// Bootstraps all app modules (loaded by public/scripts/main.js)
(function () {
  window.AppBootstrap = function () {
    const ctx = window.AppCore?.createContext?.();
    if (!ctx) {
      console.warn('AppCore.createContext() missing');
      return;
    }

    // Run modules if present (order matters a bit: core context -> user context -> pages)
    const parts = window.AppParts || {};

    try { parts.userContext?.(ctx); } catch (e) { console.warn('userContext failed', e); }
    try { parts.galleryUpload?.(ctx); } catch (e) { console.warn('galleryUpload failed', e); }
    try { parts.calendar?.(ctx); } catch (e) { console.warn('calendar failed', e); }
    try { parts.dashboard?.(ctx); } catch (e) { console.warn('dashboard failed', e); }
    try { parts.settingsCats?.(ctx); } catch (e) { console.warn('settingsCats failed', e); }
    try { parts.catsPageData?.(ctx); } catch (e) { console.warn('catsPageData failed', e); }
    try { parts.caregiversPage?.(ctx); } catch (e) { console.warn('caregiversPage failed', e); }
    try { parts.detailsPageData?.(ctx); } catch (e) { console.warn('detailsPageData failed', e); }
    try { parts.detailsGalleryControls?.(ctx); } catch (e) { console.warn('detailsGalleryControls failed', e); }
    try { parts.logsPage?.(ctx); } catch (e) { console.warn('logsPage failed', e); }
    try { parts.schedulePage?.(ctx); } catch (e) { console.warn('schedulePage failed', e); }
    try { parts.adminPage?.(ctx); } catch (e) { console.warn('adminPage failed', e); }
    try { parts.handlers?.(ctx); } catch (e) { console.warn('handlers failed', e); }
  };
})();
