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
    },

    // ===== 삼국유사(三國遺事) 설화 기반 신규 이벤트 =====
    {
      id: 'ichadon',
      name: '이차돈의 순교',
      year: 527,
      turnMin: 3, turnMax: 45,
      kingdom: 'silla',
      description: '삼국유사에 이르길, 법흥왕의 신하 이차돈이 불법을 위해 목을 베니 흰 젖이 솟구치고 하늘이 어두워졌다 한다. 이 이적으로 신라가 불교를 공인하고 민심이 하나로 모였다.',
      effect: function (state, api) {
        api.boostCity(state, 'geumseong', { defense: 8, commerce: 6 });
        api.boostCity(state, 'seorabeol', { defense: 6 });
        return '이차돈의 순교로 신라 왕경(금성·서라벌)의 민심이 안정되었다.';
      }
    },
    {
      id: 'manpasikjeok',
      name: '만파식적',
      year: 682,
      turnMin: 20, turnMax: 100,
      kingdom: 'silla',
      description: '삼국유사에 전하길, 신문왕이 동해의 용에게서 대나무를 얻어 피리를 만드니 이를 불면 적병이 물러가고 병이 나으며 물결이 잔잔해졌다 한다. 신라의 병력이 사기충천한다.',
      effect: function (state, api) {
        api.boostKingdomTroops(state, 'silla', 1.12);
        return '만파식적의 신묘한 가락으로 신라 전군의 병력이 강성해졌다.';
      }
    },
    {
      id: 'seodongyo',
      name: '서동요',
      year: 600,
      turnMin: 8, turnMax: 70,
      kingdom: 'baekje',
      description: '삼국유사에 이르길, 서동(뒷날 무왕)이 서동요를 지어 퍼뜨려 신라 선화공주를 아내로 맞았다 한다. 무왕이 금마저(익산)에 미륵사를 세우니 백제의 국력이 번창한다.',
      effect: function (state, api) {
        api.boostCity(state, 'iksan', { commerce: 12, agriculture: 8, defense: 6 });
        api.boostKingdomGold(state, 'baekje', 800);
        return '서동요의 지략과 미륵사 건립으로 백제 익산이 크게 번영하였다.';
      }
    },
    {
      id: 'wonhyo',
      name: '원효의 화쟁',
      year: 686,
      turnMin: 22, turnMax: 110,
      kingdom: 'silla',
      description: '삼국유사에 전하길, 원효가 해골물을 마시고 일체유심조를 깨달아 무애가를 부르며 백성 속으로 들어갔다 한다. 불법이 온 나라에 퍼져 삼국의 민심이 두루 안정된다.',
      effect: function (state, api) {
        api.allCities(state, function (c) { c.defense = Math.min(100, c.defense + 4); });
        api.boostKingdomGold(state, 'silla', 700);
        return '원효의 화쟁 사상으로 온 나라의 치안이 향상되고 신라 국고가 늘었다.';
      }
    },
    {
      id: 'bulguksa',
      name: '김대성과 불국사',
      year: 751,
      turnMin: 30, turnMax: 140,
      kingdom: 'silla',
      description: '삼국유사에 이르길, 김대성이 현생의 부모를 위해 불국사를, 전생의 부모를 위해 석불사(석굴암)를 세웠다 한다. 신라 왕경의 문물이 융성하고 재정이 넉넉해진다.',
      effect: function (state, api) {
        api.boostCity(state, 'geumseong', { commerce: 12, agriculture: 6 });
        api.boostKingdomGold(state, 'silla', 1000);
        return '불국사와 석굴암의 조영으로 신라 금성의 상업과 국고가 크게 늘었다.';
      }
    },
    {
      id: 'ondal',
      name: '바보 온달과 평강공주',
      year: 590,
      turnMin: 6, turnMax: 65,
      kingdom: 'goguryeo',
      description: '삼국사기 열전과 설화에 전하길, 평강공주가 바보라 불리던 온달을 도와 명장으로 길러내니, 온달이 사냥과 전장에서 으뜸이 되어 신라에 빼앗긴 옛 땅을 되찾고자 출정하였다. 고구려 남부 전선이 강화된다.',
      effect: function (state, api) {
        api.boostCity(state, 'hanseong_g', { defense: 10 });
        api.boostKingdomTroops(state, 'goguryeo', 1.08);
        return '온달 장군의 분전으로 고구려 한성 방면의 방어와 병력이 강화되었다.';
      }
    },
    {
      id: 'gwanchang',
      name: '관창의 분전',
      year: 660,
      turnMin: 12, turnMax: 60,
      kingdom: 'silla',
      description: '삼국사기에 전하길, 황산벌에서 신라 화랑 관창이 홀로 백제 진영에 돌진하여 사로잡혔다 두 번을 나아가니, 계백이 그 용맹을 아껴 목을 보내었다. 이에 신라군의 사기가 하늘을 찔러 총공격에 나섰다.',
      effect: function (state, api) {
        api.boostKingdomTroops(state, 'silla', 1.1);
        api.raiseTension(state);
        return '관창의 장렬한 분전으로 신라군의 사기가 치솟고 삼국의 긴장이 고조되었다.';
      }
    },

    // ===== 당·왜 참전 신규 이벤트 =====
    {
      id: 'baekgang',
      name: '백강 전투',
      year: 663,
      turnMin: 16, turnMax: 90,
      kingdom: 'wa',
      description: '백제 부흥을 위해 바다를 건너온 왜의 대함대가 백강 어귀에서 나당연합 수군과 맞붙었다. 왜와 백제의 결의가 굳건해진다.',
      effect: function (state, api) {
        api.boostKingdomTroops(state, 'wa', 1.12);
        api.boostKingdomDefense(state, 'baekje', 8);
        api.raiseTension(state);
        return '백강 전투로 왜의 수군이 강화되고 백제 각 성의 방어가 굳건해졌다.';
      }
    },
    {
      id: 'ansiseong',
      name: '안시성 싸움',
      year: 645,
      turnMin: 12, turnMax: 80,
      kingdom: 'tang',
      description: '당태종이 친히 대군을 이끌고 요동으로 진격하여 안시성을 포위했다. 당의 군세가 요서 전선으로 몰려든다.',
      effect: function (state, api) {
        api.boostKingdomTroops(state, 'tang', 1.1);
        api.boostCity(state, 'ansi', { defense: 6 });
        api.raiseTension(state);
        return '안시성 싸움으로 당의 병력이 강화되고 요서 전선의 긴장이 고조되었다.';
      }
    }
  ];

  global.SAMGUK = global.SAMGUK || {};
  global.SAMGUK.EVENTS = EVENTS;
})(window);
