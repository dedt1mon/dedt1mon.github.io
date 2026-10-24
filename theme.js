/* A local presentation preference only. Run before CSS to avoid a theme flash. */
(() => {
  'use strict';
  const root = document.documentElement;
  const key = 'dedtimon-theme';
  const system = window.matchMedia('(prefers-color-scheme: light)');
  const valid = value => value === 'light' || value === 'dark';
  let preference = null;
  try { const saved = localStorage.getItem(key); if (valid(saved)) preference = saved; } catch { /* Storage may be unavailable. */ }
  function apply() {
    const theme = preference || (system.matches ? 'light' : 'dark');
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'light' ? '#f3f7f9' : '#111218';
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.setAttribute('aria-pressed', String(theme === 'light'));
      button.title = theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему';
    });
  }
  apply();
  const systemChanged = () => { if (!preference) apply(); };
  if (system.addEventListener) system.addEventListener('change', systemChanged);
  else system.addListener(systemChanged);
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : null;
    apply();
  });
  function controls() {
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.addEventListener('click', () => {
        preference = root.dataset.theme === 'light' ? 'dark' : 'light';
        try { localStorage.setItem(key, preference); } catch { /* Keep the choice for this page session. */ }
        apply();
      });
      button.hidden = false;
    });
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', controls, {once:true});
  else controls();
})();
