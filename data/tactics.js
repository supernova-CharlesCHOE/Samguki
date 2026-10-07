// 계략(計略) 데이터 모듈 — 순수 데이터 + 서술자(descriptor)만 보유한다.
// 실제 효과(전투 상태 변경)는 js/store.js battleAction에서 적용한다.
// (data 모듈은 전투 내부 상태를 직접 건드리지 않는다.)
(function (global) {
  global.SAMGUK = global.SAMGUK || {};

  // 각 계략 객체 필드
  //  id        : 식별자 ('tactic:<id>' 형태로 battleAction에 전달)
  //  name/hanja: 표기
  //  icon      : UI용 글리프(이모지)
  //  desc      : 짧은 효과 요약(UI 표시용)
  //  cooldown  : 재사용 대기(라운드)
  //  baseChance: 기본 성공 확률(지력차·군학·상황 보정 전)
  //  tags      : 상황 보정 메타데이터(store가 읽어 성공률/효과를 가감)
  var TACTICS = [
    {
      id: 'fire',
      name: '화공',
      hanja: '火攻',
      icon: '🔥',
      desc: '불을 질러 적 사기를 크게 꺾고 병력을 태운다. 야전에서 강하고 공성에서 약하다.',
      cooldown: 3,
      baseChance: 0.42,
      tags: { field: 'strong', siege: 'weak', focus: 'morale', aggressive: true }
    },
    {
      id: 'water',
      name: '수공',
      hanja: '水攻',
      icon: '🌊',
      desc: '물길을 터 농성한 적을 수몰시킨다. 농성·높은 치안의 적에게 강하며 지속 피해를 남긴다.',
      cooldown: 4,
      baseChance: 0.38,
      tags: { field: 'weak', siege: 'strong', focus: 'troops', aggressive: true }
    },
    {
      id: 'ambush',
      name: '매복',
      hanja: '伏兵',
      icon: '🏹',
      desc: '복병을 두어 기습한다. 야전에서 강하고 적 주력이 기병일 때 특히 큰 피해.',
      cooldown: 3,
      baseChance: 0.40,
      tags: { field: 'strong', siege: 'weak', focus: 'troops', vsUnit: 'cavalry', aggressive: true }
    },
    {
      id: 'discord',
      name: '이간계',
      hanja: '離間計',
      icon: '🗣️',
      desc: '적장 사이를 갈라 지휘를 흩트린다. 지원 무장이 많을수록 강하며 적 공격력을 떨어뜨린다.',
      cooldown: 4,
      baseChance: 0.36,
      tags: { focus: 'debuff', scalesSupport: true, backlash: 'counter' }
    },
    {
      id: 'confusion',
      name: '혼란계',
      hanja: '混亂計',
      icon: '🌀',
      desc: '적진을 교란해 다음 라운드 반격을 봉쇄한다.',
      cooldown: 4,
      baseChance: 0.34,
      tags: { focus: 'lock' }
    },
    {
      id: 'rumor',
      name: '허보',
      hanja: '虛報',
      icon: '📜',
      desc: '유언비어를 퍼뜨려 적 사기를 흔든다. 실패해도 손해가 가장 적다.',
      cooldown: 2,
      baseChance: 0.50,
      tags: { focus: 'morale', backlash: 'low' }
    }
  ];

  var byId = {};
  for (var i = 0; i < TACTICS.length; i++) byId[TACTICS[i].id] = TACTICS[i];

  global.SAMGUK.TACTICS = TACTICS;
  global.SAMGUK.tacticById = function (id) { return byId[id] || null; };
})(window);
