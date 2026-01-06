(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.catsPageData = function catsPageData(ctx) {
    (function initCatsPageData() {
      const host = document.querySelector('.cat-cards');
      if (!host) return;

      ctx.apiGet(ctx.URLS.apiCats)
        .then((data) => {
          const items = Array.isArray(data?.items) ? data.items : [];
          if (items.length === 0) {
            host.innerHTML = '<div class="hint">No cats yet. Click Add cat.</div>';
            return;
          }

          host.innerHTML = '';
          items.forEach((c) => {
            const ageLabel = (c?.age === null || c?.age === undefined || c?.age === '') ? '—' : `${ctx.safeText(c.age)} year old`;
            const breedLabel = (c?.breed || '').trim() ? ctx.safeText(c.breed) : 'unknown breed';
            const avatar = c?.avatar_path || '/public/img/cat1.jpg';
            const desc = c?.description || '';

            const frag = ctx.cloneTemplate('tpl-cat-card');
            const card = frag?.firstElementChild || frag?.querySelector?.('.cat-card');
            if (!card) return;

            const id = ctx.safeText(c?.id);
            card.setAttribute('data-cat-id', id);
            const img = card.querySelector('img');
            if (img) img.setAttribute('src', ctx.safeText(avatar));

            const nameEl = card.querySelector('.cat-name');
            if (nameEl) nameEl.textContent = ctx.safeText(c?.name);

            const breedEl = card.querySelector('[data-cat-meta-breed]');
            if (breedEl) breedEl.textContent = breedLabel;

            const ageEl = card.querySelector('[data-cat-meta-age]');
            if (ageEl) ageEl.textContent = ageLabel;

            const descEl = card.querySelector('.cat-description');
            if (descEl) descEl.textContent = ctx.safeText(desc);

            const editLink = card.querySelector('a.icon-btn[data-cat-action="edit-link"]');
            if (editLink) {
              editLink.setAttribute('href', '/details' + (id ? `?cat_id=${encodeURIComponent(id)}&edit=1` : ''));
            }

            host.appendChild(card);
          });
        })
        .catch(() => {
          host.innerHTML = '<div class="hint">Cannot load cats (not logged in?).</div>';
        });
    })();
  };
})();
