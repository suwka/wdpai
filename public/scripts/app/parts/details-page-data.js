/* modul ladowania danych strony szczegolow */

(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.detailsPageData = function detailsPageData(ctx) {
    (function initDetailsPageData() {
      const detailsRoot = document.querySelector('.left-container');
      if (!detailsRoot) return;

      const catId = ctx.getCatIdFromUrl();
      if (!catId) return;

      ctx.apiGet(ctx.URLS.apiCat + '?cat_id=' + encodeURIComponent(catId))
        .then((data) => {
          const c = data?.item;
          if (!c) return;
          const nameEl = document.querySelector('.left-container .cat-name');
          const breedEl = document.querySelector('.left-container .cat-breed');
          const ageEl = document.querySelector('.left-container .cat-age');
          const descEl = document.querySelector('[data-cat-description]');
          const imgEl = document.querySelector('img[data-cat-avatar]') || document.querySelector('.left-container .cat-description-image img');

          if (nameEl) nameEl.textContent = c.name || '—';
          if (breedEl) breedEl.textContent = c.breed || '—';
          if (ageEl) ageEl.textContent = 'Age: ' + (c.age ?? '—') + ' years';
          if (descEl) descEl.textContent = c.description || '';
          if (imgEl) {
            const avatarFallback = '/public/img/cat1.jpg';
            const avatar = (c?.avatar_path ?? '').toString().trim() || avatarFallback;
            imgEl.src = avatar;
            imgEl.onerror = () => {
              imgEl.onerror = null;
              imgEl.src = avatarFallback;
            };
          }

          const isOwner = Boolean(c?.is_owner);
          const editLink = document.querySelector('[data-modal-open="edit-cat"]');
          if (editLink) editLink.hidden = !isOwner;

          const manageBtn = document.querySelector('[data-gallery-manage]');
          if (manageBtn) manageBtn.hidden = !isOwner;
        })
        .catch(() => {
        });

      ctx.apiGet(ctx.URLS.apiCatPhotos + '?cat_id=' + encodeURIComponent(catId))
        .then((data) => {
          const items = Array.isArray(data?.items) ? data.items : [];
          const grid = document.querySelector('.all-images');
          if (!grid) return;
          if (items.length === 0) return;

          grid.innerHTML = '';
          items.forEach((p) => {
            const frag = ctx.cloneTemplate('tpl-cat-gallery-item');
            const wrap = frag?.firstElementChild || frag?.querySelector?.('.singlepicture');
            if (!wrap) return;
            wrap.setAttribute('data-photo-id', ctx.safeText(p?.id));
            const img = wrap.querySelector('img');
            if (img) img.setAttribute('src', ctx.safeText(p?.path));
            grid.appendChild(wrap);
          });
        })
        .catch(() => {
        });

      (function initDetailsPlannedActivities() {
        const host = document.querySelector('[data-cat-planned-activities]');
        if (!host) return;

        function formatWhen(rawStartsAt) {
          const raw = (rawStartsAt ?? '').toString().trim();
          const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/);
          if (m) {
            return `${m[4]}, ${m[3]}-${m[2]}-${m[1]}`;
          }
          const d = new Date(raw);
          if (!Number.isNaN(d.getTime())) return d.toLocaleString();
          return raw || '—';
        }

        ctx.apiGet(ctx.URLS.apiCatActivities + '?cat_id=' + encodeURIComponent(catId))
          .then((data) => {
            const items = Array.isArray(data?.items) ? data.items : [];
            if (items.length === 0) {
              host.innerHTML = '';
              return;
            }

            host.innerHTML = '';
            items.forEach((a) => {
              const title = (a?.title || '').toString().trim() || '—';
              const desc = (a?.description || '').toString().trim();
              const startsAt = (a?.starts_at || '').toString();

              const frag = ctx.cloneTemplate('tpl-cat-planned-activity-card');
              const card = frag?.firstElementChild || frag?.querySelector?.('.cat-detail-card');
              if (!card) return;

              const titleEl = card.querySelector('[data-activity-title]');
              if (titleEl) titleEl.textContent = ctx.safeText(title);
              const descEl = card.querySelector('[data-activity-desc]');
              if (descEl) descEl.textContent = ctx.safeText(desc);
              const whenEl = card.querySelector('[data-activity-when]');
              if (whenEl) whenEl.textContent = ctx.safeText(formatWhen(startsAt));

              const btn = card.querySelector('button[data-modal-open="edit-activity"]');
              if (btn) {
                btn.setAttribute('data-activity-id', ctx.safeText(a?.id));
                btn.setAttribute('data-activity-title', ctx.safeText(title));
                btn.setAttribute('data-activity-description', ctx.safeText(desc));
                btn.setAttribute('data-activity-done-description', ctx.safeText(a?.done_description || ''));
                btn.setAttribute('data-activity-starts-at', ctx.safeText(startsAt));
              }

              host.appendChild(card);
            });
          })
          .catch(() => {
            host.innerHTML = '';
          });
      })();
    })();
  };
})();
