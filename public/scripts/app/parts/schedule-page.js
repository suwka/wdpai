(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.schedulePage = function schedulePage(ctx) {
    (function initSchedulePage() {
      if (window.location.pathname !== '/schedule') return;

      const table = document.querySelector('table[data-schedule-table]');
      if (!table) return;

      function clearRows() {
        const rows = Array.from(table.querySelectorAll('tr'));
        rows.slice(1).forEach((r) => r.remove());
      }

      function formatWhen(startsAt) {
        const raw = (startsAt ?? '').toString().trim();
        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})/);
        if (m) return `${m[4]}, ${m[3]}-${m[2]}-${m[1]}`;
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) return d.toLocaleString();
        return raw || '—';
      }

      function buildQuery() {
        const p = new URLSearchParams();
        p.set('status', 'planned');
        p.set('future', '1');
        return p.toString();
      }

      function render(items) {
        clearRows();
        const list = Array.isArray(items) ? items : [];
        if (list.length === 0) return;

        list.forEach((a, idx) => {
          const avatar = a?.cat_avatar_path || '/public/img/cat1.jpg';
          const catName = (a?.cat_name || '').toString().trim() || '—';
          const title = (a?.title || '').toString().trim() || '—';
          const whenText = formatWhen(a?.starts_at);
          const catId = (a?.cat_id || '').toString();
          const activityId = (a?.id || '').toString();

          const frag = ctx.cloneTemplate('tpl-schedule-row');
          const tr = frag?.querySelector?.('tr') || frag?.firstElementChild;
          if (!tr) return;

          const idxEl = tr.querySelector('[data-schedule-idx]');
          if (idxEl) idxEl.textContent = String(idx + 1);

          const imgEl = tr.querySelector('img[data-schedule-avatar]');
          if (imgEl) imgEl.setAttribute('src', ctx.safeText(avatar));

          const catEl = tr.querySelector('[data-schedule-cat-name]');
          if (catEl) catEl.textContent = ctx.safeText(catName);

          const titleEl = tr.querySelector('[data-schedule-title]');
          if (titleEl) titleEl.textContent = ctx.safeText(title);

          const timeEl = tr.querySelector('time[data-schedule-starts-at]');
          if (timeEl) {
            timeEl.setAttribute('datetime', ctx.safeText(a?.starts_at));
            timeEl.textContent = ctx.safeText(whenText);
          }

          const editLink = tr.querySelector('a[data-schedule-edit-link]');
          if (editLink) {
            const href = '/details?cat_id=' + encodeURIComponent(catId) + '&edit_activity_id=' + encodeURIComponent(activityId);
            editLink.setAttribute('href', href);
          }

          table.appendChild(tr);
        });
      }

      function load() {
        ctx.apiGet(ctx.URLS.apiActivities + '?' + buildQuery())
          .then((data) => {
            render(data?.items);
          })
          .catch(() => {
            clearRows();
          });
      }


      load();
    })();
  };
})();
