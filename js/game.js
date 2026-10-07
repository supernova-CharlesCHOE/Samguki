// 삼국기 - 메인 게임 화면 + HUD + 오버레이(내정/외교/전투/무장/이벤트)
(function (global) {
  'use strict';
  var S = global.SAMGUK;
  var UI = S.UI;
  var el = UI.el;
  var store = S.store;

  function K(id) { return S.KINGDOMS[id]; }
  function aiLevelLabel(lv) { return { normal: '난이도 보통', hard: '난이도 어려움', hell: '난이도 지옥' }[lv] || '난이도 보통'; }

  // ============ 장수제 HUD ============
  function renderOfficerHUD(state) {
    var pk = state.playerKingdom;
    var k = K(pk);
    var g = store.generalById(state.playerGeneralId);
    var rank = store.currentRank();
    var nr = store.nextRank();
    var meritToNext = nr ? (nr.merit - state.merit) : 0;
    var cityNow = store.officerCity();
    return el('div.hud.officer-hud', { style: { '--kcolor': k.color, '--kcolor-light': k.colorLight } }, [
      el('div.hud-left', null, [
        el('div.hud-emblem', null, [UI.avatar(g ? g.name : '?', k.colorLight, 40)]),
        el('div.hud-kingdom', null, [
          el('div.hud-kingdom-name', { text: (g ? g.name : '') + ' · ' + rank.name }),
          el('div.hud-turn', { text: k.name + '의 신하 · ' + state.year + '년 ' + state.turn + '턴 · ' + aiLevelLabel(state.aiLevel) })
        ])
      ]),
      el('div.hud-stats', null, [
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '관직' }), el('span.hud-stat-val', { text: rank.name })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '공훈' }), el('span.hud-stat-val', { text: state.merit + (nr ? ' / ' + nr.merit : ' (최고위)') })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '다음 승진' }), el('span.hud-stat-val', { text: nr ? ('공훈 ' + meritToNext) : '—' })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '재산' }), el('span.hud-stat-val', { text: state.personalGold.toLocaleString() + '금' })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '근무지' }), el('span.hud-stat-val', { text: cityNow ? cityNow.name : '-' })])
      ]),
      el('button.btn.btn-turn', { text: (state.actedThisTurn ? '턴 종료 ▶' : '턴 종료(미근무) ▶'), onClick: function () { store.nextTurn(); } })
    ]);
  }

  // ============ HUD ============
  function renderHUD(state) {
    if (state.playMode === 'officer') return renderOfficerHUD(state);
    var pk = state.playerKingdom;
    var k = K(pk);
    var troops = store.kingdomTroops(pk);
    var income = store.kingdomIncome(pk);
    var cityCount = store.citiesOf(pk).length;
    var rice = store.kingdomRice ? store.kingdomRice(pk) : 0;
    var riceBal = store.kingdomRiceBalance ? store.kingdomRiceBalance(pk) : 0;

    return el('div.hud', { style: { '--kcolor': k.color, '--kcolor-light': k.colorLight } }, [
      el('div.hud-left', null, [
        el('div.hud-emblem', null, [UI.emblem(k.emblem, k.colorLight, 40)]),
        el('div.hud-kingdom', null, [
          el('div.hud-kingdom-name', { text: k.name + ' (' + k.hanja + ')' }),
          el('div.hud-turn', { text: state.year + '년 · ' + state.turn + '턴 · ' + aiLevelLabel(state.aiLevel) })
        ])
      ]),
      el('div.hud-stats', null, [
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '금' }), el('span.hud-stat-val', { text: state.gold[pk].toLocaleString() })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '세수/턴' }), el('span.hud-stat-val', { text: '+' + income.toLocaleString() })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '군량' }), el('span.hud-stat-val' + (riceBal < 0 ? '.warn' : ''), { text: rice.toLocaleString() + ' (' + (riceBal >= 0 ? '+' : '') + riceBal.toLocaleString() + ')' })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '총병력' }), el('span.hud-stat-val', { text: troops.toLocaleString() })]),
        el('div.hud-stat', null, [el('span.hud-stat-label', { text: '영지' }), el('span.hud-stat-val', { text: cityCount + '성' })])
      ]),
      el('button.btn.btn-turn', { text: '턴 종료 ▶', onClick: function () { store.nextTurn(); } })
    ]);
  }

  // ============ 사이드 액션 메뉴 ============
  function renderSidePanel(state) {
    var items;
    if (state.playMode === 'officer') {
      items = [
        { name: '근무', overlay: 'officer', icon: '📋' },
        { name: '무장', overlay: 'generals', icon: '⚔' },
        { name: '모략', overlay: 'scheme', icon: '🕯' },
        { name: '연표', overlay: 'log', icon: '📜' },
        { name: '저장', overlay: 'saveload', icon: '💾' }
      ];
    } else {
      items = [
        { name: '무장', overlay: 'generals', icon: '⚔' },
        { name: '등용', overlay: 'recruit', icon: '🤝' },
        { name: '외교', overlay: 'diplomacy', icon: '🕊' },
        { name: '모략', overlay: 'scheme', icon: '🕯' },
        { name: '연표', overlay: 'log', icon: '📜' },
        { name: '저장', overlay: 'saveload', icon: '💾' }
      ];
    }
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

    // 모략 진입 버튼: 아군 성이 아닌(적/중립) 성에서만 노출. 선택 성을 기본 대상으로 유지.
    function schemeBtn() {
      return el('button.btn.btn-scheme', { text: '🕯 모략', onClick: function () {
        store.selectCity(c.id);
        store.openOverlay('scheme');
      } });
    }

    var actions;
    if (state.playMode === 'officer') {
      // 장수제: 소속 세력 성이고 장군 이상이면 태수 부임 가능
      var faction = store.playerFaction();
      if (c.kingdom === faction && store.currentRank().canGovern) {
        actions = [
          el('button.btn.btn-primary', { text: '태수 부임', onClick: function () { store.officerBecomeGovernor(c.id); } })
        ];
      } else if (c.kingdom === faction) {
        actions = [el('div.city-info-note', { text: '장수제에서는 근무 명령으로 공을 세우세요.' })];
      } else {
        // 적/중립 성: 모략 진입
        actions = [schemeBtn()];
      }
    } else if (mine) {
      actions = [
        el('button.btn.btn-primary', { text: '내정', onClick: function () { store.openOverlay('internal'); } }),
        el('button.btn.btn-danger', { text: '출병', onClick: function () { openAttackChooser(c); } })
      ];
    } else {
      // 적/중립 성: 인접 아군 성에서 공격 가능 + 모략 진입
      actions = [
        el('button.btn.btn-danger', { text: '공격', onClick: function () { openAttackChooser(c); } }),
        schemeBtn()
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
        UI.statBar('치안', c.defense, '#4a90d9'),
        UI.statBar('민심', c.popularity != null ? c.popularity : 60, (c.popularity >= 70 ? '#6ab04c' : (c.popularity >= 40 ? '#c9a227' : '#c0392b')))
      ]),
      el('div.city-info-troops', { text: '병력 ' + c.troops.toLocaleString() + ' · 군량 ' + (c.rice || 0).toLocaleString() }),
      el('div.city-info-troops', { text: '무장: ' + genNames }),
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
    if (state.pendingReport) return renderReport(state);
    if (!state.overlay) return null;
    var body;
    if (state.overlay === 'internal') body = S.Overlays.internal(state);
    else if (state.overlay === 'diplomacy') body = S.Overlays.diplomacy(state);
    else if (state.overlay === 'generals') body = S.Overlays.generals(state);
    else if (state.overlay === 'battle') body = S.Overlays.battle(state);
    else if (state.overlay === 'duel') body = S.Overlays.duel(state);
    else if (state.overlay === 'debate') body = S.Overlays.debate(state);
    else if (state.overlay === 'recruit') body = S.Overlays.recruit(state);
    else if (state.overlay === 'officer') body = S.Overlays.officer(state);
    else if (state.overlay === 'scheme') body = S.Overlays.scheme(state);
    else if (state.overlay === 'saveload') body = S.Overlays.saveload(state);
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

  // ============ 턴 결과 보고 팝업 (재해 / 합종연횡) ============
  function renderReport(state) {
    var rep = state.pendingReport;
    return el('div.overlay-backdrop', null, [
      el('div.event-popup', null, [
        el('div.event-scroll.report-scroll', null, [
          el('div.event-year', { text: state.year + '년 · ' + state.turn + '턴' }),
          el('h2.event-name', { text: '정세 보고' }),
          el('div.report-lines', null, rep.lines.map(function (ln) {
            return el('div.report-line', null, [
              el('div.report-line-title', { text: ln.title }),
              el('div.report-line-text', { text: ln.text })
            ]);
          })),
          el('button.btn.btn-primary', { text: '확인', onClick: function () { store.dismissReport(); } })
        ])
      ])
    ]);
  }

  // ============ 이벤트 팝업 ============
  function renderEvent(state) {
    var ev = state.pendingEvent;
    var hasChoices = ev.choices && ev.choices.length && !ev.resolved;

    var body = [
      el('div.event-year', { text: (ev.year ? ev.year + '년' : '역사의 순간') }),
      el('h2.event-name', { text: ev.name }),
      el('p.event-desc', { text: ev.description })
    ];

    if (hasChoices) {
      // 미해결 선택지: 선택 버튼 노출
      body.push(el('div.event-choices', null, ev.choices.map(function (c, i) {
        return el('button.btn.event-choice-btn', {
          onClick: function () { store.chooseEventOption(i); }
        }, [
          el('span.event-choice-label', { text: c.label }),
          c.hint ? el('span.event-choice-hint', { text: c.hint }) : null
        ]);
      })));
    } else {
      // 결과 표시 + 확인
      if (ev.chosenLabel) body.push(el('div.event-chosen', { text: '▶ ' + ev.chosenLabel }));
      if (ev.resultText) body.push(el('div.event-result', { text: ev.resultText }));
      body.push(el('button.btn.btn-primary', { text: '확인', onClick: function () { store.dismissEvent(); } }));
    }

    return el('div.overlay-backdrop', null, [
      el('div.event-popup', null, [
        el('div.event-scroll', null, body)
      ])
    ]);
  }

  global.SAMGUK.Game = { renderGame: renderGame };
})(window);
