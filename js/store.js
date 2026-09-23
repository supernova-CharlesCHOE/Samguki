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
        politics: g.politics, loyalty: g.loyalty, bio: g.bio,
        // 삼혼(三魂): 통솔혼/무혼/지혼 수련치 (레퍼런스의 Three Spirits)
        spirit: { command: 0, martial: 0, mind: 0 },
        exp: 0,               // 수련 경험치
        sworn: [],            // 의형제로 맺은 무장 id 목록
        free: g.free === true // 재야(무소속) 무장 여부
      };
    });
  }

  // 세력별 시작 금(기본 3000, 국력이 큰 당은 넉넉하게)
  function buildInitialGold() {
    var startGold = { tang: 5000, wa: 3500 };
    var gold = {};
    S.KINGDOM_ORDER.forEach(function (k) {
      gold[k] = startGold.hasOwnProperty(k) ? startGold[k] : 3000;
    });
    return gold;
  }

  // 외교 관계 행렬 생성: 중립(0)으로 채운 뒤 역사적 성향을 대칭으로 반영
  function buildInitialDiplomacy() {
    var diplomacy = {};
    S.KINGDOM_ORDER.forEach(function (a) {
      diplomacy[a] = {};
      S.KINGDOM_ORDER.forEach(function (b) {
        if (a === b) return;
        diplomacy[a][b] = { relation: 0, alliance: false, war: false };
      });
    });
    // 두 세력이 모두 존재할 때만 성향을 대칭으로 부여
    function seed(a, b, rel) {
      if (diplomacy[a] && diplomacy[a][b] && diplomacy[b] && diplomacy[b][a]) {
        diplomacy[a][b].relation = rel;
        diplomacy[b][a].relation = rel;
      }
    }
    seed('silla', 'tang', 25);    // 나당연합 성향
    seed('baekje', 'wa', 25);     // 왜의 백제 우호
    seed('goguryeo', 'tang', -15); // 당의 고구려 원정
    return diplomacy;
  }

  function createInitialState() {
    return {
      phase: 'title',        // title | scenario-select | kingdom-select | game | victory | defeat
      overlay: null,         // null | internal | diplomacy | battle | generals | event | duel | debate | recruit | tournament
      playerKingdom: null,
      scenarioId: null,      // 선택된 시나리오 id
      turn: 1,
      year: 400,
      cities: deepCopyCities(S.INITIAL_CITIES),
      generals: deepCopyGenerals(S.GENERALS),
      gold: buildInitialGold(),
      // 외교 관계: 상대국 -> {relation(-100~100), alliance, war}
      diplomacy: buildInitialDiplomacy(),
      selectedCityId: null,
      battle: null,          // 전투 상태
      firedEvents: {},       // 발생한 이벤트 id 기록
      eventLog: [],          // 최근 이벤트/알림 로그
      pendingEvent: null,    // 표시 대기중인 이벤트
      message: null,         // 짧은 토스트 메시지
      duel: null,            // 일기토(무장 대결) 상태
      debate: null,          // 설전(논쟁) 상태
      recruitTargetId: null, // 등용 대상 무장 id
      pendingReport: null,   // 재해/반란 등 턴 결과 보고
      tournament: null       // 무투대회 상태
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
    state.phase = 'scenario-select';
    notify();
  }

  function goTitle() {
    state = createInitialState();
    notify();
  }

  function scenarioById(id) {
    if (!S.SCENARIOS) return null;
    for (var i = 0; i < S.SCENARIOS.length; i++) if (S.SCENARIOS[i].id === id) return S.SCENARIOS[i];
    return null;
  }

  // 시나리오 선택: 국면에 맞게 초기 상태를 조정하고 군주 선택 화면으로 진행
  function selectScenario(id) {
    var sc = scenarioById(id);
    // 상태를 새로 만들되 시나리오 정보 반영 (재선택 시 초기화 보장)
    state = createInitialState();
    state.scenarioId = id;
    if (sc) {
      state.year = sc.year;
      state.turn = sc.turn || 1;
      try { sc.apply(state, eventApi); } catch (e) { /* 방어적: 시나리오 오류 무시 */ }
    }
    state.phase = 'kingdom-select';
    notify();
  }

  function selectKingdom(kingdom) {
    state.playerKingdom = kingdom;
    state.phase = 'game';
    var sc = scenarioById(state.scenarioId);
    if (sc) pushLog('[' + sc.name + '] ' + S.KINGDOMS[kingdom].name + '의 군주가 되어 대업을 시작한다.');
    else pushLog(S.KINGDOMS[kingdom].name + '의 군주가 되어 삼국 통일의 대업을 시작한다.');
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
    return g ? effStat(g, key) : fallback;
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

  // ---- 삼혼(三魂) 수련 / 유효 능력치 ----
  // 무장의 유효 능력치 = 기본치 + 해당 삼혼 수련 보너스(상한 100)
  function effStat(g, key) {
    if (!g) return 0;
    var base = g[key] || 0;
    var bonus = 0;
    if (g.spirit) {
      if (key === 'command') bonus = Math.floor((g.spirit.command || 0) / 2);
      else if (key === 'force') bonus = Math.floor((g.spirit.martial || 0) / 2);
      else if (key === 'intellect' || key === 'politics') bonus = Math.floor((g.spirit.mind || 0) / 2);
    }
    return Math.min(100, base + bonus);
  }

  // 수련: 금을 들여 특정 삼혼을 단련한다 (통솔혼/무혼/지혼)
  function trainGeneral(generalId, spiritKind) {
    var g = generalById(generalId);
    if (!g) return;
    if (g.kingdom !== state.playerKingdom) { toast('아군 무장만 수련시킬 수 있습니다.'); notify(); return; }
    var cost = 250;
    if (state.gold[state.playerKingdom] < cost) { toast('금이 부족합니다.'); notify(); return; }
    state.gold[state.playerKingdom] -= cost;
    if (!g.spirit) g.spirit = { command: 0, martial: 0, mind: 0 };
    var gain = 4 + Math.floor(Math.random() * 4); // 4~7
    g.spirit[spiritKind] = Math.min(100, (g.spirit[spiritKind] || 0) + gain);
    var label = { command: '통솔혼', martial: '무혼', mind: '지혼' }[spiritKind] || spiritKind;
    toast(g.name + '의 ' + label + '이(가) +' + gain + ' 단련되었다.');
    pushLog(g.name + '이(가) 수련하여 ' + label + '을(를) 갈고닦았다.');
    notify();
  }

  // ---- 일기토(一騎討, 무장 대결) ----
  // 두 무장이 무력/무혼을 겨루는 턴제 대결. 승리 시 사기/충성 보정.
  function startDuel(challengerId, opponentId) {
    var a = generalById(challengerId);
    var d = generalById(opponentId);
    if (!a || !d) return;
    state.duel = {
      aId: challengerId,
      dId: opponentId,
      aHp: 100,
      dHp: 100,
      round: 1,
      over: false,
      result: null, // 'win' | 'lose'
      log: ['일기토 개시! ' + a.name + ' 대 ' + d.name]
    };
    state.overlay = 'duel';
    notify();
  }

  function duelPower(g) {
    // 무력 위주 + 통솔 약간 반영
    return effStat(g, 'force') * 0.75 + effStat(g, 'command') * 0.25;
  }

  function duelAction(action) {
    var b = state.duel;
    if (!b || b.over) return;
    var a = generalById(b.aId);
    var d = generalById(b.dId);
    var rand = function () { return 0.8 + Math.random() * 0.4; };

    if (action === 'yield') {
      b.over = true; b.result = 'lose';
      b.log.unshift(a.name + '이(가) 물러섰다. 일기토 패배.');
      applyDuelResult();
      notify();
      return;
    }

    // action: 'strike'(맹공) | 'guard'(신중) | 'feint'(허허실실)
    var aAtkMult = action === 'strike' ? 1.35 : (action === 'feint' ? 1.1 : 0.8);
    var aDefMult = action === 'guard' ? 0.6 : (action === 'feint' ? 0.85 : 1.0);

    var aPow = duelPower(a), dPow = duelPower(d);
    // AI 상대는 무작위 행동
    var dChoice = Math.random();
    var dAtkMult = dChoice < 0.5 ? 1.35 : (dChoice < 0.75 ? 1.1 : 0.8);

    var dmgToD = Math.round((aPow / 6) * aAtkMult * rand());
    var dmgToA = Math.round((dPow / 6) * dAtkMult * aDefMult * rand());

    b.dHp = Math.max(0, b.dHp - dmgToD);
    b.aHp = Math.max(0, b.aHp - dmgToA);

    var actName = { strike: '맹공', guard: '신중', feint: '허허실실' }[action] || action;
    b.log.unshift('제' + b.round + '합 [' + actName + '] · ' + d.name + ' -' + dmgToD + ', ' + a.name + ' -' + dmgToA);
    b.round++;

    if (b.dHp <= 0 && b.aHp <= 0) {
      b.over = true; b.result = b.aHp >= b.dHp ? 'win' : 'lose';
      b.log.unshift('양측 모두 쓰러졌다!');
      applyDuelResult();
    } else if (b.dHp <= 0) {
      b.over = true; b.result = 'win';
      b.log.unshift(d.name + '이(가) 쓰러졌다! ' + a.name + '의 승리.');
      applyDuelResult();
    } else if (b.aHp <= 0) {
      b.over = true; b.result = 'lose';
      b.log.unshift(a.name + '이(가) 쓰러졌다. 일기토 패배.');
      applyDuelResult();
    } else if (b.round > 9) {
      b.over = true; b.result = b.aHp >= b.dHp ? 'win' : 'lose';
      b.log.unshift('승부가 나지 않아 물러섰다.');
      applyDuelResult();
    }
    notify();
  }

  function applyDuelResult() {
    var b = state.duel;
    var a = generalById(b.aId);
    var d = generalById(b.dId);
    if (!a || !d) return;
    if (b.result === 'win') {
      // 승리한 아군 무장: 무혼 단련 + 충성 상승
      if (a.kingdom === state.playerKingdom) {
        if (!a.spirit) a.spirit = { command: 0, martial: 0, mind: 0 };
        a.spirit.martial = Math.min(100, a.spirit.martial + 3);
        a.loyalty = Math.min(100, a.loyalty + 3);
      }
      // 패한 상대 무장의 충성 하락(등용 기반)
      d.loyalty = Math.max(0, d.loyalty - 8);
      pushLog(a.name + '이(가) 일기토에서 ' + d.name + '을(를) 꺾었다.');
    } else {
      if (a.kingdom === state.playerKingdom) a.loyalty = Math.max(0, a.loyalty - 2);
      pushLog(a.name + '이(가) 일기토에서 ' + d.name + '에게 패했다.');
    }
  }

  // 진행중인 전투(legion)에서 양 장수의 일기토를 벌인다.
  function startDuelFromBattle() {
    var b = state.battle;
    if (!b || b.over || !b.atkGen || !b.defGen) return;
    b.duelPending = true; // 전투 복귀 표시
    startDuel(b.atkGen, b.defGen);
  }

  function endDuel() {
    var b = state.battle;
    var d = state.duel;
    // 전투 중 일기토였다면 결과를 전투에 반영하고 전투로 복귀
    if (b && d && b.duelPending) {
      b.duelPending = false;
      if (d.result === 'win') {
        // 승리: 적 수비군 사기 저하(병력 -12%), 아군 사기 상승 로그
        var cut = Math.round(b.defTroops * 0.12);
        b.defTroops = Math.max(0, b.defTroops - cut);
        b.log.unshift('일기토 승리! 적 수비군의 사기가 떨어져 병력이 ' + cut + ' 이탈했다.');
      } else if (d.result === 'lose') {
        var cutA = Math.round(b.atkTroops * 0.10);
        b.atkTroops = Math.max(0, b.atkTroops - cutA);
        b.log.unshift('일기토 패배로 아군의 사기가 흔들려 병력이 ' + cutA + ' 이탈했다.');
        if (b.atkTroops <= 0) {
          b.over = true; b.result = 'lose';
          b.log.unshift('아군이 무너졌다. 공격 실패.');
          applyBattleResult();
        }
      }
      state.duel = null;
      state.overlay = 'battle';
      notify();
      return;
    }
    state.duel = null;
    state.overlay = null;
    notify();
  }

  // ---- 설전(舌戰, 논쟁) ----
  // 지력/정치·지혼을 겨루는 턴제 논쟁. 승리 시 상대 무장 충성 하락(등용에 유리).
  function startDebate(challengerId, opponentId) {
    var a = generalById(challengerId);
    var d = generalById(opponentId);
    if (!a || !d) return;
    state.debate = {
      aId: challengerId,
      dId: opponentId,
      aResolve: 100,
      dResolve: 100,
      round: 1,
      over: false,
      result: null,
      log: ['설전 개시! ' + a.name + ' 대 ' + d.name]
    };
    state.overlay = 'debate';
    notify();
  }

  function debatePower(g) {
    return effStat(g, 'intellect') * 0.6 + effStat(g, 'politics') * 0.4;
  }

  function debateAction(action) {
    var b = state.debate;
    if (!b || b.over) return;
    var a = generalById(b.aId);
    var d = generalById(b.dId);
    var rand = function () { return 0.8 + Math.random() * 0.4; };

    if (action === 'concede') {
      b.over = true; b.result = 'lose';
      b.log.unshift(a.name + '이(가) 말문이 막혔다. 설전 패배.');
      applyDebateResult();
      notify();
      return;
    }

    // action: 'logic'(정론) | 'rhetoric'(달변) | 'probe'(반문)
    var aAtkMult = action === 'logic' ? 1.3 : (action === 'rhetoric' ? 1.15 : 0.85);
    var aDefMult = action === 'probe' ? 0.65 : 1.0;

    var aPow = debatePower(a), dPow = debatePower(d);
    var dChoice = Math.random();
    var dAtkMult = dChoice < 0.5 ? 1.3 : (dChoice < 0.75 ? 1.15 : 0.85);

    var dmgToD = Math.round((aPow / 6) * aAtkMult * rand());
    var dmgToA = Math.round((dPow / 6) * dAtkMult * aDefMult * rand());

    b.dResolve = Math.max(0, b.dResolve - dmgToD);
    b.aResolve = Math.max(0, b.aResolve - dmgToA);

    var actName = { logic: '정론', rhetoric: '달변', probe: '반문' }[action] || action;
    b.log.unshift('제' + b.round + '합 [' + actName + '] · ' + d.name + ' -' + dmgToD + ', ' + a.name + ' -' + dmgToA);
    b.round++;

    if (b.dResolve <= 0 && b.aResolve <= 0) {
      b.over = true; b.result = b.aResolve >= b.dResolve ? 'win' : 'lose';
      b.log.unshift('설전이 무승부로 끝났다.');
      applyDebateResult();
    } else if (b.dResolve <= 0) {
      b.over = true; b.result = 'win';
      b.log.unshift(d.name + '이(가) 할 말을 잃었다! ' + a.name + '의 승리.');
      applyDebateResult();
    } else if (b.aResolve <= 0) {
      b.over = true; b.result = 'lose';
      b.log.unshift(a.name + '이(가) 논파당했다. 설전 패배.');
      applyDebateResult();
    } else if (b.round > 9) {
      b.over = true; b.result = b.aResolve >= b.dResolve ? 'win' : 'lose';
      b.log.unshift('설전이 길어져 마무리되었다.');
      applyDebateResult();
    }
    notify();
  }

  function applyDebateResult() {
    var b = state.debate;
    var a = generalById(b.aId);
    var d = generalById(b.dId);
    if (!a || !d) return;
    if (b.result === 'win') {
      if (a.kingdom === state.playerKingdom) {
        if (!a.spirit) a.spirit = { command: 0, martial: 0, mind: 0 };
        a.spirit.mind = Math.min(100, a.spirit.mind + 3);
      }
      // 설전 승리는 상대의 마음을 흔들어 등용에 크게 유리
      d.loyalty = Math.max(0, d.loyalty - 12);
      pushLog(a.name + '이(가) 설전에서 ' + d.name + '을(를) 논파했다.');
    } else {
      pushLog(a.name + '이(가) 설전에서 ' + d.name + '에게 밀렸다.');
    }
  }

  function endDebate() {
    state.debate = null;
    state.overlay = null;
    notify();
  }

  // ---- 등용(登用) / 의형제(義兄弟) ----
  // 등용 가능한 무장: 재야(free) 무장, 또는 충성이 낮은 타국 무장
  function recruitableGenerals() {
    return state.generals.filter(function (g) {
      if (g.kingdom === state.playerKingdom) return false;
      if (g.free) return true;               // 재야는 항상 등용 후보
      return g.loyalty <= 45;                // 충성이 흔들리는 타국 무장
    });
  }

  function openRecruit(generalId) {
    state.recruitTargetId = generalId || null;
    state.overlay = 'recruit';
    notify();
  }

  // 등용 성공 확률: (100 - 충성)% 기반 + 재야 보정 + 금 투자 보정
  function recruitChance(g) {
    if (!g) return 0;
    var base = (100 - (g.loyalty || 0)); // 충성 낮을수록 유리
    if (g.free) base += 20;
    return Math.max(5, Math.min(95, base));
  }

  function recruitTarget(generalId) {
    var g = generalById(generalId);
    if (!g) return;
    if (g.kingdom === state.playerKingdom) { toast('이미 아군 무장입니다.'); notify(); return; }
    var cost = g.free ? 800 : 1500; // 타국 무장 회유가 더 비싸다
    if (state.gold[state.playerKingdom] < cost) { toast('금이 부족합니다.'); notify(); return; }
    state.gold[state.playerKingdom] -= cost;
    var chance = recruitChance(g);
    if (Math.random() * 100 < chance) {
      // 등용 성공: 아군으로 편입, 왕경(수도) 성에 배치
      var wasFree = g.free;
      g.kingdom = state.playerKingdom;
      g.free = false;
      g.loyalty = Math.max(60, g.loyalty);
      // 아무 성에도 없으면 아군 최대 병력 성에 배치
      var placed = state.cities.some(function (c) { return c.generals.indexOf(g.id) >= 0; });
      if (!placed) {
        var mine = citiesOf(state.playerKingdom);
        if (mine.length) {
          mine.sort(function (a, b) { return b.troops - a.troops; });
          mine[0].generals.push(g.id);
        }
      }
      toast(g.name + '을(를) 등용했습니다!');
      pushLog(S.KINGDOMS[state.playerKingdom].name + '이 ' + (wasFree ? '재야의 ' : '') + g.name + '을(를) 등용했다.');
    } else {
      g.loyalty = Math.min(100, g.loyalty + 5); // 실패 시 상대 결속 강화
      toast(g.name + '이(가) 등용을 거절했습니다.');
    }
    state.recruitTargetId = null;
    notify();
  }

  // 의형제 결의: 아군 무장 둘을 맺어 서로 충성/사기를 높인다 (도원결의 오마주)
  function swornOath(idA, idB) {
    var a = generalById(idA);
    var b = generalById(idB);
    if (!a || !b || a.id === b.id) { toast('서로 다른 두 무장을 골라야 합니다.'); notify(); return; }
    if (a.kingdom !== state.playerKingdom || b.kingdom !== state.playerKingdom) {
      toast('아군 무장끼리만 의형제를 맺을 수 있습니다.'); notify(); return;
    }
    var cost = 500;
    if (state.gold[state.playerKingdom] < cost) { toast('금이 부족합니다.'); notify(); return; }
    if (a.sworn.indexOf(b.id) >= 0) { toast('이미 의형제입니다.'); notify(); return; }
    state.gold[state.playerKingdom] -= cost;
    a.sworn.push(b.id);
    b.sworn.push(a.id);
    a.loyalty = Math.min(100, a.loyalty + 8);
    b.loyalty = Math.min(100, b.loyalty + 8);
    toast(a.name + '와(과) ' + b.name + '이(가) 의형제를 맺었습니다!');
    pushLog(a.name + '와(과) ' + b.name + '이(가) 의형제의 결의를 맺어 생사를 함께하기로 했다.');
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

  // ---- 재해(災害) 시스템 ----
  // 레퍼런스의 6종 재해(지진/홍수/가뭄/황충/역병/폭설)를 한반도 배경으로 구현.
  var DISASTERS = [
    { id: 'quake', name: '지진', apply: function (c) { c.defense = Math.max(20, c.defense - 12); c.population = Math.round(c.population * 0.96); }, desc: '성벽이 무너지고 백성이 다쳤다. (치안 -12)' },
    { id: 'flood', name: '홍수', apply: function (c) { c.agriculture = Math.max(15, c.agriculture - 12); }, desc: '강이 범람하여 논밭이 잠겼다. (농업 -12)' },
    { id: 'drought', name: '가뭄', apply: function (c) { c.agriculture = Math.max(15, c.agriculture - 10); c.commerce = Math.max(15, c.commerce - 4); }, desc: '오랜 가뭄으로 곡식이 말랐다. (농업 -10, 상업 -4)' },
    { id: 'locust', name: '황충', apply: function (c) { c.agriculture = Math.max(15, c.agriculture - 14); }, desc: '메뚜기 떼가 들판을 덮쳤다. (농업 -14)' },
    { id: 'plague', name: '역병', apply: function (c) { c.troops = Math.round(c.troops * 0.85); c.population = Math.round(c.population * 0.94); }, desc: '역병이 돌아 병사와 백성이 스러졌다. (병력 -15%)' },
    { id: 'snow', name: '폭설', apply: function (c) { c.commerce = Math.max(15, c.commerce - 12); c.troops = Math.round(c.troops * 0.95); }, desc: '기록적인 폭설로 교역이 끊겼다. (상업 -12, 병력 -5%)' }
  ];

  function checkDisasters() {
    // 매 턴 12% 확률로 재해 발생, 무작위 도시 1곳 강타
    if (Math.random() >= 0.12) return null;
    var targets = state.cities.filter(function (c) { return c.kingdom !== 'neutral'; });
    if (!targets.length) return null;
    var city = targets[Math.floor(Math.random() * targets.length)];
    var d = DISASTERS[Math.floor(Math.random() * DISASTERS.length)];
    d.apply(city);
    var text = city.name + '에 ' + d.name + '! ' + d.desc;
    pushLog('[재해] ' + text);
    return {
      isPlayer: city.kingdom === state.playerKingdom,
      name: d.name, cityName: city.name, desc: d.desc,
      kingdomName: city.kingdom === 'neutral' ? '중립' : S.KINGDOMS[city.kingdom].name
    };
  }

  // ---- 합종연횡(合從連衡): 최강 세력을 견제하는 동맹 ----
  // 최강국이 뚜렷하면 나머지 AI 세력이 합종(연합)하여 견제하고,
  // 최강국은 연횡으로 맞선다(관계 개선 시도). 플레이어가 최강이면 포위될 수 있다.
  function checkAlliances() {
    var alive = S.KINGDOM_ORDER.filter(function (k) { return citiesOf(k).length > 0; });
    if (alive.length < 3) return null;
    // 국력 = 총병력 + 성 수 가중
    function power(k) { return kingdomTroops(k) + citiesOf(k).length * 5000; }
    alive.sort(function (a, b) { return power(b) - power(a); });
    var top = alive[0];
    var second = alive[1];
    // 최강국이 2위보다 30% 이상 강할 때만 합종 발동
    if (power(top) < power(second) * 1.3) return null;
    // 합종은 6턴 쿨다운(매 턴 보고가 반복되지 않도록)
    if (state._allianceCooldown && state.turn < state._allianceCooldown) return null;
    // 25% 확률로만 국면 전환
    if (Math.random() >= 0.25) return null;
    state._allianceCooldown = state.turn + 6;

    var others = alive.filter(function (k) { return k !== top; });
    // 합종: 나머지 세력끼리 관계 개선 + 최강국에 대한 적대 상승
    others.forEach(function (a) {
      others.forEach(function (b) {
        if (a !== b) {
          state.diplomacy[a][b].relation = Math.min(100, state.diplomacy[a][b].relation + 8);
        }
      });
      // 최강국을 향한 적대
      state.diplomacy[a][top].relation = Math.max(-100, state.diplomacy[a][top].relation - 12);
      state.diplomacy[top][a].relation = state.diplomacy[a][top].relation;
    });

    var topName = S.KINGDOMS[top].name;
    var msg = topName + '의 독주를 견제하기 위해 나머지 세력이 합종(合從)을 도모한다!';
    pushLog('[합종연횡] ' + msg);
    return {
      isPlayerTop: top === state.playerKingdom,
      topName: topName,
      othersNames: others.map(function (k) { return S.KINGDOMS[k].name; }).join(' · '),
      msg: msg
    };
  }

  // ---- 무장 이탈(반란/사직): 충성이 매우 낮으면 재야로 이탈 ----
  function checkDefections() {
    state.generals.forEach(function (g) {
      if (g.free || g.kingdom === 'neutral') return;
      if (g.kingdom === state.playerKingdom) return; // 플레이어 무장은 별도(사기 유지) — 이탈 제외
      if (g.loyalty <= 15 && Math.random() < 0.3) {
        // 소속에서 제거하고 재야로
        state.cities.forEach(function (c) {
          var idx = c.generals.indexOf(g.id);
          if (idx >= 0) c.generals.splice(idx, 1);
        });
        var old = g.kingdom;
        g.kingdom = 'free';
        g.free = true;
        pushLog('[이탈] ' + S.KINGDOMS[old].name + '의 ' + g.name + '이(가) 불만을 품고 재야로 떠났다.');
      }
    });
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

    // 동적 세계: 합종연횡 → 재해 → 무장 이탈
    var alliance = checkAlliances();
    var disaster = checkDisasters();
    checkDefections();

    // 턴 결과 보고(재해/합종)를 팝업으로 모아 표시 (이벤트가 없을 때만; 이벤트 우선)
    var reportLines = [];
    if (alliance) reportLines.push({ title: '합종연횡 · ' + alliance.topName + ' 견제', text: alliance.msg + (alliance.isPlayerTop ? ' 그대가 표적이 되었다!' : '') });
    if (disaster) reportLines.push({ title: '재해 · ' + disaster.name + ' (' + disaster.cityName + ')', text: disaster.kingdomName + '의 ' + disaster.cityName + ' — ' + disaster.desc });

    // 이벤트 체크
    var firedEvent = checkAndTriggerEvent();

    // 이벤트가 없고 보고할 내용이 있으면 보고 팝업 준비
    if (!firedEvent && reportLines.length) {
      state.pendingReport = { lines: reportLines };
    }

    // 승패 판정
    checkEndConditions();

    notify();
  }

  function dismissReport() {
    state.pendingReport = null;
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
    scenarioById: scenarioById,
    selectScenario: selectScenario,
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
    effStat: effStat,
    trainGeneral: trainGeneral,
    startDuel: startDuel,
    startDuelFromBattle: startDuelFromBattle,
    duelAction: duelAction,
    endDuel: endDuel,
    startDebate: startDebate,
    debateAction: debateAction,
    endDebate: endDebate,
    recruitableGenerals: recruitableGenerals,
    openRecruit: openRecruit,
    recruitChance: recruitChance,
    recruitTarget: recruitTarget,
    swornOath: swornOath,
    dismissEvent: dismissEvent,
    dismissReport: dismissReport,
    nextTurn: nextTurn
  };

  // 초기 상태 생성
  state = createInitialState();
})(window);
