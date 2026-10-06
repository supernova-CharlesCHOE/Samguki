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

  // ============ 플레이 방식 선택 (군주제 / 장수제) ============
  Screens['mode-select'] = function (state) {
    var kingdom = state.playerKingdom;
    var k = K(kingdom);
    var live = store.getState();
    // 그 세력의 무장 목록 (장수제 선택지)
    var factionGenerals = live.generals.filter(function (g) { return g.kingdom === kingdom; });
    var rulerId = S.RULERS[kingdom];

    // 군주제 카드
    var rulerCard = el('div.mode-card.ruler-mode', {
      style: { '--kcolor': k.color, '--kcolor-light': k.colorLight },
      onClick: function () { store.startAsRuler(); }
    }, [
      el('div.mode-icon', { text: '👑' }),
      el('h3.mode-name', { text: '군주제' }),
      el('div.mode-sub', { text: k.name + '의 군주로서' }),
      el('p.mode-desc', { text: '세력 전체를 직접 통치합니다. 내정·외교·군사를 모두 지휘하여 천하를 통일하세요.' }),
      el('button.btn.btn-primary.mode-btn', { text: '군주로 시작' })
    ]);

    // 장수제 카드 (무장 선택 포함)
    var selectedGenId = { id: rulerId }; // 클로저로 선택 상태 보관
    var genButtons = factionGenerals.map(function (g) {
      return el('button.btn.officer-pick' + (g.id === selectedGenId.id ? '.active' : ''), {
        'data-gid': g.id,
        onClick: function (e) {
          selectedGenId.id = g.id;
          // 활성 표시 토글
          var wrap = e.target.closest ? e.target.closest('.officer-picks') : null;
          if (wrap) Array.prototype.forEach.call(wrap.querySelectorAll('.officer-pick'), function (b) {
            b.classList.remove('active');
          });
          (e.currentTarget || e.target).classList.add('active');
        }
      }, [
        el('span.officer-pick-name', { text: g.name }),
        el('span.officer-pick-stat', { text: '통' + g.command + '무' + g.force + '지' + g.intellect + '정' + g.politics })
      ]);
    });

    var officerCard = el('div.mode-card.officer-mode', {
      style: { '--kcolor': k.color, '--kcolor-light': k.colorLight }
    }, [
      el('div.mode-icon', { text: '⚔' }),
      el('h3.mode-name', { text: '장수제' }),
      el('div.mode-sub', { text: k.name + '의 한 무장으로서' }),
      el('p.mode-desc', { text: '한 무장이 되어 근무·훈련·임무·출전으로 공훈을 쌓아 승진합니다. 태수를 거쳐 실권을 장악하면 직접 군주가 될 수도 있습니다.' }),
      el('div.officer-pick-label', { text: '플레이할 무장 선택' }),
      el('div.officer-picks', null, genButtons),
      el('button.btn.btn-primary.mode-btn', {
        text: '장수로 시작',
        onClick: function () { store.startAsOfficer(selectedGenId.id); }
      })
    ]);

    // AI 난이도 선택
    var levelMeta = {
      normal: { name: '보통', desc: 'AI와 대등한 승부' },
      hard:   { name: '어려움', desc: 'AI가 경제·증원·공조로 압박' },
      hell:   { name: '지옥', desc: 'AI가 사정없이 몰아친다' }
    };
    var diffRow = el('div.diff-select', null, [
      el('span.diff-label', { text: 'AI 난이도' })
    ].concat(['normal', 'hard', 'hell'].map(function (lv) {
      return el('button.btn.diff-btn' + (state.aiLevel === lv ? '.active' : ''), {
        title: levelMeta[lv].desc,
        onClick: function () { store.setAiLevel(lv); }
      }, [
        el('span.diff-btn-name', { text: levelMeta[lv].name }),
        el('span.diff-btn-desc', { text: levelMeta[lv].desc })
      ]);
    })));

    return el('div.screen.select-screen.mode-screen', { style: { '--kcolor': k.color, '--kcolor-light': k.colorLight } }, [
      el('div.ink-bg'),
      el('div.select-inner', null, [
        el('button.btn.btn-ghost.back-btn', { text: '← 세력 선택', onClick: function () { store.selectScenario(state.scenarioId); } }),
        el('h2.select-title', { text: '플레이 방식을 선택하라' }),
        el('p.scenario-intro', { text: k.name + ' (' + k.hanja + ') — 군주로 천하를 호령할 것인가, 한 무장으로 입신할 것인가?' }),
        diffRow,
        el('div.mode-cards', null, [rulerCard, officerCard])
      ])
    ]);
  };

  Screens.getScreen = function (name) { return Screens[name]; };

  global.SAMGUK.Screens = Screens;
})(window);
