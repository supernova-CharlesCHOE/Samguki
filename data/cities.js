// 삼국기 - 도시(성) 초기 데이터
// x, y 는 지도 SVG viewBox(0 0 400 620) 상의 좌표
(function (global) {
  'use strict';

  var INITIAL_CITIES = [
    // ===== 고구려 (북부/만주) =====
    { id: 'liaodong', name: '요동성', kingdom: 'goguryeo', province: '요동',
      x: 70, y: 95, population: 90000, agriculture: 45, commerce: 40, defense: 70,
      troops: 12000, generals: ['gwanggaeto'] },
    { id: 'gungnae', name: '국내성', kingdom: 'goguryeo', province: '만주',
      x: 190, y: 110, population: 80000, agriculture: 40, commerce: 45, defense: 65,
      troops: 9000, generals: ['jangsu'] },
    { id: 'pyongyang', name: '평양성', kingdom: 'goguryeo', province: '패수',
      x: 175, y: 210, population: 120000, agriculture: 60, commerce: 65, defense: 80,
      troops: 14000, generals: ['euljimundeok', 'yeongaesomun'] },
    { id: 'hanseong_g', name: '한성', kingdom: 'goguryeo', province: '한강 북안',
      x: 200, y: 285, population: 70000, agriculture: 55, commerce: 50, defense: 55,
      troops: 7000, generals: ['gogugwon'] },

    // ===== 백제 (서남부) =====
    { id: 'hanseong_b', name: '위례성', kingdom: 'baekje', province: '한강 남안',
      x: 170, y: 305, population: 85000, agriculture: 58, commerce: 60, defense: 60,
      troops: 8000, generals: ['geunchogo'] },
    { id: 'ungjin', name: '웅진성', kingdom: 'baekje', province: '금강',
      x: 155, y: 375, population: 75000, agriculture: 55, commerce: 62, defense: 68,
      troops: 7500, generals: ['seong'] },
    { id: 'sabi', name: '사비성', kingdom: 'baekje', province: '부여',
      x: 140, y: 420, population: 95000, agriculture: 60, commerce: 70, defense: 65,
      troops: 9000, generals: ['uija'] },
    { id: 'iksan', name: '익산', kingdom: 'baekje', province: '금마저',
      x: 150, y: 465, population: 60000, agriculture: 62, commerce: 55, defense: 50,
      troops: 6000, generals: ['gyebaek'] },

    // ===== 신라 (동남부) =====
    { id: 'geumseong', name: '금성', kingdom: 'silla', province: '경주',
      x: 285, y: 430, population: 110000, agriculture: 55, commerce: 60, defense: 75,
      troops: 11000, generals: ['kimyusin', 'seondeok'] },
    { id: 'seorabeol', name: '서라벌', kingdom: 'silla', province: '경주 외곽',
      x: 300, y: 470, population: 80000, agriculture: 58, commerce: 65, defense: 62,
      troops: 7000, generals: ['munmu'] },
    { id: 'sangju', name: '상주', kingdom: 'silla', province: '낙동강 상류',
      x: 245, y: 380, population: 65000, agriculture: 60, commerce: 50, defense: 55,
      troops: 6500, generals: ['isabu'] },
    { id: 'gaya', name: '금관가야', kingdom: 'silla', province: '김해',
      x: 275, y: 520, population: 55000, agriculture: 52, commerce: 58, defense: 48,
      troops: 5000, generals: ['kimchunchu'] },

    // ===== 중립(쟁탈) 지역 =====
    { id: 'daeya', name: '대야성', kingdom: 'neutral', province: '합천',
      x: 235, y: 460, population: 40000, agriculture: 45, commerce: 40, defense: 45,
      troops: 3500, generals: [] },
    { id: 'gwansan', name: '관산성', kingdom: 'neutral', province: '옥천',
      x: 195, y: 400, population: 35000, agriculture: 42, commerce: 38, defense: 50,
      troops: 3000, generals: [] },
    { id: 'dangph', name: '당항성', kingdom: 'neutral', province: '남양만',
      x: 150, y: 335, population: 45000, agriculture: 48, commerce: 55, defense: 42,
      troops: 3200, generals: [] }
  ];

  global.SAMGUK = global.SAMGUK || {};
  global.SAMGUK.INITIAL_CITIES = INITIAL_CITIES;
})(window);
