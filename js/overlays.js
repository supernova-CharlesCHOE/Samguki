// 삼국기 - 오버레이 화면 (내정/외교/무장/전투)
(function (global) {
  'use strict';
  var S = global.SAMGUK;
  var UI = S.UI;
  var el = UI.el;
  var store = S.store;

  function K(id) { return S.KINGDOMS[id]; }

  function head(title) {
    return el('div.overlay-head', null, [
      el('h2', { text: title }),
      el('button.btn.btn-close', { text: '✕', onClick: function () { store.closeOverlay(); } })
    ]);
  }

  // ============ 내정 ============
  function internal(state) {
    var c = store.cityById(state.selectedCityId);
    if (!c) return el('div.overlay-panel', null, [head('내정'), el('p', { text: '성이 선택되지 않았습니다.' })]);
    var gold = state.gold[state.playerKingdom];

    function cmd(label, kind, cost, hint) {
      return el('div.affair-cmd', null, [
        el('div.affair-cmd-info', null, [
          el('div.affair-cmd-name', { text: label }),
          el('div.affair-cmd-hint', { text: hint })
        ]),
        el('button.btn.btn-primary', {
          text: cost + '금',
          disabled: gold < cost,
          onClick: function () { store.developCity(c.id, kind); }
        })
      ]);
    }

    return el('div.overlay-panel.internal-panel', null, [
      head('내정 · ' + c.name),
      el('div.internal-body', null, [
        el('div.internal-stats', null, [
          UI.statBar('농업', c.agriculture, '#6ab04c'),
          UI.statBar('상업', c.commerce, '#c9a227'),
          UI.statBar('치안', c.defense, '#4a90d9'),
          el('div.internal-troops', { text: '병력: ' + c.troops.toLocaleString() }),
          el('div.internal-income', { text: '예상 세수/턴: +' + (c.commerce * 6 + c.agriculture * 4).toLocaleString() + '금' })
        ]),
        el('div.internal-cmds', null, [
          cmd('농업 개발', 'agriculture', 300, '농업 +6 · 세수와 병력 회복 증가'),
          cmd('상업 진흥', 'commerce', 300, '상업 +6 · 세수 증가'),
          cmd('성벽 보강', 'defense', 300, '치안 +6 · 방어력 상승'),
          cmd('병사 모집', 'troops', 200, '병력 +1,500')
        ]),
        el('div.internal-gold', { text: '보유 금: ' + gold.toLocaleString() })
      ])
    ]);
  }

  // ============ 외교 ============
  function diplomacy(state) {
    var pk = state.playerKingdom;
    var others = S.KINGDOM_ORDER.filter(function (k) { return k !== pk && store.citiesOf(k).length > 0; });
    var gold = state.gold[pk];

    var rows = others.map(function (target) {
      var rel = state.diplomacy[pk][target];
      var status = rel.war ? '전쟁중' : (rel.alliance ? '동맹' : '중립');
      var statusClass = rel.war ? 'war' : (rel.alliance ? 'ally' : 'neutral');
      var relPct = (rel.relation + 100) / 2; // 0~100

      return el('div.diplo-row', { style: { '--kcolor': K(target).color } }, [
        el('div.diplo-head', null, [
          el('div.diplo-emblem', null, [UI.emblem(K(target).emblem, K(target).colorLight, 40)]),
          el('div', null, [
            el('div.diplo-name', { text: K(target).name }),
            el('span.diplo-status.' + statusClass, { text: status })
          ])
        ]),
        el('div.diplo-meter', null, [
          el('div.diplo-meter-track', null, [
            el('div.diplo-meter-fill', { style: { width: relPct + '%' } })
          ]),
          el('span.diplo-meter-num', { text: '관계 ' + rel.relation })
        ]),
        el('div.diplo-actions', null, [
          el('button.btn', { text: '사신파견 (300금)', disabled: gold < 300, onClick: function () { store.envoy(target); } }),
          el('button.btn', { text: '조공 (1000금)', disabled: gold < 1000, onClick: function () { store.tribute(target); } }),
          el('button.btn.btn-primary', { text: '동맹제안', disabled: rel.alliance || rel.relation < 30, onClick: function () { store.proposeAlliance(target); } }),
          el('button.btn.btn-danger', { text: '선전포고', disabled: rel.war, onClick: function () { store.declareWar(target); } })
        ])
      ]);
    });

    return el('div.overlay-panel.diplo-panel', null, [
      head('외교'),
      el('div.diplo-body', null, rows.length ? rows : [el('p', { text: '외교할 상대가 없습니다.' })]),
      el('div.diplo-gold', { text: '보유 금: ' + gold.toLocaleString() })
    ]);
  }

  // ============ 무장 목록 ============
  function generals(state) {
    var pk = state.playerKingdom;
    // 무장 -> 소속 도시 맵
    var loc = {};
    state.cities.forEach(function (c) {
      c.generals.forEach(function (gid) { loc[gid] = c; });
    });

    // 삼혼 수련 보너스를 반영한 유효 능력치 막대(수련분은 밝은 색으로 덧표시하지 않고 합산 표시)
    function statWithSpirit(label, g, key, color) {
      var eff = store.effStat(g, key);
      var bonus = eff - (g[key] || 0);
      var lbl = bonus > 0 ? label + '↑' : label;
      return UI.statBar(lbl, eff, color);
    }

    function spiritCmd(g, kind, label) {
      return el('button.btn.spirit-btn', {
        disabled: state.gold[pk] < 250,
        onClick: function () { store.trainGeneral(g.id, kind); }
      }, [el('span', { text: label }), el('span.spirit-val', { text: String((g.spirit && g.spirit[kind]) || 0) })]);
    }

    function card(g, locked) {
      var color = K(g.kingdom).colorLight;
      var assignment = loc[g.id] ? loc[g.id].name : '재야';
      var mineCard = !locked && g.kingdom === pk;
      return el('div.general-card' + (locked ? '.locked' : ''), { style: { '--kcolor': K(g.kingdom).color } }, [
        el('div.general-top', null, [
          UI.avatar(locked ? '?' : g.name, color, 52),
          el('div.general-id', null, [
            el('div.general-name', { text: locked ? '???' : g.name }),
            el('div.general-kingdom', { text: K(g.kingdom).name + (locked ? '' : ' · ' + assignment) })
          ])
        ]),
        locked ? el('div.general-locked-note', { text: '아직 정보가 알려지지 않았다.' }) :
          el('div.general-stats', null, [
            statWithSpirit('통솔', g, 'command', '#c0392b'),
            statWithSpirit('무력', g, 'force', '#e67e22'),
            statWithSpirit('지력', g, 'intellect', '#2980b9'),
            statWithSpirit('정치', g, 'politics', '#27ae60'),
            el('div.general-loyalty', { text: '충성 ' + g.loyalty }),
            (g.sworn && g.sworn.length) ? el('div.general-sworn', {
              text: '의형제: ' + g.sworn.map(function (sid) { var s = store.generalById(sid); return s ? s.name : ''; }).filter(Boolean).join(', ')
            }) : null,
            el('p.general-bio', { text: g.bio }),
            mineCard ? el('div.spirit-row', null, [
              el('div.spirit-title', { text: '삼혼 수련 (250금)' }),
              el('div.spirit-btns', null, [
                spiritCmd(g, 'command', '통솔혼'),
                spiritCmd(g, 'martial', '무혼'),
                spiritCmd(g, 'mind', '지혼')
              ])
            ]) : null
          ])
      ]);
    }

    var mine = state.generals.filter(function (g) { return g.kingdom === pk; });
    var enemy = state.generals.filter(function (g) { return g.kingdom !== pk && g.kingdom !== 'free'; });

    return el('div.overlay-panel.generals-panel', null, [
      head('무장 열전'),
      el('div.generals-section-title', { text: K(pk).name + ' 무장' }),
      el('div.generals-grid', null, mine.map(function (g) { return card(g, false); })),
      el('div.generals-section-title', { text: '타국 무장 (첩보)' }),
      el('div.generals-grid', null, enemy.map(function (g) { return card(g, true); }))
    ]);
  }

  // ============ 전투 ============
  function battle(state) {
    var b = state.battle;
    if (!b) return el('div.overlay-panel', null, [head('전투'), el('p', { text: '진행중인 전투가 없습니다.' })]);
    var from = store.cityById(b.fromId);
    var to = store.cityById(b.toId);
    var atkGen = b.atkGen ? store.generalById(b.atkGen) : null;
    var defGen = b.defGen ? store.generalById(b.defGen) : null;

    function sideCard(cls, title, gen, troops, max, kingdom) {
      var pct = max > 0 ? Math.max(0, (troops / max) * 100) : 0;
      return el('div.battle-side.' + cls, { style: { '--kcolor': kingdom === 'neutral' ? '#5a5346' : K(kingdom).color } }, [
        el('div.battle-side-title', { text: title }),
        gen ? UI.avatar(gen.name, kingdom === 'neutral' ? '#7a7060' : K(kingdom).colorLight, 56) : UI.avatar('병', '#555', 56),
        el('div.battle-gen-name', { text: gen ? gen.name : '무장 없음' }),
        gen ? el('div.battle-gen-stat', { text: '통' + gen.command + ' 무' + gen.force }) : null,
        el('div.battle-troop-bar', null, [
          el('div.battle-troop-fill', { style: { width: pct + '%' } })
        ]),
        el('div.battle-troop-num', { text: troops.toLocaleString() + ' 명' })
      ]);
    }

    var field = renderBattleField(b);

    var controls;
    if (b.over) {
      var resultText = b.result === 'win' ? '승리! ' + to.name + '을(를) 함락했다.' :
        (b.result === 'retreat' ? '퇴각했다.' : '패배했다.');
      controls = el('div.battle-controls', null, [
        el('div.battle-result.' + b.result, { text: resultText }),
        el('button.btn.btn-primary.btn-lg', { text: '전투 종료', onClick: function () { store.endBattle(); } })
      ]);
    } else {
      var canDuel = b.atkGen && b.defGen;
      controls = el('div.battle-controls', null, [
        el('button.btn.btn-danger', { text: '총공격', onClick: function () { store.battleAction('attack'); } }),
        el('button.btn', { text: '방어', onClick: function () { store.battleAction('defend'); } }),
        el('button.btn.btn-primary', { text: '필살전법', onClick: function () { store.battleAction('special'); } }),
        canDuel ? el('button.btn.btn-duel', { text: '일기토', onClick: function () { store.startDuelFromBattle(); } }) : null,
        el('button.btn.btn-ghost', { text: '퇴각', onClick: function () { store.battleAction('retreat'); } })
      ]);
    }

    return el('div.overlay-panel.battle-panel', null, [
      el('div.overlay-head', null, [
        el('h2', { text: '전투 · ' + from.name + ' → ' + to.name + ' (제' + b.round + '라운드)' })
      ]),
      el('div.battle-arena', null, [
        sideCard('atk', '공격군', atkGen, b.atkTroops, b.atkMax, b.attackerKingdom),
        field,
        sideCard('def', '수비군', defGen, b.defTroops, b.defMax, b.defenderKingdom)
      ]),
      controls,
      el('div.battle-log', null, b.log.slice(0, 8).map(function (line) {
        return el('div.battle-log-line', { text: line });
      }))
    ]);
  }

  // 6x4 전장 그리드 (시각 표현)
  function renderBattleField(b) {
    var SVGNS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 240 160');
    s.setAttribute('class', 'battle-field');
    var atkColor = b.attackerKingdom === 'neutral' ? '#7a7060' : K(b.attackerKingdom).colorLight;
    var defColor = b.defenderKingdom === 'neutral' ? '#7a7060' : K(b.defenderKingdom).colorLight;

    var html = '';
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 6; c++) {
        var x = c * 40, y = r * 40;
        html += '<rect x="' + x + '" y="' + y + '" width="40" height="40" fill="none" stroke="#3a3524" stroke-width="1"/>';
      }
    }
    // 공격 유닛(좌측 2열), 수비 유닛(우측 2열)
    var atkUnits = Math.min(8, Math.ceil(b.atkTroops / (b.atkMax / 8 || 1)));
    var defUnits = Math.min(8, Math.ceil(b.defTroops / (b.defMax / 8 || 1)));
    var i;
    for (i = 0; i < atkUnits; i++) {
      var ax = (i % 2) * 40 + 20, ay = Math.floor(i / 2) * 40 + 20;
      html += '<circle cx="' + ax + '" cy="' + ay + '" r="12" fill="' + atkColor + '"/>';
      html += '<text x="' + ax + '" y="' + (ay + 4) + '" text-anchor="middle" font-size="12" fill="#111">攻</text>';
    }
    for (i = 0; i < defUnits; i++) {
      var dx = 200 - (i % 2) * 40 + 20 - 40, dy = Math.floor(i / 2) * 40 + 20;
      dx = 240 - ((i % 2) * 40 + 20);
      html += '<circle cx="' + dx + '" cy="' + dy + '" r="12" fill="' + defColor + '"/>';
      html += '<text x="' + dx + '" y="' + (dy + 4) + '" text-anchor="middle" font-size="12" fill="#111">守</text>';
    }
    s.innerHTML = html;
    return s;
  }

  // ============ 일기토(무장 대결) ============
  function duel(state) {
    var b = state.duel;
    if (!b) return el('div.overlay-panel', null, [head('일기토'), el('p', { text: '진행중인 대결이 없습니다.' })]);
    var a = store.generalById(b.aId);
    var d = store.generalById(b.dId);

    function fighter(cls, title, g, hp) {
      var color = g && g.kingdom !== 'neutral' && K(g.kingdom) ? K(g.kingdom).colorLight : '#7a7060';
      var kcolor = g && g.kingdom !== 'neutral' && K(g.kingdom) ? K(g.kingdom).color : '#5a5346';
      return el('div.battle-side.' + cls, { style: { '--kcolor': kcolor } }, [
        el('div.battle-side-title', { text: title }),
        UI.avatar(g ? g.name : '?', color, 56),
        el('div.battle-gen-name', { text: g ? g.name : '무장' }),
        g ? el('div.battle-gen-stat', { text: '무' + store.effStat(g, 'force') + ' 통' + store.effStat(g, 'command') }) : null,
        el('div.battle-troop-bar', null, [el('div.battle-troop-fill', { style: { width: hp + '%' } })]),
        el('div.battle-troop-num', { text: '기력 ' + hp })
      ]);
    }

    var controls;
    if (b.over) {
      controls = el('div.battle-controls', null, [
        el('div.battle-result.' + (b.result === 'win' ? 'win' : 'lose'), {
          text: b.result === 'win' ? '승리! ' + (d ? d.name : '적장') + '을(를) 꺾었다.' : '패배...'
        }),
        el('button.btn.btn-primary.btn-lg', { text: '대결 종료', onClick: function () { store.endDuel(); } })
      ]);
    } else {
      controls = el('div.battle-controls', null, [
        el('button.btn.btn-danger', { text: '맹공', onClick: function () { store.duelAction('strike'); } }),
        el('button.btn', { text: '신중', onClick: function () { store.duelAction('guard'); } }),
        el('button.btn.btn-primary', { text: '허허실실', onClick: function () { store.duelAction('feint'); } }),
        el('button.btn.btn-ghost', { text: '물러서기', onClick: function () { store.duelAction('yield'); } })
      ]);
    }

    return el('div.overlay-panel.battle-panel', null, [
      el('div.overlay-head', null, [el('h2', { text: '일기토 · 제' + b.round + '합' })]),
      el('div.battle-arena', null, [
        fighter('atk', '도전', a, b.aHp),
        el('div.duel-vs', { text: '⚔' }),
        fighter('def', '상대', d, b.dHp)
      ]),
      controls,
      el('div.battle-log', null, b.log.slice(0, 8).map(function (line) {
        return el('div.battle-log-line', { text: line });
      }))
    ]);
  }

  // ============ 설전(논쟁) ============
  function debate(state) {
    var b = state.debate;
    if (!b) return el('div.overlay-panel', null, [head('설전'), el('p', { text: '진행중인 논쟁이 없습니다.' })]);
    var a = store.generalById(b.aId);
    var d = store.generalById(b.dId);

    function speaker(cls, title, g, resolve) {
      var color = g && g.kingdom !== 'neutral' && K(g.kingdom) ? K(g.kingdom).colorLight : '#7a7060';
      var kcolor = g && g.kingdom !== 'neutral' && K(g.kingdom) ? K(g.kingdom).color : '#5a5346';
      return el('div.battle-side.' + cls, { style: { '--kcolor': kcolor } }, [
        el('div.battle-side-title', { text: title }),
        UI.avatar(g ? g.name : '?', color, 56),
        el('div.battle-gen-name', { text: g ? g.name : '무장' }),
        g ? el('div.battle-gen-stat', { text: '지' + store.effStat(g, 'intellect') + ' 정' + store.effStat(g, 'politics') }) : null,
        el('div.battle-troop-bar', null, [el('div.battle-troop-fill', { style: { width: resolve + '%' } })]),
        el('div.battle-troop-num', { text: '논지 ' + resolve })
      ]);
    }

    var controls;
    if (b.over) {
      controls = el('div.battle-controls', null, [
        el('div.battle-result.' + (b.result === 'win' ? 'win' : 'lose'), {
          text: b.result === 'win' ? '승리! ' + (d ? d.name : '상대') + '을(를) 논파했다.' : '논파당했다...'
        }),
        el('button.btn.btn-primary.btn-lg', { text: '설전 종료', onClick: function () { store.endDebate(); } })
      ]);
    } else {
      controls = el('div.battle-controls', null, [
        el('button.btn.btn-danger', { text: '정론', onClick: function () { store.debateAction('logic'); } }),
        el('button.btn.btn-primary', { text: '달변', onClick: function () { store.debateAction('rhetoric'); } }),
        el('button.btn', { text: '반문', onClick: function () { store.debateAction('probe'); } }),
        el('button.btn.btn-ghost', { text: '수긍', onClick: function () { store.debateAction('concede'); } })
      ]);
    }

    return el('div.overlay-panel.battle-panel', null, [
      el('div.overlay-head', null, [el('h2', { text: '설전 · 제' + b.round + '합' })]),
      el('div.battle-arena', null, [
        speaker('atk', '도전', a, b.aResolve),
        el('div.duel-vs', { text: '☯' }),
        speaker('def', '상대', d, b.dResolve)
      ]),
      controls,
      el('div.battle-log', null, b.log.slice(0, 8).map(function (line) {
        return el('div.battle-log-line', { text: line });
      }))
    ]);
  }

  // ============ 등용 / 의형제 ============
  function recruit(state) {
    var pk = state.playerKingdom;
    var gold = state.gold[pk];
    var targets = store.recruitableGenerals();

    function targetCard(g) {
      var isFree = g.free;
      var cost = isFree ? 800 : 1500;
      var chance = store.recruitChance(g);
      var color = g.kingdom !== 'free' && K(g.kingdom) ? K(g.kingdom).colorLight : '#9a8d6f';
      var origin = isFree ? '재야' : (K(g.kingdom) ? K(g.kingdom).name : g.kingdom);
      return el('div.recruit-card', null, [
        el('div.general-top', null, [
          UI.avatar(g.name, color, 48),
          el('div.general-id', null, [
            el('div.general-name', { text: g.name }),
            el('div.general-kingdom', { text: origin + ' · 충성 ' + g.loyalty })
          ])
        ]),
        el('div.recruit-stats', { text: '통' + store.effStat(g, 'command') + ' 무' + store.effStat(g, 'force') + ' 지' + store.effStat(g, 'intellect') + ' 정' + store.effStat(g, 'politics') }),
        el('div.recruit-chance', { text: '등용 성공률 ' + chance + '%' }),
        el('button.btn.btn-primary', {
          text: '등용 (' + cost + '금)',
          disabled: gold < cost,
          onClick: function () { store.recruitTarget(g.id); }
        })
      ]);
    }

    // 의형제 결의 섹션
    var mine = state.generals.filter(function (g) { return g.kingdom === pk; });
    var swornBody;
    if (mine.length < 2) {
      swornBody = el('p.recruit-empty', { text: '의형제를 맺으려면 아군 무장이 둘 이상이어야 합니다.' });
    } else {
      var selA = el('select.sworn-select');
      var selB = el('select.sworn-select');
      mine.forEach(function (g) {
        var oa = document.createElement('option'); oa.value = g.id; oa.textContent = g.name; selA.appendChild(oa);
        var ob = document.createElement('option'); ob.value = g.id; ob.textContent = g.name; selB.appendChild(ob);
      });
      if (mine.length > 1) selB.selectedIndex = 1;
      swornBody = el('div.sworn-form', null, [
        selA,
        el('span.sworn-amp', { text: '⨯' }),
        selB,
        el('button.btn.btn-primary', {
          text: '의형제 결의 (500금)',
          disabled: gold < 500,
          onClick: function () { store.swornOath(selA.value, selB.value); }
        })
      ]);
    }

    return el('div.overlay-panel.recruit-panel', null, [
      head('등용 · 의형제'),
      el('div.recruit-body', null, [
        el('div.generals-section-title', { text: '등용 가능한 무장' }),
        targets.length
          ? el('div.recruit-grid', null, targets.map(targetCard))
          : el('p.recruit-empty', { text: '지금 등용할 수 있는 무장이 없습니다. (재야 무장이나 충성이 흔들리는 타국 무장을 노리세요. 설전/일기토로 충성을 떨어뜨릴 수 있습니다.)' }),
        el('div.generals-section-title', { text: '의형제 결의 (도원결의)' }),
        swornBody
      ]),
      el('div.diplo-gold', { text: '보유 금: ' + gold.toLocaleString() })
    ]);
  }

  global.SAMGUK.Overlays = {
    internal: internal,
    diplomacy: diplomacy,
    generals: generals,
    battle: battle,
    duel: duel,
    debate: debate,
    recruit: recruit
  };
})(window);
