// 삼국기 - 화면 렌더 함수 모음
(function (global) {
  'use strict';
  var S = global.SAMGUK;
  var UI = S.UI;
  var el = UI.el;
  var store = S.store;

  var Screens = {};

  function K(id) { return S.KINGDOMS[id]; }

  // ============ 타이틀 화면 ============
  Screens.title = function () {
    return el('div.screen.title-screen', null, [
      el('div.ink-bg'),
      el('div.title-inner', null, [
        el('h1.game-title', { text: '삼국기' }),
        el('div.game-title-hanja', { text: '三國記' }),
        el('p.game-subtitle', { text: '고구려 백제 신라의 패권을 차지하라' }),
        el('div.title-buttons', null, [
          el('button.btn.btn-primary.btn-lg', {
            text: '새 게임 시작',
            onClick: function () { store.newGame(); }
          }),
          el('button.btn.btn-ghost.btn-lg', {
            text: '이어하기',
            disabled: true
          })
        ]),
        el('div.title-footer', { text: '4~7세기 한반도 · 턴제 전략 시뮬레이션' })
      ])
    ]);
  };

  // ============ 시나리오(개막 국면) 선택 화면 ============
  Screens['scenario-select'] = function (state) {
    var scenarios = S.SCENARIOS || [];
    var cards = scenarios.map(function (sc) {
      var factionNames = (sc.selectable || S.KINGDOM_ORDER).map(function (id) {
        return K(id) ? K(id).name : id;
      }).join(' · ');
      return el('div.scenario-card', {
        onClick: function () { store.selectScenario(sc.id); }
      }, [
        el('div.scenario-year', { text: sc.year + '년' }),
        el('h3.scenario-name', { text: sc.name }),
        el('div.scenario-diff', { text: '난이도 ' + UI.starRating(sc.difficulty || 3) }),
        el('p.scenario-summary', { text: sc.summary }),
        el('div.scenario-factions', { text: '가능 세력: ' + factionNames }),
        el('button.btn.btn-primary.scenario-select-btn', { text: '이 국면으로 시작' })
      ]);
    });

    return el('div.screen.select-screen.scenario-screen', null, [
      el('div.ink-bg'),
      el('div.select-inner', null, [
        el('button.btn.btn-ghost.back-btn', { text: '← 타이틀로', onClick: function () { store.goTitle(); } }),
        el('h2.select-title', { text: '개막 국면을 선택하라' }),
        el('p.scenario-intro', { text: '한반도 삼국시대의 역사적 분기점 중 하나를 골라 그 시대의 정세로 시작합니다.' }),
        el('div.scenario-cards', null, cards)
      ])
    ]);
  };

  // ============ 국가 선택 화면 ============
  Screens['kingdom-select'] = function (state) {
    var scenario = state && state.scenarioId ? store.scenarioById(state.scenarioId) : null;
    var selectable = scenario && scenario.selectable ? scenario.selectable : S.KINGDOM_ORDER;
    return renderKingdomSelect(selectable, scenario);
  };

  function renderKingdomSelect(selectable, scenario) {
    var live = store.getState();
    var cards = selectable.map(function (id) {
      var k = K(id);
      // 시나리오 적용 후의 실제 상태에서 초기 성/병력을 계산
      var startCities = live.cities.filter(function (c) { return c.kingdom === id; });
      var troops = startCities.reduce(function (s, c) { return s + c.troops; }, 0);
      var rulerGen = S.store.generalById(S.RULERS[id]);
      return el('div.kingdom-card', {
        style: { '--kcolor': k.color, '--kcolor-light': k.colorLight },
        onClick: function () { store.selectKingdom(id); }
      }, [
        el('div.kingdom-emblem', null, [UI.emblem(k.emblem, k.colorLight, 72)]),
        el('h2.kingdom-name', { text: k.name }),
        el('div.kingdom-hanja', { text: k.hanja }),
        el('div.kingdom-ruler', { text: '군주 · ' + k.ruler }),
        el('div.kingdom-difficulty', { text: '난이도 ' + UI.starRating(k.difficulty) }),
        el('p.kingdom-territory', { text: k.territory }),
        el('div.kingdom-trait', { text: '특성: ' + k.trait }),
        el('div.kingdom-stats', null, [
          el('span', { text: '초기 성 ' + startCities.length }),
          el('span', { text: '초기 병력 ' + troops.toLocaleString() })
        ]),
        rulerGen ? el('div.kingdom-ruler-stats', null, [
          el('span', { text: '통 ' + rulerGen.command }),
          el('span', { text: '무 ' + rulerGen.force }),
          el('span', { text: '지 ' + rulerGen.intellect }),
          el('span', { text: '정 ' + rulerGen.politics })
        ]) : null,
        el('button.btn.btn-primary.kingdom-select-btn', { text: k.name + '(으)로 시작' })
      ]);
    });

    return el('div.screen.select-screen', null, [
      el('div.ink-bg'),
      el('div.select-inner', null, [
        el('button.btn.btn-ghost.back-btn', { text: '← 국면 선택', onClick: function () { store.newGame(); } }),
        el('h2.select-title', { text: '군주를 선택하라' }),
        scenario ? el('p.scenario-intro', { text: scenario.year + '년 · ' + scenario.name }) : null,
        el('div.kingdom-cards', null, cards)
      ])
    ]);
  }

  Screens.getScreen = function (name) { return Screens[name]; };

  global.SAMGUK.Screens = Screens;
})(window);
