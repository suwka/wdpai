/* Dashboard page module. */

(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.dashboard = function dashboard(ctx) {
    function clearHost(host) {
      if (host) host.innerHTML = '';
    }

    function appendFromTemplate(host, tplId, fillCb) {
      const frag = ctx.cloneTemplate(tplId);
      const el = frag?.firstElementChild || frag?.querySelector?.('*');
      if (!host || !el) return;
      try { fillCb?.(el); } catch {}
      host.appendChild(el);
    }

    (function initDashboardCats() {
      const host = document.querySelector('[data-dashboard-cats]');
      if (!host) return;

      ctx.apiGet(ctx.URLS.apiCats)
        .then((data) => {
          const items = Array.isArray(data?.items) ? data.items : [];
          if (items.length === 0) {
            clearHost(host);
            return;
          }

          const top = items.slice(0, 4);
          clearHost(host);
          top.forEach((c) => {
            const avatarFallback = '/public/img/cat1.jpg';
            const avatar = (c?.avatar_path ?? '').toString().trim() || avatarFallback;
            const meta = `${(c?.breed || '—')} • ${(c?.age ?? '—')}y`;
            appendFromTemplate(host, 'tpl-dashboard-cat-card', (el) => {
              el.setAttribute('data-cat-id', ctx.safeText(c?.id));
              const img = el.querySelector('img');
              if (img) {
                img.setAttribute('src', ctx.safeText(avatar));
                img.onerror = () => {
                  img.onerror = null;
                  img.src = avatarFallback;
                };
              }
              const nameEl = el.querySelector('[data-dashboard-name]');
              if (nameEl) nameEl.textContent = ctx.safeText(c?.name);
              const metaEl = el.querySelector('[data-dashboard-meta]');
              if (metaEl) metaEl.textContent = ctx.safeText(meta);
            });
          });
        })
        .catch(() => {
          clearHost(host);
        });
    })();

    (function initDashboardUsers() {
      const host = document.querySelector('[data-dashboard-users]');
      if (!host) return;

      const wrapper = host.closest('[data-admin-only]');
      if (wrapper && wrapper.hidden) return;

      ctx.apiGet(ctx.URLS.apiUsers)
        .then((data) => {
          const items = Array.isArray(data?.items) ? data.items : [];
          if (items.length === 0) {
            clearHost(host);
            return;
          }
          const top = items.slice(0, 4);
          clearHost(host);
          top.forEach((u) => {
            const avatarFallback = '/public/img/avatar.jpg';
            const avatar = (u?.avatar_path ?? '').toString().trim() || avatarFallback;
            const sub = u?.role ? `Role: ${ctx.safeText(u.role)}` : '';
            appendFromTemplate(host, 'tpl-dashboard-user-card', (el) => {
              const img = el.querySelector('img');
              if (img) {
                img.setAttribute('src', ctx.safeText(avatar));
                img.onerror = () => {
                  img.onerror = null;
                  img.src = avatarFallback;
                };
              }
              const usernameEl = el.querySelector('[data-dashboard-username]');
              if (usernameEl) usernameEl.textContent = ctx.safeText(u?.username);
              const subEl = el.querySelector('[data-dashboard-sub]');
              if (subEl) subEl.textContent = sub;
            });
          });
        })
        .catch(() => {
          clearHost(host);
        });
    })();

    (function initDashboardActivities() {
      const recentHost = document.querySelector('[data-dashboard-activities-recent]');
      const plannedHost = document.querySelector('[data-dashboard-activities-planned]');
      if (!recentHost && !plannedHost) return;

      function formatWhen(startsAt) {
        const raw = (startsAt ?? '').toString();
        if (!raw) return '—';
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return raw;
        return d.toLocaleString();
      }

      function render(items, host) {
        if (!host) return;
        const list = Array.isArray(items) ? items : [];
        if (list.length === 0) {
          clearHost(host);
          return;
        }

        clearHost(host);
        list.forEach((a) => {
          const title = (a?.title || '').toString().trim();
          const catName = (a?.cat_name || '').toString().trim();
          const text = [title, catName].filter(Boolean).join(' • ') || '—';
          appendFromTemplate(host, 'tpl-dashboard-activity-card', (el) => {
            const textEl = el.querySelector('[data-dashboard-activity-text]');
            if (textEl) textEl.textContent = ctx.safeText(text);
            const timeEl = el.querySelector('[data-dashboard-activity-time]');
            if (timeEl) timeEl.textContent = ctx.safeText(formatWhen(a?.starts_at));
          });
        });
      }

      ctx.apiGet(ctx.URLS.apiDashboardActivities)
        .then((data) => {
          render(data?.recent, recentHost);
          render(data?.planned, plannedHost);
        })
        .catch(() => {
          clearHost(recentHost);
          clearHost(plannedHost);
        });
    })();
  };
})();
