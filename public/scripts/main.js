document.addEventListener('DOMContentLoaded', () => {
  let overlay = document.querySelector('[data-modal-overlay]');
  if (!overlay) {
    document.body.insertAdjacentHTML(
      'beforeend',
      `
        <div class="pc-modal-overlay" data-modal-overlay hidden>
          <div class="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pc-modal-title">
            <div class="pc-modal-header">
              <div class="pc-modal-title" id="pc-modal-title" data-modal-title>Modal</div>
              <button class="pc-modal-close" type="button" aria-label="Close" data-modal-close>&times;</button>
            </div>
            <div class="pc-modal-body" data-modal-body></div>
            <div class="pc-modal-footer">
              <button class="pc-btn pc-btn-secondary" type="button" data-modal-cancel>Cancel</button>
              <button class="pc-btn pc-btn-primary" type="button" data-modal-ok>OK</button>
            </div>
          </div>
        </div>
      `
    );
    overlay = document.querySelector('[data-modal-overlay]');
  }

  const titleEl = overlay.querySelector('[data-modal-title]');
  const bodyEl = overlay.querySelector('[data-modal-body]');
  const okBtn = overlay.querySelector('[data-modal-ok]');
  const cancelBtn = overlay.querySelector('[data-modal-cancel]');
  const closeBtn = overlay.querySelector('[data-modal-close]');

  let onOk = null;
  let lastActiveEl = null;

  function openModal({ title, bodyHtml, okText = 'OK', cancelText = 'Cancel', onOkCb = null }) {
    lastActiveEl = document.activeElement;
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    okBtn.textContent = okText;
    cancelBtn.textContent = cancelText;
    onOk = onOkCb;

    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    const firstFocusable = overlay.querySelector('input, textarea, select, button');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    bodyEl.innerHTML = '';
    onOk = null;
    if (lastActiveEl && typeof lastActiveEl.focus === 'function') lastActiveEl.focus();
  }

  function escHandler(e) {
    if (!overlay.hidden && e.key === 'Escape') closeModal();
  }

  function overlayClickHandler(e) {
    if (e.target === overlay) closeModal();
  }

  function okHandler() {
    const modalForm = overlay.querySelector('form[data-modal-form]');
    if (modalForm) {
      modalForm.requestSubmit();
      return;
    }

    if (typeof onOk === 'function') onOk();
    closeModal();
  }

  overlay.addEventListener('click', overlayClickHandler);
  document.addEventListener('keydown', escHandler);
  okBtn.addEventListener('click', okHandler);
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);

  function safeText(value) {
    return (value ?? '').toString();
  }

  function getCatIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('cat_id') || params.get('id') || '';
  }

  function getUserFromCard(cardEl) {
    const raw = cardEl?.querySelector('.cat-user-name')?.textContent?.trim() ?? '';
    return raw;
  }

  function go(path) {
    window.location.href = path;
  }

  (function initUserContext() {
    // Populate username + avatar on all authenticated pages
    fetch('/api-profile', { headers: { 'Accept': 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        const u = data?.item;
        if (!u) return;

        // Admin-only blocks
        const adminBlocks = document.querySelectorAll('[data-admin-only]');
        adminBlocks.forEach((el) => {
          el.hidden = (u.role !== 'admin');
        });

        const userNameEls = document.querySelectorAll('[data-user-username]');
        userNameEls.forEach((el) => (el.textContent = u.username || '—'));

        const avatarEls = document.querySelectorAll('[data-user-avatar]');
        avatarEls.forEach((img) => {
          if (img && u.avatar_path) img.setAttribute('src', u.avatar_path);
        });

        const welcome = document.querySelector('[data-welcome]');
        if (welcome) {
          const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          welcome.textContent = `Welcome back, ${fullName || (u.username || '—')}`;
        }

        // Profile page bindings
        const pUsername = document.querySelector('[data-profile-username]');
        if (pUsername) pUsername.textContent = u.username || '—';
        const pFullName = document.querySelector('[data-profile-fullname]');
        if (pFullName) pFullName.textContent = `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—';
        const pEmail = document.querySelector('[data-profile-email]');
        if (pEmail) pEmail.textContent = u.email || '—';
        const pRole = document.querySelector('[data-profile-role]');
        if (pRole) pRole.textContent = u.role || '—';
      })
      .catch(() => {
        // Not logged in or blocked; ignore
      });
  })();

  (function fillCatIdHiddenInputs() {
    const catId = getCatIdFromUrl();
    if (!catId) return;
    const input1 = document.getElementById('cat_id');
    if (input1) input1.value = catId;
    const input2 = document.getElementById('cat_id_gallery');
    if (input2) input2.value = catId;
  })();

  (function initGalleryUpload() {
    const form = document.getElementById('cat_gallery_upload_form');
    const fileInput = document.getElementById('cat_photo');
    if (!form || !fileInput) return;

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-gallery-upload]');
      if (!trigger) return;
      e.preventDefault();
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      form.requestSubmit();
    });
  })();

  (function initCalendarWidgets() {
    const containers = Array.from(document.querySelectorAll('.calendar-container'));
    if (containers.length === 0) return;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    function toMondayIndex(jsDay) {
      // JS: Sun=0..Sat=6 => Monday=0..Sunday=6
      return (jsDay + 6) % 7;
    }

    function parseMonthLabel(text) {
      const m = (text || '').trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (!m) return null;
      const monthIdx = monthNames.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
      if (monthIdx < 0) return null;
      return { monthIdx, year: parseInt(m[2], 10) };
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
      // no calendar markers elsewhere
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

        fetch('/api-activities-day?date=' + encodeURIComponent(date), { headers: { 'Accept': 'application/json' } })
          .then((r) => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then((data) => {
            const items = Array.isArray(data?.items) ? data.items : [];
            const bodyHtml = items.length === 0
              ? '<div class="pc-info"><div class="pc-info-row"><div class="pc-info-key">Info</div><div class="pc-info-val">No activities</div></div></div>'
              : `
                <div class="pc-activity-day-list">
                  ${items.map((a) => {
                    const startsAt = (a?.starts_at || '').toString();
                    const m = startsAt.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
                    const time = m ? m[2] : '—';
                    const cat = (a?.cat_name || '').toString().trim();
                    const title = (a?.title || '').toString().trim();
                    const desc = (a?.description || '').toString().trim();
                    const main = [title, desc].filter(Boolean).join(' — ') || '—';
                    return `
                      <div class="pc-activity-day-row">
                        <div class="pc-activity-day-time">${safeText(time)}</div>
                        <div class="pc-activity-day-main">
                          <div class="pc-activity-day-title">${safeText(main)}</div>
                          ${cat ? `<div class="pc-activity-day-sub">${safeText(cat)}</div>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `;

            openModal({
              title: `Activities (${date})`,
              bodyHtml,
              okText: 'OK',
              cancelText: 'Close',
            });
          })
          .catch(() => {
            openModal({
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

      fetch('/api-activities-calendar?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to), { headers: { 'Accept': 'application/json' } })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
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
          // ignore
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

      // Always render a 6-week grid (42 cells)
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

      // normalize to first of month
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

  (function initDashboardCats() {
    const host = document.querySelector('[data-dashboard-cats]');
    if (!host) return;

    fetch('/api-cats', { headers: { 'Accept': 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0) {
          host.innerHTML = '';
          return;
        }

        const top = items.slice(0, 4);
        host.innerHTML = top.map((c) => {
          const avatar = c.avatar_path || '/public/img/cat1.jpg';
          const meta = `${(c.breed || '—')} • ${(c.age ?? '—')}y`;
          return `
            <div class="card" data-dashboard-card="cat" data-cat-id="${safeText(c.id)}">
              <img src="${safeText(avatar)}" class="card-image">
              <div class="card-info">
                <div class="cat-user-name">${safeText(c.name)}</div>
                <div class="card-activity-info">${safeText(meta)}</div>
              </div>
            </div>
          `;
        }).join('');
      })
      .catch(() => {
        host.innerHTML = '';
      });
  })();

  (function initDashboardUsers() {
    const host = document.querySelector('[data-dashboard-users]');
    if (!host) return;

    // Only render when admin block is visible
    const wrapper = host.closest('[data-admin-only]');
    if (wrapper && wrapper.hidden) return;

    fetch('/api-users', { headers: { 'Accept': 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0) {
          host.innerHTML = '';
          return;
        }
        const top = items.slice(0, 4);
        host.innerHTML = top.map((u) => {
          const avatar = u.avatar_path || '/public/img/avatar.jpg';
          const sub = u.role ? `Role: ${safeText(u.role)}` : '';
          return `
            <div class="card" data-dashboard-card="user">
              <img src="${safeText(avatar)}" class="card-image">
              <div class="card-info">
                <div class="cat-user-name">${safeText(u.username)}</div>
                <div class="card-activity-info">${sub}</div>
              </div>
            </div>
          `;
        }).join('');
      })
      .catch(() => {
        host.innerHTML = '';
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
        host.innerHTML = '';
        return;
      }

      host.innerHTML = list.map((a) => {
        const title = (a?.title || '').toString().trim();
        const catName = (a?.cat_name || '').toString().trim();
        const text = [title, catName].filter(Boolean).join(' • ') || '—';
        return `
          <div class="activity-card">
            <div class="activity-icon">
              <i class="fa-solid fa-calendar-check"></i>
            </div>
            <div class="activity-info">
              <div class="activity-text">${safeText(text)}</div>
              <div class="activity-time">${safeText(formatWhen(a?.starts_at))}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    fetch('/api-dashboard-activities', { headers: { 'Accept': 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        render(data?.recent, recentHost);
        render(data?.planned, plannedHost);
      })
      .catch(() => {
        if (recentHost) recentHost.innerHTML = '';
        if (plannedHost) plannedHost.innerHTML = '';
      });
  })();

  function addCatFormHtml() {
    return `
      <form class="pc-form" data-modal-form method="POST" action="/cat-create" enctype="multipart/form-data">
        <div class="pc-field">
          <label>Name</label>
          <input class="pc-input" name="name" type="text" placeholder="e.g. Gilbert" required />
        </div>
        <div class="pc-grid-2">
          <div class="pc-field">
            <label>Age</label>
            <input class="pc-input" name="age" type="number" min="0" placeholder="e.g. 3" />
          </div>
          <div class="pc-field">
            <label>Breed</label>
            <input class="pc-input" name="breed" type="text" placeholder="e.g. Moggie" />
          </div>
        </div>
        <div class="pc-field">
          <label>Description</label>
          <textarea class="pc-textarea" name="description" placeholder="Short note about the cat..."></textarea>
        </div>
        <div class="pc-field">
          <label>Profile photo</label>
          <input class="pc-input" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" />
        </div>
      </form>
    `;
  }

  function editCatFormHtml(prefill) {
    return `
      <form class="pc-form" data-modal-form method="POST" action="/cat-update" enctype="multipart/form-data">
        <input type="hidden" name="cat_id" value="${safeText(prefill.id)}" />
        <div class="pc-field">
          <label>Name</label>
          <input class="pc-input" name="name" type="text" value="${safeText(prefill.name)}" required />
        </div>
        <div class="pc-grid-2">
          <div class="pc-field">
            <label>Age</label>
            <input class="pc-input" name="age" type="number" min="0" value="${safeText(prefill.age)}" />
          </div>
          <div class="pc-field">
            <label>Breed</label>
            <input class="pc-input" name="breed" type="text" value="${safeText(prefill.breed)}" placeholder="e.g. Moggie" />
          </div>
        </div>
        <div class="pc-field">
          <label>Description</label>
          <textarea class="pc-textarea" name="description" placeholder="Short note...">${safeText(prefill.description)}</textarea>
        </div>
        <div class="pc-field">
          <label>Change profile photo</label>
          <input class="pc-input" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" />
        </div>
      </form>
    `;
  }

  function activityFormHtml() {
    return `
      <form class="pc-form" data-modal-form method="POST" action="/activity-create">
        <input type="hidden" name="cat_id" value="${safeText(getCatIdFromUrl())}" />
        <div class="pc-field">
          <label>What (CO)</label>
          <input class="pc-input" name="title" type="text" placeholder="e.g. Feeding" required />
        </div>
        <div class="pc-field">
          <label>Description</label>
          <textarea class="pc-textarea" name="description" placeholder="Short description..."></textarea>
        </div>
        <div class="pc-grid-2">
          <div class="pc-field">
            <label>Date</label>
            <input class="pc-input" name="date" type="date" required />
          </div>
          <div class="pc-field">
            <label>Time</label>
            <input class="pc-input" name="time" type="time" required />
          </div>
        </div>
      </form>
    `;
  }

  function parseStartsAtParts(startsAt) {
    const raw = (startsAt ?? '').toString().trim();
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    if (m) return { date: m[1], time: m[2] };
    return { date: '', time: '' };
  }

  function activityEditFormHtml(prefill) {
    return `
      <form class="pc-form" data-modal-form method="POST" action="/activity-update">
        <input type="hidden" name="activity_id" value="${safeText(prefill.activityId)}" />
        <input type="hidden" name="cat_id" value="${safeText(prefill.catId)}" />
        <div class="pc-field">
          <label>What (CO)</label>
          <input class="pc-input" name="title" type="text" value="${safeText(prefill.title)}" required />
        </div>
        <div class="pc-field">
          <label>Description</label>
          <textarea class="pc-textarea" name="description" placeholder="Short description...">${safeText(prefill.description)}</textarea>
        </div>
        <div class="pc-grid-2">
          <div class="pc-field">
            <label>Date</label>
            <input class="pc-input" name="date" type="date" value="${safeText(prefill.date)}" required />
          </div>
          <div class="pc-field">
            <label>Time</label>
            <input class="pc-input" name="time" type="time" value="${safeText(prefill.time)}" required />
          </div>
        </div>
      </form>
    `;
  }

  function filtersHtml(kindLabel) {
    return `
      <div class="pc-form">
        <div class="pc-field">
          <label>${kindLabel} - choose something</label>
          <select class="pc-select">
            <option>All</option>
            <option>Only Gilbert</option>
            <option>Only user1</option>
          </select>
        </div>
        <div class="pc-field">
          <label>
            <input type="checkbox" /> Show only planned
          </label>
          <label>
            <input type="checkbox" /> Show only done
          </label>
        </div>
      </div>
    `;
  }

  function addUserFormHtml(prefill) {
    return `
      <form class="pc-form" onsubmit="return false;">
        <div class="pc-grid-2">
          <div class="pc-field">
            <label>First name</label>
            <input class="pc-input" type="text" value="${safeText(prefill.firstName)}" placeholder="e.g. Jan" />
          </div>
          <div class="pc-field">
            <label>Last name</label>
            <input class="pc-input" type="text" value="${safeText(prefill.lastName)}" placeholder="e.g. Kowalski" />
          </div>
        </div>
        <div class="pc-field">
          <label>Email</label>
          <input class="pc-input" type="email" value="${safeText(prefill.email)}" placeholder="e.g. jan@purrfect.care" />
        </div>
        <div class="pc-field">
          <label>Role</label>
          <select class="pc-select">
            <option>Caregiver</option>
            <option>Owner</option>
            <option>Admin</option>
          </select>
        </div>
      </form>
    `;
  }

  function catInfoHtml(fromCard) {
    return `
      <div class="pc-info">
        <div class="pc-info-row">
          <div class="pc-info-key">Name</div>
          <div class="pc-info-val">${safeText(fromCard.name)}</div>
        </div>
        <div class="pc-info-row">
          <div class="pc-info-key">Meta</div>
          <div class="pc-info-val">${safeText(fromCard.meta)}</div>
        </div>
        <div class="pc-info-row">
          <div class="pc-info-key">Description</div>
          <div class="pc-info-val">${safeText(fromCard.description)}</div>
        </div>
      </div>
    `;
  }

  function getCatInfoFromCard(cardEl) {
    if (!cardEl) return { name: '', meta: '', description: '' };
    const name = cardEl.querySelector('.cat-name')?.textContent?.trim();
    const meta = cardEl.querySelector('.cat-meta')?.textContent?.trim();
    const description = cardEl.querySelector('.cat-description')?.textContent?.trim();
    return { name, meta, description };
  }

  function getCatPrefillFromDetailsPage() {
    const name = document.querySelector('.left-container .cat-name')?.textContent?.trim();
    const ageText = document.querySelector('.left-container .cat-age')?.textContent?.trim();
    const breed = document.querySelector('.left-container .cat-breed')?.textContent?.trim();
    const description = document.querySelector('[data-cat-description]')?.textContent?.trim();
    const age = (ageText ?? '').match(/(\d+)/)?.[1] ?? '';
    return {
      id: getCatIdFromUrl(),
      name: name ?? '',
      age: age ?? '',
      breed: breed ?? '',
      description: description ?? '',
    };
  }

  function getUserPrefillFromSettings(userEl) {
    const userName = userEl?.querySelector('.user-name')?.textContent?.trim() ?? '';
    return {
      firstName: userName,
      lastName: '',
      email: '',
    };
  }

  (function initSettingsCats() {
    if (window.location.pathname !== '/settings') return;
    const host = document.querySelector('[data-settings-cats]');
    if (!host) return;

    fetch('/api-cats', { headers: { 'Accept': 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0) {
          host.innerHTML = '';
          return;
        }

        host.innerHTML = items.map((c) => {
          const name = (c?.name ?? '').toString().trim() || '—';
          const breed = (c?.breed ?? '').toString().trim();
          const age = (c?.age ?? '').toString().trim();
          const meta = [breed ? `${breed} cat` : '', age ? `${age} year` : ''].filter(Boolean).join(' • ');
          const avatar = (c?.avatar_path ?? '').toString().trim() || '/public/img/avatar.jpg';

          return `
            <div class="single-user">
              <img src="${safeText(avatar)}" class="user-avatar">
              <div class="user-description">
                <div>
                  <div class="user-name">${safeText(name)}</div>
                  ${meta ? `<div class="pc-cat-meta">${safeText(meta)}</div>` : ''}
                </div>
                <div class="user-icons">
                  <form class="pc-inline-form" method="POST" action="/cat-delete" data-cat-delete data-cat-name="${safeText(c?.name)}">
                    <input type="hidden" name="cat_id" value="${safeText(c?.id)}" />
                    <button class="pc-icon-link" type="submit" aria-label="Delete">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </form>
                  <a href="#" data-modal-open="edit-cat-settings"
                    data-cat-id="${safeText(c?.id)}"
                    data-cat-name="${safeText(c?.name)}"
                    data-cat-age="${safeText(c?.age)}"
                    data-cat-breed="${safeText(c?.breed)}"
                    data-cat-description="${safeText(c?.description)}"
                    aria-label="Edit">
                    <i class="fa-solid fa-pen"></i>
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('');
      })
      .catch(() => {
        host.innerHTML = '';
      });
  })();

  document.addEventListener('submit', (e) => {
    const form = e.target?.closest?.('form[data-cat-delete]');
    if (!form) return;

    e.preventDefault();
    const rawName = (form.getAttribute('data-cat-name') || '').trim();
    const name = rawName || 'this cat';

    openModal({
      title: 'Confirm deletion',
      bodyHtml: `
        <div class="pc-info">
          <div class="pc-info-row">
            <div class="pc-info-key">Question</div>
            <div class="pc-info-val">Are you sure you want to delete ${safeText(name)}?</div>
          </div>
        </div>
      `,
      okText: 'Delete',
      cancelText: 'Cancel',
      onOkCb: () => form.submit(),
    });
  });

  document.addEventListener('click', (e) => {
    // Dashboard cards navigation
    const dashboardCard = e.target.closest('.card[data-dashboard-card]');
    if (dashboardCard) {
      e.preventDefault();
      const type = dashboardCard.getAttribute('data-dashboard-card');
      if (type === 'cat') {
        const catId = dashboardCard.getAttribute('data-cat-id') || '';
        go('/details' + (catId ? `?cat_id=${encodeURIComponent(catId)}` : ''));
        return;
      }
      if (type === 'user') {
        const username = getUserFromCard(dashboardCard);
        go('/profile' + (username ? `?username=${encodeURIComponent(username)}` : ''));
        return;
      }
    }

    // Cats page: action buttons
    const catsMoreInfo = e.target.closest('.icon-btn[title="More Info"]');
    if (catsMoreInfo && catsMoreInfo.closest('.cat-card')) {
      e.preventDefault();
      const card = catsMoreInfo.closest('.cat-card');
      const catId = card?.getAttribute('data-cat-id') || '';
      go('/details' + (catId ? `?cat_id=${encodeURIComponent(catId)}` : ''));
      return;
    }

    const catsHealth = e.target.closest('.icon-btn[title="Health Logs"]');
    if (catsHealth && catsHealth.closest('.cat-card')) {
      e.preventDefault();
      go('/logs');
      return;
    }

    const catsEdit = e.target.closest('.icon-btn[title="Edit Profile"]');
    if (catsEdit && catsEdit.closest('.cat-card')) {
      e.preventDefault();
      const card = catsEdit.closest('.cat-card');
      const name = card.querySelector('.cat-name')?.textContent?.trim() ?? '';
      const meta = card.querySelector('.cat-meta')?.textContent?.trim() ?? '';
      const description = card.querySelector('.cat-description')?.textContent?.trim() ?? '';

      const age = (meta.match(/(\d+)\s*year/i)?.[1] ?? '').trim();
      const breed = (meta.split('•')[0] ?? '').replace(/\s*cat\s*$/i, '').trim();

      openModal({
        title: 'Edit cat',
        bodyHtml: editCatFormHtml({
          id: card.getAttribute('data-cat-id') || '',
          name,
          age,
          breed,
          description,
        }),
        okText: 'Save',
        cancelText: 'Cancel',
      });
      return;
    }

    let trigger = e.target.closest('[data-modal-open]');
    let kind = trigger?.getAttribute('data-modal-open');

    if (!trigger) return;
    e.preventDefault();

    if (kind === 'add-cat') {
      openModal({
        title: 'Add cat',
        bodyHtml: addCatFormHtml(),
        okText: 'Save',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'schedule-filters') {
      openModal({
        title: 'Schedule filters',
        bodyHtml: filtersHtml('Filters'),
        okText: 'Apply',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'schedule-options') {
      openModal({
        title: 'Schedule options',
        bodyHtml: filtersHtml('Options'),
        okText: 'Save',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'logs-filters') {
      openModal({
        title: 'Logs filters',
        bodyHtml: filtersHtml('Filters'),
        okText: 'Apply',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'logs-options') {
      openModal({
        title: 'Logs options',
        bodyHtml: filtersHtml('Options'),
        okText: 'Save',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'edit-cat') {
      const prefill = getCatPrefillFromDetailsPage();
      openModal({
        title: 'Edit cat',
        bodyHtml: editCatFormHtml(prefill),
        okText: 'Save',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'edit-cat-settings') {
      openModal({
        title: 'Edit cat',
        bodyHtml: editCatFormHtml({
          id: trigger.getAttribute('data-cat-id') || '',
          name: trigger.getAttribute('data-cat-name') || '',
          age: trigger.getAttribute('data-cat-age') || '',
          breed: trigger.getAttribute('data-cat-breed') || '',
          description: trigger.getAttribute('data-cat-description') || '',
        }),
        okText: 'Save',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'add-activity') {
      openModal({
        title: 'Add activity',
        bodyHtml: activityFormHtml(),
        okText: 'Add',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'edit-activity') {
      const startsAt = trigger.getAttribute('data-activity-starts-at') || '';
      const parts = parseStartsAtParts(startsAt);
      const catIdFromTrigger = trigger.getAttribute('data-activity-cat-id') || '';
      openModal({
        title: 'Edit activity',
        bodyHtml: activityEditFormHtml({
          activityId: trigger.getAttribute('data-activity-id') || '',
          catId: catIdFromTrigger || getCatIdFromUrl(),
          title: trigger.getAttribute('data-activity-title') || '',
          description: trigger.getAttribute('data-activity-description') || '',
          date: parts.date,
          time: parts.time,
        }),
        okText: 'Save',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'add-user') {
      openModal({
        title: 'Add user',
        bodyHtml: addUserFormHtml({}),
        okText: 'OK',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'edit-user') {
      const userEl = trigger.closest('.single-user');
      const prefill = getUserPrefillFromSettings(userEl);
      openModal({
        title: 'Edit user',
        bodyHtml: addUserFormHtml(prefill),
        okText: 'Save',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'profile-edit') {
      const usernameEl = document.querySelector('[data-profile-username]');
      const fullNameEl = document.querySelector('[data-profile-fullname]');
      const emailEl = document.querySelector('[data-profile-email]');
      openModal({
        title: 'Edit profile',
        bodyHtml: `
          <form class="pc-form" onsubmit="return false;">
            <div class="pc-field">
              <label>Username</label>
              <input class="pc-input" type="text" value="${safeText(usernameEl?.textContent?.trim())}" />
            </div>
            <div class="pc-grid-2">
              <div class="pc-field">
                <label>First name</label>
                <input class="pc-input" type="text" value="${safeText((fullNameEl?.textContent?.trim() || '').split(' ')[0] || '')}" />
              </div>
              <div class="pc-field">
                <label>Last name</label>
                <input class="pc-input" type="text" value="${safeText((fullNameEl?.textContent?.trim() || '').split(' ').slice(1).join(' '))}" />
              </div>
            </div>
            <div class="pc-field">
              <label>Email</label>
              <input class="pc-input" type="email" value="${safeText(emailEl?.textContent?.trim())}" />
            </div>
          </form>
        `,
        okText: 'Save',
        cancelText: 'Cancel',
        onOkCb: () => {
          const inputs = overlay.querySelectorAll('input');
          const nextUsername = inputs[0]?.value?.trim() || '—';
          const nextFirst = inputs[1]?.value?.trim() || '';
          const nextLast = inputs[2]?.value?.trim() || '';
          const nextEmail = inputs[3]?.value?.trim() || '—';
          if (usernameEl) usernameEl.textContent = nextUsername;
          if (fullNameEl) fullNameEl.textContent = `${nextFirst} ${nextLast}`.trim() || '—';
          if (emailEl) emailEl.textContent = nextEmail;
        },
      });
      return;
    }

    if (kind === 'profile-password') {
      openModal({
        title: 'Change password',
        bodyHtml: `
          <form class="pc-form" onsubmit="return false;">
            <div class="pc-field">
              <label>Old password</label>
              <input class="pc-input" type="password" placeholder="••••••••" />
            </div>
            <div class="pc-field">
              <label>New password</label>
              <input class="pc-input" type="password" placeholder="••••••••" />
            </div>
          </form>
          <div class="pc-info" style="margin-top: 10px;">
            <div class="pc-info-key">Note</div>
            <div class="pc-info-val">UI only (no backend yet)</div>
          </div>
        `,
        okText: 'OK',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'caregivers-assign') {
      openModal({
        title: 'Assign caregiver',
        bodyHtml: `
          <form class="pc-form" onsubmit="return false;">
            <div class="pc-field">
              <label>Cat</label>
              <select class="pc-select">
                <option>Gilbert</option>
                <option>Żaneta</option>
                <option>Albert</option>
              </select>
            </div>
            <div class="pc-field">
              <label>Caregiver</label>
              <select class="pc-select">
                <option>user1</option>
                <option>user2</option>
                <option>user3</option>
              </select>
            </div>
          </form>
        `,
        okText: 'OK',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'caregivers-manage') {
      const row = trigger.closest('.assignment-row');
      const catName = row?.children?.[0]?.textContent?.trim() ?? '—';
      const caregiversCell = row?.children?.[2];
      const currentRaw = caregiversCell?.textContent?.trim() ?? '';
      let current = currentRaw === '—' || currentRaw === '' ? [] : currentRaw.split(',').map((x) => x.trim()).filter(Boolean);

      function renderList() {
        const list = overlay.querySelector('[data-caregivers-list]');
        if (!list) return;
        list.innerHTML = '';
        if (current.length === 0) {
          list.innerHTML = '<div class="hint">No caregivers assigned.</div>';
          return;
        }
        current.forEach((name, idx) => {
          const item = document.createElement('div');
          item.style.display = 'flex';
          item.style.gap = '10px';
          item.style.alignItems = 'center';
          item.style.justifyContent = 'space-between';
          item.innerHTML = `
            <div>${safeText(name)}</div>
            <button class="pc-btn pc-btn-secondary" type="button" data-remove-caregiver="${idx}">Remove</button>
          `;
          list.appendChild(item);
        });
      }

      openModal({
        title: 'Manage caregivers',
        bodyHtml: `
          <div class="pc-info">
            <div class="pc-info-row">
              <div class="pc-info-key">Cat</div>
              <div class="pc-info-val">${safeText(catName)}</div>
            </div>
          </div>
          <div style="height: 10px;"></div>
          <div data-caregivers-list></div>
          <div style="height: 10px;"></div>
          <form class="pc-form" onsubmit="return false;">
            <div class="pc-field">
              <label>Add caregiver</label>
              <div style="display:flex; gap: 10px;">
                <select class="pc-select" data-caregiver-add>
                  <option value="">— choose —</option>
                  <option value="user1">user1</option>
                  <option value="user2">user2</option>
                  <option value="user3">user3</option>
                  <option value="user4">user4</option>
                </select>
                <button class="pc-btn pc-btn-primary" type="button" data-caregiver-add-btn>Add</button>
              </div>
            </div>
          </form>
        `,
        okText: 'Save',
        cancelText: 'Cancel',
        onOkCb: () => {
          if (caregiversCell) caregiversCell.textContent = current.length ? current.join(', ') : '—';
        },
      });

      renderList();

      overlay.addEventListener('click', (ev) => {
        const removeBtn = ev.target.closest('[data-remove-caregiver]');
        if (removeBtn) {
          const idx = parseInt(removeBtn.getAttribute('data-remove-caregiver') || '-1', 10);
          if (!Number.isNaN(idx) && idx >= 0) {
            current.splice(idx, 1);
            renderList();
          }
          return;
        }
        const addBtn = ev.target.closest('[data-caregiver-add-btn]');
        if (addBtn) {
          const sel = overlay.querySelector('[data-caregiver-add]');
          const val = sel?.value?.trim();
          if (val && !current.includes(val)) {
            current.push(val);
            renderList();
          }
        }
      }, { once: true });
      return;
    }

    if (kind === 'reports-generate') {
      openModal({
        title: 'Generate report',
        bodyHtml: `
          <form class="pc-form" onsubmit="return false;">
            <div class="pc-grid-2">
              <div class="pc-field">
                <label>From</label>
                <input class="pc-input" type="date" />
              </div>
              <div class="pc-field">
                <label>To</label>
                <input class="pc-input" type="date" />
              </div>
            </div>
            <div class="pc-field">
              <label>Type</label>
              <select class="pc-select">
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Activities</option>
                <option>Logs</option>
              </select>
            </div>
          </form>
        `,
        okText: 'OK',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'help-contact') {
      openModal({
        title: 'Contact',
        bodyHtml: `
          <form class="pc-form" data-modal-form method="POST" action="/support-create">
            <div class="pc-field">
              <label>Topic</label>
              <select class="pc-select" name="topic" required>
                <option value="Problem">Problem</option>
                <option value="Message">Message</option>
              </select>
            </div>
            <div class="pc-field">
              <label>Message</label>
              <textarea class="pc-textarea" name="message" placeholder="Write here..." required></textarea>
            </div>
          </form>
        `,
        okText: 'Send',
        cancelText: 'Cancel',
      });
    }
  });

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
        const catId = getCatIdFromUrl();
        const items = Array.from(grid.querySelectorAll('.singlepicture')).map((wrap) => ({
          id: wrap.getAttribute('data-photo-id') || '',
          src: wrap.querySelector('img')?.getAttribute('src') || ''
        })).filter((x) => x.src);
        openModal({
          title: 'Manage gallery',
          bodyHtml: `
            <div class="hint">UI: remove/reorder works locally. Upload is separate.</div>
            <div data-gallery-list></div>
          `,
          okText: 'Done',
          cancelText: 'Close',
          onOkCb: () => {
            // Rebuild DOM order according to list
            const list = overlay.querySelector('[data-gallery-list]');
            const orderIds = Array.from(list?.querySelectorAll('[data-photo-id]') || []).map((el) => el.getAttribute('data-photo-id') || '').filter(Boolean);
            const order = Array.from(list?.querySelectorAll('[data-photo-id]') || []).map((el) => ({
              id: el.getAttribute('data-photo-id') || '',
              src: el.getAttribute('data-gallery-src') || ''
            })).filter((x) => x.src);
            if (order.length === 0) return;
            grid.innerHTML = order.map((x) => `
              <div class="singlepicture" data-photo-id="${safeText(x.id)}"><img src="${safeText(x.src)}" class="cat-image"></div>
            `).join('');
            applyVisibility();

            if (catId && orderIds.length > 0) {
              const form = new URLSearchParams();
              form.set('cat_id', catId);
              orderIds.forEach((id) => form.append('order[]', id));
              fetch('/cat-photos-reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form.toString(),
              }).catch(() => {});
            }
          },
        });

        const list = overlay.querySelector('[data-gallery-list]');
        if (!list) return;
        list.innerHTML = items.map((x, idx) => `
          <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; margin: 8px 0;" data-photo-id="${safeText(x.id)}" data-gallery-src="${safeText(x.src)}">
            <div style="display:flex; gap:10px; align-items:center;">
              <img src="${safeText(x.src)}" style="width:44px; height:44px; object-fit:cover; border-radius:8px;" />
              <div>Photo ${idx + 1}</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="pc-btn pc-btn-secondary" type="button" data-gallery-up>Up</button>
              <button class="pc-btn pc-btn-secondary" type="button" data-gallery-down>Down</button>
              <button class="pc-btn pc-btn-secondary" type="button" data-gallery-remove>Remove</button>
            </div>
          </div>
        `).join('');

        list.addEventListener('click', (ev) => {
          const row = ev.target.closest('[data-photo-id]');
          if (!row) return;
          if (ev.target.closest('[data-gallery-remove]')) {
            const catId = getCatIdFromUrl();
            const photoId = row.getAttribute('data-photo-id') || '';
            row.remove();
            if (catId && photoId) {
              const form = new URLSearchParams();
              form.set('cat_id', catId);
              form.set('photo_id', photoId);
              fetch('/cat-photo-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form.toString(),
              }).catch(() => {});
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

  (function initReportsTickets() {
    const host = document.querySelector('[data-support-tickets]');
    if (!host) return;

    fetch('/support-list', { headers: { 'Accept': 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0) {
          host.innerHTML = '<div class="hint">No problems yet.</div>';
          return;
        }
        host.innerHTML = `
          <div class="logs-table" style="margin-top:10px;">
            <table>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Email</th>
                <th>Topic</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
              ${items.map((x) => `
                <tr>
                  <td>${safeText(x.created_at)}</td>
                  <td>${safeText(x.username)}</td>
                  <td>${safeText(x.email)}</td>
                  <td>${safeText(x.topic)}</td>
                  <td>${safeText(x.message)}</td>
                  <td>${safeText(x.status)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        `;
      })
      .catch(() => {
        host.innerHTML = '<div class="hint">No access (admin only) or server unavailable.</div>';
      });
  })();

  (function initCatsPageData() {
    const host = document.querySelector('.cat-cards');
    if (!host) return;

    fetch('/api-cats', { headers: { 'Accept': 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0) {
          host.innerHTML = '<div class="hint">No cats yet. Click Add cat.</div>';
          return;
        }

        host.innerHTML = items.map((c) => {
          const ageLabel = (c.age === null || c.age === undefined || c.age === '') ? '—' : `${safeText(c.age)} year old`;
          const breedLabel = (c.breed || '').trim() ? safeText(c.breed) : 'unknown breed';
          const avatar = c.avatar_path || '/public/img/cat1.jpg';
          const desc = c.description || '';
          return `
            <div class="cat-card" data-cat-id="${safeText(c.id)}">
              <div class="cat-image-wrapper">
                <img src="${safeText(avatar)}" class="cat-image">
              </div>
              <h3 class="cat-name">${safeText(c.name)}</h3>
              <div class="cat-meta">
                ${breedLabel} <span>•</span> ${ageLabel} <span>•</span> 0 notifications
              </div>
              <p class="cat-description">${safeText(desc)}</p>
              <div class="cat-actions">
                <button class="icon-btn" title="More Info">
                  <i class="fas fa-info-circle"></i>
                </button>
                <button class="icon-btn" title="Edit Profile">
                  <i class="fas fa-pen"></i>
                </button>
                <button class="icon-btn" title="Health Logs">
                  <i class="fas fa-clipboard-list"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');
      })
      .catch(() => {
        host.innerHTML = '<div class="hint">Cannot load cats (not logged in?).</div>';
      });
  })();

  (function initDetailsPageData() {
    const detailsRoot = document.querySelector('.left-container');
    if (!detailsRoot) return;

    const catId = getCatIdFromUrl();
    if (!catId) return;

    fetch('/api-cat?cat_id=' + encodeURIComponent(catId), { headers: { 'Accept': 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        const c = data?.item;
        if (!c) return;
        const nameEl = document.querySelector('.left-container .cat-name');
        const breedEl = document.querySelector('.left-container .cat-breed');
        const ageEl = document.querySelector('.left-container .cat-age');
        const descEl = document.querySelector('[data-cat-description]');
        const imgEl = document.querySelector('.left-container .cat-description-image img');

        if (nameEl) nameEl.textContent = c.name || '—';
        if (breedEl) breedEl.textContent = c.breed || '—';
        if (ageEl) ageEl.textContent = 'Age: ' + (c.age ?? '—') + ' years';
        if (descEl) descEl.textContent = c.description || '';
        if (imgEl && c.avatar_path) imgEl.src = c.avatar_path;
      })
      .catch(() => {
        // no-op
      });

    // Load gallery from DB
    fetch('/api-cat-photos?cat_id=' + encodeURIComponent(catId), { headers: { 'Accept': 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        const grid = document.querySelector('.all-images');
        if (!grid) return;
        if (items.length === 0) return;
        grid.innerHTML = items.map((p) => `
          <div class="singlepicture" data-photo-id="${safeText(p.id)}"><img src="${safeText(p.path)}" class="cat-image"></div>
        `).join('');
      })
      .catch(() => {
        // no-op
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

      fetch('/api-cat-activities?cat_id=' + encodeURIComponent(catId), { headers: { 'Accept': 'application/json' } })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then((data) => {
          const items = Array.isArray(data?.items) ? data.items : [];
          if (items.length === 0) {
            host.innerHTML = '';
            return;
          }

          host.innerHTML = items.map((a) => {
            const title = (a?.title || '').toString().trim() || '—';
            const desc = (a?.description || '').toString().trim();
            const startsAt = (a?.starts_at || '').toString();
            return `
              <div class="cat-detail-card">
                <div class="lewa">
                  <h1>${safeText(title)}</h1>
                  <p>${safeText(desc)}</p>
                </div>
                <div class="srodek">
                  ${safeText(formatWhen(startsAt))}
                </div>
                <div class="prawa">
                  <button class="pc-icon-btn" type="button" title="Edit" data-modal-open="edit-activity"
                    data-activity-id="${safeText(a?.id)}"
                    data-activity-title="${safeText(title)}"
                    data-activity-description="${safeText(desc)}"
                    data-activity-starts-at="${safeText(startsAt)}">
                    <i class="fa-solid fa-ellipsis"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('');
        })
        .catch(() => {
          host.innerHTML = '';
        });
    })();
  })();

  (function initLogsPage() {
    if (window.location.pathname !== '/logs') return;

    const table = document.querySelector('table[data-logs-table]');
    if (!table) return;

    const input = document.querySelector('.search-panel .search-input');
    const btn = document.querySelector('.search-panel .search-btn');

    let filters = {
      cat_name: '',
      username: '',
      q: '',
      // logs = executed-ish
      past: true,
    };

    function formatWhenForLogs(startsAt) {
      const raw = (startsAt ?? '').toString().trim();
      const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})/);
      if (m) return `${m[4]}<br>${m[3]}-${m[2]}-${m[1]}`;
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString() + '<br>' + d.toLocaleDateString();
      }
      return safeText(raw || '—');
    }

    function clearRows() {
      const rows = Array.from(table.querySelectorAll('tr'));
      rows.slice(1).forEach((r) => r.remove());
    }

    function buildQuery() {
      const p = new URLSearchParams();
      if (filters.q) p.set('q', filters.q);
      if (filters.cat_name) p.set('cat_name', filters.cat_name);
      if (filters.username) p.set('username', filters.username);
      if (filters.past) p.set('past', '1');
      // Treat logs as done-like: past activities excluding cancelled handled server-side by past=1
      return p.toString();
    }

    function render(items) {
      clearRows();
      const list = Array.isArray(items) ? items : [];
      if (list.length === 0) return;

      list.forEach((a, idx) => {
        const avatar = a?.cat_avatar_path || '/public/img/cat1.jpg';
        const catName = (a?.cat_name || '').toString().trim() || '—';
        const userName = (a?.created_by_username || '').toString().trim() || '—';
        const title = (a?.title || '').toString().trim() || '—';
        const desc = (a?.description || '').toString().trim();
        const whenHtml = formatWhenForLogs(a?.starts_at);

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><img src="${safeText(avatar)}" alt="cat-img"></td>
          <td>${safeText(catName)}</td>
          <td>${safeText(userName)}</td>
          <td>${safeText(title)}</td>
          <td>${safeText(desc)}</td>
          <td><time datetime="${safeText(a?.starts_at)}">${whenHtml}</time></td>
        `;
        table.appendChild(tr);
      });
    }

    function load() {
      fetch('/api-activities?' + buildQuery(), { headers: { 'Accept': 'application/json' } })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then((data) => {
          // client-side: keep only past + not cancelled (done-like)
          const items = Array.isArray(data?.items) ? data.items : [];
          const filtered = items.filter((x) => (x?.status || '') !== 'cancelled');
          render(filtered);
        })
        .catch(() => {
          clearRows();
        });
    }

    function parseFilterModal(modalRoot) {
      const select = modalRoot?.querySelector('select');
      const onlyPlanned = modalRoot?.querySelectorAll('input[type="checkbox"]')?.[0]?.checked;
      const onlyDone = modalRoot?.querySelectorAll('input[type="checkbox"]')?.[1]?.checked;
      const pick = (select?.value || '').toString();

      // Reset
      filters.cat_name = '';
      filters.username = '';

      if (/only\s+gilbert/i.test(pick)) filters.cat_name = 'Gilbert';
      if (/only\s+user1/i.test(pick)) filters.username = 'user1';

      // On logs, checkbox meaning: done-like only (past). planned-only would be nonsensical -> ignore.
      filters.past = true;
      if (onlyPlanned && !onlyDone) {
        // keep past anyway; no-op
        filters.past = true;
      }
    }

    // Wire up search
    if (btn) {
      btn.addEventListener('click', () => {
        filters.q = (input?.value || '').toString().trim();
        load();
      });
    }
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          filters.q = (input?.value || '').toString().trim();
          load();
        }
      });
    }

    // Hook into modal OK: when logs-filters is open, read choices and reload
    const originalOkHandler = okBtn.onclick;
    // We can't rely on onclick (listeners use addEventListener), so we patch via capturing click on OK button
    okBtn.addEventListener('click', () => {
      if (overlay.hidden) return;
      const title = titleEl?.textContent || '';
      if (/logs\s+filters/i.test(title)) {
        parseFilterModal(overlay);
        // allow submit logic to run, then refresh
        setTimeout(load, 0);
      }
    });

    load();
  })();

  (function initSchedulePage() {
    if (window.location.pathname !== '/schedule') return;

    const table = document.querySelector('table[data-schedule-table]');
    if (!table) return;

    const input = document.querySelector('.search-panel .search-input');
    const btn = document.querySelector('.search-panel .search-btn');

    let filters = {
      cat_name: '',
      q: '',
      future: true,
    };

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
      if (filters.future) p.set('future', '1');
      if (filters.q) p.set('q', filters.q);
      if (filters.cat_name) p.set('cat_name', filters.cat_name);
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
        const desc = (a?.description || '').toString().trim() || '';
        const whenText = formatWhen(a?.starts_at);
        const catId = (a?.cat_id || '').toString();

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><img src="${safeText(avatar)}" alt="cat-img"></td>
          <td>${safeText(catName)}</td>
          <td>${safeText(title)}</td>
          <td>Details</td>
          <td><time datetime="${safeText(a?.starts_at)}">${safeText(whenText)}</time></td>
          <td>
            <button class="pc-icon-btn" type="button" title="Edit" data-modal-open="edit-activity"
              data-activity-id="${safeText(a?.id)}"
              data-activity-cat-id="${safeText(catId)}"
              data-activity-title="${safeText(title)}"
              data-activity-description="${safeText(desc)}"
              data-activity-starts-at="${safeText(a?.starts_at)}">
              <i class="fa-solid fa-ellipsis"></i>
            </button>
          </td>
        `;
        table.appendChild(tr);
      });
    }

    function load() {
      fetch('/api-activities?' + buildQuery(), { headers: { 'Accept': 'application/json' } })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then((data) => {
          render(data?.items);
        })
        .catch(() => {
          clearRows();
        });
    }

    function parseFilterModal(modalRoot) {
      const select = modalRoot?.querySelector('select');
      const onlyPlanned = modalRoot?.querySelectorAll('input[type="checkbox"]')?.[0]?.checked;
      const onlyDone = modalRoot?.querySelectorAll('input[type="checkbox"]')?.[1]?.checked;
      const pick = (select?.value || '').toString();

      // Reset
      filters.cat_name = '';
      if (/only\s+gilbert/i.test(pick)) filters.cat_name = 'Gilbert';

      // Schedule should be planned future
      filters.future = true;
      if (onlyDone && !onlyPlanned) {
        // If user picked "done" here, keep planned list anyway (UI is generic)
        filters.future = true;
      }
    }

    if (btn) {
      btn.addEventListener('click', () => {
        filters.q = (input?.value || '').toString().trim();
        load();
      });
    }
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          filters.q = (input?.value || '').toString().trim();
          load();
        }
      });
    }

    okBtn.addEventListener('click', () => {
      if (overlay.hidden) return;
      const title = titleEl?.textContent || '';
      if (/schedule\s+filters/i.test(title)) {
        parseFilterModal(overlay);
        setTimeout(load, 0);
      }
    });

    load();
  })();
});
  