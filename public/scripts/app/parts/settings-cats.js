/* modul sekcji kategorii ustawien */

(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.settingsCats = function settingsCats(ctx) {
    (function initSettingsCats() {
      if (window.location.pathname !== '/settings') return;
      const host = document.querySelector('[data-settings-cats]');
      if (!host) return;

      function clearHost() {
        host.innerHTML = '';
      }

      function appendCat(c) {
        const frag = ctx.cloneTemplate('tpl-settings-cat-row');
        if (!frag) return;

        const name = (c?.name ?? '').toString().trim() || '—';
        const breed = (c?.breed ?? '').toString().trim();
        const age = (c?.age ?? '').toString().trim();
        const meta = [breed ? `${breed} cat` : '', age ? `${age} year` : ''].filter(Boolean).join(' • ');
        const avatarFallback = '/public/img/cat1.jpg';
        const avatar = (c?.avatar_path ?? '').toString().trim() || avatarFallback;

        const avatarEl = frag.querySelector('[data-settings-cat-avatar]');
        if (avatarEl) {
          avatarEl.setAttribute('src', ctx.safeText(avatar));
          avatarEl.onerror = () => {
            avatarEl.onerror = null;
            avatarEl.src = avatarFallback;
          };
        }

        const nameEl = frag.querySelector('[data-settings-cat-name]');
        if (nameEl) nameEl.textContent = ctx.safeText(name);

        const metaEl = frag.querySelector('[data-settings-cat-meta]');
        if (metaEl) {
          metaEl.textContent = ctx.safeText(meta);
          metaEl.hidden = meta.trim() === '';
        }

        const deleteForm = frag.querySelector('form[data-settings-cat-delete]');
        if (deleteForm) {
          deleteForm.action = ctx.URLS.catDelete;
          deleteForm.setAttribute('data-cat-name', ctx.safeText(c?.name));
        }

        const idField = frag.querySelector('[data-settings-cat-id-field]');
        if (idField) idField.value = ctx.safeText(c?.id);

        const editLink = frag.querySelector('[data-settings-cat-edit]');
        if (editLink) {
          const id = ctx.safeText(c?.id);
          editLink.setAttribute('href', '/details' + (id ? `?cat_id=${encodeURIComponent(id)}&edit=1` : ''));
        }

        host.appendChild(frag);
      }

      ctx.apiGet(ctx.URLS.apiCats + '?owned=1')
        .then((data) => {
          const items = Array.isArray(data?.items) ? data.items : [];
          clearHost();
          for (const c of items) appendCat(c);
        })
        .catch(() => {
          clearHost();
        });
    })();
  };
})();
