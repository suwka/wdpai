/* proste ustawienia aplikacji (localStorage) */

(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.settingsApp = function settingsApp(ctx) {
    (function initSettingsApp() {
      if (window.location.pathname !== '/settings') return;

      const confirmDeleteEl = document.querySelector('[data-app-setting="confirmDelete"]');
      const showCatMetaEl = document.querySelector('[data-app-setting="showCatMeta"]');

      function syncUiFromSettings() {
        const s = ctx.settings?.all?.() || {};

        if (confirmDeleteEl) confirmDeleteEl.checked = s.confirmDelete !== false;
        if (showCatMetaEl) showCatMetaEl.checked = s.showCatMeta !== false;
      }

      function bindCheckbox(el, key) {
        if (!el) return;
        el.addEventListener('change', () => {
          ctx.settings?.set?.(key, Boolean(el.checked));
        });
      }

      bindCheckbox(confirmDeleteEl, 'confirmDelete');
      bindCheckbox(showCatMetaEl, 'showCatMeta');

      window.addEventListener('pc:settingsChanged', syncUiFromSettings);
      syncUiFromSettings();
    })();
  };
})();
