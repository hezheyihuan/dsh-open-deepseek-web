window.__ModuleLoader__.load({
  id: 'dsh-open-deepseek-web',
  factory(require) {
    const React = require('react');
    const { useEffect } = React;
    const h = React.createElement;

    const LAUNCH_PATH = '/open-deepseek-web/launch';

    const DICTS = {
      en: { label: 'Web Chat' },
      'zh-CN': { label: '网页版' },
      zh: { label: '网页版' },
    };

    // Blue chubby whale, used both as the sidebar icon and the plugin icon.
    function WhaleIcon(props) {
      const size = props.size || 20;
      return h(
        'svg',
        {
          viewBox: '0 0 64 64',
          width: size,
          height: size,
          'aria-hidden': true,
          focusable: 'false',
          style: { display: 'block', pointerEvents: 'none' },
        },
        h('path', {
          d: 'M21 9c-2.2-3.2-4.6-5-7.4-6M21 9c0-3-1-5-2.2-6.6M21 9c2.2-3.2 4.6-5 7.4-6',
          stroke: '#4d6bfe',
          strokeWidth: 2.6,
          fill: 'none',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('circle', { cx: 27, cy: 34, r: 19, fill: '#4d6bfe' }),
        h('path', {
          d: 'M45 28c7-2.6 12.4-7 15-12-1.4 8.6-7 14-14.6 15z',
          fill: '#4d6bfe',
        }),
        h('path', {
          d: 'M28 47c6 4.2 13 3.4 18-1.6-1 5-6 8.6-12.6 8.6-4 0-7.6-1.8-5.4-7z',
          fill: '#cfe0ff',
        }),
        h('circle', { cx: 16.5, cy: 30, r: 2.6, fill: '#12306b' }),
        h('circle', { cx: 15.6, cy: 29.1, r: 0.9, fill: '#ffffff' }),
      );
    }

    function requestLaunch() {
      fetch(LAUNCH_PATH, { method: 'POST' }).catch(() => {});
    }

    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        const disposers = [];
        for (const [locale, dict] of Object.entries(DICTS)) {
          disposers.push(ctx.locale.register('open-deepseek-web', locale, dict));
        }
        const t = ctx.locale.bind('open-deepseek-web');

        // Sidebar panel-icon cell, rendered by the sidebar inside its own button.
        function PanelIcon(props) {
          return h(WhaleIcon, { size: props.size || 20 });
        }

        // Main-panel body selected when the whale cell is clicked. It asks the Host
        // to focus/launch the DeepSeek window and immediately returns to conversation.
        function LaunchPanel() {
          useEffect(() => {
            requestLaunch();
            const layout = ctx.get('layout');
            if (layout && typeof layout.selectPanel === 'function') {
              layout.selectPanel('conversation');
            }
          }, []);
          return null;
        }

        ctx.effect(() => {
          const disposePanel = ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register(
              {
                name: 'sidebar.panellist',
                id: 'open-deepseek-web',
                order: 11,
                label: () => t('label'),
              },
              PanelIcon,
            ),
          );
          const disposeMain = ctx.slots.inject('main', () =>
            ctx.slots.register(
              { name: 'main', key: 'open-deepseek-web' },
              LaunchPanel,
            ),
          );
          return () => {
            disposePanel();
            disposeMain();
            disposers.forEach((d) => d());
          };
        });
      },
    };
  },
});
