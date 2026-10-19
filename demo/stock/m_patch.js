(function() {
  'use strict';
  var URL0 = '/api/bot/patch_notes';
  var DOW = [ '일', '월', '화', '수', '목', '금', '토' ];
  var MP = window.MP = {
    n: 10,
    open: {}
  };
  (function() {
    if (document.getElementById('mp-css')) return;
    var st = document.createElement('style');
    st.id = 'mp-css';
    st.textContent = [ '.mp-cap{font-size:13px;font-weight:800;color:#6b7280;margin:14px 4px 6px;letter-spacing:-.2px}', '.mp-cap:first-child{margin-top:2px}', '.mp-sec{background:#fff;border-radius:12px;margin:0 0 8px;overflow:hidden}', '.mp-sh{display:flex;align-items:baseline;gap:8px;padding:11px 14px;cursor:pointer;-webkit-tap-highlight-color:transparent}', '.mp-sh:active{background:#f3f4f6}', '.mp-ar{flex:0 0 auto;color:#9aa3af;font-size:12px;width:12px}', '.mp-t{flex:1;min-width:0;font-size:15px;font-weight:700;color:#0b1220;letter-spacing:-.3px;line-height:1.4}', '.mp-k{flex:0 0 auto;font-size:12.5px;color:#9aa3af;white-space:nowrap}', '.mp-bd{padding:0 14px 12px 34px;font-size:14px;line-height:1.6;color:#1f2937;word-break:break-word}', '.mp-sec:not(.on) > .mp-bd{display:none}', '.mp-li{position:relative;margin:3px 0}', '.mp-li > .mp-dot{position:absolute;left:-12px;color:#9aa3af}', '.mp-p{margin:6px 0}', '.mp-h3{font-weight:800;margin:10px 0 4px;color:#16324f}', '.mp-q{border-left:3px solid #d1d5db;padding:1px 0 1px 9px;color:#4b5563;margin:2px 0}', '.mp-code{font-family:Consolas,monospace;font-size:12.5px;background:#f3f4f6;border-radius:4px;padding:0 3px}', '.mp-pre{font-family:Consolas,monospace;font-size:12px;background:#f3f4f6;border-radius:8px;padding:8px;white-space:pre-wrap;margin:6px 0}', '.mp-more{display:block;width:100%;margin:4px 0 10px}' ].join('\n');
    document.head.appendChild(st);
  })();
  function why(d) {
    var w = d.__err ? d.__err.message || String(d.__err) : d.error || '답이 비었습니다';
    return /HTTP 404/.test(w) ? '컴퓨터 서버를 다시 켠 뒤에 나옵니다 (HTTP 404)' : w;
  }
  function dayLabel(s) {
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return String(s || '');
    var d = new Date(+m[1], +m[2] - 1, +m[3]), t = new Date;
    var lb = +m[2] + '/' + +m[3] + ' (' + DOW[d.getDay()] + ')';
    if (d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()) lb = '오늘 · ' + lb;
    return lb;
  }
  function inl(parent, s) {
    s = String(s == null ? '' : s).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    var re = /\*\*([^*]+)\*\*|`([^`]+)`/g, last = 0, m;
    while (m = re.exec(s)) {
      if (m.index > last) parent.appendChild(document.createTextNode(s.slice(last, m.index)));
      if (m[1] != null) parent.appendChild(el('b', '', m[1])); else parent.appendChild(el('code', 'mp-code', m[2]));
      last = re.lastIndex;
    }
    if (last < s.length) parent.appendChild(document.createTextNode(s.slice(last)));
    return parent;
  }
  function li(text, depth) {
    var x = el('div', 'mp-li');
    if (depth) x.style.marginLeft = Math.min(3, depth) * 14 + 'px';
    x.appendChild(el('span', 'mp-dot', '•'));
    inl(x, text);
    return x;
  }
  function mdBody(text) {
    var box = el('div', 'mp-md'), para = null, pre = null;
    String(text || '').split('\n').forEach((function(ln) {
      var m;
      if (/^\s*```/.test(ln)) {
        if (pre) {
          pre = null;
        } else {
          pre = el('div', 'mp-pre', '');
          box.appendChild(pre);
        }
        para = null;
        return;
      }
      if (pre) {
        pre.textContent += (pre.textContent ? '\n' : '') + ln;
        return;
      }
      if (!ln.trim()) {
        para = null;
        return;
      }
      if (m = ln.match(/^#{1,6}\s+(.*)$/)) {
        box.appendChild(inl(el('div', 'mp-h3'), m[1]));
        para = null;
        return;
      }
      if (m = ln.match(/^(\s*)[-*+]\s+(.*)$/)) {
        box.appendChild(li(m[2], Math.floor(m[1].length / 2)));
        para = null;
        return;
      }
      if (m = ln.match(/^\s*>\s?(.*)$/)) {
        box.appendChild(inl(el('div', 'mp-q'), m[1]));
        para = null;
        return;
      }
      if (!para) {
        para = el('div', 'mp-p');
        box.appendChild(para);
      } else para.appendChild(document.createElement('br'));
      inl(para, ln);
    }));
    return box;
  }
  function sec(key, title, side, first, bodyFn) {
    var on = key in MP.open ? MP.open[key] : !!first;
    var box = el('div', 'mp-sec' + (on ? ' on' : ''));
    box.setAttribute('data-mpk', key);
    var h = el('div', 'mp-sh');
    var ar = el('span', 'mp-ar', on ? '▼' : '▶');
    h.appendChild(ar);
    h.appendChild(el('span', 'mp-t', title || '(제목 없음)'));
    if (side) h.appendChild(el('span', 'mp-k', side));
    var bd = el('div', 'mp-bd');
    bodyFn(bd);
    h.onclick = function() {
      var now = !box.classList.contains('on');
      MP.open[key] = now;
      box.classList.toggle('on', now);
      ar.textContent = now ? '▼' : '▶';
    };
    box.appendChild(h);
    box.appendChild(bd);
    return box;
  }
  MP.render = function(first) {
    TITLE.textContent = '패치노트';
    var u = URL0 + '?n=' + MP.n;
    if (first && hasCache(u)) first = false;
    if (first) {
      var w = document.createDocumentFragment();
      w.appendChild(el('div', 'mut', '불러오는 중…'));
      swapBody(w);
    }
    getJSONc(u).catch((function(e) {
      return {
        __err: e
      };
    })).then((function(d) {
      if (TAB !== 'patch' || URL0 + '?n=' + MP.n !== u) return;
      d = d || {};
      var g = document.createDocumentFragment();
      if (d.__err || d.ok === false) {
        g.appendChild(el('div', 'err', '📰 패치노트를 못 읽었습니다 — ' + why(d)));
        swapBody(g);
        return;
      }
      live(true, '');
      var days = d.days || [], notes = d.notes || [];
      g.appendChild(el('div', 'mp-cap', '📜 날짜별 바뀐 것 (최근 30일)'));
      if (!days.length) g.appendChild(el('div', 'mut', '최근 30일에 기록된 변경이 없습니다.'));
      days.forEach((function(x, i) {
        var its = x.items || [];
        g.appendChild(sec('g:' + x.day, dayLabel(x.day), its.length + '건', i === 0, (function(bd) {
          its.forEach((function(s) {
            bd.appendChild(li(s, 0));
          }));
        })));
      }));
      g.appendChild(el('div', 'mp-cap', '🌙 새벽 작업이 적어 둔 기록'));
      if (d.notes_error) g.appendChild(el('div', 'err', '⚠ ' + d.notes_error)); else if (!notes.length) g.appendChild(el('div', 'mut', '아직 적어 둔 기록이 없습니다.'));
      notes.forEach((function(x, i) {
        g.appendChild(sec('n:' + x.title, x.title, '', i === 0, (function(bd) {
          bd.appendChild(mdBody(x.body));
          if (x.cut) bd.appendChild(el('div', 'mut', '… 너무 길어 여기까지만 보여 줍니다 — 나머지는 컴퓨터 메인 화면 «패치노트»'));
        })));
      }));
      var rest = (Number(d.notes_total) || 0) - notes.length;
      if (rest > 0 && !d.notes_error) {
        var b = el('button', 'btn mp-more', '옛 기록 더 보기 (' + rest + '회차 더)');
        b.onclick = function() {
          MP.n += 10;
          MP.render(true);
        };
        g.appendChild(b);
      }
      g.appendChild(el('div', 'mut', '컴퓨터 메인 화면 «패치노트» 와 같은 글입니다'));
      swapBody(g);
    }));
  };
})();
