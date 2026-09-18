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
      viewBox: '0 0 400 620',
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

    root.appendChild(svg('rect', { x: 0, y: 0, width: 400, height: 620, fill: 'url(#sea)' }));

    // 육지
    root.appendChild(svg('path', {
      d: PENINSULA_PATH, fill: 'url(#landGrad)', stroke: '#6b7a4a', 'stroke-width': 2
    }));

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
