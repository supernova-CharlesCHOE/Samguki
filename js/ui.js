// 삼국기 - UI 공통 유틸 (DOM 생성 헬퍼, SVG 엠블럼, 아바타)
(function (global) {
  'use strict';
  var S = global.SAMGUK;
  var UI = {};

  // 간단한 하이퍼스크립트 헬퍼
  // el('div.class#id', { attr }, [children])
  function el(tag, attrs, children) {
    var parts = tag.split(/(?=[.#])/);
    var tagName = parts[0] || 'div';
    var node = document.createElement(tagName);
    parts.slice(1).forEach(function (p) {
      if (p[0] === '.') node.classList.add(p.slice(1));
      else if (p[0] === '#') node.id = p.slice(1);
    });
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'onClick') node.addEventListener('click', attrs[k]);
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.assign(node.style, attrs[k]);
        } else if (k === 'disabled') {
          if (attrs[k]) node.setAttribute('disabled', 'disabled');
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    if (children == null) return;
    if (Array.isArray(children)) {
      children.forEach(function (c) { appendChildren(node, c); });
    } else if (typeof children === 'string' || typeof children === 'number') {
      node.appendChild(document.createTextNode(String(children)));
    } else if (children instanceof Node) {
      node.appendChild(children);
    }
  }

  UI.el = el;

  // 능력치 막대
  UI.statBar = function (label, value, color) {
    return el('div.stat-row', null, [
      el('span.stat-label', { text: label }),
      el('div.stat-track', null, [
        el('div.stat-fill', { style: { width: value + '%', background: color || '#c9a227' } })
      ]),
      el('span.stat-num', { text: String(value) })
    ]);
  };

  // 국가 엠블럼 SVG (호랑이/봉황/학을 상징 도형으로 표현)
  UI.emblem = function (type, color, size) {
    size = size || 60;
    var svg = 'http://www.w3.org/2000/svg';
    var wrap = document.createElementNS(svg, 'svg');
    wrap.setAttribute('viewBox', '0 0 100 100');
    wrap.setAttribute('width', size);
    wrap.setAttribute('height', size);
    var content = '';
    if (type === 'tiger') {
      // 호랑이: 원형 방패 + 발톱 줄무늬
      content =
        '<circle cx="50" cy="50" r="44" fill="' + color + '" stroke="#f5e6c8" stroke-width="3"/>' +
        '<path d="M30 35 Q50 20 70 35" stroke="#f5e6c8" stroke-width="4" fill="none"/>' +
        '<path d="M35 50 L45 45 M55 45 L65 50 M40 62 L50 58 L60 62" stroke="#f5e6c8" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<circle cx="40" cy="45" r="3" fill="#f5e6c8"/><circle cx="60" cy="45" r="3" fill="#f5e6c8"/>';
    } else if (type === 'phoenix') {
      // 봉황: 날개 펼친 새
      content =
        '<circle cx="50" cy="50" r="44" fill="' + color + '" stroke="#f5e6c8" stroke-width="3"/>' +
        '<path d="M50 30 C40 45 25 45 22 60 C40 52 45 60 50 72 C55 60 60 52 78 60 C75 45 60 45 50 30 Z" fill="#f5e6c8"/>' +
        '<path d="M50 30 L50 22 M46 26 L54 26" stroke="#f5e6c8" stroke-width="3"/>';
    } else if (type === 'crane') {
      // 학: 긴 목의 새
      content =
        '<circle cx="50" cy="50" r="44" fill="' + color + '" stroke="#4a3a10" stroke-width="3"/>' +
        '<path d="M35 70 Q45 55 45 40 Q45 28 55 26 L62 22" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<path d="M35 70 Q55 62 72 66" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<circle cx="62" cy="22" r="3" fill="#fff"/><circle cx="56" cy="26" r="2.5" fill="#8b1a1a"/>';
    }
    wrap.innerHTML = content;
    return wrap;
  };

  // 무장 아바타 (원형 + 이니셜)
  UI.avatar = function (name, color, size) {
    size = size || 48;
    return el('div.avatar', {
      style: {
        width: size + 'px', height: size + 'px',
        background: 'radial-gradient(circle at 30% 30%, ' + color + ', #1a1208)',
        fontSize: (size * 0.42) + 'px'
      },
      text: name.charAt(0)
    });
  };

  UI.starRating = function (n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += (i < n ? '★' : '☆');
    return s;
  };

  global.SAMGUK.UI = UI;
})(window);
