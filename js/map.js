// 삼국기 - 한반도 SVG 지도 렌더
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

  // 한반도 + 만주 대략 윤곽 (viewBox 0 0 400 620)
  var PENINSULA_PATH =
    'M60 60 L120 45 L200 55 L250 80 L245 120 ' +
    'L210 130 L215 165 L195 200 L205 240 L185 270 ' +
    'L200 300 L175 330 L185 365 L160 400 L170 440 ' +
    'L150 470 L165 500 L150 540 L175 575 L200 560 ' +
    'L235 580 L300 540 L320 480 L300 440 L315 400 ' +
    'L290 360 L270 320 L255 280 L270 240 L255 200 ' +
    'L270 160 L255 120 L270 90 L230 70 L180 78 ' +
    'L140 70 L90 78 L60 60 Z';

  // 북서 대륙 (당). Tang 도시 좌표 changan(60,90) luoyang(110,150) ansi(90,235) 뒤 (x 0-160, y 0-300)
  var CONTINENT_PATH =
    'M0 0 L170 0 L165 40 L150 80 L160 130 ' +
    'L140 175 L155 220 L130 265 L150 305 ' +
    'L90 300 L40 285 L0 300 Z';

  // 남동 섬 (왜). Wa 도시 좌표 asuka(560,470) naniwa(500,420) 뒤 (x 460-620, y 370-570)
  var ISLAND_PATHS = [
    'M470 400 L520 385 L575 400 L600 445 L590 500 ' +
    'L555 540 L510 525 L478 485 L465 440 Z',
    'M560 545 L600 535 L615 565 L590 590 L555 580 Z'
  ];

  function kingdomColor(kingdom) {
    if (kingdom === 'neutral') return '#5a5346';
    return S.KINGDOMS[kingdom].color;
  }
  function kingdomColorLight(kingdom) {
    if (kingdom === 'neutral') return '#7a7060';
    return S.KINGDOMS[kingdom].colorLight;
  }

  // 지도 렌더. 반환: SVG 엘리먼트
  function render(state) {
    var root = svg('svg', {
      viewBox: '0 0 640 640',
      class: 'map-svg',
      preserveAspectRatio: 'xMidYMid meet'
    });

    // 바다 배경
    var defs = svg('defs');
    defs.innerHTML =
      '<radialGradient id="landGrad" cx="50%" cy="35%" r="80%">' +
      '<stop offset="0%" stop-color="#3f4a2e"/><stop offset="100%" stop-color="#2b331f"/></radialGradient>' +
      '<pattern id="sea" width="20" height="20" patternUnits="userSpaceOnUse">' +
      '<rect width="20" height="20" fill="#16283a"/>' +
      '<path d="M0 10 Q5 6 10 10 T20 10" stroke="#1f3a52" stroke-width="1" fill="none"/></pattern>';
    root.appendChild(defs);

    root.appendChild(svg('rect', { x: 0, y: 0, width: 640, height: 640, fill: 'url(#sea)' }));

    // 북서 대륙 (당나라). 당 도시 좌표 뒤에 위치
    root.appendChild(svg('path', {
      d: CONTINENT_PATH, fill: 'url(#landGrad)', stroke: '#6b7a4a', 'stroke-width': 2
    }));

    // 남동 섬 (왜). 왜 도시 좌표 뒤에 위치
    ISLAND_PATHS.forEach(function (d) {
      root.appendChild(svg('path', {
        d: d, fill: 'url(#landGrad)', stroke: '#6b7a4a', 'stroke-width': 2
      }));
    });

    // 한반도 + 만주 육지
    root.appendChild(svg('path', {
      d: PENINSULA_PATH, fill: 'url(#landGrad)', stroke: '#6b7a4a', 'stroke-width': 2
    }));

    // 지역 라벨 (은은한 지도 텍스트)
    [
      { x: 70, y: 60, big: '大唐', small: '당' },
      { x: 545, y: 405, big: '倭', small: '왜' }
    ].forEach(function (m) {
      var big = svg('text', {
        x: m.x, y: m.y, 'text-anchor': 'middle', class: 'map-region-label'
      });
      big.textContent = m.big;
      root.appendChild(big);
      var small = svg('text', {
        x: m.x, y: m.y + 20, 'text-anchor': 'middle', class: 'map-region-sub'
      });
      small.textContent = m.small;
      root.appendChild(small);
    });

    // 세력 영향권 (도시 주변 색 원)
    state.cities.forEach(function (c) {
      var halo = svg('circle', {
        cx: c.x, cy: c.y, r: 26,
        fill: kingdomColor(c.kingdom), opacity: 0.28
      });
      halo.classList.add('territory-halo');
      root.appendChild(halo);
    });

    // 도시 마커
    state.cities.forEach(function (c) {
      var g = svg('g', { class: 'city-marker' });
      g.style.cursor = 'pointer';

      var selected = state.selectedCityId === c.id;
      var isPlayer = c.kingdom === state.playerKingdom;

      var ring = svg('circle', {
        cx: c.x, cy: c.y, r: selected ? 13 : 10,
        fill: kingdomColorLight(c.kingdom),
        stroke: selected ? '#fff8dc' : '#0d0d0d',
        'stroke-width': selected ? 3 : 1.5
      });
      if (selected) ring.classList.add('pulse');
      g.appendChild(ring);

      // 본거지 표시(무장 다수)
      if (c.generals.length > 0) {
        g.appendChild(svg('circle', { cx: c.x, cy: c.y, r: 4, fill: '#fff8dc' }));
      }

      var label = svg('text', {
        x: c.x, y: c.y - 16, 'text-anchor': 'middle',
        class: 'city-label' + (isPlayer ? ' player' : '')
      });
      label.textContent = c.name;
      g.appendChild(label);

      var tnum = svg('text', {
        x: c.x, y: c.y + 24, 'text-anchor': 'middle', class: 'city-troops'
      });
      tnum.textContent = (c.troops / 1000).toFixed(1) + '천';
      g.appendChild(tnum);

      g.addEventListener('click', function () { store.selectCity(c.id); });
      root.appendChild(g);
    });

    return root;
  }

  global.SAMGUK.GameMap = { render: render };
})(window);
