/*
Rdzen + kontekst modalny (bez bundlera, zwykle globalnie).
Udostepnia: window.AppCore.createContext()
*/


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
      apiAdminStats: '/api-admin-stats',
      apiCats: '/api-cats',
      apiCat: '/api-cat',
      apiCatPhotos: '/api-cat-photos',
      apiCatActivities: '/api-cat-activities',
      apiDashboardActivities: '/api-dashboard-activities',
      apiActivities: '/api-activities',
      apiActivitiesCalendar: '/api-activities-calendar',
      apiActivitiesDay: '/api-activities-day',
      apiCaregivers: '/api-caregivers',

      catCreate: '/cat-create',
      catUpdate: '/cat-update',
      catDelete: '/cat-delete',

      activityCreate: '/activity-create',
      activityUpdate: '/activity-update',

      catPhotoDelete: '/cat-photo-delete',
      catPhotosReorder: '/cat-photos-reorder',

      caregiverAssign: '/caregiver-assign',
      caregiverUnassign: '/caregiver-unassign',

      adminUserUpdate: '/admin-user-update',
      adminUserCreate: '/admin-user-create',
      adminUserBlock: '/admin-user-block',
      adminUserDelete: '/admin-user-delete',
    };

    const FILTER_PRESETS = {
      onlyCatName: 'Gilbert',
      onlyUsername: 'user1',
    };

    function safeText(value) {
      return (value ?? '').toString();
    }

    function escapeHtml(str) {
      return safeText(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    let lastUiErrorAt = 0;
    function shouldNotifyNow() {
      const now = Date.now();
      if (now - lastUiErrorAt < 2500) return false;
      lastUiErrorAt = now;
      return true;
    }

    function notifyError(title, message) {
      if (!shouldNotifyNow()) return;
      openModal({
        title: safeText(title || 'Błąd'),
        bodyHtml: `<div class="hint">${escapeHtml(message || 'Wystąpił błąd.')}</div>`,
        okText: 'OK',
        cancelText: 'Zamknij',
      });
    }

    const SETTINGS_KEY = 'pc_app_settings_v1';
    const DEFAULT_SETTINGS = {
      confirmDelete: true,
      showCatMeta: true,
    };

    function applySettingsToDom(state) {
      try {
        const show = (state?.showCatMeta !== false);
        document.documentElement.setAttribute('data-pc-show-cat-meta', show ? '1' : '0');
      } catch {
      }
    }

    function loadSettings() {
      try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    }

    function saveSettings(next) {
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
      }

      applySettingsToDom(next);

      try {
        window.dispatchEvent(new Event('pc:settingsChanged'));
      } catch {
      }
    }

    let settingsState = loadSettings();
    applySettingsToDom(settingsState);

    const settings = {
      get(key) {
        return settingsState?.[key];
      },
      set(key, value) {
        settingsState = { ...(settingsState || {}), [key]: value };
        saveSettings(settingsState);
      },
      all() {
        return { ...(settingsState || {}) };
      },
      reset() {
        settingsState = { ...DEFAULT_SETTINGS };
        saveSettings(settingsState);
      },
    };

    function handleHttpError(status, message) {
      const p = (window.location.pathname || '').toString().toLowerCase();
      if (p === '/login' || p === '/login/' || p === '/register' || p === '/register/') {
        return;
      }

      if (status === 401) {
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          go('/login?err=unauthorized');
          return;
        }
        notifyError('Brak autoryzacji', 'Zaloguj się ponownie.');
        return;
      }

      if (status === 403) {
        notifyError('Brak dostępu (403)', message || 'Nie masz uprawnień do wykonania tej akcji.');
        return;
      }

      if (status >= 500) {
        notifyError('Błąd serwera', message || `HTTP ${status}`);
        return;
      }
    }

    async function request(url, options = {}) {
      const opts = { credentials: 'same-origin', ...options };
      opts.headers = { 'Accept': 'application/json', ...(options.headers || {}) };

      let resp;
      try {
        resp = await fetch(url, opts);
      } catch (e) {
        notifyError('Brak połączenia', 'Nie udało się połączyć z serwerem.');
        throw e;
      }

      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      const isJson = ct.includes('application/json');
      const payload = isJson
        ? await resp.json().catch(() => null)
        : await resp.text().catch(() => '');

      if (!resp.ok) {
        const msg = (payload && typeof payload === 'object')
          ? (payload.message || payload.error || (`HTTP ${resp.status}`))
          : (payload || (`HTTP ${resp.status}`));

        handleHttpError(resp.status, safeText(msg));

        const err = new Error(safeText(msg));
        err.status = resp.status;
        err.payload = payload;
        throw err;
      }

      return payload;
    }

    function apiGet(url) {
      return request(url, { method: 'GET' });
    }

    function apiPostUrlEncoded(url, params) {
      const body = (params instanceof URLSearchParams) ? params.toString() : safeText(params);
      return request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    }

    function apiPostFormObject(url, dataObj) {
      const fd = new FormData();
      Object.entries(dataObj || {}).forEach(([k, v]) => fd.append(k, (v ?? '').toString()));
      return request(url, { method: 'POST', body: fd });
    }

    function apiPostFormData(url, formData) {
      return request(url, { method: 'POST', body: formData });
    }

    async function submitForm(formEl) {
      const method = (formEl?.method || 'POST').toUpperCase();
      const action = formEl?.action || '';
      const fd = new FormData(formEl);

      let resp;
      try {
        resp = await fetch(action, { method, body: fd, credentials: 'same-origin' });
      } catch (e) {
        notifyError('Brak połączenia', 'Nie udało się wysłać formularza.');
        throw e;
      }

      if (resp.ok) {
        if (resp.redirected && resp.url) {
          window.location.href = resp.url;
          return;
        }
        window.location.reload();
        return;
      }

      const text = await resp.text().catch(() => '');
      handleHttpError(resp.status, text || `HTTP ${resp.status}`);
      throw new Error(text || `HTTP ${resp.status}`);
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
      settings,
      apiGet,
      apiPostUrlEncoded,
      apiPostFormObject,
      apiPostFormData,
      submitForm,
      notifyError,
      escapeHtml,
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
