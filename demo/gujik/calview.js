(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var D = {};
  try { D = JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}") || {}; } catch (e) { D = {}; }
  var LOGO = { "잡코리아": "icons/site_jobkorea.png", "사람인": "icons/site_saramin.png" };
  var SHOW_KEY = "jkCalViewShow";
  var today = JKCal.kstToday();
  var S = { y: +today.slice(0, 4), m: +today.slice(5, 7), cells: [], items: [], data: null, show: { scrap: true, job: true }, seq: 0, pop: null, tt: null };
  function inFrame() { try { return window.parent !== window; } catch (e) { return true; } }
  function close() {
    if (inFrame()) { try { window.parent.postMessage({ __jkCalView: 1, t: "close" }, "*"); } catch (e) { } }
    else window.close();
  }
  function send(msg) {
    return new Promise(function (res) {
      try {
        chrome.runtime.sendMessage(Object.assign({ ticket: D.ticket || "" }, msg), function (r) {
          if (chrome.runtime.lastError) r = null;
          res(r);
        });
      } catch (e) { res(null); }
    });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function openLink(u) {
    if (!/^https?:\/\/[^\s]+$/i.test(u || "")) return;
    try { chrome.tabs.create({ url: u, active: true }); } catch (e) { window.open(u, "_blank", "noopener"); }
  }
  function toast(text, label, fn, ms) {
    var t = $("toast"), b = $("tbtn");
    $("tmsg").textContent = text;
    b.hidden = !label; b.textContent = label || "";
    b.onclick = label ? function () { t.classList.remove("on"); fn(); } : null;
    t.classList.add("on");
    clearTimeout(S.tt);
    S.tt = setTimeout(function () { t.classList.remove("on"); }, ms || 5000);
  }
  function paintStatus() {
    var st = $("st"), d = S.data || {};
    st.textContent = "";
    var bits = [];
    function add(text, cls) { var s = el("span", cls || "", text); bits.push(s); }
    if (d.ok === false) add(d.err || "달력 자료를 받지 못했어요", "err");
    else {
      if (d.scrapErr) add("📌 " + d.scrapErr, "err");
      else if (!d.on) add("📌 구글 계정을 연결하지 않아 이 브라우저의 스크랩 모음만 보여요");
      if (d.icsErr) add("📅 " + d.icsErr, "err");
      else if (!d.icsSet) add("📅 설정(⚙)에 «취업캘린더» 비공개 주소를 넣으면 발표·면접 일정도 함께 보여요");
    }
    bits.forEach(function (s, i) { if (i) st.appendChild(document.createTextNode("  ·  ")); st.appendChild(s); });
    if (bits.length && (d.scrapErr || d.icsErr || !d.on || !d.icsSet)) {
      var b = el("button", "", "설정 열기");
      b.type = "button"; b.onclick = openSettings;
      st.appendChild(document.createTextNode("  "));
      st.appendChild(b);
    }
  }
  function openSettings() { try { chrome.runtime.openOptionsPage(); } catch (e) { } }
  function itemsOn(day) {
    return S.items.filter(function (v) { return S.show[v.src] && v.start <= day && v.end >= day; })
      .sort(function (a, b) {
        if (a.src !== b.src) return a.src === "job" ? -1 : 1;
        if ((a.time || "") !== (b.time || "")) return (a.time || "99") < (b.time || "99") ? -1 : 1;
        return a.title < b.title ? -1 : 1;
      });
  }
  function chip(v, inList) {
    var c = el("div", "chip " + v.src + (v.link ? "" : " nolink"));
    if (v.site && LOGO[v.site]) {
      var im = el("img"); im.src = LOGO[v.site]; im.alt = v.site; c.appendChild(im);
    } else c.appendChild(el("span", "dot"));
    if (v.time) c.appendChild(el("span", "tm", v.time));
    c.appendChild(el("span", "tx", v.title));
    var tip = (v.src === "job" ? "📅 취업캘린더" : "📌 스크랩 공고") + (v.site ? " · " + v.site : "") + "\n" + v.title +
      (v.start !== v.end ? "\n" + v.start + " ~ " + v.end : "") + (v.link ? "\n누르면 링크를 새 탭으로 열어요" : "\n누르면 내용을 봐요") +
      (v.src === "job" ? "" : "\n오른쪽 클릭 = 고치기 · 지우기");
    c.title = tip;
    c.setAttribute("data-src", v.src);
    if (v.site) c.setAttribute("data-site", v.site);
    c.addEventListener("click", function (e) {
      e.stopPropagation();
      if (v.link) openLink(v.link);
      else showItem(v, c);
    });
    c.addEventListener("contextmenu", function (e) { e.preventDefault(); e.stopPropagation(); showMenu(v, e.clientX, e.clientY); });
    return c;
  }
  function render() {
    $("month").textContent = S.y + "년 " + S.m + "월";
    var g = $("grid");
    g.textContent = "";
    var weeks = S.cells.length / 7;
    g.style.gridTemplateRows = "repeat(" + weeks + ", minmax(0, 1fr))";
    var mm = S.y + "-" + (S.m < 10 ? "0" : "") + S.m;
    S.cells.forEach(function (day, i) {
      var c = el("div", "day");
      if (day.slice(0, 7) !== mm) c.classList.add("out");
      if (i % 7 === 0) c.classList.add("sun");
      if (i % 7 === 6) c.classList.add("sat");
      if (day === today) c.classList.add("today");
      c.setAttribute("data-day", day);
      c.appendChild(el("span", "num", String(+day.slice(8, 10))));
      c.title = day + " — 빈 곳을 누르면 일정 추가";
      c.addEventListener("click", function (e) { e.stopPropagation(); showAdd(day, c); });
      g.appendChild(c);
    });
    fillChips();
  }
  function fillChips() {
    var cells = $("grid").querySelectorAll(".day");
    if (!cells.length) return;
    var h = cells[0].clientHeight, fit = Math.max(1, Math.floor((h - 22) / 21));
    Array.prototype.forEach.call(cells, function (c) {
      Array.prototype.slice.call(c.querySelectorAll(".chip,.more")).forEach(function (n) { n.remove(); });
      var day = c.getAttribute("data-day"), list = itemsOn(day);
      var n = list.length > fit ? fit - 1 : list.length;
      list.slice(0, n).forEach(function (v) { c.appendChild(chip(v)); });
      if (list.length > n) {
        var m = el("div", "more", "+" + (list.length - n) + "개 더");
        m.addEventListener("click", function (e) { e.stopPropagation(); showDay(day, c); });
        c.appendChild(m);
      }
    });
  }
  function closePop() { if (S.pop && S.pop.parentNode) S.pop.parentNode.removeChild(S.pop); S.pop = null; }
  function placePop(p, anchor) {
    document.body.appendChild(p);
    var r = anchor.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, pw = p.offsetWidth, ph = p.offsetHeight;
    var x = r.right + 6; if (x + pw > W - 8) x = r.left - pw - 6; if (x < 8) x = Math.max(8, Math.min(W - pw - 8, r.left));
    var y = r.top; if (y + ph > H - 8) y = Math.max(8, H - ph - 8);
    p.style.left = x + "px"; p.style.top = y + "px";
  }
  function popBox(title) {
    closePop();
    var p = el("div", "pop");
    p.setAttribute("role", "dialog");
    var h = el("h3");
    h.appendChild(el("span", "", title));
    h.appendChild(el("span", "sp"));
    var x = el("button", "lnk", "✕"); x.type = "button"; x.title = "닫기"; x.onclick = closePop;
    h.appendChild(x);
    p.appendChild(h);
    p.addEventListener("click", function (e) { e.stopPropagation(); });
    S.pop = p;
    return p;
  }
  function placeAt(p, x, y) {
    document.body.appendChild(p);
    var W = window.innerWidth, H = window.innerHeight;
    p.style.left = Math.max(8, Math.min(W - p.offsetWidth - 8, x)) + "px";
    p.style.top = Math.max(8, Math.min(H - p.offsetHeight - 8, y)) + "px";
  }
  function tagOf(v) { return { src: v.src, from: v.from || "", kind: v.kind || "", id: v.id || "", link: v.link || "", start: v.start || "" }; }
  function showMenu(v, x, y) {
    closePop();
    var p = el("div", "pop menu");
    p.setAttribute("role", "menu");
    p.addEventListener("click", function (e) { e.stopPropagation(); });
    p.addEventListener("contextmenu", function (e) { e.preventDefault(); e.stopPropagation(); });
    p.appendChild(el("div", "mh", (v.src === "job" ? "📅 " : "📌 ") + v.title));
    function item(label, fn, cls) {
      var b = el("button", "mi" + (cls ? " " + cls : ""), label);
      b.type = "button"; b.setAttribute("role", "menuitem");
      b.onclick = function () { fn(); };
      p.appendChild(b);
      return b;
    }
    if (v.link) item(v.kind === "post" ? "↗ 공고 열기" : "↗ 링크 열기", function () { closePop(); openLink(v.link); });
    if (v.src === "job") {
      item("📅 구글 캘린더에서 보기", function () { closePop(); openLink("https://calendar.google.com/calendar/r/day/" + v.start.replace(/-/g, "/")); });
      p.appendChild(el("div", "mn", "취업캘린더 일정은 읽기만 해요 — 고치거나 지우려면 구글 캘린더에서"));
    } else {
      item("✏ 고치기", function () { showEdit(v, x, y); }).id = "miEdit";
      item("🗑 일정 삭제", function () { del(v); }, "warn").id = "miDel";
    }
    if (v.memo || v.loc) item("ℹ 내용 보기", function () { showItemAt(v, x, y); });
    S.pop = p;
    placeAt(p, x, y);
  }
  function del(v) {
    closePop();
    send({ type: "calViewDel", it: tagOf(v) }).then(function (r) {
      if (r && r.ok) {
        S.items = S.items.filter(function (w) { return w !== v; });
        fillChips();
        toast("🗑 «" + v.title + "» 을 지웠어요", "되돌리기", function () {
          send({ type: "calViewUndo" }).then(function (u) {
            if (u && u.ok) { toast("되돌렸어요 ✓"); load(true); }
            else toast("되돌리지 못했어요 — " + (u && u.err === "too fast" ? "잠시 뒤 다시 눌러 주세요" : (u && u.err) || "응답이 없어요"), null, null, 6000);
          });
        }, 9000);
        return;
      }
      toast("지우지 못했어요 — " + (r && r.err === "too fast" ? "잠시 뒤 다시 해 주세요" : (r && r.err) || "확장과 연결하지 못했어요(F5)"), null, null, 6000);
    });
  }
  function showEdit(v, x, y) {
    var post = v.kind !== "user";
    var p = popBox("✏ 고치기");
    function row(label, input) { var r = el("label", "row"); r.appendChild(el("span", "", label)); r.appendChild(input); p.appendChild(r); return input; }
    function inp(type, val, max, id) { var n = el("input"); n.type = type; n.value = val || ""; if (max) n.maxLength = max; n.id = id; return n; }
    var f = {};
    if (post) {
      f.co = row("회사", inp("text", v.co, 60, "edCo"));
      f.ti = row("제목", inp("text", v.pt || v.title, 200, "edTi"));
      var wrap = el("span", "dlw"), lab = el("label", "al");
      f.dl = inp("date", /^\d{4}-\d{2}-\d{2}$/.test(v.dl || "") ? v.dl : "", 0, "edDl");
      f.al = inp("checkbox", "", 0, "edAl"); f.al.checked = v.dl === "상시";
      lab.appendChild(f.al); lab.appendChild(document.createTextNode(" 상시"));
      wrap.appendChild(f.dl); wrap.appendChild(lab);
      row("마감", wrap);
      f.al.onchange = function () { if (f.al.checked) f.dl.value = ""; };
      f.dl.oninput = function () { if (f.dl.value) f.al.checked = false; };
      p.appendChild(el("div", "mode", "마감을 비우면(또는 상시) 지금 날짜 칸에 그대로 있어요."));
    } else {
      f.ti = row("제목", inp("text", v.title, 100, "edTi"));
      f.day = row("날짜", inp("date", v.start, 0, "edDay"));
      f.lk = row("링크", inp("text", v.link, 600, "edLk"));
      f.me = el("textarea"); f.me.maxLength = 500; f.me.id = "edMe"; f.me.value = v.um || "";
      row("메모", f.me);
    }
    var err = el("div", "err"); p.appendChild(err);
    var act = el("div", "act"), no = el("button", "no", "닫기"), go = el("button", "go", "저장");
    no.type = go.type = "button"; go.id = "edGo"; no.onclick = closePop;
    function run() {
      if (go.disabled) return;
      var val = post ? { company: f.co.value, title: f.ti.value, deadline: f.al.checked ? "상시" : f.dl.value }
                     : { title: f.ti.value, date: f.day.value, link: f.lk.value, memo: f.me.value };
      go.disabled = true; err.textContent = "";
      send({ type: "calViewEdit", it: tagOf(v), v: val }).then(function (r) {
        go.disabled = false;
        if (r && r.ok) { closePop(); toast("고쳤어요 ✓"); load(true); return; }
        err.textContent = r && r.err === "too fast" ? "잠시 뒤 다시 눌러 주세요" : (r && r.err) || "확장과 연결하지 못했어요 — 이 탭을 새로고침(F5)한 뒤 다시 해 주세요";
      });
    }
    go.onclick = run;
    Array.prototype.forEach.call(p.querySelectorAll("input[type=text]"), function (n) {
      n.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); run(); } });
    });
    act.appendChild(no); act.appendChild(go); p.appendChild(act);
    placeAt(p, x, y);
    setTimeout(function () { f.ti.focus(); }, 0);
  }
  function showItemAt(v, x, y) {
    var p = popBox((v.src === "job" ? "📅 " : "📌 ") + v.title);
    p.appendChild(el("div", "mode", v.start + (v.end !== v.start ? " ~ " + v.end : "") + (v.time ? " · " + v.time : "") + (v.loc ? " · " + v.loc : "")));
    if (v.memo) p.appendChild(el("div", "memo", v.memo));
    placeAt(p, x, y);
  }
  function dayLabel(day) {
    var w = "일월화수목금토".charAt(new Date(day + "T00:00:00Z").getUTCDay());
    return (+day.slice(5, 7)) + "월 " + (+day.slice(8, 10)) + "일 (" + w + ")";
  }
  function showItem(v, anchor) {
    var p = popBox((v.src === "job" ? "📅 " : "📌 ") + v.title);
    p.appendChild(el("div", "mode", v.start + (v.end !== v.start ? " ~ " + v.end : "") + (v.time ? " · " + v.time : "") + (v.loc ? " · " + v.loc : "")));
    if (v.memo) p.appendChild(el("div", "memo", v.memo));
    placePop(p, anchor);
  }
  function showDay(day, anchor) {
    var p = popBox(dayLabel(day));
    var list = el("div", "list");
    itemsOn(day).forEach(function (v) { list.appendChild(chip(v, true)); });
    p.appendChild(list);
    var act = el("div", "act"), b = el("button", "no", "＋ 일정 추가");
    b.type = "button"; b.onclick = function () { showAdd(day, anchor); };
    act.appendChild(b); p.appendChild(act);
    placePop(p, anchor);
  }
  function showAdd(day, anchor) {
    var d = S.data || {};
    var p = popBox("＋ " + dayLabel(day) + " 일정 추가");
    function row(label, input) { var r = el("label", "row"); r.appendChild(el("span", "", label)); r.appendChild(input); p.appendChild(r); return input; }
    var ti = el("input"); ti.type = "text"; ti.maxLength = 100; ti.placeholder = "예: ○○ 1차 면접"; ti.id = "addTitle";
    var lk = el("input"); lk.type = "text"; lk.maxLength = 600; lk.placeholder = "https://… (없어도 돼요)"; lk.id = "addLink";
    var me = el("textarea"); me.maxLength = 500; me.placeholder = "메모 (없어도 돼요)"; me.id = "addMemo";
    row("제목", ti); row("링크", lk); row("메모", me);
    p.appendChild(el("div", "mode", d.on
      ? "«추가» 를 누르면 내 구글 캘린더 «📌 스크랩 공고» 에 바로 들어가요."
      : "«추가» 를 누르면 이 브라우저 달력에 바로 들어가요. 설정(⚙)에서 구글 계정을 연결하면 구글 캘린더(폰)에도 들어가요."));
    var err = el("div", "err"); p.appendChild(err);
    var act = el("div", "act"), no = el("button", "no", "닫기"), go = el("button", "go", "추가");
    no.type = go.type = "button"; go.id = "addGo";
    no.onclick = closePop;
    function run(forceTab) {
      if (go.disabled) return;
      var ev = { title: ti.value, date: day, link: lk.value, memo: me.value };
      var chk = JKCal.userEventInfo(ev);
      if (chk.err) { err.textContent = chk.err; return; }
      go.disabled = true; err.textContent = "";
      send({ type: "calViewAdd", ev: ev, forceTab: forceTab === true }).then(function (r) {
        go.disabled = false;
        if (r && r.ok) {
          closePop();
          if (r.mode === "gcal") { toast("«📌 스크랩 공고» 에 넣었어요 ✓"); load(true); }
          else if (r.mode === "local") { toast("달력에 넣었어요 ✓"); load(true); }
          else toast("구글 캘린더 «일정 추가» 화면을 열었어요 — 거기서 «저장» 을 눌러 주세요", null, null, 6000);
          return;
        }
        if (r && r.err === "too fast") { err.textContent = "잠시 뒤 다시 눌러 주세요"; return; }
        err.textContent = (r && r.err) || "확장과 연결하지 못했어요 — 이 탭을 새로고침(F5)한 뒤 다시 해 주세요";
        if (r && r.fallback) {
          var fb = el("button", "no", "캘린더 화면으로 열기"); fb.type = "button";
          fb.onclick = function () { fb.remove(); run(true); };
          act.insertBefore(fb, no);
        }
      });
    }
    go.onclick = function () { run(false); };
    [ti, lk].forEach(function (n) { n.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); run(false); } }); });
    act.appendChild(no); act.appendChild(go); p.appendChild(act);
    placePop(p, anchor);
    setTimeout(function () { ti.focus(); }, 0);
  }
  function load(fresh) {
    S.cells = JKCal.monthCells(S.y, S.m);
    render();
    var my = ++S.seq;
    document.body.classList.add("busy");
    send({ type: "calView", from: S.cells[0], to: S.cells[S.cells.length - 1], fresh: fresh === true }).then(function (r) {
      if (my !== S.seq) return;
      document.body.classList.remove("busy");
      S.data = r || { ok: false, err: "확장과 연결하지 못했어요 — 이 탭을 새로고침(F5)한 뒤 다시 열어 주세요" };
      S.items = (r && r.ok && Array.isArray(r.items)) ? r.items : [];
      paintStatus();
      fillChips();
    });
  }
  function go(d) {
    closePop();
    var m = S.m + d, y = S.y;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    S.y = y; S.m = m;
    load(false);
  }
  $("prev").onclick = function () { go(-1); };
  $("next").onclick = function () { go(1); };
  $("today").onclick = function () { closePop(); S.y = +today.slice(0, 4); S.m = +today.slice(5, 7); load(false); };
  $("reload").onclick = function () { closePop(); load(true); };
  $("openSet").onclick = openSettings;
  $("x").onclick = close;
  Array.prototype.forEach.call(document.querySelectorAll(".leg button"), function (b) {
    b.onclick = function () {
      var k = b.getAttribute("data-src");
      S.show[k] = !S.show[k];
      b.setAttribute("aria-pressed", S.show[k] ? "true" : "false");
      var o = {}; o[SHOW_KEY] = S.show;
      try { chrome.storage.local.set(o); } catch (e) { }
      closePop(); fillChips();
    };
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (S.pop) { closePop(); return; }
    close();
  });
  document.addEventListener("click", function () { closePop(); });
  (function () {
    if (!inFrame()) return;
    var hd = document.querySelector(".hd"), on = false;
    if (!hd) return;
    hd.title = "빈 곳을 끌어 달력 옮기기";
    function post(ph, e) { try { window.parent.postMessage({ __jkCalView: 1, t: "drag", ph: ph, sx: e.screenX, sy: e.screenY }, "*"); } catch (x) { } }
    hd.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || (e.target.closest && e.target.closest("button, input, a, select, label"))) return;
      on = true;
      try { hd.setPointerCapture(e.pointerId); } catch (x) { }
      hd.classList.add("moving");
      post("start", e);
      e.preventDefault();
    });
    hd.addEventListener("pointermove", function (e) { if (on) post("move", e); });
    function end(e) { if (!on) return; on = false; hd.classList.remove("moving"); post("end", e); }
    hd.addEventListener("pointerup", end);
    hd.addEventListener("pointercancel", end);
  })();
  var rt = null;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(fillChips, 80); });
  try {
    chrome.storage.local.get([SHOW_KEY], function (d) {
      var s = d && d[SHOW_KEY];
      if (s && typeof s === "object") {
        S.show = { scrap: s.scrap !== false, job: s.job !== false };
        Array.prototype.forEach.call(document.querySelectorAll(".leg button"), function (b) {
          b.setAttribute("aria-pressed", S.show[b.getAttribute("data-src")] ? "true" : "false");
        });
      }
      load(false);
    });
  } catch (e) { load(false); }
})();
