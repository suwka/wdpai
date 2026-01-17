/* modul widzetu kalendarza */

(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.calendar = function calendar(ctx) {
    (function initCalendarWidgets() {
      const containers = Array.from(document.querySelectorAll('.calendar-container'));
      if (containers.length === 0) return;

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      function toMondayIndex(jsDay) {
        return (jsDay + 6) % 7;
      }

      function pad2(n) {
        return String(n).padStart(2, '0');
      }

      function fmtDate(d) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      }

      function addDays(d, delta) {
        const x = new Date(d);
        x.setDate(x.getDate() + delta);
        return x;
      }

      function getCalendarMode() {
        const p = window.location.pathname;
        if (p === '/dashboard') return { planned: true, done: true };
        if (p === '/schedule') return { planned: true, done: false };
        return { planned: false, done: false };
      }

      function ensureDayClickHandler(container) {
        if (container.getAttribute('data-activity-day-click') === '1') return;
        container.setAttribute('data-activity-day-click', '1');

        const daysEl = container.querySelector('.calendar-days');
        if (!daysEl) return;

        daysEl.addEventListener('click', (e) => {
          const dayEl = e.target.closest('.day');
          if (!dayEl || !daysEl.contains(dayEl)) return;

          if (!dayEl.classList.contains('has-planned') && !dayEl.classList.contains('has-done')) return;
          const date = dayEl.getAttribute('data-date') || '';
          if (!date) return;

          function buildActivityDayNode(items) {
            const modalFrag = ctx.cloneTemplate('tpl-activity-day-modal');
            const listEl = modalFrag?.querySelector?.('[data-activity-day-list]') || modalFrag?.firstElementChild;
            if (!modalFrag || !listEl) return null;

            items.forEach((a) => {
              const rowFrag = ctx.cloneTemplate('tpl-activity-day-row');
              const rowEl = rowFrag?.firstElementChild || rowFrag?.querySelector?.('[data-activity-day-time]')?.closest?.('.pc-activity-day-row');
              if (!rowEl) return;

              const startsAt = (a?.starts_at || '').toString();
              const m = startsAt.match(/^\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2})/);
              const time = m ? m[1] : '—';
              const cat = (a?.cat_name || '').toString().trim();
              const title = (a?.title || '').toString().trim();
              const desc = (a?.description || '').toString().trim();
              const main = [title, desc].filter(Boolean).join(' — ') || '—';

              const timeEl = rowEl.querySelector('[data-activity-day-time]');
              if (timeEl) timeEl.textContent = ctx.safeText(time);
              const titleEl = rowEl.querySelector('[data-activity-day-title]');
              if (titleEl) titleEl.textContent = ctx.safeText(main);
              const subEl = rowEl.querySelector('[data-activity-day-sub]');
              if (subEl) {
                subEl.textContent = ctx.safeText(cat);
                subEl.hidden = !cat;
              }

              listEl.appendChild(rowEl);
            });

            return modalFrag;
          }

          ctx.apiGet(ctx.URLS.apiActivitiesDay + '?date=' + encodeURIComponent(date))
            .then((data) => {
              const items = Array.isArray(data?.items) ? data.items : [];
              const bodyNode = (items.length > 0) ? buildActivityDayNode(items) : null;

              ctx.openModal({
                title: `Activities (${date})`,
                bodyNode: bodyNode,
                bodyHtml: bodyNode ? '' : '<div class="pc-info"><div class="pc-info-row"><div class="pc-info-key">Info</div><div class="pc-info-val">No activities</div></div></div>',
                okText: 'OK',
                cancelText: 'Close',
              });
            })
            .catch(() => {
              ctx.openModal({
                title: `Activities (${date})`,
                bodyHtml: '<div class="pc-info"><div class="pc-info-row"><div class="pc-info-key">Error</div><div class="pc-info-val">Cannot load activities</div></div></div>',
                okText: 'OK',
                cancelText: 'Close',
              });
            });
        });
      }

      function decorateCalendar(container, fromDate, toDateExclusive) {
        const mode = getCalendarMode();
        if (!mode.planned && !mode.done) return;

        const from = fmtDate(fromDate);
        const to = fmtDate(toDateExclusive);

        ctx.apiGet(ctx.URLS.apiActivitiesCalendar + '?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to))
          .then((data) => {
            const items = Array.isArray(data?.items) ? data.items : [];
            const map = new Map();
            items.forEach((row) => {
              const day = (row?.day || '').toString();
              if (!day) return;
              map.set(day, {
                planned: Number(row?.planned_future_count || 0),
                done: Number(row?.done_like_count || 0),
              });
            });

            const days = Array.from(container.querySelectorAll('.calendar-days > .day'));
            days.forEach((el) => {
              el.classList.remove('has-event', 'has-planned', 'has-done');
              const date = el.getAttribute('data-date') || '';
              if (!date) return;
              const counts = map.get(date);
              if (!counts) return;

              const hasPlanned = mode.planned && counts.planned > 0;
              const hasDone = mode.done && counts.done > 0;
              if (!hasPlanned && !hasDone) return;

              el.classList.add('has-event');
              if (hasPlanned) el.classList.add('has-planned');
              if (hasDone) el.classList.add('has-done');
            });
          })
          .catch(() => {
          });
      }

      function renderMonth(container, year, monthIdx) {
        const label = container.querySelector('.calendar-month');
        const daysEl = container.querySelector('.calendar-days');
        if (!label || !daysEl) return;

        label.textContent = `${monthNames[monthIdx]} ${year}`;
        daysEl.innerHTML = '';

        const firstOfMonth = new Date(year, monthIdx, 1);
        const startOffset = toMondayIndex(firstOfMonth.getDay());
        const startDate = new Date(year, monthIdx, 1 - startOffset);
        const today = new Date();

        for (let i = 0; i < 42; i++) {
          const cur = addDays(startDate, i);
          const d = document.createElement('div');
          d.className = 'day';
          if (cur.getMonth() !== monthIdx) d.classList.add('other-month');
          if (cur.getFullYear() === today.getFullYear() && cur.getMonth() === today.getMonth() && cur.getDate() === today.getDate()) {
            d.classList.add('today');
          }
          d.textContent = String(cur.getDate());
          d.setAttribute('data-date', fmtDate(cur));
          daysEl.appendChild(d);
        }

        ensureDayClickHandler(container);
        decorateCalendar(container, startDate, addDays(startDate, 42));
      }

      containers.forEach((container) => {
        const base = new Date();
        let curYear = base.getFullYear();
        let curMonth = base.getMonth();
        renderMonth(container, curYear, curMonth);

        const navs = Array.from(container.querySelectorAll('.calendar-header .calendar-nav'));
        const prev = navs[0];
        const next = navs[1];

        if (prev) {
          prev.style.cursor = 'pointer';
          prev.addEventListener('click', () => {
            curMonth -= 1;
            if (curMonth < 0) {
              curMonth = 11;
              curYear -= 1;
            }
            renderMonth(container, curYear, curMonth);
          });
        }

        if (next) {
          next.style.cursor = 'pointer';
          next.addEventListener('click', () => {
            curMonth += 1;
            if (curMonth > 11) {
              curMonth = 0;
              curYear += 1;
            }
            renderMonth(container, curYear, curMonth);
          });
        }
      });
    })();
  };
})();
