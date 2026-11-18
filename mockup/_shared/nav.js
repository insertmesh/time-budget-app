/* Shared nav bar for all Time Budget APP mockups (step 02j_mockup_hub, 2026-11-17).
   Each page loads it with ONE line just before </body>:
     <script src="../_shared/nav.js"></script>
   It draws a thin strip at the top of the page (outside the phone) with a link to every screen.
   To add / rename a screen: edit the PAGES list below. Nothing else needs to change.
   Works from disk (double-click) and on GitHub Pages: all links are relative to the mockup folder.
   Not used by the web page set (02h_web), which has its own menu. */
(function () {
  var me = document.currentScript;
  var base = me ? me.src.replace(/_shared\/nav\.js(\?.*)?$/, '') : '../';

  // [label, path from the mockup folder, status]  status: '' = designed, 'soon' = placeholder page
  var PAGES = [
    ['Tap',        '02g_tap/tap.html',               ''],
    ['Plans',      '02a_plans/plans.html',           ''],
    ['Categories', '02b_categories/categories.html', ''],
    ['Goals',      '02b_categories/categories.html#cat=a09', ''],
    ['Overviews',  '02c_overviews/overviews.html',   ''],
    ['Rewards',    '02d_rewards/rewards.html',       ''],
    ['Check-in',   '06_checkin/checkin.html',        'soon'],
    ['Journey',    '07_journey/journey.html',        'soon'],
    ['Yes-check',  '08_yes_check/yes_check.html',    'soon'],
    ['Settings',   '02e_settings/settings.html',     ''],
    ['Content',    '02f_content/content.html',       ''],
    ['Navigation', '02k_navigation/navigation.html', '']
  ];

  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + '_shared/nav.css';
  document.head.appendChild(css);

  function file(p) { return p.split('#')[0]; }
  function here() {
    var path = decodeURIComponent(location.pathname).replace(/\\/g, '/');
    var onGoals = /(^|[#&])cat=/.test(location.hash.slice(1));
    var hit = '';
    PAGES.forEach(function (p) {
      if (path.slice(-file(p[1]).length) !== file(p[1])) return;
      if (p[0] === 'Goals' && !onGoals) return;
      if (p[0] === 'Categories' && onGoals) return;
      hit = p[0];
    });
    return hit;
  }

  var nav = document.createElement('nav');
  nav.className = 'tbn';
  nav.setAttribute('aria-label', 'All app mockups');
  function draw() {
    var cur = here();
    nav.innerHTML = '<span class="tbn-tag">App mockups</span><span class="tbn-list">' +
      PAGES.map(function (p) {
        var cls = 'tbn-a' + (p[2] ? ' tbn-soon' : '') + (p[0] === cur ? ' tbn-on' : '');
        return '<a class="' + cls + '" href="' + base + p[1] + '"' + (p[0] === cur ? ' aria-current="page"' : '') + '>' +
          p[0] + (p[2] ? ' <small>soon</small>' : '') + '</a>';
      }).join('') + '</span>';
  }
  draw();
  window.addEventListener('hashchange', draw);
  document.body.insertBefore(nav, document.body.firstChild);
  // Pages without side padding on <body> (e.g. Categories, Content): keep a 16px gap on small screens
  if (parseFloat(getComputedStyle(document.body).paddingLeft) < 8) nav.classList.add('tbn-gap');
})();
