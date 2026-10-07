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

  // ============ 내정 (노부나가의 야망 참고: 군량·민심·세율·시설) ============
  function internal(state) {
    var c = store.cityById(state.selectedCityId);
    if (!c) return el('div.overlay-panel', null, [head('내정'), el('p', { text: '성이 선택되지 않았습니다.' })]);
    var gold = state.gold[state.playerKingdom];

    // 능력치 막대(시설 상한 표시)
    function devStat(label, statKey, buildKey, color) {
      var cap = store.statCap(c.buildings[buildKey]);
      return el('div.dev-stat-row', null, [
        UI.statBar(label, c[statKey], color),
        el('span.dev-cap', { text: '상한 ' + cap + ' · ' + buildKey.replace('irrigation', '관개').replace('market', '시장').replace('fort', '성채') + ' Lv' + c.buildings[buildKey] })
      ]);
    }

    // 개발 명령 버튼
    function devCmd(label, kind, hint) {
      var statKey = kind === 'agriculture' ? 'agriculture' : (kind === 'commerce' ? 'commerce' : 'defense');
      var buildKey = kind === 'agriculture' ? 'irrigation' : (kind === 'commerce' ? 'market' : 'fort');
      var atCap = c[statKey] >= store.statCap(c.buildings[buildKey]);
      return el('div.affair-cmd', null, [
        el('div.affair-cmd-info', null, [
          el('div.affair-cmd-name', { text: label }),
          el('div.affair-cmd-hint', { text: atCap ? '상한 도달 — 시설을 증축하세요' : hint })
        ]),
        el('button.btn.btn-primary', {
          text: '300금',
          disabled: gold < 300 || atCap,
          onClick: function () { store.developCity(c.id, kind); }
        })
      ]);
    }

    // 시설 증축 버튼
    function upgradeCmd(label, buildKey, hint) {
      var lvl = c.buildings[buildKey] || 1;
      var cost = lvl >= 3 ? 0 : (lvl === 1 ? 800 : 1600);
      return el('div.affair-cmd.upgrade-cmd', null, [
        el('div.affair-cmd-info', null, [
          el('div.affair-cmd-name', { text: label + ' Lv' + lvl + (lvl >= 3 ? ' (최대)' : '') }),
          el('div.affair-cmd-hint', { text: hint })
        ]),
        el('button.btn', {
          text: lvl >= 3 ? '최대' : cost + '금',
          disabled: lvl >= 3 || gold < cost,
          onClick: function () { store.upgradeBuilding(c.id, buildKey); }
        })
      ]);
    }

    // 민심 색상
    var moodColor = c.popularity >= 70 ? '#6ab04c' : (c.popularity >= 40 ? '#c9a227' : '#c0392b');
    // 담당관 표시
    var govP = store.governorPolitics(c);
    var govText = govP > 0 ? ('담당관 정치 ' + govP + ' · 개발효율 ×' + store.devEfficiency(c).toFixed(2)) : '담당관 없음 · 개발효율 ×0.80';

    // 세율 선택 버튼
    function taxBtn(rate, label) {
      return el('button.btn.tax-btn' + (c.taxRate === rate ? '.active' : ''), {
        text: label,
        onClick: function () { store.setTaxRate(c.id, rate); }
      });
    }

    return el('div.overlay-panel.internal-panel', { style: { '--kcolor': K(c.kingdom) ? K(c.kingdom).color : '#5a5346' } }, [
      head('내정 · ' + c.name),
      el('div.internal-body', null, [
        // ── 상단: 핵심 자원 요약 ──
        el('div.internal-summary', null, [
          el('div.res-chip', null, [el('span.res-k', { text: '군량' }), el('span.res-v', { text: (c.rice || 0).toLocaleString() })]),
          el('div.res-chip', null, [el('span.res-k', { text: '세수/턴' }), el('span.res-v', { text: '+' + store.cityIncome(c).toLocaleString() + '금' })]),
          el('div.res-chip', null, [el('span.res-k', { text: '군량수지' }), el('span.res-v', { text: (store.cityRiceYield(c) - store.cityRiceUpkeep(c) >= 0 ? '+' : '') + (store.cityRiceYield(c) - store.cityRiceUpkeep(c)).toLocaleString() })]),
          el('div.res-chip', null, [el('span.res-k', { text: '병력' }), el('span.res-v', { text: c.troops.toLocaleString() })])
        ]),
        // ── 능력치 + 민심 ──
        el('div.internal-stats', null, [
          devStat('농업', 'agriculture', 'irrigation', '#6ab04c'),
          devStat('상업', 'commerce', 'market', '#c9a227'),
          devStat('치안', 'defense', 'fort', '#4a90d9'),
          UI.statBar('민심', c.popularity, moodColor),
          el('div.gov-note', { text: govText })
        ]),
        // ── 세율 ──
        el('div.tax-row', null, [
          el('span.tax-label', { text: '세율' }),
          taxBtn('low', '경세'),
          taxBtn('normal', '보통'),
          taxBtn('high', '중세'),
          el('span.tax-hint', { text: '경세: 세수↓ 민심↑ · 중세: 세수↑ 민심↓' })
        ]),
        // ── 개발 명령 ──
        el('div.internal-section-title', { text: '개발' }),
        el('div.internal-cmds', null, [
          devCmd('농업 개발', 'agriculture', '농업↑ · 군량 수확·세수 증가'),
          devCmd('상업 진흥', 'commerce', '상업↑ · 세수 증가'),
          devCmd('성벽 보강', 'defense', '치안↑ · 방어력 상승'),
          el('div.affair-cmd', null, [
            el('div.affair-cmd-info', null, [
              el('div.affair-cmd-name', { text: '민심 안정(구휼)' }),
              el('div.affair-cmd-hint', { text: '민심 +8 · 세수·수확·모집 효율 상승' })
            ]),
            el('button.btn.btn-primary', { text: '250금', disabled: gold < 250, onClick: function () { store.developCity(c.id, 'relief'); } })
          ]),
          el('div.affair-cmd', null, [
            el('div.affair-cmd-info', null, [
              el('div.affair-cmd-name', { text: '병사 모집' }),
              el('div.affair-cmd-hint', { text: '병력↑ (금 200 + 군량 300, 민심 소폭↓)' })
            ]),
            el('button.btn.btn-primary', { text: '200금+군량', disabled: gold < 200 || (c.rice || 0) < 300, onClick: function () { store.developCity(c.id, 'troops'); } })
          ])
        ]),
        // ── 시설 증축 ──
        el('div.internal-section-title', { text: '시설 증축 (능력치 상한·효율 상승)' }),
        el('div.internal-cmds', null, [
          upgradeCmd('관개 시설', 'irrigation', '농업 상한↑ · 수해/가뭄 피해 경감'),
          upgradeCmd('시장', 'market', '상업 세수 배율↑'),
          upgradeCmd('성채', 'fort', '치안 상한↑ · 농성 방어↑')
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

    // 기능(技能) 칩: Lv.1 이상인 기능만 표시
    function skillChips(g) {
      var owned = (S.store.SKILL_DEFS || []).filter(function (sd) { return store.skillLevel(g, sd.id) > 0; });
      if (!owned.length) return null;
      return el('div.skill-chips', null, [el('span.skill-chips-label', { text: '기능' })].concat(
        owned.map(function (sd) {
          return el('span.skill-chip', { title: sd.desc, text: sd.name + ' Lv.' + store.skillLevel(g, sd.id) });
        })
      ));
    }

    // 무장 육성 경험치 바 (현재 레벨 진행도). 상한 도달 시 MAX 표시.
    function expBar(g) {
      var lv = g.level || 1;
      var maxed = lv >= store.GENERAL_LEVEL_MAX;
      var need = store.generalExpForLevel(lv);
      var cur = g.levelExp || 0;
      var pct = maxed ? 100 : Math.max(0, Math.min(100, (cur / need) * 100));
      return el('div.general-exp', null, [
        el('div.general-exp-label', { text: maxed ? '경험치 MAX' : ('경험치 ' + cur + ' / ' + need) }),
        el('div.general-exp-bar', null, [
          el('div.general-exp-fill' + (maxed ? '.maxed' : ''), { style: { width: pct + '%' } })
        ])
      ]);
    }

    function card(g, locked) {
      // 'free'(재야) 등 KINGDOMS에 없는 소속도 안전하게 처리
      var kd = K(g.kingdom);
      var color = kd ? kd.colorLight : '#9a8d6f';
      var kcolor = kd ? kd.color : '#5a5346';
      var kname = kd ? kd.name : '재야';
      var assignment = loc[g.id] ? loc[g.id].name : '재야';
      var mineCard = !locked && g.kingdom === pk;
      return el('div.general-card' + (locked ? '.locked' : ''), { style: { '--kcolor': kcolor } }, [
        el('div.general-top', null, [
          UI.avatar(locked ? '?' : g.name, color, 52),
          el('div.general-id', null, [
            el('div.general-name-row', null, [
              el('div.general-name', { text: locked ? '???' : g.name }),
              // 타국(첩보) 카드는 능력치와 마찬가지로 레벨도 가린다 — 적 무장 성장도 노출 금지
              el('span.general-level' + (locked ? '.masked' : ''), { text: locked ? 'Lv.?' : ('Lv.' + (g.level || 1)) })
            ]),
            el('div.general-kingdom', { text: kname + (locked ? '' : ' · ' + assignment) })
          ])
        ]),
        locked ? el('div.general-locked-note', { text: '아직 정보가 알려지지 않았다.' }) :
          el('div.general-stats', null, [
            statWithSpirit('통솔', g, 'command', '#c0392b'),
            statWithSpirit('무력', g, 'force', '#e67e22'),
            statWithSpirit('지력', g, 'intellect', '#2980b9'),
            statWithSpirit('정치', g, 'politics', '#27ae60'),
            el('div.general-loyalty', { text: '충성 ' + g.loyalty }),
            expBar(g),
            (g.sworn && g.sworn.length) ? el('div.general-sworn', {
              text: '의형제: ' + g.sworn.map(function (sid) { var s = store.generalById(sid); return s ? s.name : ''; }).filter(Boolean).join(', ')
            }) : null,
            el('p.general-bio', { text: g.bio }),
            skillChips(g),
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
      el('div.generals-grid', null, enemy.map(function (g) {
        // 세작(sabotage)으로 첩보가 공개된 국가의 무장은 능력치를 열람할 수 있다.
        var revealed = state.intel && state.intel[g.kingdom];
        return card(g, !revealed);
      }))
    ]);
  }

  // ============ 전투 ============
  var UNIT_LABEL = { infantry: '보', cavalry: '기', archer: '궁' };
  var UNIT_FULL = { infantry: '보병', cavalry: '기병', archer: '궁병' };

  function compBar(comp) {
    // 병종 구성 막대 (보/기/궁)
    var seg = function (t, color) {
      return el('div.comp-seg', { style: { width: Math.round(comp[t] * 100) + '%', background: color }, title: UNIT_FULL[t] }, [
        el('span.comp-seg-lbl', { text: UNIT_LABEL[t] })
      ]);
    };
    return el('div.comp-bar', null, [
      seg('infantry', '#8a6d3b'), seg('cavalry', '#a0522d'), seg('archer', '#4a7a4a')
    ]);
  }

  // 계략 선택 패널: store.TACTICS를 나열하고 각 계략의 쿨다운/유불리를 표시한다.
  function tacticMenu(b) {
    var defMain = store.mainUnit(b.defComp);
    var rows = (store.TACTICS || []).map(function (tac) {
      var cd = (b.tacticCd && b.tacticCd[tac.id]) || 0;
      var onCd = cd > 0;
      var tags = tac.tags || {};

      // 상황 유불리 산정: 야전/공성 적성 + 적 주력 상성(vsUnit)
      var score = 0;
      if (b.isSiege) {
        if (tags.siege === 'strong') score += 1;
        if (tags.siege === 'weak') score -= 1;
      } else {
        if (tags.field === 'strong') score += 1;
        if (tags.field === 'weak') score -= 1;
      }
      if (tags.vsUnit && tags.vsUnit === defMain) score += 1;
      if (tags.scalesSupport && (b.defSupport || []).length >= 2) score += 1;
      var favLabel = score > 0 ? '유리' : (score < 0 ? '불리' : '보통');
      var favCls = score > 0 ? 'fav-good' : (score < 0 ? 'fav-bad' : 'fav-neutral');

      var cdLabel = onCd ? ('남은 ' + cd + '라운드') : '사용 가능';

      return el('button.tactic-row' + (onCd ? '.on-cooldown' : ''), {
        disabled: onCd,
        title: tac.desc,
        onClick: onCd ? null : function () { store.battleAction('tactic:' + tac.id); }
      }, [
        el('span.tactic-icon', { text: tac.icon || '計' }),
        el('div.tactic-body', null, [
          el('div.tactic-row-head', null, [
            el('span.tactic-name', { text: tac.name }),
            el('span.tactic-hanja', { text: tac.hanja ? '(' + tac.hanja + ')' : '' }),
            el('span.tactic-fav.' + favCls, { text: favLabel })
          ]),
          el('div.tactic-desc', { text: tac.desc }),
          el('div.tactic-cd' + (onCd ? '.cd-wait' : '.cd-ready'), { text: cdLabel })
        ])
      ]);
    });
    return el('div.tactic-menu', null, [
      el('div.tactic-menu-title', { text: '계략 선택 (計略)' })
    ].concat(rows));
  }

  function battle(state) {
    var b = state.battle;
    if (!b) return el('div.overlay-panel', null, [head('전투'), el('p', { text: '진행중인 전투가 없습니다.' })]);
    var from = store.cityById(b.fromId);
    var to = store.cityById(b.toId);
    var atkGen = b.atkGen ? store.generalById(b.atkGen) : null;
    var defGen = b.defGen ? store.generalById(b.defGen) : null;

    function sideCard(cls, title, gen, troops, max, morale, kingdom, comp, support, formKey) {
      var pct = max > 0 ? Math.max(0, (troops / max) * 100) : 0;
      var kcolor = kingdom === 'neutral' ? '#5a5346' : K(kingdom).color;
      var light = kingdom === 'neutral' ? '#7a7060' : K(kingdom).colorLight;
      var moraleColor = morale >= 60 ? '#6ab04c' : (morale >= 30 ? '#e8c85a' : '#c0392b');
      var form = store.FORMATIONS[formKey];
      var supportNames = (support || []).map(function (id) { var g = store.generalById(id); return g ? g.name : ''; }).filter(Boolean);
      return el('div.battle-side.' + cls, { style: { '--kcolor': kcolor } }, [
        el('div.battle-side-title', { text: title + (form ? ' · ' + form.name + '진' : '') }),
        gen ? UI.avatar(gen.name, light, 54) : UI.avatar('병', '#555', 54),
        el('div.battle-gen-name', { text: gen ? gen.name : '무장 없음' }),
        gen ? el('div.battle-gen-stat', { text: '통' + store.effStat(gen, 'command') + ' 무' + store.effStat(gen, 'force') + ' 지' + store.effStat(gen, 'intellect') }) : null,
        supportNames.length ? el('div.battle-support', { text: '지원: ' + supportNames.join(', ') }) : null,
        // 병력
        el('div.battle-bar-label', { text: '병력 ' + troops.toLocaleString() }),
        el('div.battle-troop-bar', null, [el('div.battle-troop-fill', { style: { width: pct + '%' } })]),
        // 사기
        el('div.battle-bar-label', { text: '사기 ' + morale }),
        el('div.battle-morale-bar', null, [el('div.battle-morale-fill', { style: { width: morale + '%', background: moraleColor } })]),
        // 병종 구성
        comp ? compBar(comp) : null
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
      var menuOpen = !!b._tacticMenuOpen;
      // 진형 선택 버튼
      var formBtns = Object.keys(store.FORMATIONS).map(function (fk) {
        var f = store.FORMATIONS[fk];
        return el('button.btn.form-btn' + (b.atkFormation === fk ? '.active' : ''), {
          text: f.name,
          title: f.desc,
          onClick: function () { store.setBattleFormation(fk); }
        });
      });
      controls = el('div.battle-controls-wrap', null, [
        el('div.battle-form-row', null, [el('span.battle-form-label', { text: '진형' })].concat(formBtns)),
        el('div.battle-controls', null, [
          el('button.btn.btn-danger', { text: '총공격', onClick: function () { store.battleAction('attack'); } }),
          el('button.btn', { text: '방어', onClick: function () { store.battleAction('defend'); } }),
          el('button.btn.btn-primary', { text: '필살전법', onClick: function () { store.battleAction('special'); } }),
          el('button.btn.btn-tactic' + (menuOpen ? '.active' : ''), { text: '전법·계략' + (menuOpen ? ' ▲' : ' ▼'), onClick: function () { store.toggleTacticMenu(); } }),
          canDuel ? el('button.btn.btn-duel', { text: '일기토', onClick: function () { store.startDuelFromBattle(); } }) : null,
          el('button.btn.btn-ghost', { text: '퇴각', onClick: function () { store.battleAction('retreat'); } })
        ]),
        menuOpen ? tacticMenu(b) : null
      ]);
    }

    // 병종 상성 안내 (주력 기준)
    var atkMain = store.mainUnit(b.atkComp), defMain = store.mainUnit(b.defComp);
    var adv = store.unitAdvantage(atkMain, defMain);
    var advText = adv > 1 ? '아군 ' + UNIT_FULL[atkMain] + '이(가) 적 ' + UNIT_FULL[defMain] + '에 상성 우위' :
      (adv < 1 ? '아군 ' + UNIT_FULL[atkMain] + '이(가) 적 ' + UNIT_FULL[defMain] + '에 상성 열세' : '병종 상성 대등');

    return el('div.overlay-panel.battle-panel', null, [
      el('div.overlay-head', null, [
        el('h2', { text: (b.isSiege ? '공성전' : '야전') + ' · ' + from.name + ' → ' + to.name + ' (제' + b.round + '라운드)' })
      ]),
      el('div.battle-advice', { text: advText }),
      el('div.battle-arena', null, [
        sideCard('atk', '공격군', atkGen, b.atkTroops, b.atkMax, b.atkMorale, b.attackerKingdom, b.atkComp, b.atkSupport, b.atkFormation),
        field,
        sideCard('def', '수비군', defGen, b.defTroops, b.defMax, b.defMorale, b.defenderKingdom, b.defComp, b.defSupport, b.defFormation)
      ]),
      controls,
      el('div.battle-log', null, b.log.slice(0, 8).map(function (line) {
        return el('div.battle-log-line', { text: line });
      }))
    ]);
  }

  // 전장 시각화: 병종별 색 유닛, 사기에 따른 흔들림/투명도
  function renderBattleField(b) {
    var SVGNS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 240 160');
    s.setAttribute('class', 'battle-field');
    var atkColor = b.attackerKingdom === 'neutral' ? '#7a7060' : K(b.attackerKingdom).colorLight;
    var defColor = b.defenderKingdom === 'neutral' ? '#7a7060' : K(b.defenderKingdom).colorLight;
    var unitGlyph = { infantry: '步', cavalry: '騎', archer: '弓' };

    // 구성 비율로 8칸을 병종에 배분
    function unitTypes(comp) {
      var arr = [];
      ['infantry', 'cavalry', 'archer'].forEach(function (t) {
        var n = Math.round(comp[t] * 8);
        for (var k = 0; k < n; k++) arr.push(t);
      });
      while (arr.length < 8) arr.push('infantry');
      return arr.slice(0, 8);
    }
    var atkTypes = unitTypes(b.atkComp), defTypes = unitTypes(b.defComp);

    var html = '';
    // 전장 바닥(공성전이면 성벽 느낌)
    html += '<rect x="0" y="0" width="240" height="160" fill="#1a1710"/>';
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 6; c++) {
        html += '<rect x="' + (c * 40) + '" y="' + (r * 40) + '" width="40" height="40" fill="none" stroke="#302b1c" stroke-width="1"/>';
      }
    }
    if (b.isSiege) {
      // 수비측 성벽
      html += '<rect x="196" y="0" width="6" height="160" fill="#6b5a3a" opacity="0.8"/>';
      html += '<rect x="202" y="0" width="38" height="160" fill="#2a2416" opacity="0.5"/>';
    }

    var atkUnits = Math.min(8, Math.ceil(b.atkTroops / (b.atkMax / 8 || 1)));
    var defUnits = Math.min(8, Math.ceil(b.defTroops / (b.defMax / 8 || 1)));
    var atkOp = 0.45 + (b.atkMorale / 100) * 0.55; // 사기 낮으면 흐릿
    var defOp = 0.45 + (b.defMorale / 100) * 0.55;
    var i;
    for (i = 0; i < atkUnits; i++) {
      var ax = (i % 2) * 40 + 22, ay = Math.floor(i / 2) * 40 + 20;
      html += '<circle cx="' + ax + '" cy="' + ay + '" r="12" fill="' + atkColor + '" opacity="' + atkOp.toFixed(2) + '" stroke="#120d06" stroke-width="1"/>';
      html += '<text x="' + ax + '" y="' + (ay + 4) + '" text-anchor="middle" font-size="12" fill="#120d06">' + unitGlyph[atkTypes[i]] + '</text>';
    }
    for (i = 0; i < defUnits; i++) {
      var dx = 240 - ((i % 2) * 40 + 22), dy = Math.floor(i / 2) * 40 + 20;
      html += '<circle cx="' + dx + '" cy="' + dy + '" r="12" fill="' + defColor + '" opacity="' + defOp.toFixed(2) + '" stroke="#120d06" stroke-width="1"/>';
      html += '<text x="' + dx + '" y="' + (dy + 4) + '" text-anchor="middle" font-size="12" fill="#120d06">' + unitGlyph[defTypes[i]] + '</text>';
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

  // ============ 장수제 근무/명령 ============
  function officer(state) {
    var g = store.generalById(state.playerGeneralId);
    if (!g) return el('div.overlay-panel', null, [head('근무'), el('p', { text: '무장 정보가 없습니다.' })]);
    var rank = store.currentRank();
    var nr = store.nextRank();
    var c = store.officerCity();
    var acted = state.actedThisTurn;
    var k = K(state.playerKingdom);

    // 공훈 진행 막대
    var prevMerit = rank.merit;
    var meritPct = nr ? Math.max(0, Math.min(100, ((state.merit - prevMerit) / (nr.merit - prevMerit)) * 100)) : 100;

    function cmd(label, hint, onClick, disabled) {
      return el('div.affair-cmd', null, [
        el('div.affair-cmd-info', null, [
          el('div.affair-cmd-name', { text: label }),
          el('div.affair-cmd-hint', { text: hint })
        ]),
        el('button.btn.btn-primary', { text: acted ? '근무완료' : '수행', disabled: disabled || acted, onClick: onClick })
      ]);
    }

    // 삼혼 훈련 버튼
    function trainBtn(kind, label) {
      return el('button.btn.officer-train-btn', {
        disabled: acted,
        onClick: function () { store.officerTrainSelf(kind); }
      }, [el('span', { text: label }), el('span.spirit-val', { text: String((g.spirit && g.spirit[kind]) || 0) })]);
    }

    var canGovern = rank.canGovern;
    var canIndep = rank.canIndependent;

    return el('div.overlay-panel.officer-panel', { style: { '--kcolor': k.color } }, [
      head('근무 · ' + g.name + ' (' + rank.name + ')'),
      el('div.officer-body', null, [
        // 신상 요약
        el('div.officer-summary', null, [
          el('div.res-chip', null, [el('span.res-k', { text: '관직' }), el('span.res-v', { text: rank.name })]),
          el('div.res-chip', null, [el('span.res-k', { text: '공훈' }), el('span.res-v', { text: String(state.merit) })]),
          el('div.res-chip', null, [el('span.res-k', { text: '봉록/턴' }), el('span.res-v', { text: '+' + rank.stipend })]),
          el('div.res-chip', null, [el('span.res-k', { text: '재산' }), el('span.res-v', { text: state.personalGold.toLocaleString() })])
        ]),
        // 승진 진행
        el('div.officer-promo', null, [
          el('div.officer-promo-label', { text: nr ? ('다음 관직: ' + nr.name + ' (공훈 ' + nr.merit + ')') : '최고 관직에 올랐습니다.' }),
          el('div.stat-track', null, [el('div.stat-fill', { style: { width: meritPct + '%', background: '#c9a227' } })])
        ]),
        // 능력치
        el('div.officer-stats', null, [
          UI.statBar('통솔', store.effStat(g, 'command'), '#c0392b'),
          UI.statBar('무력', store.effStat(g, 'force'), '#e67e22'),
          UI.statBar('지력', store.effStat(g, 'intellect'), '#2980b9'),
          UI.statBar('정치', store.effStat(g, 'politics'), '#27ae60')
        ]),
        acted ? el('div.officer-acted-note', { text: '이번 턴 근무를 마쳤습니다. 턴을 종료하면 봉록을 받고 다시 근무할 수 있습니다.' }) : null,
        // 근무 명령
        el('div.internal-section-title', { text: '근무 (턴당 1회)' }),
        el('div.internal-cmds', null, [
          cmd('내정 근무', (c ? c.name : '성') + ' 농업 개발 · 공훈·금·지혼', function () { store.officerAdminService('agriculture'); }),
          cmd('상업 근무', (c ? c.name : '성') + ' 상업 진흥 · 공훈·금·지혼', function () { store.officerAdminService('commerce'); }),
          cmd('치안 근무', (c ? c.name : '성') + ' 치안·민심 · 공훈·금', function () { store.officerAdminService('defense'); }),
          cmd('임무 수행', '순찰·토벌로 공훈과 재산 획득 (성패 있음)', function () { store.officerMission(); }),
          cmd('출전', '전선으로 출전하여 전투를 지휘 (큰 공훈)', function () { store.officerSortie(); })
        ]),
        // 자기 수련
        el('div.internal-section-title', { text: '수련 (삼혼 단련, 턴당 1회)' }),
        el('div.officer-train-row', null, [
          trainBtn('command', '통솔혼'),
          trainBtn('martial', '무혼'),
          trainBtn('mind', '지혼')
        ]),
        // 사사(師事) — 기능 수련 (태합입지전5)
        el('div.internal-section-title', { text: '사사(師事) · 기능 수련 (150금, 턴당 1회)' }),
        el('div.skill-study-grid', null, (S.store.SKILL_DEFS || []).map(function (sd) {
          var lv = store.skillLevel(g, sd.id);
          var pct = lv >= store.SKILL_MAX ? 100 : Math.round(((g.skillExp && g.skillExp[sd.id] || 0) / store.SKILL_EXP_PER_LEVEL) * 100);
          return el('button.btn.skill-study-btn' + (lv >= store.SKILL_MAX ? '.maxed' : ''), {
            disabled: acted || lv >= store.SKILL_MAX || state.personalGold < 150,
            title: sd.desc,
            onClick: function () { store.officerStudy(sd.id); }
          }, [
            el('span.skill-study-name', { text: sd.name + ' Lv.' + lv }),
            el('span.skill-study-track', null, [el('span.skill-study-fill', { style: { width: pct + '%' } })])
          ]);
        })),
        // 출세 (고위직)
        el('div.internal-section-title', { text: '출세' }),
        el('div.officer-advance', null, [
          el('div.officer-advance-note', {
            text: canGovern ? '장군 이상: 지도에서 아군 성을 골라 태수로 부임할 수 있습니다.' : '장군이 되면 성을 다스릴 수 있습니다.'
          }),
          el('button.btn.btn-danger', {
            text: '실권 장악(군주 승계)',
            disabled: !canIndep,
            onClick: function () { store.officerDeclareIndependence(); }
          }),
          el('div.officer-advance-note', { text: canIndep ? '태수 이상: 세력의 실권을 장악해 직접 군주가 됩니다.' : '태수 이상이 되면 실권을 장악할 수 있습니다.' })
        ])
      ])
    ]);
  }

  // ============ 모략(謀略) · 전투 밖 전략 계략 ============
  function scheme(state) {
    var officerMode = state.playMode === 'officer';
    var STAT_LABEL = { intellect: '지력', politics: '정치' };

    // 대상 후보(FEAT-001 store 셀렉터)
    var cities = store.schemeTargetCities();
    var kingdoms = store.schemeTargetKingdoms();
    var gens = store.schemeTargetGenerals();

    function kname(k) { return K(k) ? K(k).name : k; }

    // 주체 무장 요약(계략별 focusStat 가 다르므로 대표로 지력/정치 각각 안내)
    function agentSummary() {
      var chips = [];
      ['intellect', 'politics'].forEach(function (focus) {
        var ag = store.schemeAgent({ focusStat: focus });
        chips.push(el('div.res-chip', null, [
          el('span.res-k', { text: STAT_LABEL[focus] + ' 주체' }),
          el('span.res-v', { text: ag ? (ag.name + ' (' + store.effStat(ag, focus) + ')') : '없음' })
        ]));
      });
      return chips;
    }

    // 자원/턴 요약
    function resourceSummary() {
      var chips = [];
      if (officerMode) {
        chips.push(el('div.res-chip', null, [el('span.res-k', { text: '재산' }), el('span.res-v', { text: state.personalGold.toLocaleString() })]));
        chips.push(el('div.res-chip', null, [el('span.res-k', { text: '공훈' }), el('span.res-v', { text: String(state.merit) })]));
        chips.push(el('div.res-chip', null, [el('span.res-k', { text: '행동' }), el('span.res-v', { text: state.actedThisTurn ? '소진' : '가능' })]));
      } else {
        var pk = state.playerKingdom;
        var used = state.schemesUsedThisTurn || 0;
        var cap = store.SCHEMES_PER_TURN_RULER || 2;
        chips.push(el('div.res-chip', null, [el('span.res-k', { text: '국고' }), el('span.res-v', { text: (state.gold[pk] || 0).toLocaleString() })]));
        chips.push(el('div.res-chip', null, [el('span.res-k', { text: '이번 턴' }), el('span.res-v', { text: used + ' / ' + cap + '회' })]));
      }
      return chips;
    }

    // targetType 별 대상 select + 성공률/실행
    function schemeRow(sc) {
      var cd = store.schemeCooldown(sc.id);
      var blocked = store.schemeBlockReason(sc.id); // null 이면 사용 가능
      var costText = officerMode
        ? (store.schemeOfficerGold(sc).toLocaleString() + '금 · 공훈 ' + sc.costMerit)
        : (sc.costGold.toLocaleString() + '금');

      // 대상 select 구성
      var selA = null, selB = null, controls = [], ctxBuilder;
      if (sc.targetType === 'city') {
        selA = el('select.scheme-select');
        if (!cities.length) { var oc = document.createElement('option'); oc.textContent = '대상 성 없음'; oc.value = ''; selA.appendChild(oc); }
        cities.forEach(function (c) {
          var o = document.createElement('option'); o.value = c.id;
          o.textContent = c.name + ' (' + kname(c.kingdom) + ')';
          selA.appendChild(o);
        });
        if (state.selectedCityId) {
          var pre = cities.filter(function (c) { return c.id === state.selectedCityId; });
          if (pre.length) selA.value = state.selectedCityId;
        }
        controls.push(selA);
        ctxBuilder = function () {
          var c = store.cityById(selA.value);
          return { targetType: 'city', city: c };
        };
      } else if (sc.targetType === 'general') {
        selA = el('select.scheme-select');
        if (!gens.length) { var og = document.createElement('option'); og.textContent = '대상 무장 없음'; og.value = ''; selA.appendChild(og); }
        gens.forEach(function (g) {
          var o = document.createElement('option'); o.value = g.id;
          o.textContent = g.name + ' (' + kname(g.kingdom) + ' · 충' + g.loyalty + ')';
          selA.appendChild(o);
        });
        controls.push(selA);
        ctxBuilder = function () {
          var g = store.generalById(selA.value);
          return { targetType: 'general', general: g };
        };
      } else if (sc.id === 'discord') {
        selA = el('select.scheme-select');
        selB = el('select.scheme-select');
        kingdoms.forEach(function (k) {
          var oa = document.createElement('option'); oa.value = k; oa.textContent = kname(k); selA.appendChild(oa);
          var ob = document.createElement('option'); ob.value = k; ob.textContent = kname(k); selB.appendChild(ob);
        });
        if (kingdoms.length > 1) selB.selectedIndex = 1;
        controls.push(selA, el('span.scheme-amp', { text: '⨯' }), selB);
        ctxBuilder = function () {
          return { targetType: 'kingdom', kingdomA: selA.value, kingdomB: selB.value };
        };
      } else { // kingdom (sabotage)
        selA = el('select.scheme-select');
        if (!kingdoms.length) { var ok = document.createElement('option'); ok.textContent = '대상 적국 없음'; ok.value = ''; selA.appendChild(ok); }
        kingdoms.forEach(function (k) {
          var o = document.createElement('option'); o.value = k; o.textContent = kname(k); selA.appendChild(o);
        });
        controls.push(selA);
        ctxBuilder = function () {
          return { targetType: 'kingdom', kingdom: selA.value };
        };
      }

      // 예상 성공률(현재 선택값 기준).
      function currentCtx() { return ctxBuilder(); }
      function currentHasTarget() {
        return sc.id === 'discord'
          ? !!(selA.value && selB.value && selA.value !== selB.value)
          : !!(selA && selA.value);
      }

      var chanceEl = el('span.scheme-chance');
      var reasonEl = el('span.scheme-reason');
      var runBtn = el('button.btn.btn-primary.scheme-run', { onClick: function () {
        var c2 = currentCtx();
        if (sc.id === 'discord') store.executeScheme(sc.id, c2.kingdomA, c2.kingdomB);
        else if (sc.targetType === 'city') store.executeScheme(sc.id, c2.city ? c2.city.id : null);
        else if (sc.targetType === 'general') store.executeScheme(sc.id, c2.general ? c2.general.id : null);
        else store.executeScheme(sc.id, c2.kingdom);
      } }, [el('span', { text: '실행' })]);

      // 선택값 기준으로 성공률/실행버튼/사유를 갱신(전체 재렌더 없이 로컬 갱신)
      function refresh() {
        var cc = store.schemeChance(sc, currentCtx());
        chanceEl.textContent = '성공률 ' + Math.round(cc.chance * 100) + '%';
        var hasTarget = currentHasTarget();
        var disabled = !!blocked || !hasTarget;
        runBtn.disabled = disabled;
        var reasonText = blocked ? blocked : (!hasTarget ? '대상을 선택하세요.' : '');
        reasonEl.textContent = reasonText;
      }
      controls.forEach(function (ctrl) {
        if (ctrl.tagName === 'SELECT') ctrl.onchange = function () {
          // 성(城) 대상은 지도 선택 상태도 유지
          if (sc.targetType === 'city' && ctrl === selA && selA.value) store.selectCity(selA.value);
          refresh();
        };
      });
      refresh();

      return el('div.scheme-row', null, [
        el('div.scheme-row-head', null, [
          el('span.scheme-icon', { text: sc.icon }),
          el('div.scheme-id', null, [
            el('div.scheme-name', { text: sc.name + ' · ' + sc.hanja }),
            el('div.scheme-desc', { text: sc.desc })
          ])
        ]),
        el('div.scheme-meta', null, [
          el('span.scheme-cost', { text: '코스트 ' + costText }),
          chanceEl,
          cd > 0 ? el('span.scheme-cd', { text: '대기 ' + cd + '턴' }) : el('span.scheme-cd.ready', { text: '사용 가능' })
        ]),
        el('div.scheme-target', null, controls),
        el('div.scheme-run-row', null, [
          runBtn,
          reasonEl
        ])
      ]);
    }

    var schemes = store.SCHEMES || [];
    return el('div.overlay-panel.scheme-panel', null, [
      head('모략 · 謀略'),
      el('div.scheme-body', null, [
        el('div.scheme-summary', null, agentSummary().concat(resourceSummary())),
        el('div.scheme-hint', { text: officerMode
          ? '모략은 1턴에 1회(근무 행동 소비) 수행할 수 있습니다. 개인 재산으로 비용을 치릅니다.'
          : '모략은 1턴에 ' + (store.SCHEMES_PER_TURN_RULER || 2) + '회까지 수행할 수 있습니다. 국고로 비용을 치릅니다.' }),
        el('div.scheme-list', null, schemes.map(schemeRow))
      ])
    ]);
  }

  // ============ 세이브 / 로드 ============
  // mode: 'full'(저장+불러오기, 게임 중) | 'load'(불러오기 전용, 타이틀)
  function saveload(state) {
    var saves = store.listSaves();
    var inGame = state.phase === 'game';
    var canStore = store.storageAvailable();

    function fmtTime(ts) {
      if (!ts) return '';
      try {
        var d = new Date(ts);
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
      } catch (e) { return ''; }
    }
    function levelLabel(lv) { return { normal: '보통', hard: '어려움', hell: '지옥' }[lv] || '보통'; }

    function slotRow(slot, isAuto) {
      var meta = saves[slot];
      var label = isAuto ? '자동 저장' : ('슬롯 ' + slot);
      var info;
      if (meta) {
        info = el('div.slot-info', null, [
          el('div.slot-title', { text: label }),
          el('div.slot-sub', { text: meta.sub + ' · 난이도 ' + levelLabel(meta.aiLevel) }),
          el('div.slot-meta', { text: meta.year + '년 ' + meta.turn + '턴 · ' + fmtTime(meta.savedAt) })
        ]);
      } else {
        info = el('div.slot-info', null, [
          el('div.slot-title', { text: label }),
          el('div.slot-sub.empty', { text: '— 비어 있음 —' })
        ]);
      }
      var actions = [];
      // 저장 (수동 슬롯, 게임 중에만)
      if (!isAuto && inGame) {
        actions.push(el('button.btn.btn-primary', { text: '저장', onClick: function () { store.saveGame(slot); } }));
      }
      // 불러오기 (메타 있을 때)
      if (meta) {
        actions.push(el('button.btn', { text: '불러오기', onClick: function () { store.loadGame(slot); } }));
        actions.push(el('button.btn.btn-danger', { text: '삭제', onClick: function () { store.deleteSave(slot); } }));
      }
      return el('div.slot-row' + (meta ? '' : '.empty'), null, [
        info,
        el('div.slot-actions', null, actions)
      ]);
    }

    var rows = [slotRow('auto', true)].concat(store.SAVE_SLOTS.map(function (s) { return slotRow(s, false); }));

    return el('div.overlay-panel.saveload-panel', null, [
      head(inGame ? '저장 / 불러오기' : '이어하기'),
      el('div.saveload-body', null,
        canStore ? rows : [el('p.saveload-warn', { text: '이 브라우저(사생활 보호 모드 등)에서는 저장 기능을 쓸 수 없습니다.' })]
      ),
      el('div.saveload-note', { text: '자동 저장은 매 턴 종료 시 갱신됩니다. 저장은 이 브라우저에만 보관됩니다.' })
    ]);
  }

  global.SAMGUK.Overlays = {
    internal: internal,
    diplomacy: diplomacy,
    generals: generals,
    battle: battle,
    duel: duel,
    debate: debate,
    recruit: recruit,
    officer: officer,
    scheme: scheme,
    saveload: saveload
  };
})(window);
