// 삼국기 - 한반도 SVG 지도 렌더 (고지도풍 그래픽 강화: 지형/산맥/하천/나침반)
(function (global) {
  'use strict';
  var S = global.SAMGUK;
  var store = S.store;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  // 한반도 + 만주 대략 윤곽 (viewBox 0 0 400 620 기준, 640 캔버스로 확장)
  var PENINSULA_PATH =
    'M60 60 L120 45 L200 55 L250 80 L245 120 ' +
    'L210 130 L215 165 L195 200 L205 240 L185 270 ' +
    'L200 300 L175 330 L185 365 L160 400 L170 440 ' +
    'L150 470 L165 500 L150 540 L175 575 L200 560 ' +
    'L235 580 L300 540 L320 480 L300 440 L315 400 ' +
    'L290 360 L270 320 L255 280 L270 240 L255 200 ' +
    'L270 160 L255 120 L270 90 L230 70 L180 78 ' +
    'L140 70 L90 78 L60 60 Z';

  // 북서 대륙 (당)
  var CONTINENT_PATH =
    'M0 0 L170 0 L165 40 L150 80 L160 130 ' +
    'L140 175 L155 220 L130 265 L150 305 ' +
    'L90 300 L40 285 L0 300 Z';

  // 남동 섬 (왜)
  var ISLAND_PATHS = [
    'M470 400 L520 385 L575 400 L600 445 L590 500 ' +
    'L555 540 L510 525 L478 485 L465 440 Z',
    'M560 545 L600 535 L615 565 L590 590 L555 580 Z'
  ];

  // 주요 산맥(백두대간 등)을 암시하는 능선 — ^ 글리프를 길 따라 배치
  var MOUNTAIN_RANGES = [
    // 북부 (개마고원/만주)
    [[150, 120], [175, 140], [205, 125], [235, 150]],
    // 중부 (태백/소백)
    [[230, 240], [250, 265], [268, 300], [285, 345], [300, 390]],
    // 남부
    [[250, 430], [272, 460], [255, 500]]
  ];

  // 하천 (압록/대동/한강/낙동 암시)
  var RIVERS = [
    'M70 95 Q130 120 190 115',               // 북방 수계
    'M175 210 Q140 240 150 335',             // 대동~한강
    'M205 300 Q190 360 160 420',             // 한강~금강
    'M245 380 Q275 440 275 520'              // 낙동강
  ];

  function kingdomColor(kingdom) {
    if (kingdom === 'neutral') return '#5a5346';
    return S.KINGDOMS[kingdom].color;
  }
  function kingdomColorLight(kingdom) {
    if (kingdom === 'neutral') return '#7a7060';
    return S.KINGDOMS[kingdom].colorLight;
  }

  function defsBlock() {
    var defs = svg('defs');
    defs.innerHTML =
      // 육지: 고지도풍 양피 느낌 그라디언트
      '<radialGradient id="landGrad" cx="48%" cy="32%" r="85%">' +
      '<stop offset="0%" stop-color="#5c6b40"/>' +
      '<stop offset="55%" stop-color="#45512f"/>' +
      '<stop offset="100%" stop-color="#2b331f"/></radialGradient>' +
      // 바다: 깊이감 있는 청록 그라디언트
      '<linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#14314a"/>' +
      '<stop offset="100%" stop-color="#0a1a2a"/></linearGradient>' +
      // 바다 물결 패턴 (은은하게)
      '<pattern id="sea" width="26" height="26" patternUnits="userSpaceOnUse">' +
      '<rect width="26" height="26" fill="url(#seaGrad)"/>' +
      '<path d="M0 13 Q6.5 8 13 13 T26 13" stroke="#1f4660" stroke-width="1" fill="none" opacity="0.6"/>' +
      '<path d="M0 22 Q6.5 17 13 22 T26 22" stroke="#1a3b52" stroke-width="1" fill="none" opacity="0.4"/></pattern>' +
      // 육지 그림자 필터
      '<filter id="landShadow" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.55"/></filter>' +
      // 도시 마커 글로우
      '<filter id="cityGlow" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feDropShadow dx="0" dy="1" stdDeviation="2.5" flood-color="#000" flood-opacity="0.7"/></filter>' +
      // 해안선 안쪽 음영(비네트)
      '<radialGradient id="coast" cx="50%" cy="45%" r="70%">' +
      '<stop offset="70%" stop-color="rgba(0,0,0,0)"/>' +
      '<stop offset="100%" stop-color="rgba(10,20,30,0.55)"/></radialGradient>';
    return defs;
  }

  function landMass(root) {
    // 북서 대륙 (당)
    root.appendChild(svg('path', { d: CONTINENT_PATH, fill: 'url(#landGrad)', stroke: '#7b8a54', 'stroke-width': 2, filter: 'url(#landShadow)' }));
    // 남동 섬 (왜)
    ISLAND_PATHS.forEach(function (d) {
      root.appendChild(svg('path', { d: d, fill: 'url(#landGrad)', stroke: '#7b8a54', 'stroke-width': 2, filter: 'url(#landShadow)' }));
    });
    // 한반도 + 만주
    root.appendChild(svg('path', { d: PENINSULA_PATH, fill: 'url(#landGrad)', stroke: '#7b8a54', 'stroke-width': 2, filter: 'url(#landShadow)' }));
  }

  function rivers(root) {
    RIVERS.forEach(function (d) {
      root.appendChild(svg('path', { d: d, fill: 'none', stroke: '#3b6b86', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.75 }));
      root.appendChild(svg('path', { d: d, fill: 'none', stroke: '#5a93b0', 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.6 }));
    });
  }

  function mountains(root) {
    MOUNTAIN_RANGES.forEach(function (range) {
      range.forEach(function (pt) {
        var x = pt[0], y = pt[1];
        // 작은 삼각 능선 글리프
        var g = svg('g', { opacity: 0.8 });
        g.appendChild(svg('path', { d: 'M' + (x - 7) + ' ' + (y + 5) + ' L' + x + ' ' + (y - 8) + ' L' + (x + 7) + ' ' + (y + 5) + ' Z', fill: '#6b5a3a', stroke: '#4a3c22', 'stroke-width': 1 }));
        g.appendChild(svg('path', { d: 'M' + (x - 2) + ' ' + (y - 2) + ' L' + x + ' ' + (y - 8) + ' L' + (x + 2) + ' ' + (y - 2) + ' Z', fill: '#d8c9a0', opacity: 0.9 }));
        root.appendChild(g);
      });
    });
  }

  function compassRose(root) {
    var cx = 598, cy = 70, r = 22;
    var g = svg('g', { opacity: 0.85 });
    g.appendChild(svg('circle', { cx: cx, cy: cy, r: r, fill: 'rgba(20,14,8,0.55)', stroke: '#c9a227', 'stroke-width': 1.5 }));
    g.appendChild(svg('circle', { cx: cx, cy: cy, r: r - 6, fill: 'none', stroke: '#c9a227', 'stroke-width': 0.6, opacity: 0.6 }));
    // 4방위 침 (N 강조)
    g.appendChild(svg('path', { d: 'M' + cx + ' ' + (cy - r + 2) + ' L' + (cx + 4) + ' ' + cy + ' L' + (cx - 4) + ' ' + cy + ' Z', fill: '#e8c85a' }));
    g.appendChild(svg('path', { d: 'M' + cx + ' ' + (cy + r - 2) + ' L' + (cx + 4) + ' ' + cy + ' L' + (cx - 4) + ' ' + cy + ' Z', fill: '#8a7a55' }));
    g.appendChild(svg('path', { d: 'M' + (cx - r + 2) + ' ' + cy + ' L' + cx + ' ' + (cy - 4) + ' L' + cx + ' ' + (cy + 4) + ' Z', fill: '#8a7a55' }));
    g.appendChild(svg('path', { d: 'M' + (cx + r - 2) + ' ' + cy + ' L' + cx + ' ' + (cy - 4) + ' L' + cx + ' ' + (cy + 4) + ' Z', fill: '#8a7a55' }));
    var nlabel = svg('text', { x: cx, y: cy - r - 3, 'text-anchor': 'middle', class: 'compass-n' });
    nlabel.textContent = '北';
    g.appendChild(nlabel);
    root.appendChild(g);
  }

  function regionLabels(root) {
    [
      { x: 70, y: 55, big: '大唐', small: '당' },
      { x: 160, y: 150, big: '高句麗', small: '고구려' },
      { x: 120, y: 410, big: '百濟', small: '백제' },
      { x: 300, y: 430, big: '新羅', small: '신라' },
      { x: 548, y: 400, big: '倭', small: '왜' }
    ].forEach(function (m) {
      var big = svg('text', { x: m.x, y: m.y, 'text-anchor': 'middle', class: 'map-region-label' });
      big.textContent = m.big;
      root.appendChild(big);
      var small = svg('text', { x: m.x, y: m.y + 18, 'text-anchor': 'middle', class: 'map-region-sub' });
      small.textContent = m.small;
      root.appendChild(small);
    });
  }

  // 지도 렌더. 반환: SVG 엘리먼트
  function render(state) {
    var root = svg('svg', { viewBox: '0 0 640 640', class: 'map-svg', preserveAspectRatio: 'xMidYMid meet' });
    root.appendChild(defsBlock());

    // 바다 + 외곽 테두리
    root.appendChild(svg('rect', { x: 0, y: 0, width: 640, height: 640, fill: 'url(#sea)' }));

    // 경위선(그라티큘) — 고지도 느낌
    var grat = svg('g', { opacity: 0.12 });
    for (var gx = 80; gx < 640; gx += 80) grat.appendChild(svg('line', { x1: gx, y1: 0, x2: gx, y2: 640, stroke: '#9fb8c8', 'stroke-width': 0.6 }));
    for (var gy = 80; gy < 640; gy += 80) grat.appendChild(svg('line', { x1: 0, y1: gy, x2: 640, y2: gy, stroke: '#9fb8c8', 'stroke-width': 0.6 }));
    root.appendChild(grat);

    // 육지 → 하천 → 산맥 (순서대로 겹쳐 그림)
    landMass(root);
    rivers(root);
    mountains(root);

    // 해안 비네트
    root.appendChild(svg('rect', { x: 0, y: 0, width: 640, height: 640, fill: 'url(#coast)', 'pointer-events': 'none' }));

    // 지역 라벨 + 나침반
    regionLabels(root);
    compassRose(root);

    // 세력 영향권(은은한 색 원)
    state.cities.forEach(function (c) {
      var halo = svg('circle', { cx: c.x, cy: c.y, r: 28, fill: kingdomColor(c.kingdom), opacity: 0.22 });
      halo.classList.add('territory-halo');
      root.appendChild(halo);
    });

    // 도시 마커
    state.cities.forEach(function (c) {
      root.appendChild(cityMarker(state, c));
    });

    return root;
  }

  // 도시 마커: 성채 레벨에 따른 외곽, 민심에 따른 상태점, 인구 비례 크기
  function cityMarker(state, c) {
    var g = svg('g', { class: 'city-marker' });
    g.style.cursor = 'pointer';

    var selected = state.selectedCityId === c.id;
    var isPlayer = c.kingdom === state.playerKingdom;
    var baseR = 9 + Math.min(5, Math.round((c.population || 50000) / 40000)); // 인구 비례(최대 +5)
    var r = selected ? baseR + 3 : baseR;
    var light = kingdomColorLight(c.kingdom);
    var dark = kingdomColor(c.kingdom);

    // 성채 레벨 외곽 링 (레벨 2+면 이중 테두리)
    var fortLvl = (c.buildings && c.buildings.fort) ? c.buildings.fort : 1;
    if (fortLvl >= 2) {
      g.appendChild(svg('circle', { cx: c.x, cy: c.y, r: r + 4, fill: 'none', stroke: light, 'stroke-width': 1.2, opacity: 0.6, 'stroke-dasharray': fortLvl >= 3 ? '2 2' : '0' }));
    }

    // 본체(성 아이콘 느낌): 둥근 사각 성벽
    var ring = svg('circle', {
      cx: c.x, cy: c.y, r: r,
      fill: light, stroke: selected ? '#fff8dc' : '#120d06',
      'stroke-width': selected ? 3 : 1.6, filter: 'url(#cityGlow)'
    });
    if (selected) ring.classList.add('pulse');
    g.appendChild(ring);

    // 성문(작은 성채 표식)
    g.appendChild(svg('path', {
      d: 'M' + (c.x - 4) + ' ' + (c.y + 3) + ' L' + (c.x - 4) + ' ' + (c.y - 2) + ' L' + (c.x - 1.5) + ' ' + (c.y - 4) + ' L' + (c.x + 1.5) + ' ' + (c.y - 4) + ' L' + (c.x + 4) + ' ' + (c.y - 2) + ' L' + (c.x + 4) + ' ' + (c.y + 3) + ' Z',
      fill: dark, opacity: 0.85
    }));

    // 무장 주둔 표식
    if (c.generals.length > 0) {
      g.appendChild(svg('circle', { cx: c.x + r - 2, cy: c.y - r + 2, r: 2.6, fill: '#fff8dc', stroke: '#120d06', 'stroke-width': 0.6 }));
    }

    // 민심 상태점 (좌상단)
    if (c.kingdom !== 'neutral' && c.popularity != null) {
      var moodCol = c.popularity >= 70 ? '#6ab04c' : (c.popularity >= 40 ? '#e8c85a' : '#c0392b');
      g.appendChild(svg('circle', { cx: c.x - r + 2, cy: c.y - r + 2, r: 2.4, fill: moodCol, stroke: '#120d06', 'stroke-width': 0.5 }));
    }

    // 도시명
    var label = svg('text', { x: c.x, y: c.y - r - 6, 'text-anchor': 'middle', class: 'city-label' + (isPlayer ? ' player' : '') });
    label.textContent = c.name;
    g.appendChild(label);

    // 병력 수
    var tnum = svg('text', { x: c.x, y: c.y + r + 13, 'text-anchor': 'middle', class: 'city-troops' });
    tnum.textContent = (c.troops / 1000).toFixed(1) + '천';
    g.appendChild(tnum);

    g.addEventListener('click', function () { store.selectCity(c.id); });
    return g;
  }

  global.SAMGUK.GameMap = { render: render };
})(window);
