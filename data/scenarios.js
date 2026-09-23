// 삼국기 - 시나리오(개막 국면) 데이터
// 레퍼런스: 'Legend of Heroes: Three Kingdoms'의 20여 개 개막 시나리오 개념을
// 한국 삼국시대의 역사적 분기점으로 치환하여 구성한다.
//
// 각 시나리오는 시작 연도/턴, 세력별 시작 금 보정, 외교 관계 시드,
// 도시/병력 보정, 선택 가능 세력 등을 정의한다.
// apply(state, api): createInitialState() 직후 호출되어 상태를 국면에 맞게 조정한다.
(function (global) {
  'use strict';

  var S = global.SAMGUK;

  // 시나리오 적용 헬퍼 (store 의 eventApi 와 유사하되 초기화 시점 전용)
  function cityOf(state, id) {
    for (var i = 0; i < state.cities.length; i++) if (state.cities[i].id === id) return state.cities[i];
    return null;
  }
  function seedRelation(state, a, b, rel, opts) {
    opts = opts || {};
    if (!state.diplomacy[a] || !state.diplomacy[a][b]) return;
    state.diplomacy[a][b].relation = rel;
    state.diplomacy[b][a].relation = rel;
    if (opts.alliance != null) {
      state.diplomacy[a][b].alliance = opts.alliance;
      state.diplomacy[b][a].alliance = opts.alliance;
    }
    if (opts.war != null) {
      state.diplomacy[a][b].war = opts.war;
      state.diplomacy[b][a].war = opts.war;
    }
  }
  function boostKingdomTroops(state, k, mult) {
    state.cities.forEach(function (c) { if (c.kingdom === k) c.troops = Math.round(c.troops * mult); });
  }
  function addGold(state, k, amt) { if (state.gold[k] != null) state.gold[k] += amt; }

  var SCENARIOS = [
    {
      id: 'gwanggaeto_conquest',
      name: '광개토대왕의 정복',
      year: 400,
      turn: 1,
      difficulty: 2,
      selectable: ['goguryeo', 'baekje', 'silla', 'wa'],
      summary: '399~410년. 광개토대왕이 사방으로 정복에 나서고, 백제·왜의 연합이 신라를 압박하던 시기. 고구려의 국세가 하늘을 찌른다.',
      apply: function (state, api) {
        // 고구려 전성: 병력·재정 강화
        boostKingdomTroops(state, 'goguryeo', 1.15);
        addGold(state, 'goguryeo', 1500);
        // 백제-왜 연합, 고구려-신라 우호(신라 구원)
        seedRelation(state, 'baekje', 'wa', 45, { alliance: true });
        seedRelation(state, 'goguryeo', 'silla', 30);
        seedRelation(state, 'goguryeo', 'baekje', -30);
        // 당은 아직 등장 전 → 약체화(중원의 다른 세력 대용)
        boostKingdomTroops(state, 'tang', 0.7);
      }
    },
    {
      id: 'jangsu_south',
      name: '장수왕의 남진',
      year: 475,
      turn: 1,
      difficulty: 2,
      selectable: ['goguryeo', 'baekje', 'silla', 'wa'],
      summary: '475년. 장수왕이 평양 천도 후 남진하여 백제 한성을 함락하던 시기. 백제는 존망의 위기에, 신라와 나제동맹을 맺는다.',
      apply: function (state, api) {
        boostKingdomTroops(state, 'goguryeo', 1.1);
        // 나제동맹(백제-신라)
        seedRelation(state, 'baekje', 'silla', 40, { alliance: true });
        seedRelation(state, 'goguryeo', 'baekje', -40, { war: true });
        // 백제 수도 방면 약화
        var wirye = cityOf(state, 'hanseong_b');
        if (wirye) { wirye.troops = Math.round(wirye.troops * 0.7); wirye.defense = Math.max(30, wirye.defense - 10); }
      }
    },
    {
      id: 'gwansanseong',
      name: '관산성의 비극',
      year: 554,
      turn: 1,
      difficulty: 3,
      selectable: ['goguryeo', 'baekje', 'silla', 'wa'],
      summary: '554년. 나제동맹이 깨지고 백제 성왕이 관산성에서 신라군에 전사한 국면. 백제와 신라가 원수가 되어 격돌한다.',
      apply: function (state, api) {
        seedRelation(state, 'baekje', 'silla', -60, { war: true });
        seedRelation(state, 'baekje', 'wa', 40, { alliance: true });
        // 관산성이 전장의 핵심
        var gwansan = cityOf(state, 'gwansan');
        if (gwansan) gwansan.troops += 2000;
      }
    },
    {
      id: 'three_kingdoms_war',
      name: '삼국 각축',
      year: 600,
      turn: 1,
      difficulty: 3,
      selectable: ['goguryeo', 'baekje', 'silla', 'tang', 'wa'],
      summary: '600년경. 고구려·백제·신라가 한강 유역을 두고 팽팽히 대치하고, 수·당이 대륙에서 굴기하던 시기. 균형 잡힌 표준 국면.',
      apply: function (state, api) {
        // 표준 국면: 역사적 성향만 유지 (기본 diplomacy 시드 그대로)
        seedRelation(state, 'silla', 'tang', 20);
        seedRelation(state, 'baekje', 'wa', 25);
      }
    },
    {
      id: 'salsu',
      name: '살수대첩',
      year: 612,
      turn: 1,
      difficulty: 4,
      selectable: ['goguryeo', 'baekje', 'silla', 'tang', 'wa'],
      summary: '612년. 수(당으로 대표)의 백만 대군이 고구려로 밀려들고, 을지문덕이 살수에서 이를 맞이하는 국면. 대륙 세력이 압도적이다.',
      apply: function (state, api) {
        // 당(수 대용) 대군
        boostKingdomTroops(state, 'tang', 1.35);
        addGold(state, 'tang', 3000);
        seedRelation(state, 'goguryeo', 'tang', -70, { war: true });
        // 을지문덕이 있는 평양성 방어 강화
        var py = cityOf(state, 'pyongyang');
        if (py) py.defense = Math.min(100, py.defense + 10);
      }
    },
    {
      id: 'nadang',
      name: '나당연합',
      year: 648,
      turn: 1,
      difficulty: 4,
      selectable: ['goguryeo', 'baekje', 'silla', 'tang', 'wa'],
      summary: '648년. 김춘추의 외교로 신라와 당이 동맹을 맺고 백제·고구려를 협공하려는 국면. 백제는 왜와 손잡고 맞선다.',
      apply: function (state, api) {
        seedRelation(state, 'silla', 'tang', 70, { alliance: true });
        seedRelation(state, 'baekje', 'wa', 55, { alliance: true });
        seedRelation(state, 'silla', 'baekje', -50, { war: true });
        seedRelation(state, 'goguryeo', 'tang', -40, { war: true });
        boostKingdomTroops(state, 'tang', 1.2);
      }
    },
    {
      id: 'baekje_revival',
      name: '백제 부흥운동',
      year: 660,
      turn: 1,
      difficulty: 5,
      selectable: ['goguryeo', 'baekje', 'silla', 'tang', 'wa'],
      summary: '660년. 사비성이 함락되고 백제가 멸망 직전에 몰린 국면. 흑치상지와 왜의 원군이 백제 부흥의 마지막 불씨를 지핀다. 백제로 시작하면 최고 난이도.',
      apply: function (state, api) {
        // 백제 약체화 (부흥군)
        boostKingdomTroops(state, 'baekje', 0.65);
        // 나당 강성
        seedRelation(state, 'silla', 'tang', 75, { alliance: true });
        seedRelation(state, 'silla', 'baekje', -70, { war: true });
        seedRelation(state, 'tang', 'baekje', -70, { war: true });
        boostKingdomTroops(state, 'silla', 1.15);
        boostKingdomTroops(state, 'tang', 1.2);
        // 왜의 백제 구원
        seedRelation(state, 'baekje', 'wa', 65, { alliance: true });
        boostKingdomTroops(state, 'wa', 1.15);
        addGold(state, 'baekje', 800);
      }
    }
  ];

  var SCENARIO_ORDER = SCENARIOS.map(function (s) { return s.id; });

  global.SAMGUK = global.SAMGUK || {};
  global.SAMGUK.SCENARIOS = SCENARIOS;
  global.SAMGUK.SCENARIO_ORDER = SCENARIO_ORDER;
})(window);
