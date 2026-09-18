// 삼국기 - 국가(세력) 메타데이터
(function (global) {
  'use strict';

  var KINGDOMS = {
    goguryeo: {
      id: 'goguryeo',
      name: '고구려',
      hanja: '高句麗',
      color: '#8b1a1a',      // 짙은 붉은색
      colorLight: '#c0392b',
      emblem: 'tiger',       // 호랑이
      ruler: '광개토대왕',
      difficulty: 2,         // 별점(난이도)
      territory: '만주와 한반도 북부. 강력한 기병과 넓은 영토를 자랑한다.',
      trait: '기병이 강하고 병력 회복이 빠르다.'
    },
    baekje: {
      id: 'baekje',
      name: '백제',
      hanja: '百濟',
      color: '#1f3a93',      // 짙은 파랑
      colorLight: '#2c5fb3',
      emblem: 'phoenix',     // 봉황
      ruler: '근초고왕',
      difficulty: 3,
      territory: '한반도 서남부. 뛰어난 문화와 해상 교역으로 상업이 발달했다.',
      trait: '상업 수입이 높고 외교에 능하다.'
    },
    silla: {
      id: 'silla',
      name: '신라',
      hanja: '新羅',
      color: '#b8860b',      // 금색
      colorLight: '#d4af37',
      emblem: 'crane',       // 학
      ruler: '김유신',
      difficulty: 3,
      territory: '한반도 동남부. 화랑도의 정예병과 견고한 방어를 갖추었다.',
      trait: '방어력이 높고 무장의 충성심이 강하다.'
    }
  };

  var KINGDOM_ORDER = ['goguryeo', 'baekje', 'silla'];

  global.SAMGUK = global.SAMGUK || {};
  global.SAMGUK.KINGDOMS = KINGDOMS;
  global.SAMGUK.KINGDOM_ORDER = KINGDOM_ORDER;
})(window);
