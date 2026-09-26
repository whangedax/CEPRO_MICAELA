const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', 'js', 'ui', 'layout.js');
let content = fs.readFileSync(file, 'utf8');

// Match from PENDING_INSTITUTION_FIELDS up to the first navLinks.forEach
const regex = /const PENDING_INSTITUTION_FIELDS = Object\.freeze\(\[[^\]]+\]\);[\s\S]*?const href = link\.getAttribute\('href'\);/;

const replacement = `const PENDING_INSTITUTION_FIELDS = Object.freeze(['dre', 'codigoModular', 'departamento', 'provincia', 'distrito']);

export const Layout = {
  activeRoute: null,

  init() {
    this.sanitizeSidebar();
    this.bindEvents();
    this.updateDbStatusBadge();
  },

  /**
   * Sanea la barra lateral conservando en OPERACIÓN DIARIA exclusivamente:
   * INICIO (#/inicio), ESTUDIANTES (#/estudiantes), GRUPOS (#/grupos) y DOCUMENTOS (#/documentos).
   * Retira los enlaces redundantes de la barra visible sin afectar las rutas del router.
   */
  sanitizeSidebar() {
    const redundantSelectors = [
      '#sidebar a[href="#/matriculas"]',
      '#sidebar a[href="#/nominas"]',
      '#sidebar a[href="#/registros/matricula"]',
      '#sidebar a[href="#/registro"]'
    ];
    redundantSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
  },

  bindEvents() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
      menuToggle.onclick = () => {
        sidebar.classList.toggle('open');
      };
    }
  },

  /**
   * Actualiza la navegación activa en la barra lateral
   * @param {string} currentHash
   */
  updateNavigation(currentHash) {
    this.activeRoute = currentHash;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('PATCHED_SUCCESSFULLY');
} else {
  console.error('REGEX_NOT_MATCHED');
}
