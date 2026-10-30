/**
 * public/theme-init.js
 * 
 * Inicializador síncrono anti-FOUC de tema institucional para CEPRO_MICAELA 2.0.
 * Servido estrictamente desde 'self' para cumplir con la directiva CSP:
 * script-src 'self' blob: (sin 'unsafe-inline').
 */
(function () {
  try {
    var pref = localStorage.getItem('cetpro_theme_preference');
    var isDark = pref === 'dark' || ((!pref || pref === 'system') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      root.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();
