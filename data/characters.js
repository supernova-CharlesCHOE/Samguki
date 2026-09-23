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
    },

    // ===== 신규 무장: 고구려 (삼국사기·삼국유사) =====
    {
      id: 'ondal',
      name: '온달',
      kingdom: 'goguryeo',
      command: 86, force: 94, intellect: 62, politics: 55,
      loyalty: 92,
      bio: '삼국사기 열전과 설화에 전하는 고구려 장수. 평강공주의 도움으로 무예를 익혀 명장이 되었고, 신라에 빼앗긴 옛 땅을 되찾고자 출정했다가 아단성에서 전사하였다.'
    },
    {
      id: 'myeongnimdapbu',
      name: '명림답부',
      kingdom: 'goguryeo',
      command: 88, force: 78, intellect: 87, politics: 82,
      loyalty: 88,
      bio: '삼국사기에 전하는 고구려의 국상. 좌원 전투에서 후한의 대군을 청야 전술로 궤멸시키고 고구려의 정치를 안정시킨 원로 재상이다.'
    },

    // ===== 신규 무장: 백제 (삼국사기·삼국유사) =====
    {
      id: 'muwang',
      name: '무왕',
      kingdom: 'baekje',
      command: 82, force: 78, intellect: 88, politics: 90,
      loyalty: 100,
      bio: '삼국유사 서동요 설화의 주인공인 서동. 신라 선화공주를 아내로 맞았다 전하며, 금마저(익산)에 미륵사를 세워 백제 중흥을 도모한 제30대 왕이다.'
    },
    {
      id: 'heukchisangji',
      name: '흑치상지',
      kingdom: 'baekje',
      command: 92, force: 90, intellect: 80, politics: 68,
      loyalty: 78,
      bio: '삼국사기에 전하는 백제 부흥운동의 명장. 임존성을 근거로 나당연합군에 맞서 백제 유민을 규합하였고, 뒷날 당에서도 큰 무공을 세운 용장이다.'
    },

    // ===== 신규 무장: 신라 (삼국사기·삼국유사) =====
    {
      id: 'geochilbu',
      name: '거칠부',
      kingdom: 'silla',
      command: 84, force: 76, intellect: 90, politics: 86,
      loyalty: 95,
      bio: '삼국사기에 전하는 신라의 장군이자 재상. 국사를 편찬하고 한강 상류 열 개 군을 공략하여 신라의 영토 확장과 문물 정비에 기여하였다.'
    },
    {
      id: 'ichadon',
      name: '이차돈',
      kingdom: 'silla',
      command: 40, force: 45, intellect: 82, politics: 78,
      loyalty: 100,
      bio: '삼국유사에 전하는 신라의 순교자. 법흥왕을 위해 불법을 세우고자 목을 바치니 흰 젖이 솟았다 하며, 그 이적으로 신라가 불교를 공인하는 계기가 되었다.'
    },
    {
      id: 'gwanchang',
      name: '관창',
      kingdom: 'silla',
      command: 62, force: 84, intellect: 60, politics: 50,
      loyalty: 100,
      bio: '삼국사기 열전에 전하는 신라의 어린 화랑. 황산벌 전투에서 홀로 백제 진영에 두 번 돌진하여 장렬히 전사하니, 그 용맹이 신라군의 사기를 크게 떨쳤다.'
    },

    // ===== 당나라 (唐) =====
    {
      id: 'taizong',
      name: '당태종',
      kingdom: 'tang',
      command: 95, force: 88, intellect: 92, politics: 96,
      loyalty: 100,
      bio: '당 제2대 황제 이세민. 정관의 치로 대제국의 기틀을 다졌고 친히 대군을 이끌어 고구려 원정에 나섰다.'
    },
    {
      id: 'sujeongbang',
      name: '소정방',
      kingdom: 'tang',
      command: 93, force: 90, intellect: 84, politics: 70,
      loyalty: 92,
      bio: '나당연합의 당군 총관. 대군을 이끌고 바다를 건너 백제를 공격하여 사비성을 함락시킨 당의 명장이다.'
    },
    {
      id: 'ijeok',
      name: '이적',
      kingdom: 'tang',
      command: 90, force: 82, intellect: 88, politics: 80,
      loyalty: 90,
      bio: '본명 서세적. 당 초기의 원로 명장으로 수많은 정벌을 승리로 이끌었고 뒷날 고구려 원정을 총지휘하였다.'
    },
    {
      id: 'seolingwi',
      name: '설인귀',
      kingdom: 'tang',
      command: 86, force: 95, intellect: 76, politics: 62,
      loyalty: 88,
      bio: '흰 갑옷을 두르고 선봉에 서던 당의 맹장. 안시성과 고구려 전선에서 용맹을 떨쳐 이름을 크게 알렸다.'
    },

    // ===== 왜 (倭) =====
    {
      id: 'waking',
      name: '왜왕',
      kingdom: 'wa',
      command: 80, force: 72, intellect: 82, politics: 88,
      loyalty: 100,
      bio: '열도의 왜를 다스리는 군주. 백제와 오랜 우호를 맺어 백제 부흥을 위해 대규모 수군을 바다 건너로 파견하였다.'
    },
    {
      id: 'abenohirafu',
      name: '아베노 히라부',
      kingdom: 'wa',
      command: 84, force: 86, intellect: 78, politics: 66,
      loyalty: 92,
      bio: '왜의 수군을 이끈 장수. 북방 원정과 해상 작전에 능하여 백강으로 향하는 왜 함대의 선봉을 맡았다.'
    },
    {
      id: 'echinotakutsu',
      name: '에치노 다쿠쓰',
      kingdom: 'wa',
      command: 78, force: 88, intellect: 70, politics: 58,
      loyalty: 90,
      bio: '백강 전투에 참전한 왜의 용장. 불리한 전세 속에서도 끝까지 분전하여 백제 부흥군을 도우려 하였다.'
    },

    // ===== 재야(在野) 무장 — 무소속. 등용하여 아군으로 삼을 수 있다 =====
    {
      id: 'kim_saedae',
      name: '검모잠',
      kingdom: 'free',
      command: 85, force: 82, intellect: 80, politics: 72,
      loyalty: 40,
      free: true,
      bio: '삼국사기에 전하는 고구려 부흥운동의 장수. 유민을 규합하여 옛 고구려를 되살리고자 안승을 왕으로 받들고 당에 맞섰다.'
    },
    {
      id: 'boktukseong',
      name: '복신',
      kingdom: 'free',
      command: 88, force: 84, intellect: 82, politics: 66,
      loyalty: 40,
      free: true,
      bio: '삼국사기에 전하는 백제 부흥운동의 지도자. 주류성을 근거로 왜에서 부여풍을 맞아들여 나당연합에 거세게 저항하였다.'
    },
    {
      id: 'dochim',
      name: '도침',
      kingdom: 'free',
      command: 80, force: 70, intellect: 86, politics: 74,
      loyalty: 40,
      free: true,
      bio: '백제 부흥운동에 가담한 승려 장수. 복신과 함께 주류성에서 군을 일으켜 당군에 맞선 지략가이다.'
    },
    {
      id: 'sadaham',
      name: '사다함',
      kingdom: 'free',
      command: 74, force: 86, intellect: 68, politics: 60,
      loyalty: 45,
      free: true,
      bio: '삼국사기 열전에 전하는 신라의 어린 화랑. 대가야 정벌에 자원하여 선봉으로 큰 공을 세운 재기 넘치는 낭도이다.'
    },
    {
      id: 'usan',
      name: '우륵',
      kingdom: 'free',
      command: 40, force: 35, intellect: 88, politics: 82,
      loyalty: 45,
      free: true,
      bio: '가야 출신의 악성. 가야금 열두 곡을 지어 신라에 귀의하니, 그 음률이 나라의 문물을 크게 빛냈다.'
    }
  ];

  // 국가별 군주(초기 통치자) 지정
  var RULERS = {
    goguryeo: 'gwanggaeto',
    baekje: 'geunchogo',
    silla: 'kimyusin',
    tang: 'taizong',
    wa: 'waking'
  };

  global.SAMGUK = global.SAMGUK || {};
  global.SAMGUK.GENERALS = GENERALS;
  global.SAMGUK.RULERS = RULERS;
})(window);
