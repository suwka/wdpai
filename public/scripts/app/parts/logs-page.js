(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.logsPage = function logsPage(ctx) {
    (function initLogsPage() {
      if (window.location.pathname !== '/logs') return;

      const table = document.querySelector('table[data-logs-table]');
      if (!table) return;

      function formatWhenForLogs(startsAt) {
        const raw = (startsAt ?? '').toString().trim();
        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})/);
        if (m) return `${m[4]} ${m[3]}-${m[2]}-${m[1]}`;
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleTimeString() + ' ' + d.toLocaleDateString();
        }
        return ctx.safeText(raw || '—');
      }

      function clearRows() {
        const rows = Array.from(table.querySelectorAll('tr'));
        rows.slice(1).forEach((r) => r.remove());
      }

      function buildQuery() {
        const p = new URLSearchParams();
        p.set('status', 'done');
        return p.toString();
      }

      function render(items) {
        clearRows();
        const list = Array.isArray(items) ? items : [];
        if (list.length === 0) return;

        list.forEach((a, idx) => {
          const avatar = a?.cat_avatar_path || '/public/img/cat1.jpg';
          const catName = (a?.cat_name || '').toString().trim() || '—';
          const userName = (a?.done_by_username || a?.created_by_username || '').toString().trim() || '—';
          const title = (a?.title || '').toString().trim() || '—';
          const desc = (a?.done_description || '').toString().trim();
          const whenHtml = formatWhenForLogs(a?.done_at);

          const frag = ctx.cloneTemplate('tpl-logs-row');
          const tr = frag?.querySelector?.('tr') || frag?.firstElementChild;
          if (!tr) return;

          const idxEl = tr.querySelector('[data-logs-idx]');
          if (idxEl) idxEl.textContent = String(idx + 1);

          const imgEl = tr.querySelector('img[data-logs-avatar]');
          if (imgEl) imgEl.setAttribute('src', ctx.safeText(avatar));

          const catEl = tr.querySelector('[data-logs-cat-name]');
          if (catEl) catEl.textContent = ctx.safeText(catName);

          const byEl = tr.querySelector('[data-logs-done-by]');
          if (byEl) byEl.textContent = ctx.safeText(userName);

          const titleEl = tr.querySelector('[data-logs-title]');
          if (titleEl) titleEl.textContent = ctx.safeText(title);

          const descEl = tr.querySelector('[data-logs-done-description]');
          if (descEl) descEl.textContent = ctx.safeText(desc);

          const timeEl = tr.querySelector('time[data-logs-done-at]');
          if (timeEl) {
            timeEl.setAttribute('datetime', ctx.safeText(a?.done_at));
            timeEl.textContent = whenHtml;
          }

          table.appendChild(tr);
        });
      }

      function load() {
        ctx.apiGet(ctx.URLS.apiActivities + '?' + buildQuery())
          .then((data) => {
            const items = Array.isArray(data?.items) ? data.items : [];
            render(items);
          })
          .catch(() => {
            clearRows();
          });
      }

      load();
    })();
  };
})();
