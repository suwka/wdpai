// Core + modal context (no bundler, plain globals)
// Exposes: window.AppCore.createContext()

(function () {
  const AppCore = {};

  AppCore.createContext = function createContext() {
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

    const footerEl = overlay.querySelector('.pc-modal-footer');
    let footerExtraEl = overlay.querySelector('[data-modal-footer-extra]');
    if (footerEl && !footerExtraEl) {
      footerExtraEl = document.createElement('div');
      footerExtraEl.setAttribute('data-modal-footer-extra', '');
      footerExtraEl.className = 'pc-modal-footer-extra';
      footerEl.prepend(footerExtraEl);
    }

    let onOk = null;
    let lastActiveEl = null;

    const URLS = {
      apiProfile: '/api-profile',
      apiUsers: '/api-users',
      apiCats: '/api-cats',
      apiCat: '/api-cat',
      apiCatPhotos: '/api-cat-photos',
      apiCatActivities: '/api-cat-activities',
      apiDashboardActivities: '/api-dashboard-activities',
      apiActivities: '/api-activities',
      apiActivitiesCalendar: '/api-activities-calendar',
      apiActivitiesDay: '/api-activities-day',

      catCreate: '/cat-create',
      catUpdate: '/cat-update',
      catDelete: '/cat-delete',

      activityCreate: '/activity-create',
      activityUpdate: '/activity-update',

      catPhotoDelete: '/cat-photo-delete',
      catPhotosReorder: '/cat-photos-reorder',
    };

    const FILTER_PRESETS = {
      onlyCatName: 'Gilbert',
      onlyUsername: 'user1',
    };

    function safeText(value) {
      return (value ?? '').toString();
    }

    function apiGet(url) {
      return fetch(url, { headers: { 'Accept': 'application/json' } }).then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }

    function debounce(fn, waitMs) {
      let t = null;
      return (...args) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn(...args), waitMs);
      };
    }

    function fillForm(formEl, data) {
      if (!formEl || !data) return;
      Object.entries(data).forEach(([key, value]) => {
        const field = formEl.querySelector(`[name="${CSS.escape(key)}"]`);
        if (!field) return;
        const tag = (field.tagName || '').toLowerCase();
        const type = (field.getAttribute('type') || '').toLowerCase();
        if (type === 'file') return;

        if (type === 'checkbox') {
          field.checked = Boolean(value);
          return;
        }

        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          field.value = (value ?? '').toString();
        }
      });
    }

    function cloneTemplate(id) {
      const tpl = document.getElementById(id);
      if (!tpl || !(tpl instanceof HTMLTemplateElement)) return null;
      return tpl.content.cloneNode(true);
    }

    function getCatIdFromUrl() {
      const params = new URLSearchParams(window.location.search);
      return params.get('cat_id') || params.get('id') || '';
    }

    function parseStartsAtParts(startsAt) {
      const raw = (startsAt ?? '').toString().trim();
      const m = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
      if (m) return { date: m[1], time: m[2] };
      return { date: '', time: '' };
    }

    function getUserFromCard(cardEl) {
      return cardEl?.querySelector('.cat-user-name')?.textContent?.trim() ?? '';
    }

    function go(path) {
      window.location.href = path;
    }

    function openModal({ title, bodyHtml = '', bodyNode = null, okText = 'OK', cancelText = 'Cancel', onOkCb = null, footerExtraHtml = '' }) {
      lastActiveEl = document.activeElement;
      titleEl.textContent = title;
      bodyEl.innerHTML = '';
      if (bodyNode) {
        bodyEl.appendChild(bodyNode);
      } else {
        bodyEl.innerHTML = bodyHtml;
      }
      okBtn.textContent = okText;
      cancelBtn.textContent = cancelText;
      onOk = onOkCb;

      if (footerExtraEl) {
        const html = (footerExtraHtml ?? '').toString();
        footerExtraEl.innerHTML = html;
        footerExtraEl.hidden = html.trim() === '';
      }

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
      if (footerExtraEl) {
        footerExtraEl.innerHTML = '';
        footerExtraEl.hidden = true;
      }
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

    return {
      overlay,
      titleEl,
      bodyEl,
      okBtn,
      cancelBtn,
      closeBtn,
      footerExtraEl,
      URLS,
      FILTER_PRESETS,
      safeText,
      apiGet,
      debounce,
      fillForm,
      cloneTemplate,
      getCatIdFromUrl,
      parseStartsAtParts,
      getUserFromCard,
      go,
      openModal,
      closeModal,
    };
  };

  window.AppCore = AppCore;
})();
