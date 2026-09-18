// 삼국기 - 앱 진입점. 상태 변화 시 화면을 다시 그린다.
(function (global) {
  'use strict';
  var S = global.SAMGUK;
  var UI = S.UI;
  var el = UI.el;
  var store = S.store;

  var rootEl = null;
  var toastTimer = null;

  function K(id) { return S.KINGDOMS[id]; }

  // 승리/패배 화면
  function renderEnd(state) {
    var win = state.phase === 'victory';
    var k = state.playerKingdom ? K(state.playerKingdom) : null;
    return el('div.screen.end-screen' + (win ? '.victory' : '.defeat'), null, [
      el('div.ink-bg'),
      el('div.end-inner', null, [
        el('h1.end-title', { text: win ? '천하통일' : '패망' }),
        el('div.end-sub', { text: win
          ? (k ? k.name : '') + '이(가) 삼국을 통일하고 대업을 이루었다!'
          : (k ? k.name : '') + '은(는) 역사의 뒤안길로 사라졌다...' }),
        el('div.end-detail', { text: state.year + '년 · ' + state.turn + '턴' }),
        el('button.btn.btn-primary.btn-lg', { text: '타이틀로', onClick: function () { store.goTitle(); } })
      ])
    ]);
  }

  function renderToast(state) {
    if (!state.message) return null;
    var msg = state.message;
    // 표시 후 자동 소거
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      var st = store.getState();
      if (st.message === msg) { st.message = null; rerender(st); }
    }, 2200);
    return el('div.toast', { text: msg });
  }

  function render(state) {
    var content;
    if (state.phase === 'title') content = S.Screens.title(state);
    else if (state.phase === 'kingdom-select') content = S.Screens['kingdom-select'](state);
    else if (state.phase === 'game') content = S.Game.renderGame(state);
    else if (state.phase === 'victory' || state.phase === 'defeat') content = renderEnd(state);
    else content = S.Screens.title(state);

    var toast = renderToast(state);
    var frag = document.createDocumentFragment();
    frag.appendChild(content);
    if (toast) frag.appendChild(toast);
    return frag;
  }

  function rerender(state) {
    rootEl.innerHTML = '';
    rootEl.appendChild(render(state));
  }

  function boot() {
    rootEl = document.getElementById('app');
    store.subscribe(rerender);
    rerender(store.getState());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
