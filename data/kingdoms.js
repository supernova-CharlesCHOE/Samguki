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
    },
    tang: {
      id: 'tang',
      name: '당나라',
      hanja: '唐',
      color: '#4b2e83',      // 짙은 보라
      colorLight: '#7d5ba6',
      emblem: 'dragon',      // 용
      ruler: '당태종',
      difficulty: 5,
      territory: '대륙 서북방의 대제국. 압도적인 국력과 대군을 자랑하는 중원의 강자.',
      trait: '국력과 병력이 압도적이나 사방에 적이 많다.'
    },
    wa: {
      id: 'wa',
      name: '왜',
      hanja: '倭',
      color: '#0b6b5b',      // 청록
      colorLight: '#12a58c',
      emblem: 'wave',        // 파도
      ruler: '왜왕',
      difficulty: 4,
      territory: '동남 해상의 열도 세력. 수군에 능하며 백제와 우호적이다.',
      trait: '수군이 강하고 백제와 전통적으로 가깝다.'
    }
  };

  var KINGDOM_ORDER = ['goguryeo', 'baekje', 'silla', 'tang', 'wa'];

  global.SAMGUK = global.SAMGUK || {};
  global.SAMGUK.KINGDOMS = KINGDOMS;
  global.SAMGUK.KINGDOM_ORDER = KINGDOM_ORDER;
})(window);
