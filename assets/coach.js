/* coach.js — 체험판 화면 안 «여기 눌러 보세요» 표시(코치 마크)
 *
 * 쓰는 법: 체험판 index.html 맨 끝에
 *   <script src="../../assets/coach.js"></script>
 *   <script src="coach-config.js"></script>      ← 여기서 Coach.init([...]) 를 부른다
 *
 * 표시 하나 = {
 *   id:    '이름'                       (sessionStorage 에 «봤음» 을 기억하는 열쇠)
 *   sel:   'CSS 선택자'                 (또는 find: function () { return 요소 | 요소들 })
 *   text:  '글자' | /정규식/             (선택자로 찾은 것 중 글자가 맞는 것만 · 생략 가능)
 *   label: '짧은 꼬리표'
 *   at:    [가로비율, 세로비율]          (점이 요소의 어디에 붙나 · 기본 [1,0] = 오른쪽 위 모서리)
 *   side:  'top'|'bottom'|'left'|'right' (꼬리표가 점의 어느 쪽에 · 기본 'top')
 *   align: 'start'|'end'                (위·아래 꼬리표를 점에서 오른쪽/왼쪽으로 뻗게 · 기본 가운데)
 *   dx, dy: 점 위치를 픽셀만큼 더 옮김
 *   hit:   function (눌린요소, 대상요소) → true 면 사라짐 (기본: 대상 안을 누르면)
 *   done:  function () → true 면 사라짐 (누르기 말고 다른 조건 · 예: 달이 바뀜)
 *   when:  function () → false 면 지금은 안 보임
 * }
 * 표시 자체는 pointer-events:none 이라 클릭은 언제나 아래 원래 요소로 간다.
 */
