import { spawn } from 'node:child_process';

/**
 * Host half of the Open DeepSeek Web bundle.
 *
 * Registered HTTP route runs a PowerShell snippet that either focuses an already
 * open DeepSeek web-chat window or launches `chat.deepseek.com` in Chrome app mode
 * (the same standalone window shape the user asked for). Chrome app mode reuses the
 * default browser profile, so the DeepSeek login/account is the same one the user
 * already has in their browser.
 */

const LAUNCH_PATH = '/open-deepseek-web/launch';

const PS_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class DshDeepSeekWin {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
}
'@
$found = New-Object System.Collections.ArrayList
$cb = [DshDeepSeekWin+EnumProc]{
  param($h, $l)
  if (-not [DshDeepSeekWin]::IsWindowVisible($h)) { return $true }
  $sb = New-Object System.Text.StringBuilder 512
  [void][DshDeepSeekWin]::GetWindowText($h, $sb, 512)
  $t = $sb.ToString()
  if ($t -match 'deepseek' -and $t -notmatch 'Harness') {
    [void]$found.Add($h)
  }
  return $true
}
[void][DshDeepSeekWin]::EnumWindows($cb, [IntPtr]::Zero)
if ($found.Count -gt 0) {
  $h = $found[0]
  [void][DshDeepSeekWin]::ShowWindow($h, 9)
  [void][DshDeepSeekWin]::BringWindowToTop($h)
  [void][DshDeepSeekWin]::SetForegroundWindow($h)
  Write-Output 'focused'
} else {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  $chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $chrome) {
    $cmd = Get-Command chrome.exe -ErrorAction SilentlyContinue
    if ($cmd) { $chrome = $cmd.Source }
  }
  if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList '--app=https://chat.deepseek.com'
    Write-Output 'launched'
  } else {
    Start-Process 'https://chat.deepseek.com'
    Write-Output 'launched-browser'
  }
}
`;

function launchOrFocus() {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');
    let child;
    try {
      child = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
        { windowsHide: true },
      );
    } catch (error) {
      resolve({ ok: false, error: String(error) });
      return;
    }
    child.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    child.on('error', (error) => resolve({ ok: false, error: String(error) }));
    child.on('close', (code) => {
      const action = stdout.trim();
      resolve({ ok: code === 0 && action.length > 0, action, code, stderr: stderr.trim() });
    });
  });
}

export const inject = ['webServer'];

export function apply(ctx) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: LAUNCH_PATH,
      handler: async (req, res) => {
        const result = await launchOrFocus();
        res.writeHead(result.ok ? 200 : 500, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
      },
    }),
  );
}
