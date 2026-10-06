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
    },

    // ===================================================================
    //  선택지 이벤트 (選擇肢) — 플레이어의 결정이 국면을 바꾼다
    //  choices: [{ label, hint, effect(state, api) -> 결과 문자열 }]
    // ===================================================================
    {
      id: 'choice_famine_relief',
      name: '흉년이 든 해',
      turnMin: 4, turnMax: 180,
      chance: 0.28, repeatable: true,
      description: '올해 농사가 크게 흉작이다. 창고를 열어 백성을 구휼할 것인가, 군량으로 비축할 것인가?',
      choices: [
        {
          label: '창고를 열어 백성을 구휼한다',
          hint: '민심 크게 상승, 군량·재정 소모',
          effect: function (state, api) {
            api.playerStat(state, 'popularity', 12);
            api.addPlayerGold(state, -400);
            api.playerCities(state).forEach(function (c) { c.rice = Math.max(0, Math.round((c.rice || 0) * 0.9)); });
            return '구휼로 민심이 크게 올랐으나 재정과 군량이 줄었다.';
          }
        },
        {
          label: '군량으로 비축한다',
          hint: '민심 하락, 군량 유지',
          effect: function (state, api) {
            api.playerStat(state, 'popularity', -8);
            return '백성의 원망을 샀으나 군량을 지켰다.';
          }
        }
      ]
    },
    {
      id: 'choice_wandering_general',
      name: '떠도는 호걸',
      turnMin: 3, turnMax: 180,
      chance: 0.25, repeatable: true,
      condition: function (state, api) { return state.generals.some(function (g) { return g.free; }); },
      description: '재야의 한 호걸이 그대의 명성을 듣고 찾아왔다. 어찌 대우할 것인가?',
      choices: [
        {
          label: '후하게 대접하여 등용한다',
          hint: '재물을 들여 재야 무장 등용',
          effect: function (state, api) {
            api.addPlayerGold(state, -500);
            var g = api.recruitRandomFree(state);
            return g ? (g.name + '을(를) 막하에 거두었다!') : '마땅한 인재가 없었다.';
          }
        },
        {
          label: '예로써 보내되 재물은 아낀다',
          hint: '민심 소폭 상승, 등용 없음',
          effect: function (state, api) {
            api.playerStat(state, 'popularity', 3);
            return '정중히 돌려보내니 그 소문이 좋게 퍼졌다.';
          }
        }
      ]
    },
    {
      id: 'choice_border_raid',
      name: '국경의 도적떼',
      turnMin: 5, turnMax: 190,
      chance: 0.26, repeatable: true,
      description: '변경에 도적떼가 창궐하여 백성을 노략질한다. 어떻게 대응할 것인가?',
      choices: [
        {
          label: '정예병을 보내 토벌한다',
          hint: '치안 상승·민심 상승, 병력 소모',
          effect: function (state, api) {
            api.playerStat(state, 'defense', 6);
            api.playerStat(state, 'popularity', 6);
            api.playerStat(state, 'troops', -600);
            if (api.isOfficer(state)) api.addMerit(state, 15);
            return '도적을 소탕하여 변경이 안정되었다.';
          }
        },
        {
          label: '성문을 닫고 지켜본다',
          hint: '병력 보존, 민심 하락',
          effect: function (state, api) {
            api.playerStat(state, 'popularity', -6);
            return '백성이 노략질에 시달려 원성이 높아졌다.';
          }
        },
        {
          label: '도적 두목을 회유해 끌어들인다',
          hint: '재물로 병력 확보 (성공 시)',
          effect: function (state, api) {
            api.addPlayerGold(state, -300);
            if (Math.random() < 0.6) { api.playerStat(state, 'troops', 1500); return '도적떼를 아군 병사로 받아들였다!'; }
            return '회유가 통하지 않아 재물만 잃었다.';
          }
        }
      ]
    },
    {
      id: 'choice_merchant_caravan',
      name: '서역 대상(大商)의 방문',
      turnMin: 6, turnMax: 190,
      chance: 0.24, repeatable: true,
      description: '먼 서역에서 온 대상이 진귀한 물자를 싣고 와 교역을 청한다.',
      choices: [
        {
          label: '시장을 열어 교역한다',
          hint: '상업·재정 상승',
          effect: function (state, api) {
            api.playerStat(state, 'commerce', 5);
            api.addPlayerGold(state, 600);
            return '교역으로 상업이 융성하고 국고가 두둑해졌다.';
          }
        },
        {
          label: '명마를 사들인다',
          hint: '재물을 들여 기병 강화(병력)',
          effect: function (state, api) {
            api.addPlayerGold(state, -500);
            api.playerStat(state, 'troops', 1000);
            return '서역의 준마를 들여 기병을 보강했다.';
          }
        }
      ]
    },
    {
      id: 'choice_omen',
      name: '하늘의 조짐',
      turnMin: 8, turnMax: 190,
      chance: 0.2, repeatable: true,
      description: '밤하늘에 혜성이 길게 꼬리를 끌었다. 점술가들이 길흉을 두고 논쟁한다.',
      choices: [
        {
          label: '하늘에 제사를 올려 민심을 다독인다',
          hint: '민심·치안 상승, 재정 소모',
          effect: function (state, api) {
            api.addPlayerGold(state, -300);
            api.playerStat(state, 'popularity', 8);
            api.playerStat(state, 'defense', 3);
            return '성대한 제사로 민심이 하나로 모였다.';
          }
        },
        {
          label: '조짐을 무시하고 군비를 다진다',
          hint: '병력 소폭 증가, 민심 소폭 하락',
          effect: function (state, api) {
            api.playerStat(state, 'troops', 800);
            api.playerStat(state, 'popularity', -4);
            return '군비를 다졌으나 백성은 불안에 떨었다.';
          }
        }
      ]
    },

    // ===================================================================
    //  장수제(將帥制) 전용 개인 이벤트
    // ===================================================================
    {
      id: 'officer_lord_summons',
      name: '주군의 부름',
      mode: 'officer',
      turnMin: 3, turnMax: 190,
      chance: 0.3, repeatable: true,
      description: '주군이 그대를 불러 중책을 맡기려 한다. 어떤 임무를 청할 것인가?',
      choices: [
        {
          label: '전장의 선봉을 자원한다',
          hint: '공훈 크게 상승, 무예 숙련',
          effect: function (state, api) {
            api.addMerit(state, 30);
            var g = api.playerGeneral(state);
            if (g) api.grantSkillExp(state, g.id, 'martial', 40);
            return '선봉을 자원하니 주군이 크게 기뻐했다. (공훈 +30)';
          }
        },
        {
          label: '내정을 맡아 치세를 돕는다',
          hint: '공훈·재물 상승, 지혼 수련',
          effect: function (state, api) {
            api.addMerit(state, 18);
            api.addPlayerGold(state, 300);
            var g = api.playerGeneral(state);
            if (g) api.grantSkillExp(state, g.id, 'arithmetic', 40);
            return '내정의 공으로 공훈과 재물을 얻었다. (공훈 +18)';
          }
        }
      ]
    },
    {
      id: 'officer_sworn_offer',
      name: '의형제의 제안',
      mode: 'officer',
      turnMin: 5, turnMax: 190,
      chance: 0.22, repeatable: true,
      description: '함께 전장을 누빈 동료가 생사를 함께하는 의형제의 결의를 제안한다.',
      choices: [
        {
          label: '피를 나누어 의형제를 맺는다',
          hint: '충성·사기 상승',
          effect: function (state, api) {
            var g = api.playerGeneral(state);
            if (g) api.loyalty(state, g.id, 10);
            api.addMerit(state, 10);
            return '의형제의 결의로 결속이 굳건해졌다.';
          }
        },
        {
          label: '마음만 받고 거절한다',
          hint: '변화 없음',
          effect: function (state, api) { return '정중히 사양하였다.'; }
        }
      ]
    },

    // ===================================================================
    //  군주제(君主制) 전용 통치 이벤트
    // ===================================================================
    {
      id: 'ruler_corrupt_official',
      name: '탐관오리의 발각',
      mode: 'ruler',
      turnMin: 6, turnMax: 190,
      chance: 0.24, repeatable: true,
      description: '한 지방관이 세금을 가로채 사욕을 채운 사실이 드러났다. 어찌 처결할 것인가?',
      choices: [
        {
          label: '엄히 처벌하고 재물을 몰수한다',
          hint: '민심 상승·재정 회수',
          effect: function (state, api) {
            api.playerStat(state, 'popularity', 7);
            api.addPlayerGold(state, 500);
            return '백성이 통쾌해하고 몰수한 재물이 국고에 들어왔다.';
          }
        },
        {
          label: '덮어두고 충성을 산다',
          hint: '재정 상승, 민심 하락',
          effect: function (state, api) {
            api.addPlayerGold(state, 300);
            api.playerStat(state, 'popularity', -8);
            return '뒷거래로 재물은 얻었으나 민심이 떠났다.';
          }
        }
      ]
    },
    {
      id: 'ruler_defector',
      name: '적국의 밀사',
      mode: 'ruler',
      turnMin: 10, turnMax: 190,
      chance: 0.2, repeatable: true,
      condition: function (state, api) {
        // 전쟁 중인 상대가 있을 때
        var p = state.playerKingdom;
        return Object.keys(state.diplomacy[p] || {}).some(function (o) { return state.diplomacy[p][o].war; });
      },
      description: '적국의 장수가 은밀히 투항의 뜻을 전해왔다. 받아들일 것인가?',
      choices: [
        {
          label: '후하게 맞아들인다',
          hint: '재물을 들여 적장 회유(병력 확보)',
          effect: function (state, api) {
            api.addPlayerGold(state, -600);
            if (Math.random() < 0.65) { api.playerStat(state, 'troops', 2000); return '적장이 군사를 이끌고 귀순했다!'; }
            return '투항은 거짓이었다. 재물만 잃었다.';
          }
        },
        {
          label: '함정일지 모르니 거절한다',
          hint: '변화 없음',
          effect: function (state, api) { return '신중을 기해 밀사를 돌려보냈다.'; }
        }
      ]
    },

    // ===================================================================
    //  반복형 돌발 이벤트 (길흉)
    // ===================================================================
    {
      id: 'random_bumper_harvest',
      name: '대풍년',
      turnMin: 5, turnMax: 195,
      chance: 0.18, repeatable: true,
      description: '하늘이 도와 전에 없는 대풍년이 들었다! 곳간이 넘쳐난다.',
      effect: function (state, api) {
        api.playerCities(state).forEach(function (c) { c.rice = Math.round((c.rice || 0) + 1500); });
        api.playerStat(state, 'popularity', 6);
        return '대풍년으로 군량이 가득 차고 민심이 넉넉해졌다.';
      }
    },
    {
      id: 'random_veteran_officer',
      name: '노련한 책사의 조언',
      turnMin: 8, turnMax: 195,
      chance: 0.16, repeatable: true,
      description: '한 노련한 책사가 그대에게 병법과 치국의 요체를 들려준다.',
      effect: function (state, api) {
        var g = api.playerGeneral(state);
        if (g) { api.grantSkillExp(state, g.id, 'military', 35); api.grantSkillExp(state, g.id, 'rhetoric', 25); }
        if (api.isOfficer(state)) api.addMerit(state, 8);
        return '값진 가르침으로 식견이 트였다.';
      }
    }
  ];

  global.SAMGUK = global.SAMGUK || {};
  global.SAMGUK.EVENTS = EVENTS;
})(window);
