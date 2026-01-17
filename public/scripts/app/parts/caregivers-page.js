/* Caregivers page module. */

(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.caregiversPage = function caregiversPage(ctx) {
    if (window.location.pathname !== '/caregivers') return;

    const table = document.querySelector('table[data-caregivers-table]');
    if (!table) return;

    const catId = ctx.getCatIdFromUrl();
    if (!catId) {
      table.insertAdjacentHTML('beforeend', '<tr><td colspan="5"><div class="hint">Brak cat_id w URL. Wejdź z /cats.</div></td></tr>');
      return;
    }

    const addBtn = document.querySelector('[data-caregiver-add]');

    function apiPostForm(url, formData) {
      return ctx.apiPostFormData(url, formData);
    }

    function clearRows() {
      const rows = Array.from(table.querySelectorAll('tr'));
      rows.slice(1).forEach((r) => r.remove());
    }

    function renderAssigned(assigned) {
      clearRows();

      const list = Array.isArray(assigned) ? assigned : [];
      if (list.length === 0) {
        table.insertAdjacentHTML('beforeend', '<tr><td colspan="5"><div class="hint">Brak przypisanych opiekunów.</div></td></tr>');
        return;
      }

      list.forEach((u, idx) => {
        const uid = String(u?.id || '');
        const username = String(u?.username || '—');
        const fullName = `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() || '—';
        const avatarFallback = '/public/img/avatar.jpg';
        const avatar = (u?.avatar_path ?? '').toString().trim() || avatarFallback;

        const frag = ctx.cloneTemplate('tpl-caregiver-row');
        const tr = frag?.querySelector?.('tr') || frag?.firstElementChild;
        if (!tr) return;
        tr.setAttribute('data-user-id', ctx.safeText(uid));

        const idxEl = tr.querySelector('[data-caregivers-idx]');
        if (idxEl) idxEl.textContent = String(idx + 1);

        const imgEl = tr.querySelector('img[data-caregivers-avatar]');
        if (imgEl) {
          imgEl.setAttribute('src', ctx.safeText(avatar));
          imgEl.onerror = () => {
            imgEl.onerror = null;
            imgEl.src = avatarFallback;
          };
        }

        const nameEl = tr.querySelector('[data-caregivers-fullname]');
        if (nameEl) nameEl.textContent = ctx.safeText(fullName);

        const userEl = tr.querySelector('[data-caregivers-username]');
        if (userEl) userEl.textContent = ctx.safeText(username);

        const removeBtn = tr.querySelector('[data-caregivers-remove]');
        if (removeBtn) removeBtn.setAttribute('data-user-id', ctx.safeText(uid));

        table.appendChild(tr);
      });
    }

    function openAssignModal({ available }) {
      const frag = ctx.cloneTemplate('tpl-caregivers-assign');
      if (!frag) {
        ctx.openModal({ title: 'Assign caregiver', bodyHtml: '<div class="hint">Template missing.</div>', okText: 'OK', cancelText: 'Cancel' });
        return;
      }

      const form = frag.querySelector('form');
      const userSel = frag.querySelector('[data-caregivers-assign-user]');

      if (!form || !userSel) {
        ctx.openModal({ title: 'Assign caregiver', bodyHtml: '<div class="hint">Template invalid.</div>', okText: 'OK', cancelText: 'Cancel' });
        return;
      }

      form.setAttribute('data-modal-form', '');
      const userFirst = userSel.querySelector('[data-caregivers-assign-user-first]');
      userSel.innerHTML = '';
      if (userFirst) userSel.appendChild(userFirst);

      (available || []).forEach((u) => {
        const fullName = `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim();
        const username = String(u?.username || '').trim();
        const opt = document.createElement('option');
        opt.value = String(u?.id || '');
        opt.textContent = (fullName ? `${fullName} (${username || '—'})` : (username || '—'));
        userSel.appendChild(opt);
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = String(userSel.value || '').trim();
        if (!userId) {
          ctx.openModal({
            title: 'Assign caregiver',
            bodyHtml: '<div class="hint">Wybierz opiekuna.</div>',
            okText: 'OK',
            cancelText: 'Zamknij',
          });
          return;
        }

        const fd = new FormData();
        fd.set('cat_id', catId);
        fd.set('user_id', userId);

        apiPostForm(ctx.URLS.caregiverAssign, fd)
          .then(() => {
            ctx.closeModal();
            load();
          })
          .catch((err) => {
            ctx.openModal({ title: 'Assign caregiver', bodyHtml: `<div class="hint">Błąd: ${ctx.safeText(err?.message || 'failed')}</div>`, okText: 'OK', cancelText: 'Zamknij' });
          });
      }, { once: true });

      ctx.openModal({ title: 'Assign caregiver', bodyNode: frag, okText: 'Assign', cancelText: 'Cancel' });
    }

    let lastData = null;

    function load() {
      return ctx.apiGet(ctx.URLS.apiCaregivers + '?cat_id=' + encodeURIComponent(catId))
        .then((data) => {
          lastData = data || {};
          renderAssigned(lastData.assigned || []);

          const title = String(lastData?.cat?.name || '').trim();
          if (title) {
            document.title = 'Caregivers — ' + title;
            const h = document.querySelector('.section-tittle');
            if (h) h.textContent = 'Caregivers — ' + title;
          }
        })
        .catch(() => {
          clearRows();
          table.insertAdjacentHTML('beforeend', '<tr><td colspan="5"><div class="hint">Nie udało się pobrać danych (zalogowany?).</div></td></tr>');
        });
    }

    document.addEventListener('click', (e) => {
      const unassignBtn = e.target.closest('[data-caregivers-remove]');
      if (unassignBtn) {
        const userId = unassignBtn.getAttribute('data-user-id') || '';
        if (!userId) return;

        const fd = new FormData();
        fd.set('cat_id', catId);
        fd.set('user_id', userId);

        apiPostForm(ctx.URLS.caregiverUnassign, fd)
          .then(() => load())
          .catch((err) => {
            ctx.openModal({ title: 'Remove caregiver', bodyHtml: `<div class="hint">Błąd: ${ctx.safeText(err?.message || 'failed')}</div>`, okText: 'OK', cancelText: 'Zamknij' });
          });
        return;
      }
    });

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const available = lastData?.available || [];
        if (!Array.isArray(available) || available.length === 0) {
          ctx.openModal({ title: 'Add caregiver', bodyHtml: '<div class="hint">Brak dostępnych opiekunów do dodania.</div>', okText: 'OK', cancelText: 'Zamknij' });
          return;
        }
        openAssignModal({ available });
      });
    }

    load();
  };
})();
