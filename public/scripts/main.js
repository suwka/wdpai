/*
 * main.js
 *
 * Loader modułów frontendu (bez bundlera). Ładuje pliki JS w ustalonej kolejności
 * i uruchamia bootstrap aplikacji po załadowaniu dokumentu.
 */
(function () {
  const SCRIPTS = [
    '/public/scripts/app/parts/core-modal.js',
    '/public/scripts/app/parts/user-context.js',
    '/public/scripts/app/parts/gallery-upload.js',
    '/public/scripts/app/parts/calendar.js',
    '/public/scripts/app/parts/dashboard.js',
    '/public/scripts/app/parts/settings-app.js',
    '/public/scripts/app/parts/settings-cats.js',
    '/public/scripts/app/parts/cats-page-data.js',
    '/public/scripts/app/parts/caregivers-page.js',
    '/public/scripts/app/parts/details-page-data.js',
    '/public/scripts/app/parts/details-gallery-controls.js',
    '/public/scripts/app/parts/logs-page.js',
    '/public/scripts/app/parts/schedule-page.js',
    '/public/scripts/app/parts/admin-page.js',
    '/public/scripts/app/parts/handlers.js',
    '/public/scripts/app/bootstrap.js',
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  (async () => {
    try {
      for (const src of SCRIPTS) {
        await loadScript(src);
      }

      const run = () => {
        if (typeof window.AppBootstrap === 'function') {
          window.AppBootstrap();
        } else {
          console.warn('AppBootstrap is missing');
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
      } else {
        run();
      }
    } catch (e) {
      console.warn('App loader error:', e);
    }
  })();
})();
