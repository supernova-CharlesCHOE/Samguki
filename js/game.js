// 삼국기 - 메인 게임 화면 + HUD + 오버레이(내정/외교/전투/무장/이벤트)
(function (global) {
  'use strict';
  var S = global.SAMGUK;
  var UI = S.UI;
  var el = UI.el;
  var store = S.store;

  function K(id) { return S.KINGDOMS[id]; }

  // ============ HUD ============
  function renderHUD(state) {
    var pk = state.playerKingdom;
    var k = K(pk);
    var troops = store.kingdomTroops(pk);
    var income = store.kingdomIncome(pk);
    var cityCount = store.citiesOf(pk).length;

    return el('div.hud', { style: { '--kcolor': k.color, '--kcolor-light': k.colorLight } }, [
      el('div.hud-left', null, [
        el('div.hud-emblem', null, [UI.emblem(k.emblem, k.colorLight, 40)]),
        el('div.hud-kingdom', null, [
          el('div.hud-kingdom-name', { text: k.name + ' (' + k.hanja + ')' }),
          el('div.hud-turn', { text: state.year + '년 · ' + state.turn + '턴' })
        ])
      ]),
      el('div.hud-stats', null, [
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '금' }), el('span.hud-stat-val', { text: state.gold[pk].toLocaleString() })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '세수/턴' }), el('span.hud-stat-val', { text: '+' + income.toLocaleString() })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '총병력' }), el('span.hud-stat-val', { text: troops.toLocaleString() })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '영지' }), el('span.hud-stat-val', { text: cityCount + '성' })])
      ]),
      el('button.btn.btn-turn', { text: '턴 종료 ▶', onClick: function () { store.nextTurn(); } })
    ]);
  }

  // ============ 사이드 액션 메뉴 ============
  function renderSidePanel(state) {
    var items = [
      { name: '무장', overlay: 'generals', icon: '⚔' },
      { name: '외교', overlay: 'diplomacy', icon: '🕊' },
      { name: '연표', overlay: 'log', icon: '📜' }
    ];
    return el('div.side-panel', null, [
      el('div.side-title', { text: '명령' }),
      el('div.side-buttons', null, items.map(function (it) {
        return el('button.btn.side-btn', {
          onClick: function () { store.openOverlay(it.overlay); }
        }, [el('span.side-icon', { text: it.icon }), el('span', { text: it.name })]);
      })),
      renderMiniLog(state)
    ]);
  }

  function renderMiniLog(state) {
    return el('div.mini-log', null, [
      el('div.mini-log-title', { text: '최근 소식' }),
      el('div.mini-log-body', null,
        state.eventLog.slice(0, 6).map(function (e) {
          return el('div.mini-log-item', { text: e.year + '년: ' + e.text });
        })
      )
    ]);
  }

  // ============ 도시 정보 패널 ============
  function renderCityInfo(state) {
    if (!state.selectedCityId) {
      return el('div.city-info.empty', { text: '지도의 성을 선택하세요.' });
    }
    var c = store.cityById(state.selectedCityId);
    var mine = c.kingdom === state.playerKingdom;
    var owner = c.kingdom === 'neutral' ? '중립' : K(c.kingdom).name;
    var genNames = c.generals.map(function (id) {
      var g = store.generalById(id); return g ? g.name : '';
    }).filter(Boolean).join(', ') || '없음';

    var actions;
    if (mine) {
      actions = [
        el('button.btn.btn-primary', { text: '내정', onClick: function () { store.openOverlay('internal'); } }),
        el('button.btn.btn-danger', { text: '출병', onClick: function () { openAttackChooser(c); } })
      ];
    } else {
      // 인접 아군 성에서 공격 가능
      actions = [
        el('button.btn.btn-danger', { text: '공격', onClick: function () { openAttackChooser(c); } })
      ];
    }

    return el('div.city-info', { style: { '--kcolor': c.kingdom === 'neutral' ? '#5a5346' : K(c.kingdom).color } }, [
      el('div.city-info-head', null, [
        el('h3.city-info-name', { text: c.name }),
        el('span.city-info-owner', { text: owner })
      ]),
      el('div.city-info-prov', { text: c.province + ' · 인구 ' + c.population.toLocaleString() }),
      el('div.city-info-stats', null, [
        UI.statBar('농업', c.agriculture, '#6ab04c'),
        UI.statBar('상업', c.commerce, '#c9a227'),
        UI.statBar('치안', c.defense, '#4a90d9')
      ]),
      el('div.city-info-troops', { text: '병력 ' + c.troops.toLocaleString() + ' · 무장: ' + genNames }),
      el('div.city-info-actions', null, actions)
    ]);
  }

  // 공격 대상 선택: 플레이어 소유 성 중에서 출발지 고르기
  function openAttackChooser(targetCity) {
    var state = store.getState();
    var mineCities = store.citiesOf(state.playerKingdom).filter(function (c) {
      return c.id !== targetCity.id && c.troops > 1000;
    });
    if (targetCity.kingdom === state.playerKingdom) {
      store.getState().message = '아군 성입니다.'; store.selectCity(targetCity.id); return;
    }
    if (!mineCities.length) {
      store.getState().message = '출병 가능한 아군 성이 없습니다.';
      store.selectCity(targetCity.id);
      return;
    }
    // 가장 병력 많은 성에서 출병
    mineCities.sort(function (a, b) { return b.troops - a.troops; });
    store.startBattle(mineCities[0].id, targetCity.id);
  }

  // ============ 메인 게임 화면 ============
  function renderGame(state) {
    var mapWrap = el('div.map-wrap');
    mapWrap.appendChild(S.GameMap.render(state));

    return el('div.screen.game-screen', null, [
      renderHUD(state),
      el('div.game-body', null, [
        renderSidePanel(state),
        el('div.map-area', null, [
          mapWrap,
          el('div.map-legend', null, S.KINGDOM_ORDER.map(function (id) {
            return el('div.legend-item', null, [
              el('span.legend-dot', { style: { background: K(id).color } }),
              el('span', { text: K(id).name })
            ]);
          }).concat([
            el('div.legend-item', null, [
              el('span.legend-dot', { style: { background: '#5a5346' } }),
              el('span', { text: '중립' })
            ])
          ]))
        ]),
        renderCityInfo(state)
      ]),
      renderOverlay(state)
    ]);
  }

  // ============ 오버레이 라우팅 ============
  function renderOverlay(state) {
    if (state.pendingEvent) return renderEvent(state);
    if (!state.overlay) return null;
    var body;
    if (state.overlay === 'internal') body = S.Overlays.internal(state);
    else if (state.overlay === 'diplomacy') body = S.Overlays.diplomacy(state);
    else if (state.overlay === 'generals') body = S.Overlays.generals(state);
    else if (state.overlay === 'battle') body = S.Overlays.battle(state);
    else if (state.overlay === 'log') body = renderFullLog(state);
    else return null;

    return el('div.overlay-backdrop', {
      onClick: function (e) { if (e.target.classList.contains('overlay-backdrop')) store.closeOverlay(); }
    }, [body]);
  }

  function renderFullLog(state) {
    return el('div.overlay-panel.log-panel', null, [
      el('div.overlay-head', null, [
        el('h2', { text: '연표 · 소식' }),
        el('button.btn.btn-close', { text: '✕', onClick: function () { store.closeOverlay(); } })
      ]),
      el('div.log-list', null, state.eventLog.map(function (e) {
        return el('div.log-entry', { text: '[' + e.year + '년/' + e.turn + '턴] ' + e.text });
      }))
    ]);
  }

  // ============ 이벤트 팝업 ============
  function renderEvent(state) {
    var ev = state.pendingEvent;
    return el('div.overlay-backdrop', null, [
      el('div.event-popup', null, [
        el('div.event-scroll', null, [
          el('div.event-year', { text: (ev.year ? ev.year + '년' : '역사의 순간') }),
          el('h2.event-name', { text: ev.name }),
          el('p.event-desc', { text: ev.description }),
          el('div.event-result', { text: ev.resultText }),
          el('button.btn.btn-primary', { text: '확인', onClick: function () { store.dismissEvent(); } })
        ])
      ])
    ]);
  }

  global.SAMGUK.Game = { renderGame: renderGame };
})(window);
