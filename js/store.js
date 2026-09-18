// 삼국기 - 게임 상태 저장소 및 핵심 로직 (순수 JS)
// Zustand 스토어 개념을 순수 상태 객체 + 구독/렌더 함수로 치환
(function (global) {
  'use strict';

  var S = global.SAMGUK;

  // ---- 상태 ----
  var state = null;
  var listeners = [];

  function deepCopyCities(cities) {
    return cities.map(function (c) {
      return {
        id: c.id, name: c.name, kingdom: c.kingdom, province: c.province,
        x: c.x, y: c.y, population: c.population,
        agriculture: c.agriculture, commerce: c.commerce, defense: c.defense,
        troops: c.troops, generals: c.generals.slice()
      };
    });
  }

  function deepCopyGenerals(gens) {
    return gens.map(function (g) {
      return {
        id: g.id, name: g.name, kingdom: g.kingdom,
        command: g.command, force: g.force, intellect: g.intellect,
        politics: g.politics, loyalty: g.loyalty, bio: g.bio
      };
    });
  }

  function createInitialState() {
    return {
      phase: 'title',        // title | kingdom-select | game | victory | defeat
      overlay: null,         // null | internal | diplomacy | battle | generals | event
      playerKingdom: null,
      turn: 1,
      year: 400,
      cities: deepCopyCities(S.INITIAL_CITIES),
      generals: deepCopyGenerals(S.GENERALS),
      gold: { goguryeo: 3000, baekje: 3000, silla: 3000 },
      // 외교 관계: 상대국 -> {relation(-100~100), alliance, war}
      diplomacy: {
        goguryeo: {
          baekje: { relation: 0, alliance: false, war: false },
          silla: { relation: 0, alliance: false, war: false }
        },
        baekje: {
          goguryeo: { relation: 0, alliance: false, war: false },
          silla: { relation: 0, alliance: false, war: false }
        },
        silla: {
          goguryeo: { relation: 0, alliance: false, war: false },
          baekje: { relation: 0, alliance: false, war: false }
        }
      },
      selectedCityId: null,
      battle: null,          // 전투 상태
      firedEvents: {},       // 발생한 이벤트 id 기록
      eventLog: [],          // 최근 이벤트/알림 로그
      pendingEvent: null,    // 표시 대기중인 이벤트
      message: null          // 짧은 토스트 메시지
    };
  }

  // ---- 구독 ----
  function subscribe(fn) { listeners.push(fn); }
  function notify() { listeners.forEach(function (fn) { fn(state); }); }
  function getState() { return state; }

  // ---- 유틸 ----
  function citiesOf(kingdom) {
    return state.cities.filter(function (c) { return c.kingdom === kingdom; });
  }
  function generalById(id) {
    for (var i = 0; i < state.generals.length; i++) {
      if (state.generals[i].id === id) return state.generals[i];
    }
    return null;
  }
  function cityById(id) {
    for (var i = 0; i < state.cities.length; i++) {
      if (state.cities[i].id === id) return state.cities[i];
    }
    return null;
  }
  function kingdomTroops(kingdom) {
    return citiesOf(kingdom).reduce(function (sum, c) { return sum + c.troops; }, 0);
  }
  function kingdomIncome(kingdom) {
    // 상업 + 농업 기반 세수
    return citiesOf(kingdom).reduce(function (sum, c) {
      return sum + Math.round(c.commerce * 6 + c.agriculture * 4);
    }, 0);
  }
  function pushLog(text) {
    state.eventLog.unshift({ turn: state.turn, year: state.year, text: text });
    if (state.eventLog.length > 30) state.eventLog.pop();
  }
  function toast(msg) { state.message = msg; }

  var AI_KINGDOMS = S.KINGDOM_ORDER;

  // ---- 액션들 ----
  function newGame() {
    state = createInitialState();
    state.phase = 'kingdom-select';
    notify();
  }

  function goTitle() {
    state = createInitialState();
    notify();
  }

  function selectKingdom(kingdom) {
    state.playerKingdom = kingdom;
    state.phase = 'game';
    // 중립 관계 초기값을 약간 부여 (긴장 반영)
    pushLog(S.KINGDOMS[kingdom].name + '의 군주가 되어 삼국 통일의 대업을 시작한다.');
    notify();
  }

  function selectCity(id) {
    state.selectedCityId = id;
    notify();
  }

  function openOverlay(name) { state.overlay = name; notify(); }
  function closeOverlay() { state.overlay = null; state.battle = null; notify(); }

  // 내정: 개발
  function developCity(cityId, kind) {
    var c = cityById(cityId);
    if (!c) return;
    var cost = kind === 'troops' ? 200 : 300;
    if (state.gold[state.playerKingdom] < cost) { toast('금이 부족합니다.'); notify(); return; }
    state.gold[state.playerKingdom] -= cost;
    if (kind === 'agriculture') c.agriculture = Math.min(100, c.agriculture + 6);
    else if (kind === 'commerce') c.commerce = Math.min(100, c.commerce + 6);
    else if (kind === 'defense') c.defense = Math.min(100, c.defense + 6);
    else if (kind === 'troops') c.troops += 1500;
    toast('명령을 완료했습니다.');
    notify();
  }

  // 외교
  function envoy(target) {
    var rel = state.diplomacy[state.playerKingdom][target];
    var cost = 300;
    if (state.gold[state.playerKingdom] < cost) { toast('금이 부족합니다.'); notify(); return; }
    state.gold[state.playerKingdom] -= cost;
    rel.relation = Math.min(100, rel.relation + 12);
    // 상대측 관계도 동기화
    state.diplomacy[target][state.playerKingdom].relation = rel.relation;
    toast(S.KINGDOMS[target].name + '에 사신을 보냈습니다. (관계 +12)');
    notify();
  }

  function tribute(target) {
    var rel = state.diplomacy[state.playerKingdom][target];
    var cost = 1000;
    if (state.gold[state.playerKingdom] < cost) { toast('금이 부족합니다.'); notify(); return; }
    state.gold[state.playerKingdom] -= cost;
    rel.relation = Math.min(100, rel.relation + 30);
    state.diplomacy[target][state.playerKingdom].relation = rel.relation;
    toast(S.KINGDOMS[target].name + '에 조공을 바쳤습니다. (관계 +30)');
    notify();
  }

  function proposeAlliance(target) {
    var rel = state.diplomacy[state.playerKingdom][target];
    if (rel.relation < 30) { toast('관계가 낮아 동맹을 맺을 수 없습니다. (30 이상 필요)'); notify(); return; }
    // AI 수락 확률: 관계에 비례
    var accept = Math.random() * 100 < (rel.relation + 20);
    if (accept) {
      rel.alliance = true; rel.war = false;
      state.diplomacy[target][state.playerKingdom].alliance = true;
      state.diplomacy[target][state.playerKingdom].war = false;
      toast(S.KINGDOMS[target].name + '이(가) 동맹을 수락했습니다!');
      pushLog(S.KINGDOMS[state.playerKingdom].name + '와 ' + S.KINGDOMS[target].name + '이 동맹을 맺었다.');
    } else {
      rel.relation = Math.max(-100, rel.relation - 5);
      state.diplomacy[target][state.playerKingdom].relation = rel.relation;
      toast(S.KINGDOMS[target].name + '이(가) 동맹을 거절했습니다.');
    }
    notify();
  }

  function declareWar(target) {
    var rel = state.diplomacy[state.playerKingdom][target];
    rel.war = true; rel.alliance = false;
    rel.relation = Math.max(-100, rel.relation - 40);
    var back = state.diplomacy[target][state.playerKingdom];
    back.war = true; back.alliance = false; back.relation = rel.relation;
    toast(S.KINGDOMS[target].name + '에 선전포고했습니다!');
    pushLog(S.KINGDOMS[state.playerKingdom].name + '이 ' + S.KINGDOMS[target].name + '에 선전포고했다.');
    notify();
  }

  // 무장 배치
  function assignGeneral(generalId, cityId) {
    var g = generalById(generalId);
    if (!g) return;
    // 기존 도시에서 제거
    state.cities.forEach(function (c) {
      var idx = c.generals.indexOf(generalId);
      if (idx >= 0) c.generals.splice(idx, 1);
    });
    if (cityId) {
      var target = cityById(cityId);
      if (target && target.kingdom === g.kingdom) target.generals.push(generalId);
    }
    notify();
  }

  // ---- 전투 ----
  function bestGeneral(city) {
    var best = null;
    city.generals.forEach(function (gid) {
      var g = generalById(gid);
      if (g && (!best || g.command + g.force > best.command + best.force)) best = g;
    });
    return best;
  }

  function startBattle(fromCityId, toCityId) {
    var from = cityById(fromCityId);
    var to = cityById(toCityId);
    if (!from || !to) return;
    var atkGen = bestGeneral(from);
    var defGen = bestGeneral(to);
    var deploy = Math.min(from.troops - 500, Math.floor(from.troops * 0.7));
    if (deploy < 500) { toast('출병할 병력이 부족합니다.'); notify(); return; }
    state.battle = {
      fromId: fromCityId,
      toId: toCityId,
      attackerKingdom: from.kingdom,
      defenderKingdom: to.kingdom,
      atkGen: atkGen ? atkGen.id : null,
      defGen: defGen ? defGen.id : null,
      atkTroops: deploy,
      defTroops: to.troops,
      atkMax: deploy,
      defMax: to.troops,
      round: 1,
      log: ['전투 개시! ' + from.name + ' → ' + to.name],
      over: false,
      result: null
    };
    state.overlay = 'battle';
    notify();
  }

  function genStat(id, key, fallback) {
    var g = id ? generalById(id) : null;
    return g ? g[key] : fallback;
  }

  function battleAction(action) {
    var b = state.battle;
    if (!b || b.over) return;
    var to = cityById(b.toId);

    var atkPow = genStat(b.atkGen, 'command', 60) * 0.5 + genStat(b.atkGen, 'force', 60) * 0.5;
    var defPow = genStat(b.defGen, 'command', 55) * 0.5 + genStat(b.defGen, 'force', 55) * 0.5;
    var terrain = 1 + (to.defense / 400); // 방어측 지형 보정

    var rand = function () { return 0.8 + Math.random() * 0.4; };

    if (action === 'retreat') {
      b.over = true; b.result = 'retreat';
      b.log.unshift('공격군이 퇴각했다. 전투 종료.');
      applyBattleResult();
      notify();
      return;
    }

    var atkMult = action === 'attack' ? 1.2 : (action === 'special' ? 1.5 : 0.7);
    var defTakeMult = action === 'defend' ? 0.6 : 1.0;

    // 공격군이 방어군에 주는 피해
    var dmgToDef = Math.round((b.atkTroops * 0.10) * (atkPow / 60) * atkMult * rand());
    // 방어군이 공격군에 주는 피해 (지형/특수 반영)
    var dmgToAtk = Math.round((b.defTroops * 0.09) * (defPow / 60) * terrain * defTakeMult * rand());

    b.defTroops = Math.max(0, b.defTroops - dmgToDef);
    b.atkTroops = Math.max(0, b.atkTroops - dmgToAtk);

    var actName = { attack: '총공격', defend: '방어 태세', special: '필살 전법' }[action] || action;
    b.log.unshift('제' + b.round + '라운드 [' + actName + '] · 적 -' + dmgToDef + ', 아군 -' + dmgToAtk);
    b.round++;

    if (b.defTroops <= 0) {
      b.over = true; b.result = 'win';
      b.log.unshift('적의 수비군이 전멸했다! 성을 함락한다.');
      applyBattleResult();
    } else if (b.atkTroops <= 0) {
      b.over = true; b.result = 'lose';
      b.log.unshift('아군이 전멸했다. 공격 실패.');
      applyBattleResult();
    } else if (b.round > 12) {
      b.over = true; b.result = b.atkTroops > b.defTroops ? 'win' : 'lose';
      b.log.unshift('전투가 장기화되어 종료되었다.');
      applyBattleResult();
    }
    notify();
  }

  function applyBattleResult() {
    var b = state.battle;
    var from = cityById(b.fromId);
    var to = cityById(b.toId);

    if (b.result === 'win') {
      // 성 점령: 소유권 이전, 잔여 병력 이동
      var conquerer = b.attackerKingdom;
      // 방어측 무장은 흩어짐(현 위치 무장 제거 후 정복측이 접수하지 않음: 중립화)
      to.kingdom = conquerer;
      to.troops = Math.max(500, b.atkTroops);
      // 공격 무장을 새 성으로 이동
      if (b.atkGen) {
        state.cities.forEach(function (c) {
          var idx = c.generals.indexOf(b.atkGen);
          if (idx >= 0) c.generals.splice(idx, 1);
        });
        to.generals = [b.atkGen];
      }
      // 남은 병력은 원 성에 반영
      from.troops = Math.max(0, from.troops - b.atkMax);
      pushLog(S.KINGDOMS[conquerer].name + '이 ' + to.name + '을(를) 점령했다.');
    } else {
      // 실패/퇴각: 손실 반영
      from.troops = Math.max(0, from.troops - (b.atkMax - b.atkTroops));
      to.troops = b.defTroops;
      pushLog(S.KINGDOMS[b.attackerKingdom].name + '의 ' + to.name + ' 공략이 실패했다.');
    }
    checkEndConditions();
  }

  function endBattle() {
    state.battle = null;
    state.overlay = null;
    notify();
  }

  // ---- 이벤트 API ----
  var eventApi = {
    boostKingdomTroops: function (st, k, mult) {
      citiesOfIn(st, k).forEach(function (c) { c.troops = Math.round(c.troops * mult); });
    },
    boostKingdomDefense: function (st, k, amt) {
      citiesOfIn(st, k).forEach(function (c) { c.defense = Math.min(100, c.defense + amt); });
    },
    boostKingdomGold: function (st, k, amt) { st.gold[k] += amt; },
    boostCity: function (st, id, obj) {
      var c = null;
      st.cities.forEach(function (x) { if (x.id === id) c = x; });
      if (!c) return;
      Object.keys(obj).forEach(function (key) {
        c[key] = Math.min(100, (c[key] || 0) + obj[key]);
      });
    },
    allCities: function (st, fn) { st.cities.forEach(fn); },
    raiseTension: function (st) {
      S.KINGDOM_ORDER.forEach(function (a) {
        S.KINGDOM_ORDER.forEach(function (b) {
          if (a !== b) st.diplomacy[a][b].relation = Math.max(-100, st.diplomacy[a][b].relation - 10);
        });
      });
    }
  };
  function citiesOfIn(st, kingdom) {
    return st.cities.filter(function (c) { return c.kingdom === kingdom; });
  }

  function checkAndTriggerEvent() {
    for (var i = 0; i < S.EVENTS.length; i++) {
      var ev = S.EVENTS[i];
      if (state.firedEvents[ev.id]) continue;
      if (state.turn < ev.turnMin || state.turn > ev.turnMax) continue;
      // 국가 한정 이벤트면 해당 국가가 아직 존재해야 함
      if (ev.kingdom && citiesOf(ev.kingdom).length === 0) continue;
      // 발생 확률
      if (Math.random() < 0.35) {
        state.firedEvents[ev.id] = true;
        var msg = ev.effect(state, eventApi);
        pushLog('[' + ev.name + '] ' + msg);
        state.pendingEvent = {
          name: ev.name, year: ev.year, description: ev.description, resultText: msg
        };
        return true;
      }
    }
    return false;
  }

  function dismissEvent() {
    state.pendingEvent = null;
    notify();
  }

  // ---- AI ----
  function runAI() {
    AI_KINGDOMS.forEach(function (k) {
      if (k === state.playerKingdom) return;
      if (citiesOf(k).length === 0) return;
      var myCities = citiesOf(k);
      var income = kingdomIncome(k);
      state.gold[k] += income;

      // 내정: 무작위 도시 개발
      var target = myCities[Math.floor(Math.random() * myCities.length)];
      var pick = Math.random();
      if (state.gold[k] >= 300) {
        state.gold[k] -= 300;
        if (pick < 0.33) target.agriculture = Math.min(100, target.agriculture + 5);
        else if (pick < 0.66) target.commerce = Math.min(100, target.commerce + 5);
        else target.defense = Math.min(100, target.defense + 5);
      }
      // 병력 모집
      if (state.gold[k] >= 400 && target.troops < 8000) {
        state.gold[k] -= 400;
        target.troops += 1200;
      }

      // 공격 판단: 인접 국가(플레이어 포함) 중 병력 우위가 큰 대상 공격
      var enemies = S.KINGDOM_ORDER.filter(function (o) {
        return o !== k && o !== 'neutral' && !state.diplomacy[k][o].alliance && citiesOf(o).length > 0;
      });
      // 중립 도시도 공격 후보
      var myTroops = kingdomTroops(k);
      enemies.forEach(function (en) {
        var enTroops = kingdomTroops(en);
        var atWar = state.diplomacy[k][en].war;
        if ((atWar || Math.random() < 0.1) && myTroops > enTroops * 1.5) {
          aiAttack(k, en);
        }
      });
      // 중립성 정복 시도
      var neutrals = state.cities.filter(function (c) { return c.kingdom === 'neutral'; });
      if (neutrals.length && Math.random() < 0.3) {
        aiAttackCity(k, neutrals[Math.floor(Math.random() * neutrals.length)]);
      }

      // 외교: 약하면 플레이어에게 우호 시도
      if (myTroops < kingdomTroops(state.playerKingdom) * 0.7 && Math.random() < 0.3) {
        var rel = state.diplomacy[k][state.playerKingdom];
        rel.relation = Math.min(100, rel.relation + 8);
        state.diplomacy[state.playerKingdom][k].relation = rel.relation;
      }
    });
  }

  function aiAttack(attacker, defender) {
    var defCities = citiesOf(defender);
    if (!defCities.length) return;
    // 가장 약한 성 공격
    defCities.sort(function (a, b) { return a.troops - b.troops; });
    aiAttackCity(attacker, defCities[0]);
  }

  function aiAttackCity(attacker, targetCity) {
    var atkCities = citiesOf(attacker);
    if (!atkCities.length) return;
    atkCities.sort(function (a, b) { return b.troops - a.troops; });
    var from = atkCities[0];
    if (from.troops < 3000) return;
    var deploy = Math.floor(from.troops * 0.6);
    var atkGen = bestGeneral(from);
    var defGen = bestGeneral(targetCity);
    var atkPow = (atkGen ? atkGen.command + atkGen.force : 120) / 2;
    var defPow = (defGen ? defGen.command + defGen.force : 110) / 2;
    var terrain = 1 + targetCity.defense / 400;

    var atkScore = deploy * (atkPow / 60);
    var defScore = targetCity.troops * (defPow / 60) * terrain;

    if (atkScore > defScore * 1.05) {
      // 공격 성공
      var loss = Math.round(targetCity.troops * (0.6 + Math.random() * 0.3));
      var atkLoss = Math.round(deploy * (0.3 + Math.random() * 0.3));
      var isPlayerLoss = targetCity.kingdom === state.playerKingdom;
      targetCity.kingdom = attacker;
      targetCity.troops = Math.max(500, deploy - atkLoss);
      if (atkGen) {
        state.cities.forEach(function (c) {
          var idx = c.generals.indexOf(atkGen.id);
          if (idx >= 0) c.generals.splice(idx, 1);
        });
        targetCity.generals = [atkGen.id];
      } else {
        targetCity.generals = [];
      }
      from.troops = Math.max(0, from.troops - deploy);
      pushLog(S.KINGDOMS[attacker].name + '이 ' + targetCity.name + '을(를) 점령했다.');
      if (isPlayerLoss) toast(S.KINGDOMS[attacker].name + '에게 ' + targetCity.name + '을(를) 빼앗겼습니다!');
    } else {
      // 공격 실패
      from.troops = Math.max(500, from.troops - Math.round(deploy * 0.5));
      targetCity.troops = Math.max(300, targetCity.troops - Math.round(targetCity.troops * 0.25));
    }
  }

  // ---- 턴 진행 ----
  function nextTurn() {
    // 플레이어 수입
    state.gold[state.playerKingdom] += kingdomIncome(state.playerKingdom);
    // 병력 자연 회복(농업 기반)
    state.cities.forEach(function (c) {
      if (c.kingdom !== 'neutral') c.troops += Math.round(c.agriculture * 2);
    });

    // AI
    runAI();

    // 턴/연도 진행
    state.turn += 1;
    state.year += 1;
    state.selectedCityId = null;

    // 이벤트 체크
    checkAndTriggerEvent();

    // 승패 판정
    checkEndConditions();

    notify();
  }

  function checkEndConditions() {
    var playerCities = citiesOf(state.playerKingdom).length;
    if (playerCities === 0) {
      state.phase = 'defeat';
      return;
    }
    // 다른 국가가 모두 소멸(중립 제외)했는지
    var rivals = S.KINGDOM_ORDER.filter(function (k) {
      return k !== state.playerKingdom && citiesOf(k).length > 0;
    });
    var nonNeutral = state.cities.filter(function (c) { return c.kingdom !== 'neutral'; });
    var allMine = nonNeutral.every(function (c) { return c.kingdom === state.playerKingdom; });
    if (rivals.length === 0 && allMine) {
      state.phase = 'victory';
      return;
    }
    if (state.turn >= 200) {
      // 최다 도시 보유국 승리
      state.phase = (citiesOf(state.playerKingdom).length >= mostCities()) ? 'victory' : 'defeat';
    }
  }

  function mostCities() {
    var max = 0;
    S.KINGDOM_ORDER.forEach(function (k) {
      var n = citiesOf(k).length;
      if (n > max) max = n;
    });
    return max;
  }

  // ---- 공개 API ----
  global.SAMGUK.store = {
    subscribe: subscribe,
    getState: getState,
    // 파생 셀렉터
    citiesOf: citiesOf,
    generalById: generalById,
    cityById: cityById,
    kingdomTroops: kingdomTroops,
    kingdomIncome: kingdomIncome,
    mostCities: mostCities,
    // 액션
    newGame: newGame,
    goTitle: goTitle,
    selectKingdom: selectKingdom,
    selectCity: selectCity,
    openOverlay: openOverlay,
    closeOverlay: closeOverlay,
    developCity: developCity,
    envoy: envoy,
    tribute: tribute,
    proposeAlliance: proposeAlliance,
    declareWar: declareWar,
    assignGeneral: assignGeneral,
    startBattle: startBattle,
    battleAction: battleAction,
    endBattle: endBattle,
    dismissEvent: dismissEvent,
    nextTurn: nextTurn
  };

  // 초기 상태 생성
  state = createInitialState();
})(window);
