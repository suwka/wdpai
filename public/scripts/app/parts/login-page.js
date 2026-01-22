/* modul strony logowania */

(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.loginPage = function loginPage(ctx) {
    const p = (window.location.pathname || '').toString().toLowerCase();
    if (!(p === '/login' || p === '/login/')) return;

    const link = document.querySelector('a.forgot-password');
    if (!link) return;

    let hint = document.querySelector('[data-forgot-hint]');
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'forgot-hint';
      hint.setAttribute('data-forgot-hint', '');
      hint.hidden = true;
      hint.textContent = 'Skontaktuj się z administratorem strony.';
      link.insertAdjacentElement('afterend', hint);
    }

    link.addEventListener('click', (e) => {
      e.preventDefault();
      hint.hidden = !hint.hidden;
    });
  };
})();
