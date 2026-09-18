// 삼국기 - 무장(장수) 데이터
// 능력치 순서: command(통솔), force(무력), intellect(지력), politics(정치)
// 전역 네임스페이스 SAMGUK 에 등록 (외부 의존성/빌드 도구 없이 동작)
(function (global) {
  'use strict';

  var GENERALS = [
    // ===== 고구려 (高句麗) =====
    {
      id: 'gwanggaeto',
      name: '광개토대왕',
      kingdom: 'goguryeo',
      command: 98, force: 95, intellect: 85, politics: 90,
      loyalty: 100,
      bio: '고구려 제19대 왕. 정복 군주로서 영토를 크게 확장하여 요동과 만주를 장악하였다.'
    },
    {
      id: 'euljimundeok',
      name: '을지문덕',
      kingdom: 'goguryeo',
      command: 92, force: 88, intellect: 96, politics: 78,
      loyalty: 95,
      bio: '살수대첩에서 수나라 대군을 궤멸시킨 고구려의 명장이자 지략가.'
    },
    {
      id: 'yeongaesomun',
      name: '연개소문',
      kingdom: 'goguryeo',
      command: 95, force: 97, intellect: 82, politics: 72,
      loyalty: 80,
      bio: '고구려 말기의 실권자. 강력한 군사력으로 당나라의 침공을 여러 차례 막아냈다.'
    },
    {
      id: 'gogugwon',
      name: '고국원왕',
      kingdom: 'goguryeo',
      command: 80, force: 82, intellect: 78, politics: 82,
      loyalty: 100,
      bio: '고구려 제16대 왕. 백제와의 격전 속에서 나라를 지켰다.'
    },
    {
      id: 'jangsu',
      name: '장수왕',
      kingdom: 'goguryeo',
      command: 88, force: 80, intellect: 90, politics: 88,
      loyalty: 100,
      bio: '고구려 제20대 왕. 평양 천도와 남진 정책으로 전성기를 이끌었다.'
    },

    // ===== 백제 (百濟) =====
    {
      id: 'geunchogo',
      name: '근초고왕',
      kingdom: 'baekje',
      command: 90, force: 85, intellect: 88, politics: 92,
      loyalty: 100,
      bio: '백제 제13대 왕. 백제의 전성기를 이끌며 고구려 고국원왕을 전사시켰다.'
    },
    {
      id: 'gyebaek',
      name: '계백',
      kingdom: 'baekje',
      command: 88, force: 96, intellect: 80, politics: 65,
      loyalty: 100,
      bio: '황산벌에서 5천 결사대로 신라 대군에 맞선 백제 최후의 명장.'
    },
    {
      id: 'uija',
      name: '의자왕',
      kingdom: 'baekje',
      command: 72, force: 68, intellect: 75, politics: 80,
      loyalty: 100,
      bio: '백제의 마지막 왕. 초기의 영명함과 말기의 방탕함으로 나라를 잃었다.'
    },
    {
      id: 'seong',
      name: '성왕',
      kingdom: 'baekje',
      command: 85, force: 80, intellect: 85, politics: 88,
      loyalty: 100,
      bio: '백제 제26대 왕. 사비 천도와 중흥을 이끌었으나 관산성에서 전사하였다.'
    },

    // ===== 신라 (新羅) =====
    {
      id: 'kimyusin',
      name: '김유신',
      kingdom: 'silla',
      command: 97, force: 93, intellect: 90, politics: 85,
      loyalty: 100,
      bio: '삼국통일의 주역. 신라 최고의 명장으로 백제와 고구려를 무너뜨렸다.'
    },
    {
      id: 'seondeok',
      name: '선덕여왕',
      kingdom: 'silla',
      command: 72, force: 55, intellect: 90, politics: 97,
      loyalty: 100,
      bio: '신라 제27대 왕. 첨성대와 황룡사를 세운 지혜로운 여왕.'
    },
    {
      id: 'isabu',
      name: '이사부',
      kingdom: 'silla',
      command: 85, force: 88, intellect: 82, politics: 80,
      loyalty: 100,
      bio: '우산국(울릉도)을 정벌한 신라의 장군이자 정치가.'
    },
    {
      id: 'munmu',
      name: '문무왕',
      kingdom: 'silla',
      command: 88, force: 82, intellect: 85, politics: 90,
      loyalty: 100,
      bio: '삼국통일을 완성한 신라 제30대 왕. 죽어서 동해의 용이 되어 나라를 지켰다.'
    },
    {
      id: 'kimchunchu',
      name: '김춘추',
      kingdom: 'silla',
      command: 82, force: 70, intellect: 92, politics: 95,
      loyalty: 100,
      bio: '태종무열왕. 뛰어난 외교로 나당연합을 성사시켜 통일의 기틀을 닦았다.'
    }
  ];

  // 국가별 군주(초기 통치자) 지정
  var RULERS = {
    goguryeo: 'gwanggaeto',
    baekje: 'geunchogo',
    silla: 'kimyusin'
  };

  global.SAMGUK = global.SAMGUK || {};
  global.SAMGUK.GENERALS = GENERALS;
  global.SAMGUK.RULERS = RULERS;
})(window);
