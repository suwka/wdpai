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

    function renderMonth(container, year, monthIdx) {
      const label = container.querySelector('.calendar-month');
      const daysEl = container.querySelector('.calendar-days');
      if (!label || !daysEl) return;

      label.textContent = `${monthNames[monthIdx]} ${year}`;
      daysEl.innerHTML = '';

      const firstOfMonth = new Date(year, monthIdx, 1);
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const startOffset = toMondayIndex(firstOfMonth.getDay());

      const prevMonthDays = new Date(year, monthIdx, 0).getDate();
      const today = new Date();
      const isThisMonth = today.getFullYear() === year && today.getMonth() === monthIdx;

      for (let i = 0; i < startOffset; i++) {
        const dayNum = prevMonthDays - (startOffset - 1 - i);
        const d = document.createElement('div');
        d.className = 'day other-month';
        d.textContent = String(dayNum);
        daysEl.appendChild(d);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const d = document.createElement('div');
        d.className = 'day';
        d.textContent = String(day);
        if (isThisMonth && day === today.getDate()) d.classList.add('today');
        daysEl.appendChild(d);
      }

      const total = startOffset + daysInMonth;
      const trailing = (7 - (total % 7)) % 7;
      for (let i = 1; i <= trailing; i++) {
        const d = document.createElement('div');
        d.className = 'day other-month';
        d.textContent = String(i);
        daysEl.appendChild(d);
      }
    }

    containers.forEach((container) => {
      const label = container.querySelector('.calendar-month');
      const parsed = parseMonthLabel(label?.textContent ?? '');
      const base = parsed ? new Date(parsed.year, parsed.monthIdx, 1) : new Date();

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
      <form class="pc-form" onsubmit="return false;">
        <div class="pc-field">
          <label>What (CO)</label>
          <input class="pc-input" type="text" placeholder="e.g. Feeding" />
        </div>
        <div class="pc-field">
          <label>Description</label>
          <textarea class="pc-textarea" placeholder="Short description..."></textarea>
        </div>
        <div class="pc-grid-2">
          <div class="pc-field">
            <label>Date</label>
            <input class="pc-input" type="date" />
          </div>
          <div class="pc-field">
            <label>Time</label>
            <input class="pc-input" type="time" />
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

    if (kind === 'add-activity') {
      openModal({
        title: 'Add activity',
        bodyHtml: activityFormHtml(),
        okText: 'Add',
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
  })();
});
  