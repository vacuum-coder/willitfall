// Plain ES5 on purpose: runs even in browsers too old for the app itself.
// If the app has not drawn anything after the page loaded, reloads once, then shows a message instead of a blank screen.
(function () {
  var firstError = '';
  window.addEventListener('error', function (e) {
    if (!firstError) firstError = (e && e.message) || 'ошибка загрузки';
  }, true);
  function check() {
    var root = document.getElementById('root');
    if (!root || root.children.length) return;
    // Usually a page left over from the previous deploy asking for files that are gone: reload once for the fresh one.
    try {
      if (!sessionStorage.getItem('wif-reloaded')) { sessionStorage.setItem('wif-reloaded', '1'); location.reload(); return; }
    } catch (e) { /* storage blocked: show the message */ }
    var ua = navigator.userAgent;
    root.innerHTML =
      '<div style="max-width:420px;margin:48px auto;padding:0 16px;font-family:system-ui,sans-serif;color:#2B2622;line-height:1.5">' +
      '<h1 style="font-size:22px;margin:0 0 12px">Will It Fall не открылся</h1>' +
      '<p style="margin:0 0 12px">Скорее всего, браузер на этом телефоне слишком старый. Обновите систему или откройте сайт в свежем Chrome или Safari.</p>' +
      '<p style="margin:0 0 12px">Если открыли из Telegram или Instagram — нажмите «Открыть в браузере».</p>' +
      '<p style="margin:0;font-size:12px;color:#6B6159;word-break:break-word">Для разработчиков: ' +
      (firstError ? firstError.replace(/</g, '&lt;') + ' · ' : '') + ua.replace(/</g, '&lt;') + '</p></div>';
  }
  window.addEventListener('load', function () { setTimeout(check, 4000); });
})();
