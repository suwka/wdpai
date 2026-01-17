/* modul kontrolek galerii szczegolow */

(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.detailsGalleryControls = function detailsGalleryControls(ctx) {
    (function initDetailsGalleryControls() {
      const grid = document.querySelector('.all-images');
      if (!grid) return;

      const maxVisible = 8;
      let expanded = false;

      function applyVisibility() {
        const items = Array.from(grid.querySelectorAll('.singlepicture'));
        items.forEach((el, idx) => {
          el.style.display = (!expanded && idx >= maxVisible) ? 'none' : '';
        });
      }

      applyVisibility();

      document.addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-gallery-toggle]');
        if (toggle) {
          e.preventDefault();
          expanded = !expanded;
          applyVisibility();
          return;
        }

        const add = e.target.closest('[data-gallery-add]');
        if (add) {
          e.preventDefault();
          const fileInput = document.getElementById('cat_photo');
          if (fileInput) fileInput.click();
          return;
        }

        const manage = e.target.closest('[data-gallery-manage]');
        if (manage) {
          e.preventDefault();
          const catId = ctx.getCatIdFromUrl();
          const items = Array.from(grid.querySelectorAll('.singlepicture')).map((wrap) => ({
            id: wrap.getAttribute('data-photo-id') || '',
            src: wrap.querySelector('img')?.getAttribute('src') || ''
          })).filter((x) => x.src);

          const modalNode = ctx.cloneTemplate('tpl-gallery-manage-modal');

          ctx.openModal({
            title: 'Manage gallery',
            bodyNode: modalNode,
            okText: 'Done',
            cancelText: 'Close',
            onOkCb: () => {
              const list = ctx.overlay.querySelector('[data-gallery-list]');
              const orderIds = Array.from(list?.querySelectorAll('[data-photo-id]') || []).map((el) => el.getAttribute('data-photo-id') || '').filter(Boolean);
              const order = Array.from(list?.querySelectorAll('[data-photo-id]') || []).map((el) => ({
                id: el.getAttribute('data-photo-id') || '',
                src: el.getAttribute('data-gallery-src') || ''
              })).filter((x) => x.src);
              if (order.length === 0) return;

              grid.innerHTML = '';
              order.forEach((x) => {
                const frag = ctx.cloneTemplate('tpl-cat-gallery-item');
                const wrap = frag?.firstElementChild || frag?.querySelector?.('.singlepicture');
                if (!wrap) return;
                wrap.setAttribute('data-photo-id', ctx.safeText(x.id));
                const img = wrap.querySelector('img');
                if (img) img.setAttribute('src', ctx.safeText(x.src));
                grid.appendChild(wrap);
              });
              applyVisibility();

              if (catId && orderIds.length > 0) {
                const form = new URLSearchParams();
                form.set('cat_id', catId);
                orderIds.forEach((id) => form.append('order[]', id));
                ctx.apiPostUrlEncoded(ctx.URLS.catPhotosReorder, form)
                  .catch((e2) => console.warn('reorder failed', e2));
              }
            },
          });

          const list = ctx.overlay.querySelector('[data-gallery-list]');
          if (!list) return;

          list.innerHTML = '';
          items.forEach((x, idx) => {
            const frag = ctx.cloneTemplate('tpl-gallery-manage-row');
            const row = frag?.firstElementChild || frag?.querySelector?.('[data-photo-id]');
            if (!row) return;
            row.setAttribute('data-photo-id', ctx.safeText(x.id));
            row.setAttribute('data-gallery-src', ctx.safeText(x.src));
            const img = row.querySelector('img[data-gallery-thumb]') || row.querySelector('img');
            if (img) img.setAttribute('src', ctx.safeText(x.src));
            const label = row.querySelector('[data-gallery-label]');
            if (label) label.textContent = `Photo ${idx + 1}`;
            list.appendChild(row);
          });

          list.addEventListener('click', (ev) => {
            const row = ev.target.closest('[data-photo-id]');
            if (!row) return;

            if (ev.target.closest('[data-gallery-remove]')) {
              const catId = ctx.getCatIdFromUrl();
              const photoId = row.getAttribute('data-photo-id') || '';
              row.remove();
              if (catId && photoId) {
                const form = new URLSearchParams();
                form.set('cat_id', catId);
                form.set('photo_id', photoId);
                ctx.apiPostUrlEncoded(ctx.URLS.catPhotoDelete, form)
                  .catch((e2) => console.warn('delete photo failed', e2));
              }
              return;
            }

            if (ev.target.closest('[data-gallery-up]')) {
              const prev = row.previousElementSibling;
              if (prev) prev.before(row);
              return;
            }

            if (ev.target.closest('[data-gallery-down]')) {
              const next = row.nextElementSibling;
              if (next) next.after(row);
            }
          });
        }
      });
    })();
  };
})();
