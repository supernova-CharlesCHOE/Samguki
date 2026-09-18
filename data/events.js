// 삼국기 - 역사 이벤트 데이터
// trigger: { turnMin, turnMax, kingdom(옵션) }
// effect(state): 게임 상태를 받아 효과를 적용하고 로그 문자열을 반환
(function (global) {
  'use strict';

  var EVENTS = [
    {
      id: 'salsu',
      name: '살수대첩',
      year: 612,
      turnMin: 6, turnMax: 40,
      kingdom: 'goguryeo',
      description: '을지문덕이 수나라 30만 대군을 살수로 유인하여 궤멸시켰다! 고구려의 사기가 하늘을 찌른다.',
      effect: function (state, api) {
        api.boostKingdomTroops(state, 'goguryeo', 1.15);
        return '살수대첩의 대승으로 고구려 전군의 병력이 강화되었다.';
      }
    },
    {
      id: 'hwangsanbeol',
      name: '황산벌 전투',
      year: 660,
      turnMin: 12, turnMax: 60,
      kingdom: 'baekje',
      description: '계백의 5천 결사대가 신라 5만 대군에 맞섰다. 백제 무장들의 결의가 굳건해진다.',
      effect: function (state, api) {
        api.boostKingdomDefense(state, 'baekje', 10);
        return '황산벌 결사의 의지로 백제 각 성의 방어력이 상승했다.';
      }
    },
    {
      id: 'gibeolpo',
      name: '기벌포 전투',
      year: 676,
      turnMin: 18, turnMax: 80,
      kingdom: 'silla',
      description: '신라 수군이 기벌포에서 당나라 함대를 격파했다. 신라의 국력이 강성해진다.',
      effect: function (state, api) {
        api.boostKingdomGold(state, 'silla', 1500);
        return '기벌포 승전으로 신라의 국고가 크게 늘었다.';
      }
    },
    {
      id: 'gwansanseong',
      name: '관산성 전투',
      year: 554,
      turnMin: 3, turnMax: 30,
      kingdom: null,
      description: '관산성을 둘러싼 백제와 신라의 격돌! 이 요충지의 주인이 삼국의 운명을 가른다.',
      effect: function (state, api) {
        api.raiseTension(state);
        return '관산성 일대의 긴장이 고조되어 삼국의 관계가 악화되었다.';
      }
    },
    {
      id: 'nadang',
      name: '나당연합 결성',
      year: 648,
      turnMin: 15, turnMax: 70,
      kingdom: 'silla',
      description: '김춘추의 외교로 신라와 당나라가 동맹을 맺었다. 신라의 위세가 커진다.',
      effect: function (state, api) {
        api.boostKingdomGold(state, 'silla', 1000);
        api.boostKingdomTroops(state, 'silla', 1.1);
        return '나당연합으로 신라의 군세와 재정이 강화되었다.';
      }
    },
    {
      id: 'pyeongyang_move',
      name: '평양 천도',
      year: 427,
      turnMin: 2, turnMax: 20,
      kingdom: 'goguryeo',
      description: '장수왕이 도읍을 평양으로 옮기고 남진 정책을 선포했다. 고구려의 남방 위협이 커진다.',
      effect: function (state, api) {
        api.boostCity(state, 'pyongyang', { commerce: 10, agriculture: 8 });
        return '평양 천도로 평양성이 크게 번영하였다.';
      }
    },
    {
      id: 'baekje_golden',
      name: '백제 전성기',
      year: 371,
      turnMin: 1, turnMax: 15,
      kingdom: 'baekje',
      description: '근초고왕이 마한을 병합하고 요서까지 진출했다. 백제의 상업이 융성한다.',
      effect: function (state, api) {
        api.boostKingdomGold(state, 'baekje', 1200);
        return '백제 전성기의 번영으로 국고가 늘었다.';
      }
    },
    {
      id: 'famine',
      name: '대기근',
      year: 0,
      turnMin: 8, turnMax: 120,
      kingdom: null,
      description: '전국에 흉년이 들어 백성들이 굶주린다. 모든 세력의 농업이 타격을 입었다.',
      effect: function (state, api) {
        api.allCities(state, function (c) { c.agriculture = Math.max(20, c.agriculture - 8); });
        return '대기근으로 모든 도시의 농업이 감소했다.';
      }
    },
    {
      id: 'hwarang',
      name: '화랑도 창설',
      year: 576,
      turnMin: 5, turnMax: 50,
      kingdom: 'silla',
      description: '신라가 화랑도를 조직하여 젊은 인재를 길러낸다. 신라군의 정예화가 이루어진다.',
      effect: function (state, api) {
        api.boostKingdomTroops(state, 'silla', 1.08);
        return '화랑도 창설로 신라의 병력이 정예화되었다.';
      }
    },
    {
      id: 'buddhism',
      name: '불교 공인',
      year: 372,
      turnMin: 1, turnMax: 40,
      kingdom: null,
      description: '삼국에 불교가 전래되어 민심이 안정된다. 모든 도시의 치안이 향상되었다.',
      effect: function (state, api) {
        api.allCities(state, function (c) { c.defense = Math.min(100, c.defense + 5); });
        return '불교 공인으로 모든 도시의 치안(방어)이 향상되었다.';
      }
    }
  ];

  global.SAMGUK = global.SAMGUK || {};
  global.SAMGUK.EVENTS = EVENTS;
})(window);
