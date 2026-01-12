(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.handlers = function handlers(ctx) {
    function openEditCatModalById(catId) {
      const id = (catId ?? '').toString().trim();
      if (!id) return Promise.resolve();

      return ctx.apiGet(ctx.URLS.apiCat + '?cat_id=' + encodeURIComponent(id))
        .then((data) => {
          const c = data?.item;
          if (!c) return;

          if (!Boolean(c?.is_owner)) {
            ctx.openModal({
              title: 'Brak uprawnień',
              bodyHtml: '<div class="hint">Nie możesz edytować tego kota.</div>',
              okText: 'OK',
              cancelText: 'Zamknij',
            });
            return;
          }
          const node = buildCatFormNode({
            id,
            name: c?.name || '',
            age: (c?.age ?? '').toString(),
            breed: c?.breed || '',
            description: c?.description || '',
          }, 'edit');

          ctx.openModal({
            title: 'Edit cat',
            bodyNode: node,
            okText: 'Save',
            cancelText: 'Cancel',
          });
        })
        .catch(() => {
          // no-op
        });
    }

    function openEditActivityModalById(catId, activityId) {
      const cid = (catId ?? '').toString().trim();
      const aid = (activityId ?? '').toString().trim();
      if (!cid || !aid) return Promise.resolve();

      return ctx.apiGet(ctx.URLS.apiCatActivities + '?cat_id=' + encodeURIComponent(cid))
        .then((data) => {
          const items = Array.isArray(data?.items) ? data.items : [];
          const a = items.find((x) => String(x?.id) === aid);
          if (!a) return;

          const parts = ctx.parseStartsAtParts(a?.starts_at);
          const prefill = {
            activityId: aid,
            catId: cid,
            title: a?.title || '',
            description: a?.description || '',
            date: parts.date,
            time: parts.time,
            doneDescription: '',
          };
          const node = buildActivityFormNode(prefill, 'edit');
          ctx.openModal({
            title: 'Edit activity',
            bodyNode: node,
            okText: 'Save',
            cancelText: 'Cancel',
            footerExtraHtml: `
              <label class="pc-modal-footer-check">
                <input type="checkbox" form="pc-modal-form" name="mark_done" value="1" />
                Done
              </label>
            `,
          });
        })
        .catch(() => {
          // no-op
        });
    }

    (function initAutoEditOnDetails() {
      if (window.location.pathname !== '/details') return;
      const params = new URLSearchParams(window.location.search);
      const wantsEdit = (params.get('edit') || '').toString().trim() === '1';
      if (!wantsEdit) return;

      const catId = ctx.getCatIdFromUrl();
      openEditCatModalById(catId).finally(() => {
        params.delete('edit');
        const qs = params.toString();
        const nextUrl = window.location.pathname + (qs ? ('?' + qs) : '');
        window.history.replaceState({}, '', nextUrl);
      });
    })();

    (function initAutoEditActivityOnDetails() {
      if (window.location.pathname !== '/details') return;
      const params = new URLSearchParams(window.location.search);
      const activityId = (params.get('edit_activity_id') || '').toString().trim();
      if (!activityId) return;

      const catId = ctx.getCatIdFromUrl();
      openEditActivityModalById(catId, activityId).finally(() => {
        params.delete('edit_activity_id');
        const qs = params.toString();
        const nextUrl = window.location.pathname + (qs ? ('?' + qs) : '');
        window.history.replaceState({}, '', nextUrl);
      });
    })();
    function buildCatFormNode(prefill, mode) {
      const frag = ctx.cloneTemplate('tpl-cat-form');
      if (!frag) return null;
      const form = frag.querySelector('form');
      if (!form) return null;
      form.setAttribute('method', 'POST');
      form.setAttribute('enctype', 'multipart/form-data');
      form.action = (mode === 'edit') ? ctx.URLS.catUpdate : ctx.URLS.catCreate;
      ctx.fillForm(form, {
        cat_id: (mode === 'edit') ? (prefill?.id || '') : '',
        name: prefill?.name || '',
        age: prefill?.age || '',
        breed: prefill?.breed || '',
        description: prefill?.description || '',
      });
      return frag;
    }

    function buildActivityFormNode(prefill, mode) {
      const frag = ctx.cloneTemplate('tpl-activity-form');
      if (!frag) return null;
      const form = frag.querySelector('form');
      if (!form) return null;
      form.setAttribute('method', 'POST');
      form.action = (mode === 'edit') ? ctx.URLS.activityUpdate : ctx.URLS.activityCreate;
      form.id = 'pc-modal-form';
      ctx.fillForm(form, {
        activity_id: prefill?.activityId || '',
        cat_id: prefill?.catId || ctx.getCatIdFromUrl(),
        title: prefill?.title || '',
        description: prefill?.description || '',
        date: prefill?.date || '',
        time: prefill?.time || '',
        done_description: prefill?.doneDescription || '',
      });
      return frag;
    }


    // Confirm delete cat (settings)
    document.addEventListener('submit', (e) => {
      const form = e.target?.closest?.('form[data-cat-delete]');
      if (!form) return;

      e.preventDefault();
      const rawName = (form.getAttribute('data-cat-name') || '').trim();
      const name = rawName || 'this cat';

      ctx.openModal({
        title: 'Confirm deletion',
        bodyHtml: `
          <div class="pc-info">
            <div class="pc-info-row">
              <div class="pc-info-key">Question</div>
              <div class="pc-info-val">Are you sure you want to delete ${ctx.safeText(name)}?</div>
            </div>
          </div>
        `,
        okText: 'Delete',
        cancelText: 'Cancel',
        onOkCb: () => form.submit(),
      });
    });

    // Global click delegation
    document.addEventListener('click', (e) => {
      // Dashboard cards navigation
      const dashboardCard = e.target.closest('.card[data-dashboard-card]');
      if (dashboardCard) {
        e.preventDefault();
        const type = dashboardCard.getAttribute('data-dashboard-card');
        if (type === 'cat') {
          const catId = dashboardCard.getAttribute('data-cat-id') || '';
          ctx.go('/details' + (catId ? `?cat_id=${encodeURIComponent(catId)}` : ''));
          return;
        }
        if (type === 'user') {
          const username = ctx.getUserFromCard(dashboardCard);
          ctx.go('/settings');
          return;
        }
      }

      // Cats page: action buttons
      const catsDescBtn = e.target.closest('.icon-btn[data-cat-action="desc"]');
      if (catsDescBtn && catsDescBtn.closest('.cat-card')) {
        e.preventDefault();
        const card = catsDescBtn.closest('.cat-card');
        const name = card.querySelector('.cat-name')?.textContent?.trim() ?? '';
        const description = card.querySelector('.cat-description')?.textContent?.trim() ?? '';

        ctx.openModal({
          title: name ? `Opis: ${ctx.safeText(name)}` : 'Opis kota',
          bodyHtml: `
            <div class="pc-info">
              <div class="pc-info-row">
                <div class="pc-info-key">Opis</div>
                <div class="pc-info-val">${ctx.safeText(description || 'Brak opisu.')}</div>
              </div>
            </div>
          `,
          okText: 'OK',
          cancelText: 'Zamknij',
        });
        return;
      }

      const catsCaregiversBtn = e.target.closest('.icon-btn[data-cat-action="caregivers"]');
      if (catsCaregiversBtn && catsCaregiversBtn.closest('.cat-card')) {
        e.preventDefault();
        const card = catsCaregiversBtn.closest('.cat-card');
        const catId = card?.getAttribute('data-cat-id') || '';
        ctx.go('/caregivers' + (catId ? `?cat_id=${encodeURIComponent(catId)}` : ''));
        return;
      }

      const catsCard = e.target.closest('.cat-card');
      if (catsCard) {
        if (e.target.closest('.icon-btn')) return;
        e.preventDefault();
        const catId = catsCard.getAttribute('data-cat-id') || '';
        ctx.go('/details' + (catId ? `?cat_id=${encodeURIComponent(catId)}` : ''));
        return;
      }

      const trigger = e.target.closest('[data-modal-open]');
      const kind = trigger?.getAttribute('data-modal-open');
      if (!trigger || !kind) return;

      e.preventDefault();

      const modalActions = {
        'add-cat': () => {
          const node = buildCatFormNode({}, 'add');
          ctx.openModal({ title: 'Add cat', bodyNode: node, okText: 'Save', cancelText: 'Cancel' });
        },
        'account-edit': () => {
          const node = ctx.cloneTemplate('tpl-account-edit');
          const root = node?.firstElementChild || node;
          if (!node || !root) {
            ctx.openModal({ title: 'Account', bodyHtml: '<div class="hint">Template missing.</div>', okText: 'OK', cancelText: 'Cancel' });
            return;
          }

          const usernameEl = root.querySelector?.('[data-account-username]');
          const form = root.querySelector?.('form[data-modal-form]');

          ctx.apiGet(ctx.URLS.apiProfile)
            .then((data) => {
              const u = data?.item;
              if (!u) return;
              if (usernameEl) usernameEl.value = (u.username || '').toString();
              if (form) {
                ctx.fillForm(form, {
                  first_name: u.first_name || '',
                  last_name: u.last_name || '',
                });
              }
            })
            .catch(() => {
              // no-op
            });

          ctx.openModal({ title: 'Account', bodyNode: node, okText: 'Save', cancelText: 'Close' });
        },
        'edit-cat': () => {
          const catId = ctx.getCatIdFromUrl();
          openEditCatModalById(catId);
        },
        'add-activity': () => {
          const node = buildActivityFormNode({ catId: ctx.getCatIdFromUrl() }, 'add');
          ctx.openModal({
            title: 'Add activity',
            bodyNode: node,
            okText: 'Add',
            cancelText: 'Cancel',
            footerExtraHtml: `
              <label class="pc-modal-footer-check">
                <input type="checkbox" form="pc-modal-form" name="mark_done" value="1" />
                Done
              </label>
            `,
          });
        },
        'edit-activity': (t) => {
          const startsAt = t.getAttribute('data-activity-starts-at') || '';
          const parts = ctx.parseStartsAtParts(startsAt);
          const catIdFromTrigger = t.getAttribute('data-activity-cat-id') || '';
          const prefill = {
            activityId: t.getAttribute('data-activity-id') || '',
            catId: catIdFromTrigger || ctx.getCatIdFromUrl(),
            title: t.getAttribute('data-activity-title') || '',
            description: t.getAttribute('data-activity-description') || '',
            date: parts.date,
            time: parts.time,
            doneDescription: t.getAttribute('data-activity-done-description') || '',
          };
          const node = buildActivityFormNode(prefill, 'edit');
          ctx.openModal({
            title: 'Edit activity',
            bodyNode: node,
            okText: 'Save',
            cancelText: 'Cancel',
            footerExtraHtml: `
              <label class="pc-modal-footer-check">
                <input type="checkbox" form="pc-modal-form" name="mark_done" value="1" />
                Done
              </label>
            `,
          });
        },
      };

      const handler = modalActions[kind];
      if (handler) {
        handler(trigger);
        return;
      }

      if (kind === 'caregivers-assign') {
        const node = ctx.cloneTemplate('tpl-caregivers-assign');
        const catFirst = node?.querySelector?.('[data-caregivers-assign-cat-first]');
        const userFirst = node?.querySelector?.('[data-caregivers-assign-user-first]');
        if (catFirst) catFirst.textContent = ctx.FILTER_PRESETS.onlyCatName;
        if (userFirst) userFirst.textContent = ctx.FILTER_PRESETS.onlyUsername;
        ctx.openModal({
          title: 'Assign caregiver',
          bodyNode: node,
          okText: 'OK',
          cancelText: 'Cancel',
        });
        return;
      }
    });

    // Modal form submit -> POST -> reload
    document.addEventListener('submit', (e) => {
      if (!e.target.matches('form[data-modal-form]')) return;

      e.preventDefault();
      const form = e.target;

      fetch(form.action, {
        method: form.method,
        body: new FormData(form)
      }).then((r) => {
        // Keep server redirects (e.g. /settings?err=...) instead of losing the query string.
        if (r.ok) {
          if (r.redirected && r.url) {
            window.location.href = r.url;
            return;
          }
          window.location.reload();
        }
      });
    });
  };
})();
