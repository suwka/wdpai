/* User context bootstrap (profile, nav, visibility). */

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
            if (!img) return;

            const avatarFallback = '/public/img/avatar.jpg';
            const avatar = (u?.avatar_path ?? '').toString().trim() || avatarFallback;
            img.setAttribute('src', avatar);
            img.onerror = () => {
              img.onerror = null;
              img.src = avatarFallback;
            };

            img.style.cursor = 'pointer';
            if (img.getAttribute('data-avatar-settings-bound') === '1') return;
            img.setAttribute('data-avatar-settings-bound', '1');
            img.addEventListener('click', (e) => {
              e.preventDefault();
              if (window.location.pathname === '/settings') return;
              ctx.go('/settings');
            });
          });

          const welcome = document.querySelector('[data-welcome]');
          if (welcome) {
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
            welcome.textContent = `Welcome back, ${fullName || (u.username || '—')}`;
          }

          const titles = document.querySelectorAll('.tittle');
          titles.forEach((el) => {
            if (!el) return;
            el.style.cursor = 'pointer';
            if (el.getAttribute('data-title-dashboard-bound') === '1') return;
            el.setAttribute('data-title-dashboard-bound', '1');
            el.addEventListener('click', (e) => {
              e.preventDefault();
              const target = (u.role === 'admin') ? '/admin' : '/dashboard';
              if (window.location.pathname === target) return;
              ctx.go(target);
            });
          });

          const pUsername = document.querySelector('[data-profile-username]');
          if (pUsername) pUsername.textContent = u.username || '—';
          const pFullName = document.querySelector('[data-profile-fullname]');
          if (pFullName) pFullName.textContent = `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—';
          const pEmail = document.querySelector('[data-profile-email]');
          if (pEmail) pEmail.textContent = u.email || '—';
          const pRole = document.querySelector('[data-profile-role]');
          if (pRole) pRole.textContent = u.role || '—';

          const back = document.querySelector('[data-settings-back]');
          if (back) {
            back.setAttribute('href', (u.role === 'admin') ? '/admin' : '/dashboard');
          }

          const userOnlyEls = document.querySelectorAll('[data-user-only]');
          userOnlyEls.forEach((el) => {
            el.hidden = (u.role === 'admin');
          });
        })
        .catch(() => {
        });
    })();
  };
})();
