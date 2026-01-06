(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.userContext = function userContext(ctx) {
    (function initUserContext() {
      ctx
        .apiGet(ctx.URLS.apiProfile)
        .then((data) => {
          const u = data?.item;
          if (!u) return;

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
          // ignore
        });
    })();
  };
})();