(function () {
  'use strict';
  if (window.Coach) return;

  var MAX_DEFAULT = 2;   // 한 화면에 2개까지 — 많으면 꼬리표가 몰려 어느 단추 것인지 헷갈린다(10/16 사용자 화면 확인 후). 하나 누르면 다음 것이 나온다
  var marks = [], layer = null, opts = {}, doneSet = {}, storeKey = '', lastDown = null, darkNow = null, fontFam = '';

  function load() {
    try { var v = JSON.parse(sessionStorage.getItem(storeKey) || '{}'); if (v && typeof v === 'object') doneSet = v; } catch (e) { doneSet = {}; }
  }
  function save() {
    try { sessionStorage.setItem(storeKey, JSON.stringify(doneSet)); } catch (e) { /* 파일로 열면 막힐 수 있다 — 그래도 화면에선 사라진다 */ }
  }

  var CSS = '' +
    '#coach-layer{position:fixed;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:2147483000}' +
    '#coach-layer .cm{position:fixed;left:0;top:0;pointer-events:none;transition:opacity .25s ease;opacity:1}' +
    '#coach-layer .cm.hide{opacity:0;visibility:hidden;transition:opacity .15s ease,visibility 0s .15s}' +
    '#coach-layer .cm.bye{opacity:0;transform-origin:center}' +
    '#coach-layer .dot{position:absolute;left:-7px;top:-7px;width:14px;height:14px;border-radius:50%;background:var(--cm-c);' +
      'border:2px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.35)}' +
    '#coach-layer .dot::before,#coach-layer .dot::after{content:"";position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;' +
      'border-radius:50%;background:var(--cm-c);opacity:.55;animation:cm-pulse 1.6s ease-out infinite}' +
    '#coach-layer .dot::after{animation-delay:.8s}' +
    '@keyframes cm-pulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(3.2);opacity:0}}' +
    '#coach-layer .tag{position:absolute;white-space:nowrap;font-size:12.5px;font-weight:700;line-height:1;letter-spacing:-.2px;' +
      'padding:5px 9px 5px;border-radius:999px;background:var(--cm-c);color:var(--cm-t);border:2px solid #fff;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.28);word-break:keep-all}' +
    '@media (prefers-reduced-motion: reduce){#coach-layer .dot::before,#coach-layer .dot::after{animation:none;transform:scale(1.9);opacity:.3}}';

  function isDark() {
    var els = [document.body, document.documentElement];
    for (var i = 0; i < els.length; i++) {
      if (!els[i]) continue;
      var c = getComputedStyle(els[i]).backgroundColor, m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c || '');
      if (!m || (m[4] !== undefined && +m[4] < 0.1)) continue;
      return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 < 0.45;
    }
    return false;
  }
  function paintTheme() {
    var d = isDark();
    if (d === darkNow) return;
    darkNow = d;
    layer.style.setProperty('--cm-c', d ? '#6aa6f8' : '#1d63c9');
    layer.style.setProperty('--cm-t', d ? '#0b1a33' : '#ffffff');
  }

  function candidates(m) {
    var list;
    try {
      if (typeof m.find === 'function') { list = m.find(); list = !list ? [] : (list.length !== undefined && !list.nodeType ? [].slice.call(list) : [list]); }
      else list = [].slice.call(document.querySelectorAll(m.sel));
    } catch (e) { return []; }
    if (m.text != null) {
      list = list.filter(function (el) {
        var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return m.text instanceof RegExp ? m.text.test(t) : t.indexOf(m.text) >= 0;
      });
    }
    return list;
  }

  // 요소가 지금 화면에서 실제로 보이나 — 크기·화면 안·위를 다른 것(시트·덮개)이 덮지 않았나
  function visibleRect(el) {
    if (!el || !el.isConnected) return null;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    var W = window.innerWidth, H = window.innerHeight;
    var x1 = Math.max(r.left, 0), y1 = Math.max(r.top, 0), x2 = Math.min(r.right, W), y2 = Math.min(r.bottom, H);
    if (x2 - x1 < 4 || y2 - y1 < 4) return null;
    var cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    var hitEl = document.elementFromPoint(cx, cy);
    if (!hitEl || !(hitEl === el || el.contains(hitEl))) {
      // 가운데가 가려졌어도 보이는 부분 위쪽(1/4 지점)이 맞으면 보이는 것으로 친다(스크롤 영역에 반쯤 걸친 경우)
      var y3 = y1 + (y2 - y1) * 0.25, h2 = document.elementFromPoint(cx, y3);
      if (!h2 || !(h2 === el || el.contains(h2))) return null;
    }
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    return r;
  }

  function build(m) {
    var root = document.createElement('div');
    root.className = 'cm hide';
    root.setAttribute('aria-hidden', 'true');
    var dot = document.createElement('span'); dot.className = 'dot';
    var tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = m.label;
    if (fontFam) tag.style.fontFamily = fontFam;
    root.appendChild(dot); root.appendChild(tag);
    layer.appendChild(root);
    m.node = root; m.tagNode = tag; m.shown = false;
  }

  function place(m, r) {
    var at = m.at || [1, 0];
    var x = r.left + r.width * at[0] + (m.dx || 0), y = r.top + r.height * at[1] + (m.dy || 0);
    var W = window.innerWidth, H = window.innerHeight;
    x = Math.max(9, Math.min(W - 9, x)); y = Math.max(9, Math.min(H - 9, y));
    var tw = m.tagNode.offsetWidth, th = m.tagNode.offsetHeight, gap = 10, side = m.side || 'top', tx, ty;
    // align: 위·아래 꼬리표를 점 기준 가운데(기본) · 'start'(점에서 오른쪽으로) · 'end'(점에서 왼쪽으로)
    var hx = m.align === 'start' ? -6 : m.align === 'end' ? 6 - tw : -tw / 2;
    function calc(s) {
      if (s === 'top') { tx = x + hx; ty = y - gap - th; }
      else if (s === 'bottom') { tx = x + hx; ty = y + gap; }
      else if (s === 'left') { tx = x - gap - tw; ty = y - th / 2; }
      else { tx = x + gap; ty = y - th / 2; }
    }
    function fits() { return tx >= 2 && ty >= 2 && tx + tw <= W - 2 && ty + th <= H - 2; }
    function axisFits(s) { return s === 'top' || s === 'bottom' ? (ty >= 2 && ty + th <= H - 2) : (tx >= 2 && tx + tw <= W - 2); }
    calc(side);
    // 화면 밖으로 나가면 반대편이 들어갈 때만 뒤집고, 아니면 그대로 두고 화면 안으로 민다
    if (!axisFits(side)) {
      var flip = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side];
      calc(flip);
      if (!axisFits(flip)) calc(side);
    }
    fits();
    tx = Math.max(4, Math.min(W - tw - 4, tx)); ty = Math.max(2, Math.min(H - th - 2, ty));
    m.node.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    m.tagNode.style.left = Math.round(tx - x) + 'px';
    m.tagNode.style.top = Math.round(ty - y) + 'px';
  }

  function dismiss(m) {
    if (m.gone) return;
    m.gone = true; doneSet[m.id] = 1; save();
    if (m.node) {
      m.node.classList.add('bye');
      var n = m.node; setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 300);
    }
  }

  function tick() {
    if (!layer) return;
    paintTheme();
    var shown = 0, max = opts.max || MAX_DEFAULT;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m.gone) continue;
      if (typeof m.done === 'function') { var dn = false; try { dn = m.done(); } catch (e) {} if (dn) { dismiss(m); continue; } }
      var target = null, rect = null;
      var ok = true;
      if (typeof m.when === 'function') { try { ok = !!m.when(); } catch (e) { ok = false; } }
      if (ok && shown < max) {
        var c = candidates(m);
        for (var k = 0; k < c.length; k++) { var rr = visibleRect(c[k]); if (rr) { target = c[k]; rect = rr; break; } }
      }
      m.target = target;
      if (target) {
        shown++;
        place(m, rect);
        if (!m.shown) { m.node.classList.remove('hide'); m.shown = true; }
      } else if (m.shown) { m.node.classList.add('hide'); m.shown = false; }
    }
  }

  var raf = 0;
  function loop() { tick(); raf = requestAnimationFrame(loop); }

  function hits(m, x) {
    if (m.gone || !x || !x.nodeType) return false;
    if (typeof m.hit === 'function') { try { return !!m.hit(x, m.target); } catch (err) { return false; } }
    return !!(m.shown && m.target && (m.target === x || m.target.contains(x)));
  }
  // 누르기 시작한 순간(앱이 화면을 다시 그리기 전)에 어느 표시의 요소인지 기억해 두고,
  // 실제 «클릭» 이 이어지면 그 표시를 지운다(손가락으로 스크롤만 한 건 클릭이 아니라 그대로 둔다).
  // 사람이 누른 것만 센다 — 체험판이 켜질 때 스스로 단추를 .click() 하는 경우가 있다(우편물 체험판의 «정상배달» 등)
  function onDown(e) {
    if (!e.isTrusted) return;
    lastDown = marks.filter(function (m) { return hits(m, e.target); });
  }
  function onClick(e) {
    if (!e.isTrusted) return;
    var t = e.target, pend = lastDown || [];
    marks.forEach(function (m) { if (pend.indexOf(m) >= 0 || hits(m, t)) dismiss(m); });
    lastDown = null;
  }

  function start() {
    if (layer) return;
    var st = document.createElement('style'); st.id = 'coach-style'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
    layer = document.createElement('div'); layer.id = 'coach-layer';
    document.body.appendChild(layer);
    try { fontFam = getComputedStyle(document.body).fontFamily; } catch (e) {}
    marks.forEach(function (m) { if (!m.gone) build(m); });
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('click', onClick, true);
    loop();
  }

  window.Coach = {
    init: function (list, o) {
      opts = o || {};
      storeKey = 'coach:' + (opts.key || location.pathname);
      load();
      marks = (list || []).map(function (m) { var c = {}; for (var k in m) c[k] = m[k]; c.gone = !!doneSet[c.id]; return c; });
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
      else start();
    },
    reset: function () { doneSet = {}; save(); }
  };
})();
