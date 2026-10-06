// 삼국기 - 게임 상태 저장소 및 핵심 로직 (순수 JS)
// Zustand 스토어 개념을 순수 상태 객체 + 구독/렌더 함수로 치환
(function (global) {
  'use strict';

  var S = global.SAMGUK;

  // ---- 상태 ----
  var state = null;
  var listeners = [];

  // 장수제 관직 체계(공훈 임계값으로 승진). 태수 이상이면 성을 다스릴 수 있다.
  var OFFICER_RANKS = [
    { name: '백의종군', merit: 0,    stipend: 100, canGovern: false, canIndependent: false },
    { name: '부장',     merit: 60,   stipend: 180, canGovern: false, canIndependent: false },
    { name: '교위',     merit: 160,  stipend: 280, canGovern: false, canIndependent: false },
    { name: '장군',     merit: 320,  stipend: 420, canGovern: true,  canIndependent: false },
    { name: '태수',     merit: 560,  stipend: 600, canGovern: true,  canIndependent: true  },
    { name: '대장군',   merit: 900,  stipend: 850, canGovern: true,  canIndependent: true  },
    { name: '재상',     merit: 1400, stipend: 1200, canGovern: true, canIndependent: true  }
  ];

  function deepCopyCities(cities) {
    return cities.map(function (c) {
      // 초기 군량/민심은 농업·치안을 바탕으로 산정 (노부나가의 야망의 兵糧/民心 개념)
      var rice = c.rice != null ? c.rice : Math.round(c.population / 10 + c.agriculture * 60);
      return {
        id: c.id, name: c.name, kingdom: c.kingdom, province: c.province,
        x: c.x, y: c.y, population: c.population,
        agriculture: c.agriculture, commerce: c.commerce, defense: c.defense,
        troops: c.troops, generals: c.generals.slice(),
        // ── 내정 확장 (노부나가의 야망 참고) ──
        rice: rice,                                   // 군량(兵糧) 비축량
        popularity: c.popularity != null ? c.popularity : 60,  // 민심(民心) 0~100
        taxRate: c.taxRate != null ? c.taxRate : 'normal',     // 세율 low|normal|high
        // 시설 레벨: 관개(농)/시장(상)/성채(치안) — 레벨이 능력치 상한과 세수 배율을 올린다
        buildings: c.buildings ? {
          irrigation: c.buildings.irrigation || 1,
          market: c.buildings.market || 1,
          fort: c.buildings.fort || 1
        } : { irrigation: 1, market: 1, fort: 1 }
      };
    });
  }

  // 시설 레벨에 따른 능력치 상한 (레벨당 +15, 기본 상한 40 → 최대 100)
  function statCap(level) { return Math.min(100, 40 + (level || 1) * 15); }
  // 세율에 따른 세수 배율과 민심 영향
  var TAX_TABLE = {
    low:    { mult: 0.75, moodDelta: +3, label: '경세(가벼움)' },
    normal: { mult: 1.0,  moodDelta: 0,  label: '보통' },
    high:   { mult: 1.3,  moodDelta: -5, label: '중세(무거움)' }
  };

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
      phase: 'title',        // title | scenario-select | kingdom-select | mode-select | game | victory | defeat
      overlay: null,         // null | internal | diplomacy | battle | generals | event | duel | debate | recruit | officer
      playMode: 'ruler',     // 'ruler'(군주제) | 'officer'(장수제)
      playerKingdom: null,
      // ── 장수제(Officer) 전용 ──
      playerGeneralId: null, // 플레이어가 조종하는 무장 id
      merit: 0,              // 공훈(功勳)
      rankIndex: 0,          // 관직 등급 인덱스 (OFFICER_RANKS)
      personalGold: 0,       // 개인 재산(금)
      independent: false,    // 독립하여 스스로 세력을 이끄는 상태
      actedThisTurn: false,  // 이번 턴에 근무/행동을 했는지
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
  // 성 한 곳의 세수(금). 상업·농업 기반 + 시장 레벨 배율 + 민심/세율 보정
  function cityIncome(c) {
    var base = c.commerce * 6 + c.agriculture * 4;
    var marketMult = 1 + ((c.buildings && c.buildings.market ? c.buildings.market : 1) - 1) * 0.15;
    var taxMult = (TAX_TABLE[c.taxRate] || TAX_TABLE.normal).mult;
    var moodMult = 0.6 + (c.popularity / 100) * 0.6; // 민심 0→0.6, 100→1.2
    return Math.round(base * marketMult * taxMult * moodMult);
  }
  function kingdomIncome(kingdom) {
    return citiesOf(kingdom).reduce(function (sum, c) { return sum + cityIncome(c); }, 0);
  }
  // 성 한 곳의 군량 수확량(가을 수확 개념을 매 턴 균등화). 농업·관개 레벨 기반
  function cityRiceYield(c) {
    var irr = (c.buildings && c.buildings.irrigation ? c.buildings.irrigation : 1);
    var moodMult = 0.7 + (c.popularity / 100) * 0.5;
    return Math.round(c.agriculture * (14 + irr * 4) * moodMult);
  }
  // 성의 병력이 매 턴 소비하는 군량 (1천 병당 소비)
  function cityRiceUpkeep(c) { return Math.round(c.troops * 0.06); }
  function kingdomRice(kingdom) {
    return citiesOf(kingdom).reduce(function (sum, c) { return sum + (c.rice || 0); }, 0);
  }
  // 세력 전체의 군량 수지(수확 - 소비)
  function kingdomRiceBalance(kingdom) {
    return citiesOf(kingdom).reduce(function (sum, c) {
      return sum + cityRiceYield(c) - cityRiceUpkeep(c);
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

  // 세력 선택 후 플레이 방식(군주제/장수제) 선택 화면으로
  function selectKingdom(kingdom) {
    state.playerKingdom = kingdom;
    state.phase = 'mode-select';
    notify();
  }

  // 군주제로 시작
  function startAsRuler() {
    state.playMode = 'ruler';
    state.phase = 'game';
    var sc = scenarioById(state.scenarioId);
    var kingdom = state.playerKingdom;
    if (sc) pushLog('[' + sc.name + '] ' + S.KINGDOMS[kingdom].name + '의 군주가 되어 대업을 시작한다.');
    else pushLog(S.KINGDOMS[kingdom].name + '의 군주가 되어 삼국 통일의 대업을 시작한다.');
    notify();
  }

  // 장수제로 시작: 지정한 무장으로 플레이. 그 세력은 AI 군주가 다스린다.
  function startAsOfficer(generalId) {
    var g = generalById(generalId);
    if (!g || g.kingdom !== state.playerKingdom) { toast('그 세력의 무장을 선택하세요.'); notify(); return; }
    state.playMode = 'officer';
    state.playerGeneralId = generalId;
    state.merit = 0;
    state.rankIndex = 0;
    state.personalGold = 300;
    state.independent = false;
    state.actedThisTurn = false;
    state.phase = 'game';
    var kingdom = state.playerKingdom;
    pushLog(g.name + '이(가) ' + S.KINGDOMS[kingdom].name + '의 신하로서 입신(立身)의 길을 걷기 시작한다.');
    notify();
  }

  // 장수제: 플레이어 무장이 소속된(배치된) 성
  function officerCity() {
    if (!state.playerGeneralId) return null;
    for (var i = 0; i < state.cities.length; i++) {
      if (state.cities[i].generals.indexOf(state.playerGeneralId) >= 0) return state.cities[i];
    }
    // 미배치 상태면 소속 세력의 수도(최대 병력 성)
    var mine = citiesOf(playerFaction());
    if (mine.length) { mine.sort(function (a, b) { return b.troops - a.troops; }); return mine[0]; }
    return null;
  }

  // 장수제에서 플레이어가 속한 '세력'(독립 시 자기 세력)
  function playerFaction() { return state.playerKingdom; }

  function currentRank() { return OFFICER_RANKS[state.rankIndex] || OFFICER_RANKS[0]; }
  function nextRank() { return OFFICER_RANKS[state.rankIndex + 1] || null; }

  // 공훈을 올리고 승진을 판정
  function addMerit(amount, reason) {
    state.merit += amount;
    var nr = nextRank();
    while (nr && state.merit >= nr.merit) {
      state.rankIndex++;
      pushLog('[승진] 공훈을 인정받아 ' + nr.name + '(으)로 승진했다!');
      toast('승진! 이제 ' + nr.name + '입니다.');
      nr = nextRank();
    }
    if (reason) pushLog('[공훈 +' + amount + '] ' + reason);
  }

  // ── 장수제 명령 (턴당 1회 근무) ──
  function officerGuard() { // 근무 공통 가드
    if (state.playMode !== 'officer') return false;
    if (state.actedThisTurn) { toast('이번 턴에는 이미 근무했습니다. 턴을 종료하세요.'); notify(); return false; }
    return true;
  }

  // 내정 근무: 소속 성을 개발하고 공훈·봉록·지력/정치 경험을 얻는다
  function officerAdminService(kind) {
    if (!officerGuard()) return;
    var c = officerCity();
    if (!c) { toast('근무할 성이 없습니다.'); notify(); return; }
    var g = generalById(state.playerGeneralId);
    // 개발 효과(세력 자원이 아닌 성 능력치에 직접 반영 + 본인 공훈)
    var eff = 1 + (effStat(g, 'politics') / 100) * 0.5;
    var gain = Math.round(5 * eff);
    if (kind === 'agriculture') c.agriculture = Math.min(statCap(c.buildings.irrigation), c.agriculture + gain);
    else if (kind === 'commerce') c.commerce = Math.min(statCap(c.buildings.market), c.commerce + gain);
    else { c.defense = Math.min(statCap(c.buildings.fort), c.defense + gain); c.popularity = Math.min(100, c.popularity + 2); }
    var merit = 10 + Math.round(effStat(g, 'politics') / 10);
    addMerit(merit, g.name + '이(가) ' + c.name + '에서 내정에 힘썼다.');
    // 지력/정치 경험 → 삼혼(지혼) 소폭 상승
    if (!g.spirit) g.spirit = { command: 0, martial: 0, mind: 0 };
    g.spirit.mind = Math.min(100, g.spirit.mind + 1);
    state.personalGold += 60;
    state.actedThisTurn = true;
    toast('내정 근무 완료 (공훈 +' + merit + ', 금 +60)');
    notify();
  }

  // 훈련 근무: 자신의 삼혼을 단련 (개인 금 소모 없음, 공훈 소폭)
  function officerTrainSelf(spiritKind) {
    if (!officerGuard()) return;
    var g = generalById(state.playerGeneralId);
    if (!g.spirit) g.spirit = { command: 0, martial: 0, mind: 0 };
    var up = 3 + Math.floor(Math.random() * 3);
    g.spirit[spiritKind] = Math.min(100, g.spirit[spiritKind] + up);
    addMerit(5, g.name + '이(가) 무예와 학문을 연마했다.');
    state.actedThisTurn = true;
    var label = { command: '통솔혼', martial: '무혼', mind: '지혼' }[spiritKind] || spiritKind;
    toast('훈련 완료: ' + label + ' +' + up + ' (공훈 +5)');
    notify();
  }

  // 임무(순찰/토벌): 확률적 성과. 성공 시 공훈·금, 실패 시 소폭 손실
  function officerMission() {
    if (!officerGuard()) return;
    var g = generalById(state.playerGeneralId);
    var skill = (effStat(g, 'command') + effStat(g, 'force') + effStat(g, 'intellect')) / 3;
    var success = Math.random() * 100 < (40 + skill / 2);
    state.actedThisTurn = true;
    if (success) {
      var m = 14 + Math.round(skill / 8);
      var gold = 120 + Math.floor(Math.random() * 120);
      addMerit(m, g.name + '이(가) 임무(순찰·토벌)를 완수했다.');
      state.personalGold += gold;
      if (!g.spirit) g.spirit = { command: 0, martial: 0, mind: 0 };
      g.spirit.martial = Math.min(100, g.spirit.martial + 1);
      toast('임무 성공! (공훈 +' + m + ', 금 +' + gold + ')');
    } else {
      pushLog(g.name + '이(가) 임무에 실패하여 체면을 잃었다.');
      toast('임무 실패... 다음을 기약하자.');
    }
    notify();
  }

  // 출전: 소속 세력의 전선(인접 적 성)으로 자원 참전하여 전투를 지휘
  function officerSortie() {
    if (state.playMode !== 'officer') return;
    if (state.actedThisTurn) { toast('이번 턴에는 이미 근무했습니다.'); notify(); return; }
    var faction = playerFaction();
    var myCities = citiesOf(faction);
    if (!myCities.length) { toast('소속 세력에 성이 없습니다.'); notify(); return; }
    // 공격 가능한 가장 가까운(여기서는 가장 약한) 적/중립 성 탐색
    var targets = state.cities.filter(function (c) { return c.kingdom !== faction; });
    if (!targets.length) { toast('공격할 성이 없습니다. 천하가 통일되었는가?'); notify(); return; }
    // 플레이어 무장이 있는 성, 없으면 최대 병력 성에서 출병
    var from = officerCity() || myCities.sort(function (a, b) { return b.troops - a.troops; })[0];
    if (from.troops < 1500) {
      // 병력이 부족하면 세력 내 최대 병력 성으로 대체
      myCities.sort(function (a, b) { return b.troops - a.troops; });
      from = myCities[0];
    }
    if (from.troops < 1500) { toast('출전할 병력이 부족합니다.'); notify(); return; }
    targets.sort(function (a, b) { return a.troops - b.troops; });
    var to = targets[0];
    // 플레이어 무장을 반드시 주장으로 세우기 위해 출발 성에 배치
    var g = generalById(state.playerGeneralId);
    if (from.generals.indexOf(g.id) < 0) {
      state.cities.forEach(function (c) { var i = c.generals.indexOf(g.id); if (i >= 0) c.generals.splice(i, 1); });
      from.generals.unshift(g.id);
    }
    state.actedThisTurn = true;
    state._officerSortie = true; // 전투 종료 시 공훈 보상 처리를 위한 표식
    startBattle(from.id, to.id);
  }

  // 태수 임명: 장군 이상이면 비어있는(무장 없는) 아군 성의 태수가 되어 다스린다
  function officerBecomeGovernor(cityId) {
    if (state.playMode !== 'officer') return;
    if (!currentRank().canGovern) { toast('장군 이상만 성을 다스릴 수 있습니다.'); notify(); return; }
    var c = cityById(cityId);
    var g = generalById(state.playerGeneralId);
    if (!c || c.kingdom !== playerFaction()) { toast('아군 성이 아닙니다.'); notify(); return; }
    // 플레이어 무장을 그 성으로 이동(태수)
    state.cities.forEach(function (x) { var i = x.generals.indexOf(g.id); if (i >= 0) x.generals.splice(i, 1); });
    c.generals.unshift(g.id);
    addMerit(20, g.name + '이(가) ' + c.name + '의 태수로 부임했다.');
    toast(c.name + '의 태수가 되었습니다.');
    notify();
  }

  // 권신(權臣): 대장군/재상에 올라 세력의 실권을 장악하고 군주제로 전환한다.
  // (한 성만 떼어 내는 분열 대신, 플레이어가 소속 세력의 군주 역할을 승계하는 방식)
  function officerDeclareIndependence() {
    if (state.playMode !== 'officer') return;
    if (!currentRank().canIndependent) { toast('태수 이상만 실권을 장악할 수 있습니다.'); notify(); return; }
    var g = generalById(state.playerGeneralId);
    var home = playerFaction();
    pushLog('[실권 장악] ' + g.name + '이(가) ' + S.KINGDOMS[home].name + '의 실권을 장악하고 스스로 군주가 되었다!');
    toast('실권을 장악했습니다! 이제 ' + S.KINGDOMS[home].name + '을(를) 직접 통치합니다.');
    state.independent = true;
    state.playMode = 'ruler'; // 이후 nextTurn에서 해당 세력 AI가 돌지 않음
    notify();
  }

  function selectCity(id) {
    state.selectedCityId = id;
    notify();
  }

  function openOverlay(name) { state.overlay = name; notify(); }
  function closeOverlay() { state.overlay = null; state.battle = null; notify(); }

  // 성 담당관(태수)의 정치력 → 개발 효율. 무장이 있으면 가장 높은 정치력을 반영
  function governorPolitics(c) {
    var best = 0;
    (c.generals || []).forEach(function (gid) {
      var g = generalById(gid);
      if (g) { var p = effStat(g, 'politics'); if (p > best) best = p; }
    });
    return best; // 0이면 담당관 없음
  }
  // 개발 효율 배율: 담당관 정치 70 기준 1.0, 100이면 1.3, 담당관 없으면 0.8
  function devEfficiency(c) {
    var p = governorPolitics(c);
    if (p === 0) return 0.8;
    return 0.7 + (p / 100) * 0.6;
  }

  // 내정: 개발 (농업/상업/치안은 시설 레벨 상한까지, 담당관 정치로 효율 보정)
  function developCity(cityId, kind) {
    var c = cityById(cityId);
    if (!c) return;
    var pk = state.playerKingdom;

    if (kind === 'troops') {
      // 병사 모집: 금 + 군량 소모. 민심이 높을수록 모집이 수월
      var goldCost = 200, riceCost = 300;
      if (state.gold[pk] < goldCost) { toast('금이 부족합니다.'); notify(); return; }
      if ((c.rice || 0) < riceCost) { toast('군량이 부족합니다.'); notify(); return; }
      state.gold[pk] -= goldCost;
      c.rice -= riceCost;
      var recruited = Math.round(1200 + (c.popularity / 100) * 800);
      c.troops += recruited;
      c.popularity = Math.max(0, c.popularity - 3); // 징집은 민심을 약간 깎는다
      toast(c.name + '에서 ' + recruited.toLocaleString() + '명을 모집했습니다. (군량 -' + riceCost + ')');
      pushLog(c.name + '에서 병사 ' + recruited.toLocaleString() + '명을 모집했다.');
      notify();
      return;
    }

    if (kind === 'relief') {
      // 선정(민심 안정): 금을 풀어 백성을 구휼하고 민심을 올린다
      var reliefCost = 250;
      if (state.gold[pk] < reliefCost) { toast('금이 부족합니다.'); notify(); return; }
      state.gold[pk] -= reliefCost;
      c.popularity = Math.min(100, c.popularity + 8);
      toast(c.name + '에 선정을 베풀어 민심이 올랐습니다. (민심 +8)');
      notify();
      return;
    }

    // 농업/상업/치안 개발
    var cost = 300;
    if (state.gold[pk] < cost) { toast('금이 부족합니다.'); notify(); return; }
    var statKey = kind; // agriculture|commerce|defense
    var buildKey = kind === 'agriculture' ? 'irrigation' : (kind === 'commerce' ? 'market' : 'fort');
    var cap = statCap(c.buildings[buildKey]);
    if (c[statKey] >= cap) {
      toast('시설 레벨 상한(' + cap + ')에 도달했습니다. 시설을 증축하세요.');
      notify();
      return;
    }
    state.gold[pk] -= cost;
    var gain = Math.round(6 * devEfficiency(c));
    c[statKey] = Math.min(cap, c[statKey] + gain);
    toast(c.name + ' 개발 완료 (+' + gain + ', 상한 ' + cap + ')');
    notify();
  }

  // 시설 증축: 능력치 상한과 세수/수확 배율을 올린다 (레벨 1→3)
  function upgradeBuilding(cityId, buildKey) {
    var c = cityById(cityId);
    if (!c) return;
    var pk = state.playerKingdom;
    var lvl = c.buildings[buildKey] || 1;
    if (lvl >= 3) { toast('이미 최고 레벨입니다.'); notify(); return; }
    var cost = lvl === 1 ? 800 : 1600; // 2레벨 800, 3레벨 1600
    if (state.gold[pk] < cost) { toast('금이 부족합니다. (' + cost + '금 필요)'); notify(); return; }
    state.gold[pk] -= cost;
    c.buildings[buildKey] = lvl + 1;
    var names = { irrigation: '관개 시설', market: '시장', fort: '성채' };
    toast(c.name + '의 ' + names[buildKey] + '을(를) ' + (lvl + 1) + '레벨로 증축했습니다.');
    pushLog(c.name + '의 ' + names[buildKey] + '이(가) ' + (lvl + 1) + '레벨이 되었다.');
    notify();
  }

  // 세율 조정: low|normal|high
  function setTaxRate(cityId, rate) {
    var c = cityById(cityId);
    if (!c || !TAX_TABLE[rate]) return;
    c.taxRate = rate;
    toast(c.name + '의 세율을 ' + TAX_TABLE[rate].label + '(으)로 정했습니다.');
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

  // ====================================================================
  //  전투 시스템 (영웅입지전·토탈워 삼국 참고)
  //  - 병종(兵種) 상성: 보병>기병>궁병>보병 (가위바위보)
  //  - 진형(陣形): 어린/학익/방원 — 공격·방어·측면 보정
  //  - 사기(士氣)와 궤주(潰走): 병력 0 이전에 사기가 무너지면 패주
  //  - 전법/계략: 지력 기반 성공, 화공·혼란 등
  //  - 일기토: 전투 중 무장 단기로 사기 교란
  // ====================================================================

  // 병종: 보병(infantry)/기병(cavalry)/궁병(archer)
  // 세력 특성에 따른 기본 병종 구성 비율
  var KINGDOM_COMPOSITION = {
    goguryeo: { infantry: 0.35, cavalry: 0.50, archer: 0.15 }, // 기병 강국
    baekje:   { infantry: 0.45, cavalry: 0.25, archer: 0.30 },
    silla:    { infantry: 0.50, cavalry: 0.25, archer: 0.25 }, // 보병·방어
    tang:     { infantry: 0.40, cavalry: 0.40, archer: 0.20 }, // 대군·균형
    wa:       { infantry: 0.40, cavalry: 0.15, archer: 0.45 }, // 궁·수군
    neutral:  { infantry: 0.50, cavalry: 0.25, archer: 0.25 }
  };

  // 진형 정의: atk(공격 배율) / def(피해 경감) / flank(측면/병종 보정 가중)
  var FORMATIONS = {
    eorin:  { name: '어린', hanja: '魚鱗', atk: 1.25, def: 0.95, flank: 1.0,  desc: '중앙 돌파에 특화. 공격력↑, 방어 약간↓' },
    hagik:  { name: '학익', hanja: '鶴翼', atk: 1.0,  def: 1.0,  flank: 1.35, desc: '양익 포위. 병종 상성·측면 효과↑' },
    bangwon:{ name: '방원', hanja: '方圓', atk: 0.85, def: 1.30, flank: 0.85, desc: '원형 방어진. 피해 경감↑, 공격↓' }
  };

  // 병종 상성 배율: 공격 병종이 상대 병종을 상대로 받는 보정
  // 보병 → 기병 유리 / 기병 → 궁병 유리 / 궁병 → 보병 유리
  function unitAdvantage(atkType, defType) {
    var wins = { infantry: 'cavalry', cavalry: 'archer', archer: 'infantry' };
    if (wins[atkType] === defType) return 1.3;   // 상성 우위
    if (wins[defType] === atkType) return 0.8;   // 상성 열세
    return 1.0;
  }

  function composition(kingdom) {
    return KINGDOM_COMPOSITION[kingdom] || KINGDOM_COMPOSITION.neutral;
  }

  // 군대의 "주력 병종"(가장 비율이 큰 병종) — 상성 계산 대표값
  function mainUnit(comp) {
    var best = 'infantry', bv = -1;
    ['infantry', 'cavalry', 'archer'].forEach(function (t) { if (comp[t] > bv) { bv = comp[t]; best = t; } });
    return best;
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

  // 성에 주둔한 '지원 무장'(주장 외 추가 무장) — 토탈워의 다수 무장 참전 개념
  function supportGenerals(city, mainGenId) {
    return (city.generals || []).filter(function (gid) { return gid !== mainGenId; })
      .map(function (gid) { return generalById(gid); }).filter(Boolean);
  }

  function startBattle(fromCityId, toCityId) {
    var from = cityById(fromCityId);
    var to = cityById(toCityId);
    if (!from || !to) return;
    var atkGen = bestGeneral(from);
    var defGen = bestGeneral(to);
    var deploy = Math.min(from.troops - 500, Math.floor(from.troops * 0.7));
    if (deploy < 500) { toast('출병할 병력이 부족합니다.'); notify(); return; }

    // 지원 무장 수 → 소폭 보너스 (각 +4% 공격, 최대 2명)
    var atkSupport = supportGenerals(from, atkGen ? atkGen.id : null).slice(0, 2);
    var defSupport = supportGenerals(to, defGen ? defGen.id : null).slice(0, 2);

    // 공성전 여부: 방어측이 성에 틀어박힌 상태 → 수비 보정 큼
    var isSiege = to.kingdom !== 'neutral';

    state.battle = {
      fromId: fromCityId,
      toId: toCityId,
      attackerKingdom: from.kingdom,
      defenderKingdom: to.kingdom,
      atkGen: atkGen ? atkGen.id : null,
      defGen: defGen ? defGen.id : null,
      atkSupport: atkSupport.map(function (g) { return g.id; }),
      defSupport: defSupport.map(function (g) { return g.id; }),
      atkTroops: deploy,
      defTroops: to.troops,
      atkMax: deploy,
      defMax: to.troops,
      // 사기(0~100)
      atkMorale: 100,
      defMorale: 100,
      // 진형(기본: 공격=어린, 수비=방원)
      atkFormation: 'eorin',
      defFormation: isSiege ? 'bangwon' : 'eorin',
      atkComp: composition(from.kingdom),
      defComp: composition(to.kingdom),
      isSiege: isSiege,
      // 전법 재사용 대기(지력 기반 1회성 느낌 — 쿨다운)
      atkTacticCd: 0,
      round: 1,
      log: ['전투 개시! ' + from.name + ' → ' + to.name + (isSiege ? ' (공성전)' : ' (야전)')],
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

  // 지원 무장들의 평균 보정(공격력/방어력에 소폭 반영)
  function supportBonus(ids) {
    if (!ids || !ids.length) return 1.0;
    return 1 + ids.length * 0.05; // 1명당 +5%
  }

  function battleAction(action) {
    var b = state.battle;
    if (!b || b.over) return;
    var to = cityById(b.toId);

    var rand = function () { return 0.82 + Math.random() * 0.36; };

    if (action === 'retreat') {
      b.over = true; b.result = 'retreat';
      b.log.unshift('공격군이 퇴각했다. 전투 종료.');
      applyBattleResult();
      notify();
      return;
    }

    // 진형 변경 명령은 피해 없이 라운드를 소비하지 않고 즉시 반영
    if (action && action.indexOf('form:') === 0) {
      var f = action.split(':')[1];
      if (FORMATIONS[f]) {
        b.atkFormation = f;
        b.log.unshift('진형을 ' + FORMATIONS[f].name + '(' + FORMATIONS[f].hanja + ')으로 바꾸었다.');
      }
      notify();
      return;
    }

    // 전법/계략: 지력 기반 성공. 성공 시 적 사기 급감 + 병력 피해
    if (action === 'tactic') {
      if (b.atkTacticCd > 0) { toast('전법을 다시 쓰려면 ' + b.atkTacticCd + '라운드 기다려야 합니다.'); notify(); return; }
      var intel = genStat(b.atkGen, 'intellect', 55);
      var defIntel = genStat(b.defGen, 'intellect', 55);
      var successChance = 0.35 + (intel - defIntel) / 200; // 지력차가 성패를 가른다
      b.atkTacticCd = 3;
      if (Math.random() < Math.max(0.1, Math.min(0.9, successChance))) {
        var moraleHit = 18 + Math.round(intel / 5);
        var trHit = Math.round(b.defTroops * 0.08 * (intel / 60));
        b.defMorale = Math.max(0, b.defMorale - moraleHit);
        b.defTroops = Math.max(0, b.defTroops - trHit);
        b.log.unshift('제' + b.round + '라운드 [전법 성공!] 적을 교란 — 적 사기 -' + moraleHit + ', 병력 -' + trHit);
      } else {
        b.atkMorale = Math.max(0, b.atkMorale - 8);
        b.log.unshift('제' + b.round + '라운드 [전법 실패] 계략이 간파당해 아군 사기 -8');
      }
      b.round++;
      resolveRoundEnd(b, to);
      notify();
      return;
    }

    // 일반 교전: 총공격 / 방어 / 필살전법
    var atkForm = FORMATIONS[b.atkFormation] || FORMATIONS.eorin;
    var defForm = FORMATIONS[b.defFormation] || FORMATIONS.bangwon;

    var atkPow = (genStat(b.atkGen, 'command', 60) * 0.5 + genStat(b.atkGen, 'force', 60) * 0.5) * supportBonus(b.atkSupport);
    var defPow = (genStat(b.defGen, 'command', 55) * 0.5 + genStat(b.defGen, 'force', 55) * 0.5) * supportBonus(b.defSupport);

    // 지형(수비 치안) + 공성 보정
    var terrain = 1 + (to.defense / 400) + (b.isSiege ? 0.12 : 0);

    // 병종 상성 (주력 병종 기준, 학익진이면 상성 효과 증폭)
    var atkMain = mainUnit(b.atkComp), defMain = mainUnit(b.defComp);
    var adv = unitAdvantage(atkMain, defMain);
    adv = 1 + (adv - 1) * atkForm.flank; // 학익이면 상성 체감 커짐
    var advDef = unitAdvantage(defMain, atkMain);
    advDef = 1 + (advDef - 1) * defForm.flank;

    // 사기 보정: 사기가 낮으면 가하는 피해 감소
    var atkMoraleMult = 0.5 + (b.atkMorale / 100) * 0.5;
    var defMoraleMult = 0.5 + (b.defMorale / 100) * 0.5;

    var atkMult = action === 'attack' ? 1.2 : (action === 'special' ? 1.5 : 0.7);
    var defTakeMult = action === 'defend' ? 0.6 : 1.0;

    // 공격군 피해량 (진형 공격·상성·사기 반영)
    var dmgToDef = Math.round(
      (b.atkTroops * 0.10) * (atkPow / 60) * atkMult * atkForm.atk * adv * atkMoraleMult * rand() / defForm.def
    );
    // 방어군 피해량
    var dmgToAtk = Math.round(
      (b.defTroops * 0.09) * (defPow / 60) * terrain * defTakeMult * defForm.atk * advDef * defMoraleMult * rand() / atkForm.def
    );

    b.defTroops = Math.max(0, b.defTroops - dmgToDef);
    b.atkTroops = Math.max(0, b.atkTroops - dmgToAtk);

    // 사기 변동: 큰 피해를 입으면 사기 하락, 가하면 소폭 상승
    b.defMorale = Math.max(0, b.defMorale - Math.round(dmgToDef / Math.max(1, b.defMax) * 180) - (action === 'special' ? 6 : 0));
    b.atkMorale = Math.max(0, b.atkMorale - Math.round(dmgToAtk / Math.max(1, b.atkMax) * 180) + (action === 'defend' ? 3 : 0));
    b.atkMorale = Math.min(100, b.atkMorale);
    b.defMorale = Math.min(100, b.defMorale);

    var actName = { attack: '총공격', defend: '방어 태세', special: '필살 전법' }[action] || action;
    b.log.unshift('제' + b.round + '라운드 [' + actName + '·' + atkForm.name + '] · 적 -' + dmgToDef + '(사기 ' + b.defMorale + '), 아군 -' + dmgToAtk + '(사기 ' + b.atkMorale + ')');
    b.round++;
    if (b.atkTacticCd > 0) b.atkTacticCd--;

    resolveRoundEnd(b, to);
    notify();
  }

  // 라운드 종료 판정: 전멸 또는 궤주(사기 붕괴) 또는 장기화
  function resolveRoundEnd(b, to) {
    // 궤주 판정: 사기 0 이하이고 병력이 상대보다 열세면 패주
    if (b.defTroops <= 0) {
      b.over = true; b.result = 'win';
      b.log.unshift('적 수비군이 전멸했다! 성을 함락한다.');
      applyBattleResult();
    } else if (b.atkTroops <= 0) {
      b.over = true; b.result = 'lose';
      b.log.unshift('아군이 전멸했다. 공격 실패.');
      applyBattleResult();
    } else if (b.defMorale <= 0) {
      b.over = true; b.result = 'win';
      b.log.unshift('적의 사기가 무너져 궤주한다! ' + to.name + '을(를) 함락한다.');
      applyBattleResult();
    } else if (b.atkMorale <= 0) {
      b.over = true; b.result = 'lose';
      b.log.unshift('아군의 사기가 무너져 패주했다. 공격 실패.');
      applyBattleResult();
    } else if (b.round > 14) {
      // 장기화: 병력·사기 종합 우세 판정
      var atkScore = b.atkTroops + b.atkMorale * 50;
      var defScore = b.defTroops + b.defMorale * 50;
      b.over = true; b.result = atkScore > defScore ? 'win' : 'lose';
      b.log.unshift('전투가 장기화되어 종료되었다.');
      applyBattleResult();
    }
  }

  // 진형 변경(공개 액션용 래퍼)
  function setBattleFormation(f) { battleAction('form:' + f); }

  function applyBattleResult() {
    var b = state.battle;
    var from = cityById(b.fromId);
    var to = cityById(b.toId);

    if (b.result === 'win') {
      // 성 점령: 소유권 이전, 잔여 병력 이동
      var conquerer = b.attackerKingdom;
      to.kingdom = conquerer;
      to.troops = Math.max(500, b.atkTroops);
      // 공격 주장 + 지원 무장을 새 성으로 이동
      var movers = [b.atkGen].concat(b.atkSupport || []).filter(Boolean);
      if (movers.length) {
        state.cities.forEach(function (c) {
          movers.forEach(function (gid) {
            var idx = c.generals.indexOf(gid);
            if (idx >= 0) c.generals.splice(idx, 1);
          });
        });
        to.generals = movers;
      } else {
        to.generals = [];
      }
      // 남은 병력은 원 성에 반영
      from.troops = Math.max(0, from.troops - b.atkMax);
      pushLog(S.KINGDOMS[conquerer].name + '이 ' + to.name + '을(를) 함락했다.');
    } else {
      // 실패/퇴각: 손실 반영
      from.troops = Math.max(0, from.troops - (b.atkMax - b.atkTroops));
      to.troops = b.defTroops;
      pushLog(S.KINGDOMS[b.attackerKingdom].name + '의 ' + to.name + ' 공략이 실패했다.');
    }
    checkEndConditions();
  }

  function endBattle() {
    // 장수제 출전 보상 처리
    if (state._officerSortie && state.battle) {
      var res = state.battle.result;
      state._officerSortie = false;
      var g = generalById(state.playerGeneralId);
      if (res === 'win') {
        var m = 40 + Math.round((effStat(g, 'command') + effStat(g, 'force')) / 5);
        addMerit(m, (g ? g.name : '장수') + '이(가) 출전하여 성을 함락하는 큰 공을 세웠다!');
        state.personalGold += 300;
        if (g) { if (!g.spirit) g.spirit = { command: 0, martial: 0, mind: 0 }; g.spirit.command = Math.min(100, g.spirit.command + 2); }
      } else if (res === 'lose') {
        pushLog((g ? g.name : '장수') + '의 출전이 실패로 돌아갔다.');
      } else {
        addMerit(8, (g ? g.name : '장수') + '이(가) 출전하여 적을 견제했다.');
      }
    }
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
        // 승리: 적 사기 급락 + 병력 소폭 이탈
        var cut = Math.round(b.defTroops * 0.08);
        b.defTroops = Math.max(0, b.defTroops - cut);
        b.defMorale = Math.max(0, b.defMorale - 25);
        b.atkMorale = Math.min(100, b.atkMorale + 10);
        b.log.unshift('일기토 승리! 적장이 꺾여 적 사기 -25, 병력 -' + cut);
      } else if (d.result === 'lose') {
        var cutA = Math.round(b.atkTroops * 0.06);
        b.atkTroops = Math.max(0, b.atkTroops - cutA);
        b.atkMorale = Math.max(0, b.atkMorale - 22);
        b.log.unshift('일기토 패배로 아군 사기 -22, 병력 -' + cutA);
      }
      state.duel = null;
      state.overlay = 'battle';
      // 일기토 결과로 궤주가 일어날 수 있으니 종료 판정
      if (!b.over) resolveRoundEnd(b, cityById(b.toId));
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

  // 플레이어가 직접 통치하는 세력인가? (군주제, 또는 장수제에서 실권을 장악한 경우)
  function isPlayerControlled(kingdom) {
    if (kingdom !== state.playerKingdom) return false;
    if (state.playMode === 'ruler') return true;      // 군주제 또는 독립 후
    return false;                                      // 장수제(미독립)은 AI가 통치
  }

  // ---- AI ----
  function runAI() {
    AI_KINGDOMS.forEach(function (k) {
      if (isPlayerControlled(k)) return;
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
    var atkPow = (atkGen ? effStat(atkGen, 'command') + effStat(atkGen, 'force') : 120) / 2;
    var defPow = (defGen ? effStat(defGen, 'command') + effStat(defGen, 'force') : 110) / 2;
    var terrain = 1 + targetCity.defense / 400;

    // 병종 상성 반영
    var adv = unitAdvantage(mainUnit(composition(attacker)), mainUnit(composition(targetCity.kingdom)));

    var atkScore = deploy * (atkPow / 60) * adv;
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
  // 재해는 관개(치수) 레벨로 수해·가뭄 피해가 경감되고, 군량 비축에도 타격을 준다.
  var DISASTERS = [
    { id: 'quake', name: '지진', apply: function (c) { c.defense = Math.max(20, c.defense - 12); c.population = Math.round(c.population * 0.96); }, desc: '성벽이 무너지고 백성이 다쳤다. (치안 -12)' },
    { id: 'flood', name: '홍수', water: true, apply: function (c, m) { var d = Math.round(12 * m); c.agriculture = Math.max(15, c.agriculture - d); c.rice = Math.round((c.rice || 0) * 0.85); }, desc: '강이 범람하여 논밭이 잠겼다. (농업·군량 감소)' },
    { id: 'drought', name: '가뭄', water: true, apply: function (c, m) { var d = Math.round(10 * m); c.agriculture = Math.max(15, c.agriculture - d); c.commerce = Math.max(15, c.commerce - 4); }, desc: '오랜 가뭄으로 곡식이 말랐다. (농업·상업 감소)' },
    { id: 'locust', name: '황충', apply: function (c) { c.agriculture = Math.max(15, c.agriculture - 14); c.rice = Math.round((c.rice || 0) * 0.9); }, desc: '메뚜기 떼가 들판을 덮쳤다. (농업·군량 감소)' },
    { id: 'plague', name: '역병', apply: function (c) { c.troops = Math.round(c.troops * 0.85); c.population = Math.round(c.population * 0.94); c.popularity = Math.max(0, c.popularity - 8); }, desc: '역병이 돌아 병사와 백성이 스러졌다. (병력 -15%, 민심 -8)' },
    { id: 'snow', name: '폭설', apply: function (c) { c.commerce = Math.max(15, c.commerce - 12); c.troops = Math.round(c.troops * 0.95); }, desc: '기록적인 폭설로 교역이 끊겼다. (상업 -12, 병력 -5%)' }
  ];

  function checkDisasters() {
    // 재해 기본 확률 11%, 플레이어 성 평균 민심이 낮으면 소폭 상승
    var mine = citiesOf(state.playerKingdom);
    var avgMood = mine.length ? mine.reduce(function (s, c) { return s + c.popularity; }, 0) / mine.length : 60;
    var chance = 0.11 + Math.max(0, (50 - avgMood)) * 0.0015;
    if (Math.random() >= chance) return null;
    var targets = state.cities.filter(function (c) { return c.kingdom !== 'neutral'; });
    if (!targets.length) return null;
    var city = targets[Math.floor(Math.random() * targets.length)];
    var d = DISASTERS[Math.floor(Math.random() * DISASTERS.length)];
    // 수해/가뭄은 관개(치수) 레벨이 높을수록 피해 경감 (레벨 1→1.0배, 3→0.5배)
    var sevMult = 1;
    if (d.water) { var irr = (city.buildings && city.buildings.irrigation) || 1; sevMult = Math.max(0.4, 1 - (irr - 1) * 0.25); }
    d.apply(city, sevMult);
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

  // 매 턴 모든 성의 내정 처리: 군량 수확/소비, 민심 변동, 병력 회복
  function processDomestic() {
    var starveReports = [];
    state.cities.forEach(function (c) {
      if (c.kingdom === 'neutral') return;
      // 군량: 수확 - 병력 소비
      var net = cityRiceYield(c) - cityRiceUpkeep(c);
      c.rice = Math.max(0, (c.rice || 0) + net);
      // 군량 고갈 시 병력 이탈(아사/탈영)
      if (c.rice <= 0 && cityRiceUpkeep(c) > 0) {
        var loss = Math.round(c.troops * 0.08);
        c.troops = Math.max(0, c.troops - loss);
        c.popularity = Math.max(0, c.popularity - 4);
        if (loss > 0) starveReports.push({ city: c, loss: loss });
      }
      // 민심: 세율에 따라 서서히 변동 + 100 수렴
      var moodDelta = (TAX_TABLE[c.taxRate] || TAX_TABLE.normal).moodDelta;
      c.popularity = Math.max(0, Math.min(100, c.popularity + moodDelta + 1));
      // 병력 자연 회복(농업 + 민심 기반)
      c.troops += Math.round(c.agriculture * 2 * (0.6 + c.popularity / 100 * 0.6));
    });
    return starveReports;
  }

  // ---- 턴 진행 ----
  function nextTurn() {
    // 군주제(또는 독립 후): 플레이어가 직접 통치하는 세력의 금 수입
    if (isPlayerControlled(state.playerKingdom)) {
      state.gold[state.playerKingdom] += kingdomIncome(state.playerKingdom);
    }
    // 전 세력 내정 처리(군량/민심/병력)
    var starve = processDomestic();

    // 장수제: 봉록 지급 + 근무 가능 상태 초기화
    if (state.playMode === 'officer') {
      var stipend = currentRank().stipend;
      state.personalGold += stipend;
      state.actedThisTurn = false;
      // 소속 세력이 성에 플레이어 무장을 아직 배치 안 했으면 수도에 배치
      var g = generalById(state.playerGeneralId);
      if (g) {
        var placed = state.cities.some(function (c) { return c.generals.indexOf(g.id) >= 0; });
        if (!placed) {
          var home = citiesOf(playerFaction());
          if (home.length) { home.sort(function (a, b) { return b.troops - a.troops; }); home[0].generals.push(g.id); }
        }
      }
    }

    // AI 세력 행동
    runAI();

    // 턴/연도 진행
    state.turn += 1;
    state.year += 1;
    state.selectedCityId = null;

    // 동적 세계: 합종연횡 → 재해 → 무장 이탈
    var alliance = checkAlliances();
    var disaster = checkDisasters();
    checkDefections();

    // 턴 결과 보고(재해/합종/군량)를 팝업으로 모아 표시 (이벤트가 없을 때만; 이벤트 우선)
    var reportLines = [];
    if (alliance) reportLines.push({ title: '합종연횡 · ' + alliance.topName + ' 견제', text: alliance.msg + (alliance.isPlayerTop ? ' 그대가 표적이 되었다!' : '') });
    if (disaster) reportLines.push({ title: '재해 · ' + disaster.name + ' (' + disaster.cityName + ')', text: disaster.kingdomName + '의 ' + disaster.cityName + ' — ' + disaster.desc });
    // 플레이어 성의 군량 고갈만 보고 (타국은 생략)
    (starve || []).forEach(function (s) {
      if (s.city.kingdom === state.playerKingdom) {
        reportLines.push({ title: '군량 고갈 · ' + s.city.name, text: '군량이 바닥나 병사 ' + s.loss.toLocaleString() + '명이 이탈했다. 농업·관개를 늘리거나 병력을 줄이시오.' });
        pushLog('[군량] ' + s.city.name + '의 군량이 고갈되어 병사 ' + s.loss.toLocaleString() + '명이 이탈했다.');
      }
    });

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
    var faction = state.playerKingdom;
    var playerCities = citiesOf(faction).length;

    // 소속(또는 자기) 세력이 소멸
    if (playerCities === 0) {
      // 장수제(미독립): 주군이 망하면 패망. (독립/군주제도 성이 0이면 패망)
      state.phase = 'defeat';
      return;
    }

    var rivals = S.KINGDOM_ORDER.filter(function (k) {
      return k !== faction && citiesOf(k).length > 0;
    });
    var nonNeutral = state.cities.filter(function (c) { return c.kingdom !== 'neutral'; });
    var allMine = nonNeutral.every(function (c) { return c.kingdom === faction; });

    // 천하통일: 장수제라면 '주군을 도와 통일' = 승리
    if (rivals.length === 0 && allMine) {
      state.phase = 'victory';
      return;
    }
    if (state.turn >= 200) {
      state.phase = (citiesOf(faction).length >= mostCities()) ? 'victory' : 'defeat';
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
    cityIncome: cityIncome,
    cityRiceYield: cityRiceYield,
    cityRiceUpkeep: cityRiceUpkeep,
    kingdomRice: kingdomRice,
    kingdomRiceBalance: kingdomRiceBalance,
    statCap: statCap,
    governorPolitics: governorPolitics,
    devEfficiency: devEfficiency,
    TAX_TABLE: TAX_TABLE,
    mostCities: mostCities,
    // 액션
    newGame: newGame,
    goTitle: goTitle,
    scenarioById: scenarioById,
    selectScenario: selectScenario,
    selectKingdom: selectKingdom,
    startAsRuler: startAsRuler,
    startAsOfficer: startAsOfficer,
    // 장수제
    OFFICER_RANKS: OFFICER_RANKS,
    officerCity: officerCity,
    playerFaction: playerFaction,
    currentRank: currentRank,
    nextRank: nextRank,
    isPlayerControlled: isPlayerControlled,
    officerAdminService: officerAdminService,
    officerTrainSelf: officerTrainSelf,
    officerMission: officerMission,
    officerSortie: officerSortie,
    officerBecomeGovernor: officerBecomeGovernor,
    officerDeclareIndependence: officerDeclareIndependence,
    selectCity: selectCity,
    openOverlay: openOverlay,
    closeOverlay: closeOverlay,
    developCity: developCity,
    upgradeBuilding: upgradeBuilding,
    setTaxRate: setTaxRate,
    envoy: envoy,
    tribute: tribute,
    proposeAlliance: proposeAlliance,
    declareWar: declareWar,
    assignGeneral: assignGeneral,
    startBattle: startBattle,
    battleAction: battleAction,
    setBattleFormation: setBattleFormation,
    endBattle: endBattle,
    FORMATIONS: FORMATIONS,
    composition: composition,
    mainUnit: mainUnit,
    unitAdvantage: unitAdvantage,
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
