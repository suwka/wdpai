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

  function addCatFormHtml() {
    return `
      <form class="pc-form" onsubmit="return false;">
        <div class="pc-field">
          <label>Name</label>
          <input class="pc-input" type="text" placeholder="e.g. Gilbert" />
        </div>
        <div class="pc-grid-2">
          <div class="pc-field">
            <label>Age</label>
            <input class="pc-input" type="number" min="0" placeholder="e.g. 3" />
          </div>
          <div class="pc-field">
            <label>Breed</label>
            <input class="pc-input" type="text" placeholder="e.g. Moggie" />
          </div>
        </div>
        <div class="pc-grid-2">
          <div class="pc-field">
            <label>Owner</label>
            <input class="pc-input" type="text" placeholder="e.g. user1" />
          </div>
          <div class="pc-field">
            <label>Assigned users</label>
            <input class="pc-input" type="text" placeholder="e.g. user2, user3" />
          </div>
        </div>
        <div class="pc-field">
          <label>Description</label>
          <textarea class="pc-textarea" placeholder="Short note about the cat..."></textarea>
        </div>
      </form>
    `;
  }

  function editCatFormHtml(prefill) {
    return `
      <form class="pc-form" onsubmit="return false;">
        <div class="pc-field">
          <label>Name</label>
          <input class="pc-input" type="text" value="${safeText(prefill.name)}" />
        </div>
        <div class="pc-grid-2">
          <div class="pc-field">
            <label>Age</label>
            <input class="pc-input" type="text" value="${safeText(prefill.age)}" />
          </div>
          <div class="pc-field">
            <label>Owner</label>
            <input class="pc-input" type="text" value="${safeText(prefill.owner)}" placeholder="e.g. user1" />
          </div>
        </div>
        <div class="pc-field">
          <label>Assigned users</label>
          <input class="pc-input" type="text" value="${safeText(prefill.assigned)}" placeholder="e.g. user2, user3" />
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
    const age = document.querySelector('.left-container .cat-age')?.textContent?.trim();
    return {
      name: name ?? '',
      age: age ?? '',
      owner: 'user1',
      assigned: 'user1',
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
    let trigger = e.target.closest('[data-modal-open]');
    let kind = trigger?.getAttribute('data-modal-open');

    if (!trigger) {
      const moreInfoBtn = e.target.closest('.icon-btn[title="More Info"]');
      if (moreInfoBtn) {
        trigger = moreInfoBtn;
        kind = 'cat-info';
      }
    }

    if (!trigger) return;
    e.preventDefault();

    if (kind === 'add-cat') {
      openModal({
        title: 'Add cat',
        bodyHtml: addCatFormHtml(),
        okText: 'OK',
        cancelText: 'Cancel',
      });
      return;
    }

    if (kind === 'cat-info') {
      const card = trigger.closest('.cat-card');
      const info = getCatInfoFromCard(card);
      openModal({
        title: 'More info',
        bodyHtml: catInfoHtml(info),
        okText: 'OK',
        cancelText: 'Close',
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
      const nameEl = document.querySelector('[data-profile-name]');
      const emailEl = document.querySelector('[data-profile-email]');
      openModal({
        title: 'Edit profile',
        bodyHtml: `
          <form class="pc-form" onsubmit="return false;">
            <div class="pc-field">
              <label>Name</label>
              <input class="pc-input" type="text" value="${safeText(nameEl?.textContent?.trim())}" />
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
          const nextName = inputs[0]?.value?.trim() || '—';
          const nextEmail = inputs[1]?.value?.trim() || '—';
          if (nameEl) nameEl.textContent = nextName;
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
      openModal({
        title: 'Manage caregivers',
        bodyHtml: `
          <div class="pc-info">
            <div class="pc-info-row">
              <div class="pc-info-key">Cat</div>
              <div class="pc-info-val">Selected row</div>
            </div>
          </div>
          <div style="height: 10px;"></div>
          <form class="pc-form" onsubmit="return false;">
            <div class="pc-field">
              <label>Current caregivers</label>
              <input class="pc-input" type="text" value="user2, user3" />
            </div>
            <div class="pc-field">
              <label>Add caregiver</label>
              <select class="pc-select">
                <option>— choose —</option>
                <option>user1</option>
                <option>user2</option>
                <option>user3</option>
              </select>
            </div>
          </form>
        `,
        okText: 'Save',
        cancelText: 'Cancel',
      });
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
          <form class="pc-form" onsubmit="return false;">
            <div class="pc-field">
              <label>Topic</label>
              <select class="pc-select">
                <option>Problem</option>
                <option>Question</option>
                <option>Feature request</option>
              </select>
            </div>
            <div class="pc-field">
              <label>Message</label>
              <textarea class="pc-textarea" placeholder="Write here..."></textarea>
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
    }
  });
});
  