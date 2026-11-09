# dsh-open-deepseek-web

A sidebar button for the DSH Web UI that opens `chat.deepseek.com` in a standalone Chrome app window — and, when that window is already open, brings it back to the front instead of opening a second one.

DSH 侧边栏的一个「网页版」按钮：点一下用 Chrome 应用窗口打开 `chat.deepseek.com`；已经开着，就把那个窗口还原并置顶，不重开、不刷新。

## What it does / 它做什么

- **Focus instead of relaunch / 聚焦而不是重开** — the host half enumerates visible top-level windows and looks for a title containing `deepseek` but not `Harness`. A match is restored and raised; no match falls through to a launch.
- **Chrome app mode / 应用窗口** — launches `chrome --app=https://chat.deepseek.com`, which reuses the default Chrome profile, so the DeepSeek account is the one already signed in in your browser.
- **Back to the conversation / 点完就回** — the main-panel component asks the host to launch and immediately selects the conversation panel, so the click does not leave you on an empty page.
- **Bilingual label / 中英双语** — the sidebar label follows the DSH UI language (`网页版` / `Web Chat`).
- **No dependencies / 零依赖** — nothing is imported from the DSH SDK; the host half spawns one PowerShell process.

## Requirements / 运行要求

- **Windows** — the host half uses PowerShell and `user32.dll` window enumeration.
- **Google Chrome** — checked at `%ProgramFiles%`, `%LOCALAPPDATA%`, then `chrome.exe` on `PATH`. Without Chrome the URL is handed to the default browser instead (the focus step still works).

## Install / 安装

From npm / 从 npm：

```sh
dsh plugin --profile web add dsh-open-deepseek-web
```

From GitHub / 从 GitHub：

```sh
dsh plugin --profile web add github:OWNER/dsh-open-deepseek-web
```

Restart DSH (or let the profile recompose), then reload the page. The whale button sits in the sidebar panel list, below the automation tasks.

重启 DSH 后刷新页面，侧边栏的上方面板列表中会多出一个鲸鱼按钮。

## Usage / 使用

Click the whale button. The first click opens the window; later clicks focus it.

## How it works / 实现

| Half | File | What it does |
| --- | --- | --- |
| Host | `index.js` | Registers `POST /open-deepseek-web/launch` on the host web server and runs a base64-encoded PowerShell snippet that focuses or launches the window. |
| Client | `client.js` | Registers the whale icon in the `sidebar.panellist` slot and a `main` panel whose mount requests the launch and switches back to the conversation. |

The PowerShell snippet looks for a visible window whose title matches `deepseek` and does not match `Harness` — that second clause is there so the DSH window itself is never picked.

## Known limitations / 已知限制

- **Windows only.** macOS and Linux hosts have no path through the host half.
- **Title-based matching.** A window is recognised by its title; rename the DeepSeek window's title (or run it in a language/frame that hides it) and the plugin opens a new window instead of focusing the old one.
- **Any window titled with "deepseek" can match** — another app with such a title may be focused first.
- **No settings page.** The Chrome path list and the title pattern are constants in `index.js`.
- **The launch route carries no token.** It starts a process and returns the action it took; it reads and writes no files. As with any host route, a same-origin page could call it.

## License / 许可

MIT
