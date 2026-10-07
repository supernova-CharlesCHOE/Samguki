// 전략 계략(謀略) 데이터 모듈 — 전투 '밖'(지도/턴 단위) 모략 체계.
// 전투 '내' 계략(data/tactics.js: TACTICS/tacticById + battleAction)과 완전히 분리된다.
// 이 모듈은 순수 데이터 + 서술자(descriptor)만 보유하며, 실제 효과(상태 변경)는
// js/store.js 의 executeScheme 가 적용한다. (data 모듈은 상태를 직접 건드리지 않는다.)
(function (global) {
  global.SAMGUK = global.SAMGUK || {};

  // 각 계략(scheme) 객체 필드
  //  id         : 식별자
  //  name/hanja : 표기
  //  icon       : UI용 글리프(이모지)
  //  targetType : 'city' | 'kingdom' | 'general' — 대상 종류
  //  desc       : 짧은 효과 요약(UI 표시용)
  //  focusStat  : 주체(실행 무장) 능력치 축 'intellect' | 'politics'
  //  baseChance : 기본 성공 확률(0~1, 주체 능력치·대상 저항 보정 전)
  //  cooldown   : 재사용 대기(라운드=턴)
  //  costGold   : 코스트 기준값(군주제=국고에서 차감)
  //  costMerit  : 장수제 공훈(功勳) 코스트
  //  backlash   : 실패 역효과 메타(store가 읽어 패널티를 가감)
  var SCHEMES = [
    {
      id: 'rumor',
      name: '유언비어',
      hanja: '流言蜚語',
      icon: '📜',
      targetType: 'city',
      desc: '적 성에 헛소문을 퍼뜨려 민심(民心)과 치안(治安)을 떨어뜨린다. 가장 저렴하고 위험이 적다.',
      focusStat: 'intellect',
      baseChance: 0.55,
      cooldown: 2,
      costGold: 400,
      costMerit: 6,
      backlash: { relation: 8, severity: 'low' }
    },
    {
      id: 'incite',
      name: '선동',
      hanja: '煽動',
      icon: '🔥',
      targetType: 'city',
      desc: '적 성에 반란을 선동한다. 병력과 소속국 국고에 큰 손실을 주고 민심을 크게 흔들지만 발각 위험이 높다.',
      focusStat: 'intellect',
      baseChance: 0.4,
      cooldown: 4,
      costGold: 1000,
      costMerit: 16,
      backlash: { relation: 12, severity: 'high' }
    },
    {
      id: 'sabotage',
      name: '세작',
      hanja: '細作',
      icon: '🕵️',
      targetType: 'kingdom',
      desc: '적국에 간첩을 보내 무장 능력치·병력 정보를 캐낸다. 은밀하여 관계 악화가 없다.',
      focusStat: 'intellect',
      baseChance: 0.6,
      cooldown: 3,
      costGold: 500,
      costMerit: 8,
      backlash: { relation: 6, severity: 'low', covert: true }
    },
    {
      id: 'discord',
      name: '이간계',
      hanja: '離間計',
      icon: '🗣️',
      targetType: 'kingdom',
      desc: '대상 적국과 다른 적국 사이를 이간질하여 외교 관계를 악화시킨다. 두 적국을 지정할 수 있다.',
      focusStat: 'intellect',
      baseChance: 0.42,
      cooldown: 5,
      costGold: 800,
      costMerit: 14,
      backlash: { relation: 10, severity: 'mid' }
    },
    {
      id: 'bribe',
      name: '매수',
      hanja: '買收',
      icon: '💰',
      targetType: 'general',
      desc: '적 무장 1인을 매수·이반공작하여 충성(忠誠)을 크게 떨어뜨린다. 등용(登用)으로 이어진다.',
      focusStat: 'politics',
      baseChance: 0.5,
      cooldown: 3,
      costGold: 900,
      costMerit: 12,
      backlash: { relation: 10, severity: 'mid' }
    }
  ];

  var byId = {};
  for (var i = 0; i < SCHEMES.length; i++) byId[SCHEMES[i].id] = SCHEMES[i];

  global.SAMGUK.SCHEMES = SCHEMES;
  global.SAMGUK.schemeById = function (id) { return byId[id] || null; };
})(window);
