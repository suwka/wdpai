(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.adminPage = function adminPage(ctx) {
    (function initAdminPage() {
      const p = (window.location.pathname || '').toString().toLowerCase();
      if (!(p === '/admin' || p === '/admin/')) return;

      const statsTotal = document.querySelector('[data-admin-total]');
      const statsAdmins = document.querySelector('[data-admin-admins]');
      const statsBlocked = document.querySelector('[data-admin-blocked]');

      const table = document.querySelector('table[data-admin-users-table]');
      const addUserBtn = document.querySelector('[data-admin-add-user]');

      const DEFAULT_ADMIN_EMAIL = 'admin@example.com';

      function safeInt(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }

      function formatDateTime(raw) {
        const s = (raw ?? '').toString().trim();
        if (!s) return '—';
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) return d.toLocaleString();
        return s;
      }

      function toBool(v) {
        if (v === true) return true;
        if (v === false) return false;
        if (v === 1 || v === '1') return true;
        if (v === 0 || v === '0') return false;
        const s = (v ?? '').toString().trim().toLowerCase();
        if (s === 't' || s === 'true' || s === 'yes') return true;
        if (s === 'f' || s === 'false' || s === 'no' || s === '') return false;
        return Boolean(v);
      }

      function clearRows() {
        if (!table) return;
        const rows = Array.from(table.querySelectorAll('tr'));
        rows.slice(1).forEach((r) => r.remove());
      }

      function renderErrorRow(message) {
        if (!table) return;
        clearRows();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 9;
        td.innerHTML = `<div class="hint">${ctx.safeText(message)}</div>`;
        tr.appendChild(td);
        table.appendChild(tr);
      }

      function renderStats(item) {
        if (statsTotal) statsTotal.textContent = String(safeInt(item?.total_users));
        if (statsAdmins) statsAdmins.textContent = String(safeInt(item?.admin_users));
        if (statsBlocked) statsBlocked.textContent = String(safeInt(item?.blocked_users));
      }

      function renderUsers(items) {
        if (!table) return;
        clearRows();

        const list = Array.isArray(items) ? items : [];
        list.forEach((u) => {
          const isBlocked = toBool(u?.is_blocked);
          const email = (u?.email ?? '').toString().trim().toLowerCase();
          const isDefaultAdmin = (email === DEFAULT_ADMIN_EMAIL);

          const frag = ctx.cloneTemplate('tpl-admin-user-row');
          const tr = frag?.querySelector?.('tr') || frag?.firstElementChild;
          if (!tr) return;

          tr.setAttribute('data-user-id', ctx.safeText(u?.id));
          tr.setAttribute('data-user-role', ctx.safeText(u?.role));
          tr.setAttribute('data-user-is-blocked', (isBlocked ? '1' : '0'));
          tr.setAttribute('data-user-email', ctx.safeText(u?.email));

          const idEl = tr.querySelector('[data-admin-id]');
          if (idEl) idEl.textContent = ctx.safeText(u?.id);

          const unEl = tr.querySelector('[data-admin-username]');
          if (unEl) unEl.textContent = ctx.safeText(u?.username || '—');

          const fnEl = tr.querySelector('[data-admin-first]');
          if (fnEl) fnEl.textContent = ctx.safeText(u?.first_name || '—');

          const lnEl = tr.querySelector('[data-admin-last]');
          if (lnEl) lnEl.textContent = ctx.safeText(u?.last_name || '—');

          const emEl = tr.querySelector('[data-admin-email]');
          if (emEl) emEl.textContent = ctx.safeText(u?.email || '—');

          const roleEl = tr.querySelector('[data-admin-role]');
          if (roleEl) roleEl.textContent = ctx.safeText(u?.role || '—');

          const blockedBadge = tr.querySelector('[data-admin-blocked-badge]');
          if (blockedBadge) {
            if (!isBlocked) {
              blockedBadge.remove();
            } else {
              blockedBadge.hidden = false;
            }
          }

          if (isDefaultAdmin) {
            const blockBtn = tr.querySelector('[data-admin-action="block"]');
            const delBtn = tr.querySelector('[data-admin-action="delete"]');
            if (blockBtn) {
              blockBtn.disabled = true;
              blockBtn.setAttribute('title', 'Nie można zablokować konta domyślnego');
            }
            if (delBtn) {
              delBtn.disabled = true;
              delBtn.setAttribute('title', 'Nie można usunąć konta domyślnego');
            }
          }

          const lastLoginEl = tr.querySelector('time[data-admin-last-login]');
          if (lastLoginEl) {
            lastLoginEl.setAttribute('datetime', ctx.safeText(u?.last_login_at || ''));
            lastLoginEl.textContent = formatDateTime(u?.last_login_at);
          }

          const createdEl = tr.querySelector('time[data-admin-created]');
          if (createdEl) {
            createdEl.setAttribute('datetime', ctx.safeText(u?.created_at || ''));
            createdEl.textContent = formatDateTime(u?.created_at);
          }

          table.appendChild(tr);
        });
      }

      function load() {
        Promise.all([
          ctx.apiGet(ctx.URLS.apiAdminStats),
          ctx.apiGet(ctx.URLS.apiUsers),
        ])
          .then(([stats, users]) => {
            renderStats(stats?.item);
            renderUsers(users?.items);
          })
          .catch((e) => {
            renderStats({ total_users: '—', admin_users: '—', blocked_users: '—' });
            renderErrorRow('Nie udało się wczytać użytkowników. Sprawdź czy jesteś zalogowany jako admin.');
            console.warn('adminPage load failed', e);
          });
      }

      function post(url, dataObj) {
        const fd = new FormData();
        Object.entries(dataObj || {}).forEach(([k, v]) => fd.append(k, (v ?? '').toString()));
        return fetch(url, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
          .then((r) => r.json().catch(() => ({})).then((j) => ({ ok: r.ok, status: r.status, json: j })));
      }

      function openCreateUserModal() {
        const node = ctx.cloneTemplate('tpl-admin-user-create');
        const root = node?.firstElementChild || node;
        if (!root) return;

        ctx.openModal({
          title: 'Dodaj użytkownika',
          bodyNode: node,
          okText: 'Utwórz',
          cancelText: 'Anuluj',
        });
      }

      function openEditUserModal(tr) {
        const userId = tr.getAttribute('data-user-id') || '';
        const username = tr.querySelector('[data-admin-username]')?.textContent?.trim() || '';
        const firstName = tr.querySelector('[data-admin-first]')?.textContent?.trim() || '';
        const lastName = tr.querySelector('[data-admin-last]')?.textContent?.trim() || '';

        const node = ctx.cloneTemplate('tpl-admin-user-edit');
        const root = node?.firstElementChild || node;
        if (!root) return;

        const idField = root.querySelector('[data-admin-edit-id]');
        if (idField) idField.value = userId;
        ctx.fillForm(root, { first_name: firstName, last_name: lastName, new_password: '' });

        ctx.openModal({
          title: `Edycja: ${ctx.safeText(username || userId)}`,
          bodyNode: node,
          okText: 'Zapisz',
          cancelText: 'Anuluj',
        });
      }

      document.addEventListener('submit', (e) => {
        const form = e.target?.closest?.('form[data-admin-user-edit]');
        if (!form) return;
        e.preventDefault();

        const fd = new FormData(form);
        const payload = {
          user_id: fd.get('user_id') || '',
          first_name: fd.get('first_name') || '',
          last_name: fd.get('last_name') || '',
          new_password: fd.get('new_password') || '',
        };

        post(ctx.URLS.adminUserUpdate, payload).then((res) => {
          if (!res.ok) {
            const msg = res?.json?.message || 'Nie udało się zapisać zmian.';
            ctx.openModal({ title: 'Błąd', bodyHtml: `<div class="hint">${ctx.safeText(msg)}</div>`, okText: 'OK', cancelText: 'Zamknij' });
            return;
          }
          ctx.closeModal();
          load();
        });
      });

      document.addEventListener('submit', (e) => {
        const form = e.target?.closest?.('form[data-admin-user-create]');
        if (!form) return;
        e.preventDefault();

        const fd = new FormData(form);
        const payload = {
          username: fd.get('username') || '',
          email: fd.get('email') || '',
          first_name: fd.get('first_name') || '',
          last_name: fd.get('last_name') || '',
          role: fd.get('role') || 'user',
          password: fd.get('password') || '',
        };

        post(ctx.URLS.adminUserCreate, payload).then((res) => {
          if (!res.ok) {
            const msg = res?.json?.message || res?.json?.error || 'Nie udało się utworzyć użytkownika.';
            ctx.openModal({ title: 'Błąd', bodyHtml: `<div class="hint">${ctx.safeText(msg)}</div>`, okText: 'OK', cancelText: 'Zamknij' });
            return;
          }
          ctx.closeModal();
          load();
        });
      });

      document.addEventListener('click', (e) => {
        const actBtn = e.target.closest('[data-admin-action]');
        if (actBtn && actBtn.closest('tr[data-user-id]')) {
          e.preventDefault();
          const tr = actBtn.closest('tr[data-user-id]');
          const action = actBtn.getAttribute('data-admin-action');
          const userId = tr.getAttribute('data-user-id') || '';
          const username = tr.querySelector('[data-admin-username]')?.textContent?.trim() || userId;
          const role = tr.getAttribute('data-user-role') || '';
          const isBlocked = (tr.getAttribute('data-user-is-blocked') || '') === '1';
          const email = (tr.getAttribute('data-user-email') || '').toString().trim().toLowerCase();

          if (email === DEFAULT_ADMIN_EMAIL && (action === 'block' || action === 'delete')) {
            ctx.openModal({ title: 'Info', bodyHtml: '<div class="hint">Nie można zablokować ani usunąć domyślnego konta admin@example.com.</div>', okText: 'OK', cancelText: 'Zamknij' });
            return;
          }

          if (action === 'edit') {
            openEditUserModal(tr);
            return;
          }

          if (action === 'block') {
            const next = isBlocked ? '0' : '1';
            const verb = isBlocked ? 'odblokować' : 'zablokować';
            ctx.openModal({
              title: 'Potwierdź',
              bodyHtml: `<div class="hint">Czy na pewno chcesz ${verb} użytkownika <b>${ctx.safeText(username)}</b>?</div>`,
              okText: 'Tak',
              cancelText: 'Nie',
              onOkCb: () => {
                post(ctx.URLS.adminUserBlock, { user_id: userId, is_blocked: next }).then(() => load());
              },
            });
            return;
          }

          if (action === 'delete') {
            if (role === 'admin') {
              ctx.openModal({ title: 'Info', bodyHtml: '<div class="hint">Usuwanie administratorów jest ograniczone (nie można usunąć ostatniego admina).</div>', okText: 'OK', cancelText: 'Zamknij' });
            }
            ctx.openModal({
              title: 'Potwierdź usunięcie',
              bodyHtml: `<div class="hint">Usunąć użytkownika <b>${ctx.safeText(username)}</b>? Tej operacji nie da się cofnąć.</div>`,
              okText: 'Usuń',
              cancelText: 'Anuluj',
              onOkCb: () => {
                post(ctx.URLS.adminUserDelete, { user_id: userId }).then((res) => {
                  if (!res.ok) {
                    const msg = res?.json?.error || 'Nie udało się usunąć użytkownika.';
                    ctx.openModal({ title: 'Błąd', bodyHtml: `<div class="hint">${ctx.safeText(msg)}</div>`, okText: 'OK', cancelText: 'Zamknij' });
                    return;
                  }
                  load();
                });
              },
            });
            return;
          }
        }

        if (addUserBtn && e.target.closest('[data-admin-add-user]')) {
          e.preventDefault();
          openCreateUserModal();
          return;
        }
      });

      load();
    })();
  };
})();
