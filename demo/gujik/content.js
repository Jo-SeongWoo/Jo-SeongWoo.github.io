/* 포트폴리오 체험판용 사본 — 원본 = 구직 도우미 확장 배포판 content.js. 바꾼 것: location.* → __jkLoc.*(37곳) · 최상위 창 판정 → true.
   받침(gj-shim.js)이 녹화한 실제 자료로 답한다. 손으로 고치지 말 것 — _도구\gujik\build_gujik.py 가 만든다. */
(function () {
  "use strict";
  var isTop = (true);
  var host = __jkLoc.hostname;
  var REVIEW_MAX = 200;
  if (host.indexOf("jobplanet") >= 0) {
    if (!isTop) runJobplanetScraper();
    else {
      var __act = null; try { __act = sessionStorage.getItem("jkFetchActive"); } catch (e) {}
      if (/jk_fetch=1/.test(__jkLoc.search + __jkLoc.hash) || __act) runReviewFetcher();
    }
    return;
  }
  if (window.__jkHelperLoaded) return;
  window.__jkHelperLoaded = true;
  var JK_VER = "1.74";
  if (isTop) { try { console.log("%c잡코리아 도우미 v" + JK_VER + " 로드됨%c " + __jkLoc.pathname, "background:#00a68f;color:#fff;padding:2px 7px;border-radius:5px;font-weight:800", "color:#64748b"); } catch (e) {} }
  var path = __jkLoc.pathname.toLowerCase();
  var EMBED_SITE_PARENT = /^https?:\/\/([a-z0-9-]+\.)*(jobkorea\.co\.kr|saramin\.co\.kr|jasoseol\.com|jobplanet\.co\.kr)$/;
  var embedParent = "";
  try { var _eao = __jkLoc.ancestorOrigins; if (_eao && _eao.length) embedParent = String(_eao[0]); } catch (e) {}
  var isEmbedded = !isTop && !EMBED_SITE_PARENT.test(embedParent);
  try { if (isEmbedded) initEmbedNav(); } catch (e) { console.warn("[EMB]", e); }
  try { if (isEmbedded) window.parent.postMessage({ __jkExt: "here", v: JK_VER }, "*"); } catch (e) { }
  function el(t, css, tx) { var e = document.createElement(t); if (t === "button") e.type = "button"; if (css) e.style.cssText = css; if (tx != null) e.textContent = tx; return e; }
  function esc(s) { return (s || "").replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function isJpOrigin(o) { return /^https:\/\/([a-z0-9-]+\.)*jobplanet\.co\.kr$/.test(String(o || "")); }
  function numTxt(v) { return String(v == null ? "" : v).replace(/[^0-9.,%]/g, ""); }
  function jpUrlOk(u) { return /^https:\/\/www\.jobplanet\.co\.kr\//.test(String(u || "")) ? String(u) : ""; }
  function stripEntityMark(s) { return String(s || "").replace(/[㈎-㈞]/g, ""); }
  function toast(msg, ms) {
    var t = el("div", "position:fixed;left:50%;bottom:40px;transform:translateX(-50%);background:#1f2937;color:#fff;" +
      "padding:12px 20px;border-radius:10px;font:600 15px/1.45 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;z-index:2147483600;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:80vw;text-align:center", msg);
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, ms || 2600);
  }
  function toastUndo(msg, onUndo, ms) {
    var box = document.getElementById("jkToastStack");
    if (!box) {
      box = el("div", "position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:2147483600;" +
        "display:flex;flex-direction:column-reverse;gap:8px;align-items:center;max-width:86vw");
      box.id = "jkToastStack"; document.body.appendChild(box);
    }
    var t = el("div", "display:flex;align-items:center;gap:14px;background:#1f2937;color:#fff;padding:10px 12px 10px 18px;" +
      "border-radius:10px;font:600 14.5px/1.45 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)");
    var m = el("span", "", msg);
    var u = el("button", "border:none;background:none;color:#93c5fd;font:800 14.5px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;cursor:pointer;" +
      "padding:4px 6px;white-space:nowrap", "되돌리기");
    u.type = "button";
    var timer = setTimeout(function () { t.remove(); }, ms || 8000);
    u.onclick = function () {
      if (u.disabled) return;
      u.disabled = true; u.textContent = "되돌리는 중…"; clearTimeout(timer);
      onUndo(function (ok, note) {
        if (ok) { t.remove(); toast(note || "되돌렸어요 ✅", 2200); }
        else { u.textContent = "되돌리기 실패"; m.textContent = note || "되돌리지 못했어요"; setTimeout(function () { t.remove(); }, 5000); }
      });
    };
    t.appendChild(m); t.appendChild(u); box.appendChild(t);
    return t;
  }
  function withTimeout(p, ms, onLate) {
    return new Promise(function (resolve) {
      var done = false;
      var t = setTimeout(function () { if (done) return; done = true; try { onLate && onLate(); } catch (e) {} resolve(); }, ms);
      Promise.resolve(p).then(function () { if (done) return; done = true; clearTimeout(t); resolve(); },
                              function () { if (done) return; done = true; clearTimeout(t); resolve(); });
    });
  }
  var LATE_WHY = "통근 계산이 너무 오래 걸려 건너뛰었어요 — 다음에 목록을 열면 다시 계산합니다";
  function originPicker(onChange) {
    var wrap = el("span", "display:none;align-items:center;gap:4px;font:700 12.5px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#64748b;white-space:nowrap");
    wrap.className = "jkOriginPick";
    function gear(label) {
      var a = el("span", "cursor:pointer;color:#0a8f5b;text-decoration:underline;font:700 12.5px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif", label);
      a.title = "출발 위치(집·본가 등)를 넣는 설정 창을 새 탭으로 열어요";
      a.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); bridgeFetch(null, 4000, "openSettings"); });
      return a;
    }
    bridgeFetch(null, 4000, "cmOrigins").then(function (res) {
      if (!res || !res.ok || !res.local || !res.names || !res.names.length) {
        wrap.appendChild(gear("⚙ 기준 위치 설정")); wrap.style.display = "inline-flex"; return;
      }
      var sel = document.createElement("select");
      sel.style.cssText = "border:1.5px solid #cbd5e1;border-radius:7px;padding:2px 4px;font:700 12.5px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#0f172a;background:#fff;cursor:pointer";
      res.names.forEach(function (n) { var o = document.createElement("option"); o.value = n.id; o.textContent = n.name; if (n.id === res.sel) o.selected = true; sel.appendChild(o); });
      sel.title = "통근 기준 위치 — 목록은 설정(옆 «⚙ 위치 관리» · 확장 아이콘 오른쪽 클릭 → «옵션»)에서 추가·삭제해요";
      sel.addEventListener("click", function (e) { e.stopPropagation(); });
      sel.addEventListener("change", function () {
        bridgeFetch(null, 4000, "cmSelect", { oid: sel.value }).then(function (r) { if (r && r.ok && onChange) onChange(); });
      });
      wrap.textContent = "기준:"; wrap.appendChild(sel); wrap.appendChild(gear("⚙ 위치 관리")); wrap.style.display = "inline-flex";
    });
    return wrap;
  }
  function rowDelX(onClick) {
    var GRAY = "display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;margin:6px 0 0 auto;" +
      "border:none;border-radius:50%;background:transparent;color:#94a3b8;font:700 15px/1 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;cursor:pointer;padding:0";
    var b = el("button", GRAY, "✕");
    b.type = "button"; b.className = "jkRowDel";
    b.title = "이 공고만 스크랩에서 삭제 (확인창 없음 · 아래 알림에서 되돌리기)";
    b.addEventListener("mouseenter", function () { if (!b.disabled) { b.style.background = "#fee2e2"; b.style.color = "#dc2626"; } });
    b.addEventListener("mouseleave", function () { b.style.background = "transparent"; b.style.color = "#94a3b8"; });
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (!b.disabled) onClick(b); });
    var wrap = el("div", "display:flex;justify-content:flex-end");
    wrap.className = "jkRowDelWrap"; wrap.appendChild(b);
    return wrap;
  }
  function clean(n) {
    return (n || "").replace(/[㈜㈐]/g, "").replace(/\(\s*(주|유|재|사|합)\s*\)/g, "")
      .replace(/주식회사|유한회사|유한책임회사/g, "").replace(/\s+/g, " ").trim();
  }
  var bridgeSeq = 0, bridgePending = {}, staleToasted = false;
  window.addEventListener("message", function (ev) {
    if (ev.source === window && ev.data && ev.data.__jkBridge === "stale") {
      if (!staleToasted && isTop) { staleToasted = true; toast("구직 도우미가 새 버전으로 바뀌었어요 — 이 탭을 새로고침(F5)하면 적용돼요", 7000); }
      return;
    }
    if (ev.source !== window || !ev.data || ev.data.__jkBridge !== "res") return;
    var cb = bridgePending[ev.data.id];
    if (cb) { delete bridgePending[ev.data.id]; cb(ev.data.res); }
  });
  function bridgeFetch(url, timeoutMs, kind, extra) {
    return new Promise(function (resolve) {
      var id = ++bridgeSeq, done = false;
      bridgePending[id] = function (res) { if (!done) { done = true; resolve(res); } };
      try { window.postMessage(Object.assign({ __jkBridge: "req", id: id, url: url, kind: kind || "jpFetch" }, extra || {}), "*"); } catch (e) {}
      setTimeout(function () { if (!done) { done = true; delete bridgePending[id]; resolve(null); } }, timeoutMs || 12000);
    });
  }
  function careerInfo(txt) {
    var t = (txt || "").replace(/\s/g, "");
    var m = t.match(/경력(\d+)년/) || t.match(/경력(\d+)~/);
    var yrs = m ? parseInt(m[1], 10) : null;
    var isNew = /신입/.test(t), hasExp = /경력/.test(t);
    if (/경력무관/.test(t)) return { tier: "any", years: null };
    if (isNew && hasExp && yrs == null) return { tier: "any", years: null };
    if (yrs != null) return { tier: "exp", years: yrs };
    if (hasExp) return { tier: "exp", years: null };
    if (isNew) return { tier: "new", years: null };
    return { tier: "none", years: null };
  }
  function careerKey(txt) { var t = careerInfo(txt).tier; return (t === "new" || t === "any") ? "ok" : t; }
  var WARN_COMMUTE_MIN = 60;
  var WARN_RATING = 2.0;
  var BADGE_GRAY = "#64748b", BADGE_WARN = "#dc2626", BADGE_PENDING = "#94a3b8";
  function badgeWarnColor(isWarn, isPending) {
    return isPending ? BADGE_PENDING : (isWarn ? BADGE_WARN : BADGE_GRAY);
  }
  function commuteIsWarn(min) { var n = parseInt(min, 10); return !isNaN(n) && n > WARN_COMMUTE_MIN; }
  function ratingIsWarn(val) { var v = parseFloat(val); return !isNaN(v) && v < WARN_RATING; }
  var EDU_RE = /대학|대졸|고졸|초대졸|학력|석사|박사|전문대/;
  var YEAR_RE = /\d+\s*(?:[~∼\-]\s*\d+\s*)?년/;
  function careerCell(li, isSR) {
    var e = isSR ? li.querySelector(".col_informs ul.inform li") : li.querySelector(".desc .cell");
    return e ? (e.innerText || "").replace(/\s+/g, "") : "";
  }
  function expOnly(cell) {
    if (!cell) return null;
    if (/신입|경력무관/.test(cell)) return null;
    if (EDU_RE.test(cell)) return null;
    if (YEAR_RE.test(cell)) return cell;
    if (/경력/.test(cell)) return cell;
    return null;
  }
  function careerToggle(onChange, o) {
    o = o || {};
    var st = { on: false, n: 0 };
    var b = el("button");
    function paint() {
      b.style.cssText = "display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;cursor:pointer;" +
        "font:800 " + (o.fs || "13.5px") + "/1 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;border-radius:" + (o.round || "9px") + ";" +
        "padding:" + (o.pad || "8px 12px") + ";" + (o.h ? "height:" + o.h + ";" : "") +
        "border:2px solid " + (st.on ? "#0a8f5b" : "#cbd5e1") + ";background:" + (st.on ? "#0a8f5b" : "#fff") +
        ";color:" + (st.on ? "#fff" : "#64748b") + ";" + (o.extra || "");
      b.textContent = "🆕 신입·경력무관 " + st.n;
      b.title = st.on ? "지금 신입·경력무관 공고만 보고 있어요 — 다시 누르면 전체 표시"
                      : "누르면 신입·경력무관 공고만 봐요 (경력직·경력 미표기 숨김)";
    }
    b.onclick = function () { st.on = !st.on; paint(); onChange(); };
    paint();
    return { el: b, st: st, render: function (n) { if (n != null) st.n = n; paint(); } };
  }
  function unknownRatingBadge(w) {
    w = w || {};
    var co = w.co ? " (검색어: " + w.co + ")" : "";
    if (w.k === "loading")  return { txt: "🪐 …",       tip: "잡플래닛에서 평점 조회 중이에요…" + co };
    if (w.k === "notfound") return { txt: "🪐 미등록",   tip: "잡플래닛에서 이 회사를 못 찾았어요" + co + " — 미등록이거나 등록명이 달라요" };
    if (w.k === "norating") return { txt: "🪐 평점없음", tip: "잡플래닛에 회사는 있는데 아직 평점이 없어요(리뷰 부족)" + co };
    if (w.k === "timeout")  return { txt: "🪐 —",       tip: "조회 시간초과 — 새로고침하면 다시 시도해요" + co };
    if (w.k === "noco")     return { txt: "🪐 —",       tip: "이 줄에서 회사명을 못 뽑아 조회를 못 했어요" };
    return { txt: "🪐 —", tip: "아직 조회 전이에요 — 잠시 뒤 자동으로 채워져요" };
  }
  function normCo(s) { return (s || "").replace(/\(주\)|\(유\)|주식회사|유한회사|[㈜㈐\s()·,.\-&'"]/g, "").toUpperCase(); }
  function extractAddr(html) {
    if (!html) return null;
    html = cutFooterHtml(html);
    var text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
    var lines = text.split("\n").map(function (s0) { return s0.trim(); }).filter(function (s0) { return s0; });
    var LABELS = ["근무지주소", "근무지역", "근무예정지", "근무예정지역", "근무지", "사업장소재지", "사업장 소재지", "위치", "주소"];
    for (var i = 0; i < lines.length; i++) {
      for (var L = 0; L < LABELS.length; L++) {
        if (lines[i] === LABELS[L] && i + 1 < lines.length) { var nx = lines[i + 1]; if (nx.length > 4 && LABELS.indexOf(nx) < 0) return nx; }
      }
    }
    var joined = lines.join("\n");
    var m = joined.match(/(서울특별시|서울|경기도?|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)[^\n]{2,45}?(로|길)\s?\d[\d\-]*/);
    if (m) return m[0].trim();
    m = joined.match(/(서울|경기|인천|부산|대구|대전|광주|울산|세종)[^\n]{0,15}?(구|시)[^\n]{0,15}?(동|읍|면)/);
    if (m) return m[0].trim();
    return null;
  }
  function srCleanAddr(a) {
    return String(a || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/^\s*\(\d{5}\)\s*/, "").replace(/\s+/g, " ").trim();
  }
  function srAddrFromHtml(html) {
    var tag = String(html || "").match(/<[^>]*\bjv_location\b[^>]*>/);
    if (!tag) return null;
    var m = tag[0].match(/data-address="([^"]*)"/);
    var a = m ? srCleanAddr(m[1]) : "";
    return a.length > 4 ? a : null;
  }
  function srFetchAddr(rec) {
    if (!rec) return Promise.resolve(null);
    return fetch("/zf_user/jobs/relay/view-ajax", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
      body: "rec_idx=" + encodeURIComponent(rec) + "&rec_seq=0"
    }).then(function (r) { return r.ok ? r.text() : ""; }).then(srAddrFromHtml, function () { return null; });
  }
  function cutFooterHtml(html) {
    var s = String(html || ""), i = s.search(/<footer\b|id="sri_footer"|class="[^"]*\bsri_footer\b/);
    return i > 0 ? s.slice(0, i) : s;
  }
  function pageTextNoFooter() {
    var t = (document.body && document.body.innerText) || "";
    var fs = document.querySelectorAll("footer, #footer, #sri_footer, .sri_footer, [id*='Footer'], [class*='Footer']");
    for (var i = 0; i < fs.length; i++) {
      var ft = (fs[i].innerText || "").trim();
      if (ft.length > 20) t = t.split(ft).join("\n");
    }
    return t;
  }
  function rowRegion(li) {
    var t = (li.innerText || "").replace(/\s+/g, " ");
    var m = t.match(/(서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)[^,·|]{0,4}>\s*([가-힣]{2,10}(?:시|군|구))/);
    return m ? (m[1] + " " + m[2]) : null;
  }
  function reportCommute(key, min, addr, approx) {
    bridgeFetch("https://jk.local/api/commute-report?gno=" + encodeURIComponent(key) +
      "&min=" + encodeURIComponent(min) + "&addr=" + encodeURIComponent(addr || "") +
      (approx ? "&approx=1" : ""), 6000, "commuteMap");
  }
  function commuteTier(min) { return { bg: badgeWarnColor(commuteIsWarn(min)), fg: "#fff" }; }
  function badgeState(info) { return info.pending ? "pending" : (isNaN(parseInt(info.min, 10)) ? "unknown" : "ok"); }
  function commuteBadgeEl(info, origin) {
    var n = parseInt(info.min, 10), st = badgeState(info);
    var t = st === "pending" ? { bg: "#94a3b8", fg: "#fff" } : commuteTier(info.min);
    var txt = st === "pending" ? "🚇 계산 중…"
            : (st === "unknown" ? "🚇 통근 미확인" : ("🚇 " + (info.approx ? "약 " : "") + info.min + "분"));
    var b = el("span", "display:inline-block;margin-left:8px;vertical-align:middle;background:" + t.bg + ";color:" + t.fg + ";" +
      "padding:2px 10px;border-radius:9px;font:700 12.5px/1.45 'Malgun Gothic','Apple SD Gothic Neo',sans-serif", txt);
    b.className = "jkCommuteBadge"; b.setAttribute("data-jk-st", st);
    if (st === "pending") b.title = "대시보드 캐시에 없는 공고예요 — 지금 공고에서 근무지주소를 읽어 계산 중입니다(보통 몇 초). 끝나면 자동으로 분이 채워져요.";
    else if (info.addr) b.title = (origin || "집") + " → " + info.addr +
      (isNaN(n) ? " (대중교통 경로를 못 구했어요)" : " (출근 " + info.min + "분)") +
      (info.approx ? " · 공고에 상세주소가 없어 목록의 지역(구) 기준 대략치" : "");
    else b.title = info.why || "통근 미확인";
    return b;
  }
  function fetchOneRating(company, timeoutMs) {
    return new Promise(function (resolve) {
      var qq = clean(company) || company, done = false, ifr = null, to = null;
      function finish(val, why, alt) {
        if (done) return; done = true;
        if (to) clearTimeout(to);
        window.removeEventListener("message", onMsg);
        try { if (ifr && ifr.parentNode) ifr.parentNode.removeChild(ifr); } catch (e) {}
        resolve({ v: val, why: why || null, alt: alt || null });
      }
      function onMsg(ev) {
        if (done || !ev.data || ev.data.__jk !== "jp" || !isJpOrigin(ev.origin)) return;
        if (ifr && ev.source !== ifr.contentWindow) return;
        if (ev.data.notFound) return finish(null, "notfound");
        if (ev.data.data) { var r = parseFloat(ev.data.data.rating); return finish(isNaN(r) ? null : r, isNaN(r) ? "norating" : null, ev.data.alt); }
      }
      window.addEventListener("message", onMsg);
      ifr = el("iframe", "position:fixed;left:-10000px;top:0;width:400px;height:900px;border:0");
      ifr.src = "https://www.jobplanet.co.kr/search/companies?query=" + encodeURIComponent(stripEntityMark(qq)) + "&jk_embed=1";
      (document.body || document.documentElement).appendChild(ifr);
      to = setTimeout(function () { finish(null, "timeout"); }, timeoutMs || 18000);
    });
  }
  function deadlineDays(txt, now) {
    var t = (txt || "").replace(/\s+/g, "");
    if (!t) return null;
    if (/오늘(\d{1,2}시)?마감/.test(t)) return 0;
    if (/내일(\d{1,2}시)?마감/.test(t)) return 1;
    var dd = t.match(/D-(\d+)/i);
    if (dd) return parseInt(dd[1], 10);
    var ymd = t.match(/(\d{2,4})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
    var md = ymd ? null : t.match(/(\d{1,2})[.\/-](\d{1,2})/);
    if (!ymd && !md) return null;
    now = now || new Date();
    var y, mo, dy;
    if (ymd) { y = +ymd[1]; mo = +ymd[2]; dy = +ymd[3]; if (y < 100) y += 2000; }
    else {
      mo = +md[1]; dy = +md[2]; y = now.getFullYear();
      if (mo - (now.getMonth() + 1) > 6) y -= 1;
      else if ((now.getMonth() + 1) - mo > 6) y += 1;
    }
    if (mo < 1 || mo > 12 || dy < 1 || dy > 31) return null;
    var dl = new Date(y, mo - 1, dy);
    if (isNaN(dl.getTime())) return null;
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((dl.getTime() - today.getTime()) / 86400000);
  }
  function deadlineSortVal(txt) {
    var v = deadlineDays(txt);
    return (v == null || v < 0) ? null : v;
  }
  function altNote(rec, coText) {
    var a = rec && rec.alt; if (!a) return "";
    var to = (typeof a === "string") ? a : a.to;
    var from = (typeof a === "string") ? (coText || (rec && rec.co) || "") : (a.from || "");
    if (!to) return "";
    return " · " + (from ? "「" + from + "」로는 못 찾아 " : "") + "「" + to + "」로 찾은 값이에요";
  }
  var DEL_LIST_MAX = 12;
  function delPreview(items, max) {
    max = max || DEL_LIST_MAX;
    var out = [], n = Math.min(items.length, max), i;
    for (i = 0; i < n; i++) {
      var it = items[i] || {};
      var co = (it.co || "").replace(/\s+/g, " ").trim();
      var ti = (it.title || "").replace(/\s+/g, " ").trim();
      if (co.length > 18) co = co.slice(0, 17) + "…";
      if (ti.length > 34) ti = ti.slice(0, 33) + "…";
      out.push("· " + (it.tag ? "[" + it.tag + "] " : "") + (co ? co + " — " : "") + (ti || "(제목 없음)"));
    }
    if (items.length > n) out.push("· …외 " + (items.length - n) + "건");
    return out.join("\n");
  }
  function numRange(row, unit, step, onChange) {
    function val(i) { var v = parseFloat(i.value); return isNaN(v) ? null : v; }
    function paint(i) { i.style.borderColor = (val(i) === null ? "#cbd5e1" : "#2563eb"); }
    function mk() {
      var i = el("input"); i.type = "number"; i.step = step; i.min = "0";
      i.style.cssText = "width:66px;padding:6px 8px;border:2px solid #cbd5e1;border-radius:9px;" +
        "font-size:14.5px;font-weight:800;text-align:right;outline:none;background:#fff;color:#0f172a";
      var t = null;
      i.addEventListener("input", function () {
        paint(i); clearTimeout(t); t = setTimeout(onChange, 350);
      });
      return i;
    }
    function lab(s) { return el("span", "font-size:14px;color:#475569;font-weight:700;margin:0 8px 0 3px", s); }
    var hi = mk(), lo = mk();
    row.appendChild(lo); row.appendChild(lab(unit + " 이상"));
    row.appendChild(hi); row.appendChild(lab(unit + " 이하"));
    return {
      limits: function () { return { max: val(hi), min: val(lo) }; },
      on: function () { return val(hi) !== null || val(lo) !== null; },
      clear: function () { hi.value = ""; lo.value = ""; paint(hi); paint(lo); },
      pass: function (v) {
        var L = this.limits();
        if (v === null) return false;
        return (L.max === null || v <= L.max) && (L.min === null || v >= L.min);
      }
    };
  }
  var SR_LIST_CFG = {
    guard: "__srList", barId: "srListBar",
    card: "div.box_item", hide: ".list_item",
    title: ".job_tit a", cond: ".recruit_info",
    anchor: function () { return document.querySelector("section.list_recruiting .list_body"); }
  };
  var JK_LIST_CFG = {
    guard: "__jkList", barId: "jkListBar",
    card: "tr.devloopArea", hide: null,
    title: ".tplTit .titBx strong a", cond: "p.etc",
    anchor: function () { return document.querySelector(".tplList.tplJobList"); }
  };
  var KINDS = [{ k: "closed", lb: "마감" }, { k: "career", lb: "경력직" }, { k: "applied", lb: "지원완료" }];
  var KIND_KEY = "jkDelKinds";
  var RT_KEY = "jkResumeTitleHandoff";
  var RT_TTL = 10 * 60 * 1000;
  var RT_SUFFIX = "공고 지원서";
  var RT_MAXLEN = 100;
  var CAL_POST = { company: "", addr: "", commute: "", rating: "" };
  var CAL_BTN_ID = "jkCalAddBtn";
  var CAL_LABEL = "📅 캘린더에 담기";
  var isSR = host.indexOf("saramin") >= 0;
  var SEARCH_FEATURES_ON = false;
  var isJS = host.indexOf("jasoseol") >= 0;
  var sbKill = null;
  try { if (isJS && isTop) initJss(); } catch (e) { console.warn("[JSS]", e); }
  if (!isJS) {
  try { if (!isSR && path.indexOf("/user/scrap") === 0 && path.indexOf("delscrap") < 0) initScrap(); } catch (e) { console.warn("[JK]", e); }
  try { if (!isSR && path.indexOf("/recruit/gi_read") === 0) initSidebar(); } catch (e) { console.warn("[JK]", e); }
  try { if (!isSR && path.indexOf("/recruit/gi_read") === 0) initTitleCopy(); } catch (e) { console.warn("[JK]", e); }
  try { if (!isSR && path.indexOf("/recruit/gi_read") === 0) initCalAdd(); } catch (e) { console.warn("[JK]", e); }
  try { if (!isSR && path.indexOf("/user/resume/write") === 0) initResumeTitleFill(); } catch (e) { console.warn("[JK]", e); }
  try { if (!isSR && path.indexOf("/search") === 0) initSearchFilter(); } catch (e) { console.warn("[JK]", e); }
  try { if (!isSR && path.indexOf("/recruit/joblist") === 0) initSrSearch(JK_LIST_CFG); } catch (e) { console.warn("[JK]", e); }
  try { if (!isSR && path.indexOf("/recruit/onpass") === 0) initOnPass(); } catch (e) { console.warn("[JK]", e); }
  try { if (isSR && path.indexOf("/zf_user/persons/scrap-recruit") === 0) initSrScrap(); } catch (e) { console.warn("[SR]", e); }
  try { if (isSR && /^\/zf_user\/jobs\/relay\/(view|recruit-view|pop-view)$/.test(path)) initSidebar(); } catch (e) { console.warn("[SR]", e); }
  try { if (isSR && /^\/zf_user\/jobs\/relay\/(view|recruit-view|pop-view)$/.test(path)) initTitleCopy(); } catch (e) { console.warn("[SR]", e); }
  try { if (isSR && /^\/zf_user\/jobs\/relay\/(view|recruit-view|pop-view)$/.test(path)) initCalAdd(); } catch (e) { console.warn("[SR]", e); }
  try { if (isSR && path.indexOf("/zf_user/member/resume-manage/write") === 0) initResumeTitleFill(); } catch (e) { console.warn("[SR]", e); }
  try { if (isSR && path.indexOf("/zf_user/search") === 0) initSrSearch(); } catch (e) { console.warn("[SR]", e); }
  try { if (isSR && path.indexOf("/zf_user/jobs/list/") === 0) initSrSearch(SR_LIST_CFG); } catch (e) { console.warn("[SR]", e); }
  try { if (isTop) initPageHilite(); } catch (e) { console.warn("[PG]", e); }
  }
  function wordsLocal(k) { try { return (JSON.parse(localStorage.getItem(k) || "[]") || []).filter(Boolean); } catch (e) { return []; } }
  function wordsSave(k, arr) {
    try { localStorage.setItem(k, JSON.stringify(arr)); } catch (e) {}
    var d = {}; d[k] = arr;
    bridgeFetch(null, 5000, "kvSet", { data: d });
  }
  function wordsSync(keys, cb) {
    bridgeFetch(null, 5000, "kvGet", { keys: keys }).then(function (res) {
      if (!res || !res.ok || !res.data) return;
      var out = {}, changed = false;
      keys.forEach(function (k) {
        var v = res.data[k];
        if (!v) {
          var loc = wordsLocal(k);
          if (loc.length) { var d = {}; d[k] = loc; bridgeFetch(null, 5000, "kvSet", { data: d }); }
          return;
        }
        out[k] = v.filter(Boolean);
        if (JSON.stringify(out[k]) !== JSON.stringify(wordsLocal(k))) {
          changed = true;
          try { localStorage.setItem(k, JSON.stringify(out[k])); } catch (e) {}
        }
      });
      if (changed) cb(out);
    });
  }
  var RV_IDX_KEY = "jkRvIndex", RV_CACHE_MAX = 20, CID_KEY = "jkCidMap";
  function rvKey(cid) { return "jkRv:" + cid; }
  function rvLoad(cid, cb) {
    if (!cid) { cb(null); return; }
    bridgeFetch(null, 5000, "kvGet", { keys: [rvKey(cid)] }).then(function (res) {
      var v = res && res.ok && res.data ? res.data[rvKey(cid)] : null;
      cb(v && v.list && v.list.length ? v : null);
    });
  }
  function rvSave(cid, list, total) {
    if (!cid || !list || !list.length) return;
    var d = {}; d[rvKey(cid)] = { at: Date.now(), total: total || 0, list: list };
    bridgeFetch(null, 5000, "kvSet", { data: d });
    bridgeFetch(null, 5000, "kvGet", { keys: [RV_IDX_KEY] }).then(function (res) {
      var idx = (res && res.ok && res.data && res.data[RV_IDX_KEY]) || [];
      idx = idx.filter(function (c) { return String(c) !== String(cid); });
      idx.push(String(cid));
      var drop = idx.length > RV_CACHE_MAX ? idx.splice(0, idx.length - RV_CACHE_MAX) : [];
      var dd = {}; dd[RV_IDX_KEY] = idx;
      bridgeFetch(null, 5000, "kvSet", { data: dd });
      if (drop.length) bridgeFetch(null, 5000, "kvDel", { keys: drop.map(rvKey) });
    });
  }
  function cidLoad(q, cb) {
    bridgeFetch(null, 5000, "kvGet", { keys: [CID_KEY] }).then(function (res) {
      var m = (res && res.ok && res.data && res.data[CID_KEY]) || {};
      var v = m[q];
      cb(v && v.cid ? String(v.cid) : null);
    });
  }
  function cidSave(q, cid) {
    if (!q || !cid) return;
    bridgeFetch(null, 5000, "kvGet", { keys: [CID_KEY] }).then(function (res) {
      var m = (res && res.ok && res.data && res.data[CID_KEY]) || {};
      if (m[q] && String(m[q].cid) === String(cid)) return;
      m[q] = { cid: String(cid), at: Date.now() };
      var ks = Object.keys(m);
      if (ks.length > 200) {
        ks.sort(function (a, b) { return (m[a].at || 0) - (m[b].at || 0); });
        ks.slice(0, ks.length - 200).forEach(function (k) { delete m[k]; });
      }
      var d = {}; d[CID_KEY] = m;
      bridgeFetch(null, 5000, "kvSet", { data: d });
    });
  }
  function initEmbedNav() {
    if (window.__jkEmbedNav) return;
    var SITE = /(^|\.)saramin\.co\.kr$/.test(host) ? /(^|\.)saramin\.co\.kr$/ : (/(^|\.)jobkorea\.co\.kr$/.test(host) ? /(^|\.)jobkorea\.co\.kr$/ : null);
    if (!SITE) return;
    window.__jkEmbedNav = true;
    function sameSite(u) {
      try { var x = new URL(String(u), __jkLoc.href); return (x.protocol === "https:" || x.protocol === "http:") && SITE.test(x.hostname) ? x.href : null; }
      catch (e) { return null; }
    }
    function leaves(t) {
      t = String(t == null ? "" : t).trim();
      var lt = t.toLowerCase();
      if (!t || lt === "_self") return false;
      if (lt === "_blank" || lt === "_top" || lt === "_parent") return true;
      if (window.name === t) return false;
      var fs = document.getElementsByName(t);
      for (var i = 0; i < fs.length; i++) { if (fs[i].tagName === "IFRAME" || fs[i].tagName === "FRAME") return false; }
      return true;
    }
    var last = { plain: false, at: 0 };
    function onPress(e) {
      var plain = e.type === "click" && e.button === 0 && !e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey;
      last = { plain: plain, at: Date.now() };
      if (!plain || e.defaultPrevented) return;
      var p = e.composedPath ? e.composedPath() : [e.target], a = null;
      for (var i = 0; i < p.length; i++) {
        var n = p[i];
        if (n && (n.tagName === "A" || n.tagName === "AREA") && n.hasAttribute("href")) { a = n; break; }
      }
      if (!a || a.hasAttribute("download")) return;
      var t = a.getAttribute("target");
      if (t == null || t === "") { var bt = document.querySelector("base[target]"); t = bt ? bt.getAttribute("target") : ""; }
      if (!leaves(t) || !sameSite(a.href)) return;
      var had = a.hasAttribute("target"), old = a.getAttribute("target");
      a.setAttribute("target", "_self");
      setTimeout(function () { try { if (had) a.setAttribute("target", old); else a.removeAttribute("target"); } catch (e2) {} }, 0);
    }
    window.addEventListener("click", onPress, true);
    window.addEventListener("auxclick", onPress, true);
    var realOpen = window.open;
    window.open = function (url, name) {
      try {
        var feat = String(arguments.length > 2 && arguments[2] != null ? arguments[2] : "");
        var popup = /(^|[\s,])(width|height|innerwidth|innerheight|left|top|screenx|screeny|popup)\s*(=|,|$)/i.test(feat);
        var to = (url == null || String(url) === "") ? null : sameSite(url);
        var fresh = last.plain && Date.now() - last.at < 2000;
        if (fresh && to && !popup && (name == null || name === "" || leaves(name))) {
          last.plain = false;
          __jkLoc.assign(to);
          return window;
        }
      } catch (e) {}
      return realOpen.apply(window, arguments);
    };
  }
  function initSearchFilter() {
    if (!SEARCH_FEATURES_ON) return;
    if (window.__jkSF) return; window.__jkSF = true;
    var EXC_KEY = "jkExcludeTitles";
    var load = wordsLocal, save = wordsSave;
    var exc = load(EXC_KEY);
    function hideTargetOf(card) {
      var p = card.parentElement;
      return (p && p.children.length === 1) ? p : card;
    }
    function titleOf(card) {
      var t = card.querySelector("[data-sentry-component='Title']");
      return ((t && t.textContent) || "").replace(/\s+/g, " ").trim().toLowerCase();
    }
    function anyHit(title, arr) {
      for (var i = 0; i < arr.length; i++) { var w = (arr[i] || "").toLowerCase().trim(); if (w && title.indexOf(w) >= 0) return true; }
      return false;
    }
    var lastShown = 0, lastHidden = 0, lastTotal = 0;
    var cTog = null;
    function cardCtier(card) { return careerKey(card.innerText || ""); }
    function apply() {
      var cards = document.querySelectorAll("[data-sentry-component='CardJob']");
      var hidden = 0, okN = 0, cOn = !!(cTog && cTog.st.on);
      cards.forEach(function (card) {
        var target = hideTargetOf(card), title = titleOf(card);
        var ct = cardCtier(card); if (ct === "ok") okN++;
        var show = !anyHit(title, exc) && (!cOn || ct === "ok");
        if (show) { if (card.getAttribute("data-jk-filtered") != null) { target.style.display = ""; card.removeAttribute("data-jk-filtered"); } }
        else { target.style.display = "none"; card.setAttribute("data-jk-filtered", "1"); hidden++; }
      });
      lastTotal = cards.length; lastHidden = hidden; lastShown = cards.length - hidden;
      if (cTog) cTog.render(okN);
      updatePills(); updateStatus();
    }
    var _t = null;
    function schedule() { if (_t) clearTimeout(_t); _t = setTimeout(apply, 180); }
    var CFG = {
      exc: { key: EXC_KEY, arr: exc, icon: "🚫", label: "제외", title: "제목 제외", ex: "인턴",
             hint: "제목에 이 문구가 들어가면 그 공고를 숨겨요.",
             bd: "#e11d48", bg: "#ffe4e6", fg: "#9f1239", chip: "#fecdd3" }
    };
    var openId = null;
    function closePop() { if (openId) { CFG[openId]._pop.style.display = "none"; openId = null; } }
    function positionPop(c) {
      var r = c._pill.getBoundingClientRect(), w = 268;
      var left = Math.min(r.left, (window.innerWidth || 1200) - w - 10);
      c._pop.style.left = Math.max(8, left) + "px";
      c._pop.style.top = (r.bottom + 6) + "px";
      c._pop.style.width = w + "px";
    }
    function togglePop(id) {
      if (openId === id) { closePop(); return; }
      closePop(); openId = id;
      positionPop(CFG[id]); CFG[id]._pop.style.display = "block";
      var inp = CFG[id]._pop.querySelector("input"); if (inp) setTimeout(function () { inp.focus(); }, 0);
    }
    document.addEventListener("click", function (e) {
      if (!openId) return; var c = CFG[openId];
      if (c._pop.contains(e.target) || c._pill.contains(e.target)) return;
      closePop();
    }, true);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePop(); });
    window.addEventListener("resize", function () { if (openId) positionPop(CFG[openId]); });
    window.addEventListener("scroll", function () { if (openId) positionPop(CFG[openId]); }, true);
    function renderChips(c) {
      c._chips.innerHTML = "";
      if (!c.arr.length) { c._chips.appendChild(el("span", "font-size:12px;color:#cbd5e1", "아직 없음 — 문구를 추가해줘요.")); return; }
      c.arr.forEach(function (w, i) {
        var chip = el("span", "display:inline-flex;align-items:center;gap:5px;background:" + c.bg + ";color:" + c.fg + ";" +
          "border:1px solid " + c.chip + ";border-radius:999px;padding:4px 6px 4px 10px;font-size:12.5px;font-weight:700;max-width:100%");
        chip.appendChild(el("span", "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:168px", w));
        var x = el("button", "background:" + c.chip + ";color:" + c.fg + ";border:none;width:18px;height:18px;flex:0 0 auto;" +
          "border-radius:50%;font-size:11px;line-height:1;cursor:pointer;font-weight:800", "✕");
        x.title = "제거";
        x.onclick = function (ev) { ev.stopPropagation(); c.arr.splice(i, 1); save(c.key, c.arr); renderChips(c); apply(); };
        chip.appendChild(x); c._chips.appendChild(chip);
      });
    }
    function addWord(c, v) {
      v = (v || "").replace(/\s+/g, " ").trim(); if (!v) return;
      if (!c.arr.some(function (w) { return w.toLowerCase() === v.toLowerCase(); })) { c.arr.push(v); save(c.key, c.arr); }
      renderChips(c); apply();
    }
    function buildPopover(id) {
      var c = CFG[id];
      var pop = el("div", "position:fixed;z-index:2147483600;display:none;background:#fff;border:1px solid #e2e8f0;border-radius:14px;" +
        "box-shadow:0 10px 32px rgba(0,0,0,.18);padding:12px;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif");
      pop.appendChild(el("div", "font-weight:800;font-size:14px;color:" + c.fg + ";margin-bottom:2px", c.icon + " " + c.title));
      pop.appendChild(el("div", "font-size:10.5px;color:#a5b4fc;font-weight:800;letter-spacing:.3px;margin-bottom:6px", "✦ 내가 만든 필터"));
      pop.appendChild(el("div", "font-size:11.5px;color:#94a3b8;line-height:1.5;margin-bottom:9px", c.hint));
      var row = el("div", "display:flex;gap:6px;margin-bottom:9px");
      var input = el("input"); input.type = "text"; input.placeholder = c.label + "할 문구 (예: " + c.ex + ")";
      input.style.cssText = "flex:1;min-width:0;padding:8px 10px;border:2px solid " + c.bd + ";border-radius:9px;font-size:13.5px;outline:none";
      var add = el("button", "background:" + c.bd + ";color:#fff;border:none;padding:8px 12px;border-radius:9px;font-size:13.5px;font-weight:800;cursor:pointer;white-space:nowrap", "추가");
      add.onclick = function () { addWord(c, input.value); input.value = ""; input.focus(); };
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addWord(c, input.value); input.value = ""; } });
      row.appendChild(input); row.appendChild(add); pop.appendChild(row);
      c._chips = el("div", "display:flex;flex-wrap:wrap;gap:6px"); pop.appendChild(c._chips);
      c._foot = el("div", "margin-top:10px;padding-top:8px;border-top:1px dashed #e2e8f0;font-size:12px;color:#64748b;font-weight:700;line-height:1.4");
      pop.appendChild(c._foot);
      c._pop = pop; document.body.appendChild(pop); renderChips(c);
    }
    function stylePill(c) {
      var n = c.arr.length;
      c._pill.style.cssText = "display:inline-flex;align-items:center;gap:5px;height:38px;padding:0 13px;border-radius:50px;cursor:pointer;" +
        "white-space:nowrap;font:800 13.5px/1 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;border:1.5px solid " + c.bd + ";align-self:center;" +
        (n ? "background:" + c.bd + ";color:#fff;" : "background:" + c.bg + ";color:" + c.fg + ";");
      c._pill.textContent = c.icon + " " + c.label + (n ? " " + n : "");
      c._pill.title = c.title + " 필터 (내가 만든 필터)" + (n ? " — " + n + "개 적용 중" : "");
    }
    function updatePills() { stylePill(CFG.exc); }
    function updateStatus() {
      var active = exc.length || (cTog && cTog.st.on);
      var txt = "표시 " + lastShown + " · 숨김 " + lastHidden;
      if (statusEl) {
        statusEl.style.display = active ? "" : "none";
        statusEl.textContent = txt;
        statusEl.title = "이 검색에서 필터 적용 결과 — 표시 " + lastShown + "개, 숨김 " + lastHidden + "개 (불러온 " + lastTotal + "개 기준, 스크롤하면 늘어남)";
      }
      Object.keys(CFG).forEach(function (id) {
        var f = CFG[id]._foot; if (!f) return;
        f.textContent = active ? ("📊 지금 이 검색: " + txt + " (총 " + lastTotal + "개 중)")
                               : "📊 제외 문구를 추가하면 여기에 표시/숨김 개수가 나와요.";
      });
    }
    function buildPill(id) {
      var pill = el("button", ""); pill.className = "jkFilterPill";
      pill.onclick = function (e) { e.stopPropagation(); togglePop(id); };
      CFG[id]._pill = pill; stylePill(CFG[id]); return pill;
    }
    var pillsWrap = el("span", "display:inline-flex;align-items:center;gap:6px;padding-left:8px;border-left:1.5px dashed #c7d2fe");
    pillsWrap.id = "jkFilterPills";
    cTog = careerToggle(function () { apply(); }, { round: "50px", pad: "0 13px", h: "38px", extra: "align-self:center;" });
    pillsWrap.appendChild(cTog.el);
    buildPopover("exc");
    pillsWrap.appendChild(buildPill("exc"));
    var statusEl = el("span", "display:none;align-self:center;font:700 12px/1 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#334155;" +
      "background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:5px 10px;white-space:nowrap");
    pillsWrap.appendChild(statusEl);
    function mountUI() {
      var list = document.querySelector("[data-sentry-component='FilterList']");
      if (list && pillsWrap.parentNode !== list) list.appendChild(pillsWrap);
      if (CFG.exc._pop.parentNode !== document.body) document.body.appendChild(CFG.exc._pop);
    }
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (CFG.exc._pop.contains(t) || pillsWrap.contains(t)) continue;
        mountUI(); schedule(); return;
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    mountUI(); apply();
    wordsSync([EXC_KEY], function (out) {
      if (out[EXC_KEY]) { exc.length = 0; [].push.apply(exc, out[EXC_KEY]); }
      Object.keys(CFG).forEach(function (k) { if (CFG[k]._pop) renderChips(CFG[k]); });
      apply();
    });
  }
  function initPageHilite() {
    var PAINT = "data-jk-curpage", BCLS = "jkCurPageBadge";
    var HL = [["background-color", "#4f46e5"], ["background-image", "none"], ["color", "#ffffff"], ["font-weight", "900"],
              ["border-radius", "999px"], ["box-shadow", "0 0 0 3px rgba(79,70,229,.28)"], ["min-width", "34px"],
              ["height", "34px"], ["display", "inline-flex"], ["align-items", "center"], ["justify-content", "center"],
              ["padding", "0 10px"], ["font-size", "15px"], ["line-height", "1"]];
    function numOf(e) { var t = (e.textContent || "").trim(); return /^\d{1,4}$/.test(t) ? parseInt(t, 10) : null; }
    function urlPage() {
      var q; try { q = new URLSearchParams(__jkLoc.search); } catch (e) { return 1; }
      var keys = ["Page_No", "Page", "page", "recruitPage", "pageNo", "PageNo", "page_no", "currentPageNo"];
      for (var i = 0; i < keys.length; i++) { var v = q.get(keys[i]); if (v && /^\d+$/.test(v) && +v > 0) return +v; }
      return 1;
    }
    function linkPage(e) {
      var a = (e.tagName === "A" && e.getAttribute("href")) ? e : e.querySelector && e.querySelector("a[href]");
      if (!a) return null;
      var at = a.getAttribute("page") || a.getAttribute("data-page");
      if (at && /^\d+$/.test(at)) return +at;
      var h = a.getAttribute("href") || "";
      var m = h.match(/[?&](?:Page_No|Page|page|recruitPage|pageNo|PageNo|page_no)=(\d+)/i);
      return m ? +m[1] : null;
    }
    function isLink(e) { return (e.tagName === "A" && !!e.getAttribute("href")) || !!(e.querySelector && e.querySelector("a[href]")); }
    function inner(e) {
      var g = 0, n = numOf(e);
      while (g++ < 4 && e.children.length === 1 && numOf(e.children[0]) === n) e = e.children[0];
      return e;
    }
    function bars() {
      var boxes = [];
      function add(b) { if (b && boxes.indexOf(b) < 0) boxes.push(b); }
      [].slice.call(document.querySelectorAll("[data-sentry-component='Pagination'],.pagination,.tplPagination,.paging,.pagenation")).forEach(add);
      [].slice.call(document.querySelectorAll("a[data-page],a[page],a[href*='Page='],a[href*='page='],a[href*='Page_No=']")).forEach(function (a) {
        if (numOf(a) == null || !a.parentElement) return;
        var p = a.parentElement;
        add(numOf(p) === numOf(a) && p.parentElement ? p.parentElement : p);
      });
      return boxes.map(function (b) {
        return { box: b, items: [].slice.call(b.children).filter(function (c) { return numOf(c) != null; }) };
      }).filter(function (o) { return o.items.length >= 2; });
    }
    function findCur(bar) {
      var cur = urlPage(), i, it, deep, cls;
      for (i = 0; i < bar.items.length; i++) {
        it = bar.items[i]; deep = inner(it);
        if (it.getAttribute("aria-current") === "page" || deep.getAttribute("aria-current") === "page") return it;
      }
      for (i = 0; i < bar.items.length; i++) {
        it = bar.items[i]; deep = inner(it);
        cls = ((it.className || "") + " " + (deep.className || "")).toString();
        if (/(^|[\s_-])(on|now|active|selected|current|is-active)([\s_-]|$)/.test(cls)) return it;
      }
      var nolink = bar.items.filter(function (e) { return !isLink(e); });
      if (nolink.length === 1 && bar.items.length - nolink.length >= 2) return nolink[0];
      for (i = 0; i < bar.items.length; i++) if (linkPage(bar.items[i]) === cur) return bar.items[i];
      for (i = 0; i < bar.items.length; i++) if (numOf(bar.items[i]) === cur) return bar.items[i];
      return null;
    }
    function unpaint(node) {
      HL.forEach(function (kv) { node.style.removeProperty(kv[0]); });
      node.removeAttribute(PAINT); node.removeAttribute("title");
    }
    function badge(bar, n) {
      var b = bar.box.querySelector("." + BCLS), txt = "📄 현재 " + n + "페이지";
      if (!b) {
        b = el("span", "display:inline-flex;align-items:center;margin-left:10px;padding:5px 11px;border-radius:999px;" +
          "background:#eef2ff;color:#3730a3;border:1px solid #c7d2fe;font:800 12.5px/1 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;" +
          "white-space:nowrap;vertical-align:middle", txt);
        b.className = BCLS;
        bar.box.appendChild(b);
      } else if (b.textContent !== txt) b.textContent = txt;
    }
    function paint() {
      bars().forEach(function (bar) {
        var it = findCur(bar); if (!it) return;
        var node = inner(it), n = numOf(it);
        if (node.getAttribute(PAINT) !== "1") {
          [].slice.call(bar.box.querySelectorAll("[" + PAINT + "]")).forEach(unpaint);
          HL.forEach(function (kv) { node.style.setProperty(kv[0], kv[1], "important"); });
          node.setAttribute(PAINT, "1");
          node.title = "지금 보고 있는 페이지";
        }
        badge(bar, n);
      });
    }
    var t = null;
    function schedule() { clearTimeout(t); t = setTimeout(paint, 250); }
    paint(); schedule();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("popstate", schedule);
    window.addEventListener("hashchange", schedule);
  }
  function parseKinds(s) {
    var o = {};
    if (s == null || s === "") { KINDS.forEach(function (x) { o[x.k] = 1; }); return o; }
    String(s).split(",").forEach(function (k) { if (k) o[k] = 1; });
    return o;
  }
  function kindStr(o) { return KINDS.filter(function (x) { return o[x.k]; }).map(function (x) { return x.k; }).join(","); }
  function kindNames(o) { return KINDS.filter(function (x) { return o[x.k]; }).map(function (x) { return x.lb; }).join("·"); }
  function loadDelKinds() { try { var v = localStorage.getItem(KIND_KEY); if (v != null) return parseKinds(v); } catch (e) {} return parseKinds(""); }
  function saveDelKinds(o) { try { localStorage.setItem(KIND_KEY, kindStr(o)); } catch (e) {} }
  function paintKindChip(c, on, lb, cnt) {
    c.style.cssText = "border:2px solid " + (on ? "#e11d48" : "#cbd5e1") + ";padding:6px 9px;border-radius:9px;" +
      "font-size:13.5px;font-weight:800;cursor:pointer;white-space:nowrap;background:" + (on ? "#fff1f2" : "#fff") +
      ";color:" + (on ? "#be123c" : "#94a3b8");
    c.textContent = (on ? "✓ " : "") + lb + " " + cnt;
    c.title = (on ? "켜짐 — 🗑 버튼이 지운다" : "꺼짐 — 안 지운다") + " (눌러서 바꾸기)";
  }
  function delKindsLabel(kinds, n) {
    var picked = kindStr(kinds);
    return !picked ? "지울 종류를 켜 주세요" : (n ? "🗑 선택한 종류 " + n + "건 삭제" : kindNames(kinds) + " 없음 ✅");
  }
  function delKindsGroup(kinds, onChange) {
    var box = el("span", "display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap;padding:4px 5px 4px 10px;" +
      "border:1.5px solid #fecdd3;border-radius:12px;background:#fff7f8");
    box.className = "jkDelGroup";
    box.appendChild(el("span", "font-size:12.5px;color:#9f1239;font-weight:800;white-space:nowrap;margin-right:2px", "지울 종류"));
    function every() { return KINDS.every(function (x) { return kinds[x.k]; }); }
    var allEl = el("button"); allEl.type = "button"; allEl.className = "jkDelAll";
    allEl.onclick = function () {
      var on = !every();
      KINDS.forEach(function (x) { if (on) kinds[x.k] = 1; else delete kinds[x.k]; });
      saveDelKinds(kinds); onChange();
    };
    box.appendChild(allEl);
    var els = {};
    KINDS.forEach(function (x) {
      var c = el("button"); c.type = "button"; els[x.k] = c;
      c.onclick = function () { if (kinds[x.k]) delete kinds[x.k]; else kinds[x.k] = 1; saveDelKinds(kinds); onChange(); };
      box.appendChild(c);
    });
    return {
      box: box, els: els,
      add: function (btn) { btn.style.marginLeft = "4px"; box.appendChild(btn); },
      paint: function (counts) {
        var all = every();
        allEl.style.cssText = "border:2px solid " + (all ? "#e11d48" : "#cbd5e1") + ";padding:6px 9px;border-radius:9px;" +
          "font-size:13.5px;font-weight:800;cursor:pointer;white-space:nowrap;background:" + (all ? "#e11d48" : "#fff") +
          ";color:" + (all ? "#fff" : "#64748b");
        allEl.textContent = (all ? "✓ " : "") + "전부";
        allEl.title = all ? "셋 다 켜짐 — 누르면 다 끈다" : "누르면 마감·경력직·지원완료를 한 번에 다 켠다";
        KINDS.forEach(function (x) { paintKindChip(els[x.k], !!kinds[x.k], x.lb, counts[x.k] || 0); });
      }
    };
  }
  function initScrap() {
    var AUTO = "jkAutoDelTs", CNT = "jkAutoDelN", MAX = 30;
    function closed() { return [].slice.call(document.querySelectorAll("li.listItem.closed")); }
    function careerText(li) { return expOnly(careerCell(li, false)); }
    function careerOnly() {
      return [].slice.call(document.querySelectorAll("li.listItem")).filter(function (li) {
        return !li.classList.contains("closed") && careerText(li);
      });
    }
    var APPLIED_RE = /지원\s*완료/;
    function isApplied(li) { return APPLIED_RE.test((li.innerText || "").replace(/\s+/g, " ")); }
    function appliedAll() {
      return [].slice.call(document.querySelectorAll("li.listItem")).filter(isApplied);
    }
    var delKinds = loadDelKinds();
    function isKind(li, k) {
      if (k === "closed") return li.classList.contains("closed");
      if (k === "career") return !!careerText(li);
      if (k === "applied") return isApplied(li);
      return false;
    }
    function rowKind(li, kinds) {
      for (var i = 0; i < KINDS.length; i++) if (kinds[KINDS[i].k] && isKind(li, KINDS[i].k)) return KINDS[i].lb;
      return "";
    }
    function kindRows(kinds, list) {
      return [].slice.call(list || document.querySelectorAll("li.listItem")).filter(function (li) { return !!rowKind(li, kinds); });
    }
    function targets() { return kindRows(delKinds); }
    var MODE = "jkAutoDelMode";
    function modeTargets(mode) { return kindRows(parseKinds(mode)); }
    var _pf = null, offRows = [], counting = false;
    function fetchOtherPages(cb) {
      if (_pf) { _pf.then(cb); return; }
      var last = pages(), cur = +((__jkLoc.search.match(/[?&]page=(\d+)/i) || [])[1] || 1);
      var want = []; for (var p = 1; p <= last; p++) if (p !== cur) want.push(p);
      _pf = Promise.all(want.map(function (pno) {
        return fetch(pageUrl(pno), { credentials: "same-origin" }).then(function (r) { return r.text(); })
          .then(function (h) { return { p: pno, rows: [].slice.call(new DOMParser().parseFromString(h, "text/html").querySelectorAll("li.listItem")) }; })
          .catch(function () { return { p: pno, rows: [] }; });
      })).then(function (res) { return { cur: cur, want: want, byPage: res.reduce(function (o, r) { o[r.p] = r.rows; return o; }, {}) }; });
      _pf.then(cb);
    }
    function prefetchCounts() {
      if (loaded || pages() <= 1) return;
      counting = true; updateDelBtn();
      fetchOtherPages(function (pf) {
        var have = {}; document.querySelectorAll("li.listItem input.chkIdx").forEach(function (c) { have[c.getAttribute("data-gno")] = 1; });
        offRows = [];
        pf.want.forEach(function (p) { (pf.byPage[p] || []).forEach(function (li) {
          var c = li.querySelector("input.chkIdx"), g = c && c.getAttribute("data-gno");
          if (g && have[g]) return; have[g] = 1; offRows.push(li);
        }); });
        counting = false; updateDelBtn();
      });
    }
    function countPool() {
      var dom = [].slice.call(document.querySelectorAll("li.listItem"));
      return loaded ? dom : dom.concat(offRows.filter(function (li) { return li.ownerDocument !== document; }));
    }
    function jkRowInfo(li, tag) {
      var t = li.querySelector("a[href*='GI_Read' i]"), c = li.querySelector("a[href*='/Co_Read/' i]");
      return { tag: tag,
               co: c ? (c.getAttribute("title") || c.textContent || "") : "",
               title: t ? (t.getAttribute("title") || t.textContent || "") : "" };
    }
    function delItems() {
      var out = [];
      KINDS.forEach(function (x) {
        targets().forEach(function (li) { if (rowKind(li, delKinds) === x.lb) out.push(jkRowInfo(li, x.lb)); });
      });
      return out;
    }
    function fireDelete() {
      var it = modeTargets(sessionStorage.getItem(MODE)); if (!it.length) return false;
      document.querySelectorAll("input.chkIdx").forEach(function (c) { c.checked = false; });
      var n = 0; it.forEach(function (li) { var c = li.querySelector("input.chkIdx"); if (c) { c.checked = true; n++; } });
      if (!n) return false;
      var btn = document.getElementById("js-delBtn") || document.querySelector(".js-delBtn");
      if (!btn) { toast("삭제 버튼을 못 찾음"); return false; }
      var _c = window.confirm, _a = window.alert;
      window.confirm = function () { return true; }; window.alert = function () {};
      try { btn.click(); } finally { setTimeout(function () { window.confirm = _c; window.alert = _a; }, 4000); }
      return true;
    }
    function purge() {
      if (!kindStr(delKinds)) { toast("지울 종류(마감·경력직·지원완료)를 하나 이상 켜 주세요"); return; }
      var go = function () {
        var items = delItems();
        updateDelBtn();
        if (!items.length) { toast(kindNames(delKinds) + " 공고가 없어요 ✅"); return; }
        var by = {}; items.forEach(function (x) { by[x.tag] = (by[x.tag] || 0) + 1; });
        var msg = "스크랩 목록에서 삭제할까요? (고른 종류: " + kindNames(delKinds) + ")\n";
        if (by["마감"]) msg += "· 마감공고 " + by["마감"] + "건\n";
        if (by["경력직"]) msg += "· 경력직(신입·경력무관 표기 없음) " + by["경력직"] + "건\n";
        if (by["지원완료"]) msg += "· 지원완료 " + by["지원완료"] + "건\n";
        msg += "\n" + delPreview(items) + "\n\n";
        msg += "(고르지 않은 종류와 그 외 공고는 안 건드려요)";
        if (!confirm(msg)) return;
        sessionStorage.setItem(MODE, kindStr(delKinds));
        sessionStorage.setItem(AUTO, String(Date.now())); sessionStorage.setItem(CNT, "0"); fireDelete();
      };
      if (!loaded && !loading) loadAll(go); else go();
    }
    function resume() {
      var ts = parseInt(sessionStorage.getItem(AUTO) || "0", 10); if (!ts) return;
      var it = parseInt(sessionStorage.getItem(CNT) || "0", 10);
      var mode = sessionStorage.getItem(MODE);
      var fresh = (Date.now() - ts) < 20000, rem = modeTargets(mode).length;
      if (fresh && rem > 0 && it < MAX) {
        sessionStorage.setItem(AUTO, String(Date.now())); sessionStorage.setItem(CNT, String(it + 1)); setTimeout(fireDelete, 500);
      } else {
        sessionStorage.removeItem(AUTO); sessionStorage.removeItem(CNT); sessionStorage.removeItem(MODE);
        if (fresh) toast(kindNames(parseKinds(mode)) + " 정리 완료 ✅");
        if (it >= MAX) toast("안전상 " + MAX + "회에서 멈춤. 버튼 다시 눌러줘요.");
      }
    }
    function delFlag() { var b = document.getElementById("js-delBtn") || document.querySelector(".js-delBtn"); return (b && b.getAttribute("data-flag")) || "all"; }
    function folderNo() { var m = __jkLoc.search.match(/[?&]folderNo=([^&]*)/i); return m ? decodeURIComponent(m[1]) : ""; }
    function rowDelete(li, btn) {
      var c = li.querySelector("input.chkIdx");
      if (!c) { toast("이 줄의 공고번호를 못 찾았어요 — 새로고침 후 다시"); return; }
      var info = jkRowInfo(li, "");
      var body = new URLSearchParams();
      body.append("M_check1", c.value || "");
      body.append("GINoStr", "");
      body.append("KindStr", (c.getAttribute("data-kind") || "") + ",");
      body.append("GNoStr", (c.getAttribute("data-gno") || "") + ",");
      body.append("folderNo", folderNo());
      btn.disabled = true; li.style.opacity = ".45";
      fetch("/user/scrap/delscrap?flag=" + encodeURIComponent(delFlag()), {
        method: "POST", credentials: "same-origin", body: body
      }).then(function (r) { return r.text().then(function (t) { return { ok: r.ok, t: t }; }); })
        .then(function (res) {
          if (!res.ok || !/삭제\s*되었습니다/.test(res.t)) throw new Error(res.ok ? "응답에 완료 문구 없음" : "HTTP 오류");
          var parent = li.parentNode, next = li.nextSibling, gno = c.getAttribute("data-gno") || "";
          li.remove();
          recount(); applyFilters();
          toastUndo("🗑 삭제했어요: " + (info.co ? info.co.trim() + " — " : "") + (info.title || "").trim().slice(0, 34), function (done) {
            scrapAgain(gno, function (ok, why) {
              if (!ok) { done(false, "다시 스크랩하지 못했어요(" + why + ") — 공고를 열어 직접 스크랩해 주세요"); return; }
              if (parent) { if (next && next.parentNode === parent) parent.insertBefore(li, next); else parent.appendChild(li); }
              li.style.opacity = ""; btn.disabled = false; btn.style.background = "transparent"; btn.style.color = "#94a3b8";
              recount(); applyFilters();
              done(true, "되돌렸어요 ✅ (스크랩 날짜는 오늘로 바뀌어요)");
            });
          });
        })
        .catch(function (e) {
          li.style.opacity = ""; btn.disabled = false;
          toast("삭제 못 했어요 (" + (e && e.message || "네트워크") + ") — 새로고침 후 다시 해 보세요", 3500);
        });
    }
    function scrapAgain(gno, cb) {
      if (!gno) { cb(false, "공고번호 없음"); return; }
      fetch("https://display.jobkorea.co.kr/v1/jobs/scraps?jobId=" + encodeURIComponent(gno), { method: "POST", credentials: "include" })
        .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, st: r.status, t: t }; }); })
        .then(function (res) { cb(res.ok && res.t.indexOf(gno) >= 0, res.ok ? "응답에 공고번호 없음" : "HTTP " + res.st); })
        .catch(function (e) { cb(false, (e && e.message) || "네트워크"); });
    }
    function paintRowDel() {
      document.querySelectorAll("li.listItem").forEach(function (li) {
        if (li.querySelector(".jkRowDel")) return;
        (li.querySelector(".col.btnCol") || li).appendChild(rowDelX(function (b) { rowDelete(li, b); }));
      });
    }
    var root = (document.querySelector("li.listItem") || {}).parentElement || null;
    var bar = el("div", "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 12px;" +
      "padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif");
    var del = el("button", "color:#fff;border:none;padding:7px 11px;border-radius:9px;" +
      "font-size:14.5px;font-weight:800;cursor:pointer;white-space:nowrap");
    del.onclick = purge;
    var kindGrp = delKindsGroup(delKinds, function () { updateDelBtn(); });
    kindGrp.add(del);
    function updateDelBtn() {
      var pool = countPool(), n = kindRows(delKinds, pool).length, counts = {};
      KINDS.forEach(function (x) { counts[x.k] = pool.filter(function (li) { return isKind(li, x.k); }).length; });
      kindGrp.paint(counts);
      del.style.background = (kindStr(delKinds) && n) ? "#e11d48" : "#94a3b8";
      del.textContent = delKindsLabel(delKinds, n) + (counting ? " (다른 페이지 세는 중…)" : "");
      del.title = "켜 둔 종류(" + (kindNames(delKinds) || "없음") + ")의 공고를 스크랩에서 한 번에 삭제 — 한 줄이 여러 종류면 하나만 세요" +
        (loaded || !counting ? " — 전체 페이지 기준" : " — 다른 페이지를 세는 중");
    }
    function paintCareer() {
      careerOnly().forEach(function (li) {
        if (li.querySelector(".jkCareerTag")) return;
        var tok = careerText(li); if (!tok) return;
        var b = el("span", "display:inline-block;margin-left:8px;vertical-align:middle;background:#fff1f2;color:#be123c;" +
          "border:1.5px solid #fda4af;padding:1px 8px;border-radius:9px;font:700 12px/1.5 'Malgun Gothic','Apple SD Gothic Neo',sans-serif", "⚠ " + tok);
        b.className = "jkCareerTag";
        b.title = "신입·경력무관 표기가 없는 경력직 공고 — 🗑 버튼의 삭제 대상";
        var link = li.querySelector("a[href*='GI_Read' i]");
        if (link && link.parentNode) link.parentNode.insertBefore(b, link.nextSibling);
        else li.appendChild(b);
      });
      paintApplied();
    }
    function paintApplied() {
      appliedAll().forEach(function (li) {
        if (li.querySelector(".jkAppliedTag")) return;
        var b = el("span", "display:inline-block;margin-left:8px;vertical-align:middle;background:#eff6ff;color:#1d4ed8;" +
          "border:1.5px solid #93c5fd;padding:1px 8px;border-radius:9px;font:700 12px/1.5 'Malgun Gothic','Apple SD Gothic Neo',sans-serif", "✅ 지원완료");
        b.className = "jkAppliedTag";
        b.title = "이미 지원한 공고 — 🗑 일괄삭제(지원완료 칩을 켰을 때)의 대상";
        var link = li.querySelector("a[href*='GI_Read' i]");
        if (link && link.parentNode) link.parentNode.insertBefore(b, link.nextSibling);
        else li.appendChild(b);
      });
    }
    updateDelBtn(); paintCareer(); paintRowDel();
    var s = el("input"); s.type = "search"; s.placeholder = "🔍 스크랩 검색 (회사·공고명)";
    s.style.cssText = "flex:0 1 320px;min-width:170px;padding:9px 12px;border:2px solid #2563eb;border-radius:10px;font-size:16.5px;outline:none";
    var cnt = el("span", "font-size:14.5px;color:#334155;background:#fff;border:1px solid #e2e8f0;padding:4px 9px;border-radius:8px;display:none");
    bar.appendChild(s); bar.appendChild(cnt);
    if (root && root.parentElement) {
      root.parentElement.insertBefore(bar, root);
    } else {
      var act = document.getElementById("js-delBtn");
      var actRow = act ? (act.closest("div,section") || act.parentElement) : null;
      if (actRow && actRow.parentElement) actRow.parentElement.insertBefore(bar, actRow.nextSibling);
      else { bar.style.cssText += ";position:fixed;top:150px;right:20px;z-index:2147483000;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2)"; document.body.appendChild(bar); }
    }
    var loaded = false, loading = false;
    var cmMap = null, cmOrigin = "집", serverUp = false;
    function tierName(min) { var n = parseInt(min, 10); return isNaN(n) ? "gray" : (n <= 30 ? "green" : (n <= 60 ? "yellow" : "red")); }
    function commuteBadge(info) { return commuteBadgeEl(info, cmOrigin); }
    function attachBadge(li, info) {
      var st = badgeState(info), old = li.querySelector(".jkCommuteBadge");
      if (old) {
        var os = old.getAttribute("data-jk-st") || (/미확인/.test(old.textContent || "") ? "unknown" : "ok");
        if (os === "ok") return;
        if (os === st) return;
        old.remove();
      }
      var link = li.querySelector("a[href*='GI_Read' i]");
      var badge = commuteBadge(info);
      if (link && link.parentNode) { link.parentNode.insertBefore(badge, link.nextSibling); }
      else { if (getComputedStyle(li).position === "static") li.style.position = "relative";
             badge.style.cssText += ";position:absolute;top:10px;right:12px;margin:0;z-index:6"; li.appendChild(badge); }
      li.setAttribute("data-jk-tier", st === "pending" ? "pending" : tierName(info.min));
      if (st === "ok") li.setAttribute("data-jk-min", String(parseInt(info.min, 10)));
    }
    function paintCommute(map) {
      document.querySelectorAll("li.listItem").forEach(function (li) {
        if (li.querySelector(".jkCommuteBadge")) return;
        var c = li.querySelector("input.chkIdx"), gno = c && c.getAttribute("data-gno");
        var info = gno && map[gno];
        if (!info) return;
        if (isNaN(parseInt(info.min, 10))) return;
        attachBadge(li, info);
      });
      recount();
    }
    var tierCnt = { green: 0, yellow: 0, red: 0, gray: 0, pending: 0 };
    var _hidNoVal = { t: 0, r: 0 };
    var cmRange = null;
    function anySel() { return !!(cmRange && cmRange.on()); }
    function rowTier(li) { var t = li.getAttribute("data-jk-tier"); return t || (serverUp ? "pending" : "gray"); }
    function rowMin(li) { var m = li.getAttribute("data-jk-min"); return m == null ? null : parseFloat(m); }
    var pendNote = el("span", "font-size:13px;color:#64748b;font-weight:700;margin-left:6px", "");
    function renderChips() {
      var msg = [];
      if (tierCnt.pending) msg.push("⏳ 계산 중 " + tierCnt.pending + "건 — 끝나면 자동으로 채워져요");
      if (anySel() && _hidNoVal.t) msg.push("시간 미확인 " + _hidNoVal.t + "건 숨김");
      pendNote.textContent = msg.join(" · ");
    }
    var rPendNote = el("span", "font-size:13px;color:#64748b;font-weight:700;margin-left:6px", "");
    var rCnt = { ok: 0, low: 0, unknown: 0, pending: 0 };
    var rtRange = null;
    function anyRSel() { return !!(rtRange && rtRange.on()); }
    function rowRtier(li) { return li.getAttribute("data-jk-rtier") || (ratingMap ? "unknown" : "pending"); }
    function rowRating(li) { var r = li.getAttribute("data-jk-rating"); return r == null ? null : parseFloat(r); }
    function renderRChips() {
      var msg = [];
      if (rCnt.pending) msg.push("⏳ 조회 중 " + rCnt.pending + "건");
      if (anyRSel() && _hidNoVal.r) msg.push("평점 미확인 " + _hidNoVal.r + "건 숨김");
      rPendNote.textContent = msg.join(" · ");
    }
    function recount() {
      tierCnt = { green: 0, yellow: 0, red: 0, gray: 0, pending: 0 }; rCnt = { ok: 0, low: 0, unknown: 0, pending: 0 };
      document.querySelectorAll("li.listItem").forEach(function (li) {
        tierCnt[rowTier(li)]++; rCnt[rowRtier(li)]++;
      });
      renderChips(); renderRChips();
      paintCareer(); updateDelBtn();
      paintRowDel();
    }
    var barF = el("div", "display:flex;flex-direction:column;gap:7px;margin:-2px 0 12px;" +
      "padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif");
    function filterRow(label, topLine) {
      var r = el("div", "display:flex;gap:5px;align-items:center;flex-wrap:wrap" +
        (topLine ? ";border-top:1px solid #e2e8f0;padding-top:9px;margin-top:1px" : ""));
      if (label) r.appendChild(el("span", "flex:0 0 112px;font-size:14.5px;color:#475569;font-weight:800;white-space:nowrap", label));
      barF.appendChild(r);
      return r;
    }
    var sortMode = "", _jkOrd = 0, sortEls = {};
    var SORTS = [
      { key: "",         label: "↺ 기본순",         tip: "스크랩한 원래 순서로 되돌려요" },
      { key: "commute",  label: "🚇 통근 가까운 순", tip: "통근시간이 짧은 공고부터 — 아직 계산 중이거나 못 구한 줄은 맨 끝" },
      { key: "deadline", label: "⏰ 마감임박순",     tip: "마감이 가까운 공고부터 — 상시채용·이미 마감된 줄은 맨 끝" }
    ];
    var sortNote = el("span", "font-size:12px;color:#94a3b8;font-weight:700;margin-left:4px", "");
    function renderSortChips() {
      SORTS.forEach(function (o) {
        var c = sortEls[o.key]; if (!c) return; var on = sortMode === o.key;
        c.style.cssText = "border:2px solid " + (on ? "#4f46e5" : "#cbd5e1") + ";padding:7px 10px;border-radius:9px;" +
          "font-size:14.5px;font-weight:800;cursor:pointer;white-space:nowrap;background:" + (on ? "#4f46e5" : "#fff") +
          ";color:" + (on ? "#fff" : "#64748b");
        c.textContent = o.label;
        c.title = o.tip;
      });
    }
    function jkOrd(li) { return parseInt(li.getAttribute("data-jk-ord") || "0", 10); }
    function dlText(li) { var e = li.querySelector("span.deadline, .deadline"); return e ? (e.textContent || "").trim() : ""; }
    function dlVal(li) {
      var c = li.getAttribute("data-jk-dl");
      if (c != null) return c === "" ? null : parseInt(c, 10);
      var v = deadlineSortVal(dlText(li));
      li.setAttribute("data-jk-dl", v == null ? "" : String(v));
      return v;
    }
    function sortVal(li) {
      if (sortMode === "commute") { var m = li.getAttribute("data-jk-min"); return m == null ? null : parseInt(m, 10); }
      if (sortMode === "deadline") return dlVal(li);
      return null;
    }
    function reorder() {
      if (!root) return;
      var list = [].slice.call(document.querySelectorAll("li.listItem"));
      if (!list.length) return;
      list.forEach(function (li) { if (li.getAttribute("data-jk-ord") == null) li.setAttribute("data-jk-ord", String(_jkOrd++)); });
      if (!sortMode) { list.sort(function (a, b) { return jkOrd(a) - jkOrd(b); }); list.forEach(function (li) { root.appendChild(li); }); return; }
      var known = [], unknown = [];
      list.forEach(function (li) { var v = sortVal(li); if (v == null || isNaN(v)) unknown.push(li); else known.push(li); });
      known.sort(function (a, b) { return (sortVal(a) - sortVal(b)) || (jkOrd(a) - jkOrd(b)); });
      unknown.sort(function (a, b) { return jkOrd(a) - jkOrd(b); });
      known.forEach(function (li) { root.appendChild(li); });
      unknown.forEach(function (li) { root.appendChild(li); });
    }
    function applySort() { if (sortMode) reorder(); }
    var rowS = filterRow("↕ 정렬");
    SORTS.forEach(function (o) {
      var c = el("button"); sortEls[o.key] = c;
      c.onclick = function () {
        sortMode = o.key; renderSortChips();
        if (!o.key) { reorder(); return; }
        if (!loaded && !loading) { sortNote.textContent = "전체 페이지 불러오는 중…"; loadAll(function () { sortNote.textContent = ""; reorder(); }); }
        else reorder();
      };
      rowS.appendChild(c);
    });
    rowS.appendChild(sortNote);
    renderSortChips();
    var _refilter = function () { if (!loaded && !loading) loadAll(applyFilters); else applyFilters(); };
    var rowT = filterRow("🚇 통근");
    cmRange = numRange(rowT, "분", "5", _refilter);
    rowT.appendChild(pendNote);
    var rowR = filterRow("🪐 평점");
    rtRange = numRange(rowR, "점", "0.1", _refilter);
    rowR.appendChild(el("span", "font-size:11px;color:#94a3b8;margin-left:auto;align-self:center;white-space:nowrap",
      "도우미 v" + JK_VER));
    var rowA = filterRow("", true);
    rowA.appendChild(kindGrp.box);
    var fTools = el("span", "margin-left:auto;display:none;align-items:center;gap:10px");
    var visDel = el("button", "border:none;background:#334155;color:#fff;padding:6px 10px;border-radius:9px;font-size:13.5px;font-weight:800;cursor:pointer;white-space:nowrap");
    var resetBtn = el("button", "border:none;background:none;color:#64748b;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline;padding:0;white-space:nowrap", "필터 초기화");
    resetBtn.onclick = function () {
      s.value = ""; cmRange.clear(); rtRange.clear();
      renderChips(); renderRChips(); applyFilters();
    };
    fTools.appendChild(visDel); fTools.appendChild(resetBtn);
    rowT.appendChild(fTools);
    rowT.insertBefore(originPicker(function () { __jkLoc.reload(); }), pendNote);
    function visibleRows() { return [].slice.call(document.querySelectorAll("li.listItem")).filter(function (li) { return li.style.display !== "none"; }); }
    function filterOn() { return !!(s.value.trim() || anySel() || anyRSel()); }
    function updateSelBtn() {
      var on = filterOn(), n = visibleRows().length;
      fTools.style.display = on ? "inline-flex" : "none";
      visDel.textContent = "🗑 보이는 " + n + "건 삭제";
      visDel.style.opacity = n ? "1" : ".45";
      visDel.title = "지금 필터에 걸려 보이는 공고만 스크랩에서 한 번에 삭제(전 페이지 기준 · 확인창에 목록)";
    }
    visDel.onclick = function () {
      var go = function () {
        var rows = visibleRows();
        if (!filterOn()) return;
        if (!rows.length) { toast("지금 보이는 공고가 없어요"); return; }
        if (!confirm("지금 보이는 공고 " + rows.length + "건을 스크랩 목록에서 삭제할까요?\n\n" +
            delPreview(rows.map(function (li) { return jkRowInfo(li, "보이는"); })) + "\n\n(필터로 숨은 공고는 안 건드려요)")) return;
        document.querySelectorAll("li.listItem input.chkIdx").forEach(function (c) { c.checked = false; });
        rows.forEach(function (li) { var c = li.querySelector("input.chkIdx"); if (c) c.checked = true; });
        var btn = document.getElementById("js-delBtn") || document.querySelector(".js-delBtn");
        if (!btn) { toast("삭제 버튼을 못 찾음 — 페이지 새로고침 후 다시 시도해요"); return; }
        var _c = window.confirm, _a = window.alert;
        window.confirm = function () { return true; }; window.alert = function () {};
        try { btn.click(); } finally { setTimeout(function () { window.confirm = _c; window.alert = _a; }, 4000); }
      };
      if (!loaded && !loading) loadAll(function () { applyFilters(); go(); }); else go();
    };
    updateSelBtn();
    rowR.appendChild(rPendNote);
    if (bar.parentNode && document.querySelector("li.listItem")) {
      bar.parentNode.insertBefore(barF, bar.nextSibling);
    }
    renderChips(); renderRChips();
    function applyFilters() {
      var q = s.value.trim().toLowerCase(), items = document.querySelectorAll("li.listItem"), sh = 0;
      var tierFilterOn = anySel(), rFilterOn = anyRSel();
      _hidNoVal.t = _hidNoVal.r = 0;
      items.forEach(function (li) {
        var okS = !q || (li.innerText || "").replace(/\s+/g, " ").toLowerCase().indexOf(q) >= 0;
        var okT = !tierFilterOn || cmRange.pass(rowMin(li));
        var okR = !rFilterOn || rtRange.pass(rowRating(li));
        if (tierFilterOn && rowMin(li) === null) _hidNoVal.t++;
        if (rFilterOn && rowRating(li) === null) _hidNoVal.r++;
        var show = okS && okT && okR;
        li.style.display = show ? "" : "none"; if (show) sh++;
      });
      if (q || tierFilterOn || rFilterOn) { cnt.textContent = sh + "건" + (loaded ? " (전체)" : ""); cnt.style.display = ""; }
      else { cnt.style.display = "none"; }
      renderChips(); renderRChips();
      updateSelBtn();
      applySort();
    }
    var _pageTpl = null;
    function pages() {
      var mx = 1;
      document.querySelectorAll("a[href*='scrap' i][href*='age=']").forEach(function (a) {
        var h = a.getAttribute("href") || "", m = h.match(/[?&]page=(\d+)/i);
        if (!m) return;
        mx = Math.max(mx, +m[1]);
        if (!_pageTpl) _pageTpl = h;
      });
      return mx;
    }
    function pageUrl(p) { return _pageTpl ? _pageTpl.replace(/([?&]page=)\d+/i, "$1" + p) : "/User/Scrap?Page=" + p; }
    function loadAll(done) {
      if (loaded || loading) { done && done(); return; }
      var last = pages(); if (last <= 1 || !root) { loaded = true; done && done(); return; }
      loading = true; cnt.textContent = "다른 페이지 불러오는 중…"; cnt.style.display = "";
      function gnoOf(li) { var c = li.querySelector("input.chkIdx"); return c ? c.getAttribute("data-gno") : ""; }
      fetchOtherPages(function (pf) {
        var have = {}; document.querySelectorAll("li.listItem").forEach(function (li) { have[gnoOf(li)] = 1; });
        var firstNow = root.querySelector("li.listItem");
        pf.want.forEach(function (pno) {
          (pf.byPage[pno] || []).forEach(function (li) {
            var g = gnoOf(li); if (g && have[g]) return; have[g] = 1;
            if (pno < pf.cur && firstNow) root.insertBefore(li, firstNow); else root.appendChild(li);
          });
        });
        loaded = true; loading = false; if (cmMap) paintCommute(cmMap); fillMissing(); if (ratingMap) { paintRatings(); fillMissingRatings(); } recount(); applyFilters(); done && done();
      });
    }
    var first = true;
    s.addEventListener("focus", function () { if (first) { first = false; loadAll(); } });
    s.addEventListener("input", function () { if (!loaded && !loading) loadAll(applyFilters); else applyFilters(); });
    resume();
    if (!sessionStorage.getItem(AUTO)) prefetchCounts();
    var filling = false;
    function fillMissing() {
      if (!serverUp || filling) return;
      var todo = [];
      document.querySelectorAll("li.listItem").forEach(function (li) {
        var c = li.querySelector("input.chkIdx"), gno = c && c.getAttribute("data-gno");
        if (!gno) return;
        var b = li.querySelector(".jkCommuteBadge");
        var st = b && (b.getAttribute("data-jk-st") || "ok");
        if (st === "ok" || st === "pending") return;
        var cached = cmMap && cmMap[gno];
        if (cached && !isNaN(parseInt(cached.min, 10))) return;
        var tries = parseInt(li.getAttribute("data-jk-fill") || "0", 10);
        if (tries >= 2) return;
        li.setAttribute("data-jk-fill", String(tries + 1));
        attachBadge(li, { min: "?", pending: true });
        todo.push({ li: li, gno: gno });
      });
      if (!todo.length) return;
      filling = true; recount();
      var i = 0, active = 0, CONC = 3;
      function pump() {
        if (i >= todo.length) { if (active === 0) { filling = false; recount(); applyFilters(); setTimeout(fillMissing, 1200); } return; }
        while (active < CONC && i < todo.length) {
          (function (job) { active++; withTimeout(fillOne(job), 25000, function () { attachBadge(job.li, { min: "?", why: LATE_WHY }); }).then(function () { active--; recount(); applyFilters(); pump(); }); })(todo[i++]);
        }
      }
      pump();
    }
    function fillOne(job) {
      return fetch("/Recruit/GI_Read/" + job.gno, { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.text() : ""; })
        .then(function (html) {
          var addr = extractAddr(html);
          if (addr) return addr;
          var isrc = null, ir = /<iframe[^>]+src=["']([^"']+)["']/gi, mi;
          while ((mi = ir.exec(html))) { if (/jobkorea\.co\.kr|GI_Read|Read_/i.test(mi[1])) { isrc = mi[1]; break; } }
          if (!isrc) return null;
          var iu = isrc.indexOf("//") === 0 ? __jkLoc.protocol + isrc : isrc;
          return fetch(iu, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.text() : ""; }).then(extractAddr).catch(function () { return null; });
        })
        .then(function (addr) {
          var approx = false;
          if (!addr) { addr = rowRegion(job.li); approx = !!addr; }
          if (!addr) { attachBadge(job.li, { min: "?", why: "공고에서 근무지주소를 못 찾았어요 (공고에 주소 표기 없음)" }); return; }
          return bridgeFetch("https://jk.local/api/commute-addr?addr=" + encodeURIComponent(addr), 9000, "commuteMap").then(function (res) {
            if (!res || !res.ok) { attachBadge(job.li, { min: "?", why: "통근 계산 실패 — 대시보드 서버 응답 없음" }); return; }
            var info = { min: (res.min == null ? "?" : res.min), addr: addr, approx: approx };
            if (res.min == null) info.why = res.reason ? res.reason : ("주소는 찾았는데(" + addr + ") 대중교통 경로를 못 구했어요");
            if (res.quota_exceeded) job.li.setAttribute("data-jk-fill", "9");
            else reportCommute(job.gno, res.min, addr, approx);
            if (cmMap) cmMap[job.gno] = info;
            attachBadge(job.li, info);
          });
        })
        .catch(function () { attachBadge(job.li, { min: "?", why: "통근 계산 중 오류" }); });
    }
    function loadCommute() {
      bridgeFetch("https://jk.local/api/commute-map", 8000, "commuteMap").then(function (res) {
        if (!res || !res.ok || !res.map) return;
        serverUp = true; cmMap = res.map; if (res.origin) cmOrigin = res.origin;
        paintCommute(cmMap);
        fillMissing();
      });
    }
    loadCommute();
    var ratingMap = null, ratingByCo = null, ratingMin = 0, ratingEnabled = true;
    function rowRatingRec(li) {
      var c = li.querySelector("input.chkIdx"), gno = c && c.getAttribute("data-gno");
      var rec = (gno && ratingMap && ratingMap[gno]) || null;
      if (!rec && ratingByCo) {
        var a = li.querySelector("a[href*='/Co_Read/' i]");
        var nm = a && normCo(a.textContent);
        if (nm && ratingByCo[nm]) rec = ratingByCo[nm];
      }
      return rec;
    }
    function rowRating(li) {
      var rec = rowRatingRec(li);
      return rec && rec.rating != null ? rec.rating : null;
    }
    function ratingTierOf(val) {
      if (val == null) return "unknown";
      if (ratingEnabled && ratingMin && val < ratingMin) return "low";
      return "ok";
    }
    var rWhy = {};
    function unknownBadge(gno) { return unknownRatingBadge(rWhy[gno]); }
    function paintRatings() {
      document.querySelectorAll("li.listItem").forEach(function (li) {
        var val = rowRating(li), rt = ratingTierOf(val);
        var c0 = li.querySelector("input.chkIdx"), gno0 = c0 && c0.getAttribute("data-gno");
        var unk = val == null ? unknownBadge(gno0) : null;
        li.setAttribute("data-jk-rtier", (unk && rWhy[gno0] && rWhy[gno0].k === "loading") ? "pending" : rt);
        if (val != null && !isNaN(val)) li.setAttribute("data-jk-rating", String(val)); else li.removeAttribute("data-jk-rating");
        var old = li.querySelector(".jkRatingBadge"); if (old) old.remove();
        var c = { bg: badgeWarnColor(ratingIsWarn(val), unk && rWhy[gno0] && rWhy[gno0].k === "loading"), fg: "#fff" };
        var b = el("span", "display:inline-block;margin-left:6px;vertical-align:middle;background:" + c.bg + ";color:" + c.fg + ";" +
          "padding:2px 9px;border-radius:9px;font:700 12px/1.45 'Malgun Gothic','Apple SD Gothic Neo',sans-serif", unk ? unk.txt : "🪐 " + val);
        b.className = "jkRatingBadge";
        b.title = unk ? unk.tip : ("잡플래닛 평점 " + val + (ratingMin ? " (기준 " + ratingMin + ")" : "") +
                                   altNote(rowRatingRec(li), rowCompany(li)));
        var cb = li.querySelector(".jkCommuteBadge");
        if (cb && cb.parentNode) cb.parentNode.insertBefore(b, cb.nextSibling);
        else { var link = li.querySelector("a[href*='GI_Read' i]"); if (link && link.parentNode) link.parentNode.insertBefore(b, link.nextSibling); }
      });
    }
    function loadRating() {
      bridgeFetch("https://jk.local/api/rating-map", 8000, "commuteMap").then(function (res) {
        if (!res || !res.ok || !res.map) return;
        ratingMap = res.map; ratingByCo = res.byCo || {}; ratingMin = res.min || 0; ratingEnabled = res.enabled !== false;
        paintRatings(); recount(); applyFilters();
        fillMissingRatings();
      });
    }
    function rowCompany(li) {
      var a = li.querySelector("a[href*='/Co_Read/' i]");
      var t = a && (a.textContent || "").trim();
      return t || null;
    }
    var rFilling = false, rStatus = null;
    function setRStatus(txt) {
      if (!rowR) return;
      if (!rStatus) { rStatus = el("span", "font-size:12px;color:#94a3b8;font-weight:700;margin-left:2px"); rowR.appendChild(rStatus); }
      rStatus.textContent = txt || "";
    }
    function fillMissingRatings() {
      if (!ratingMap || rFilling) return;
      var todo = [];
      document.querySelectorAll("li.listItem").forEach(function (li) {
        if (li.getAttribute("data-jk-rfill")) return;
        var c = li.querySelector("input.chkIdx"), gno = c && c.getAttribute("data-gno");
        if (!gno || ratingMap[gno]) return;
        var co = rowCompany(li);
        if (co && ratingByCo && ratingByCo[normCo(co)]) return;
        if (!co) { rWhy[gno] = { k: "noco" }; return; }
        li.setAttribute("data-jk-rfill", "1");
        rWhy[gno] = { k: "loading", co: co };
        todo.push({ li: li, gno: gno, co: co });
      });
      if (!todo.length) { setRStatus(""); paintRatings(); return; }
      paintRatings();
      rFilling = true;
      var doneN = 0, startN = 0, POOL = Math.min(6, todo.length);
      setRStatus("· 평점 불러오는 중 0/" + todo.length);
      function finOne(job, res) {
        var val = res && res.v != null ? res.v : null;
        rWhy[job.gno] = val == null ? { k: (res && res.why) || "timeout", co: job.co } : null;
        var alt = (res && res.alt) || null;
        ratingMap[job.gno] = { rating: val, co: job.co, alt: alt };
        if (val != null) {
          (ratingByCo = ratingByCo || {})[normCo(job.co)] = { rating: val, co: job.co, alt: alt };
          bridgeFetch("https://jk.local/api/rating?gno=" + encodeURIComponent(job.gno) +
            "&co=" + encodeURIComponent(job.co) + "&rating=" + encodeURIComponent(val) +
            (alt && alt.to ? "&alt=" + encodeURIComponent(alt.to) : ""), 6000, "commuteMap");
        }
        doneN++;
        setRStatus(doneN >= todo.length ? "" : "· 평점 불러오는 중 " + doneN + "/" + todo.length);
        paintRatings(); recount(); applyFilters();
        if (doneN >= todo.length) { rFilling = false; recount(); applyFilters(); fillMissingRatings(); }
        else pump();
      }
      function pump() {
        while (startN < todo.length && (startN - doneN) < POOL) {
          (function (job) { fetchOneRating(job.co, 25000).then(function (res) { finOne(job, res); }); })(todo[startN++]);
        }
      }
      pump();
    }
    loadRating();
  }
  function initOnPass() {
    var LIST_SEL = "div.recommend-list", CARD_SEL = "div.recommend-item";
    var root = null, bar = null, btnCm = null, note = null;
    var cmMap = null, cmOrigin = "집", serverUp = false, quota = null, quotaDead = false, deadWhy = "";
    var ratingMap = null, ratingByCo = null, rWhy = {}, rStatus = null;
    var sortMode = "", _ord = 0, sortEls = {};
    function cards() { return [].slice.call(document.querySelectorAll(CARD_SEL)); }
    function chkOf(it) { return it.querySelector("input.devMultiCheck"); }
    function gnoOf(it) { var c = chkOf(it); return c && c.getAttribute("data-gno"); }
    function coOf(it) {
      var c = chkOf(it), v = c && (c.getAttribute("data-cname") || "").trim();
      if (v) return v;
      var p = it.querySelector("p.company-name");
      return p ? (p.textContent || "").trim() || null : null;
    }
    function slotOf(it) { return it.querySelector(".recommend-meta") || it.querySelector(".recommend-info") || it; }
    function dlTextOf(it) { var e = it.querySelector("span.deadline"); return e ? (e.textContent || "").trim() : ""; }
    function noToggle(e) {
      e.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); });
      return e;
    }
    function boxOf(it) {
      var b = it.querySelector(".jkBadgeBox");
      if (!b) {
        b = noToggle(el("span", "display:inline-flex;flex-wrap:wrap;gap:4px;align-items:center;margin-right:6px;vertical-align:middle"));
        b.className = "jkBadgeBox";
        var slot = slotOf(it);
        slot.insertBefore(b, slot.firstChild);
      }
      return b;
    }
    function attachCm(it, info) {
      var st = badgeState(info), old = it.querySelector(".jkCommuteBadge");
      if (old) {
        var os = old.getAttribute("data-jk-st") || "ok";
        if (os === "ok") return;
        if (os === st) return;
        old.remove();
      }
      var b = commuteBadgeEl(info, cmOrigin);
      b.style.marginLeft = "0"; b.style.order = "1";
      boxOf(it).appendChild(noToggle(b));
      if (st === "ok") it.setAttribute("data-jk-min", String(parseInt(info.min, 10)));
      else it.removeAttribute("data-jk-min");
    }
    function paintCommuteCache() {
      if (!cmMap) return;
      cards().forEach(function (it) {
        var g = gnoOf(it); if (!g) return;
        var info = cmMap[g]; if (!info) return;
        if (isNaN(parseInt(info.min, 10))) return;
        attachCm(it, info);
      });
    }
    function cmTodo() {
      return cards().filter(function (it) {
        if (!gnoOf(it)) return false;
        if (it.getAttribute("data-jk-fill") === "9") return false;
        var b = it.querySelector(".jkCommuteBadge");
        var st = b && (b.getAttribute("data-jk-st") || "ok");
        return st !== "ok" && st !== "pending";
      });
    }
    function fillOne(it) {
      var gno = gnoOf(it);
      return fetch("/Recruit/GI_Read/" + gno, { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.text() : ""; })
        .then(function (html) {
          var addr = extractAddr(html);
          if (addr) return addr;
          var isrc = null, ir = /<iframe[^>]+src=["']([^"']+)["']/gi, mi;
          while ((mi = ir.exec(html))) { if (/jobkorea\.co\.kr|GI_Read|Read_/i.test(mi[1])) { isrc = mi[1]; break; } }
          if (!isrc) return null;
          var iu = isrc.indexOf("//") === 0 ? __jkLoc.protocol + isrc : isrc;
          return fetch(iu, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.text() : ""; }).then(extractAddr).catch(function () { return null; });
        })
        .then(function (addr) {
          var approx = false;
          if (!addr) { addr = rowRegion(it); approx = !!addr; }
          if (!addr) { attachCm(it, { min: "?", why: "공고에서 근무지주소를 못 찾았어요 (공고에 주소 표기 없음)" }); return; }
          return bridgeFetch("https://jk.local/api/commute-addr?addr=" + encodeURIComponent(addr), 9000, "commuteMap").then(function (res) {
            if (!res || !res.ok) { attachCm(it, { min: "?", why: "통근 계산 실패 — 응답 없음" }); return; }
            if (res.quota) quota = res.quota;
            var info = { min: (res.min == null ? "?" : res.min), addr: addr, approx: approx };
            if (res.min == null) info.why = res.reason ? res.reason : ("주소는 찾았는데(" + addr + ") 대중교통 경로를 못 구했어요");
            if (res.quota_exceeded) { quotaDead = true; deadWhy = res.reason || ""; it.setAttribute("data-jk-fill", "9"); }
            else reportCommute(gno, res.min, addr, approx);
            if (cmMap) cmMap[gno] = info;
            attachCm(it, info);
          });
        })
        .catch(function () { attachCm(it, { min: "?", why: "통근 계산 중 오류" }); });
    }
    var cmFilling = false;
    function fillCommute() {
      if (!serverUp || cmFilling) return;
      var todo = cmTodo();
      if (!todo.length) { paintBtn(); return; }
      cmFilling = true; quotaDead = false;
      todo.forEach(function (it) { attachCm(it, { min: "?", pending: true }); });
      paintBtn();
      var i = 0, active = 0, CONC = 3;
      function pump() {
        if (quotaDead) {
          while (i < todo.length) {
            var it = todo[i++];
            it.setAttribute("data-jk-fill", "9");
            var b = it.querySelector(".jkCommuteBadge");
            if (b && b.getAttribute("data-jk-st") === "pending") b.remove();
            attachCm(it, { min: "?", why: deadWhy || "네이버 길찾기가 잠시 응답하지 않아요 — 몇 분 뒤 다시 열면 계산됩니다" });
          }
        }
        if (i >= todo.length) { if (active === 0) { cmFilling = false; paintBtn(); applySort(); } return; }
        while (active < CONC && i < todo.length) {
          (function (job) { active++; withTimeout(fillOne(job), 25000, function () { attachCm(job, { min: "?", why: LATE_WHY }); }).then(function () { active--; paintBtn(); applySort(); pump(); }); })(todo[i++]);
        }
      }
      pump();
    }
    function loadCommute() {
      bridgeFetch("https://jk.local/api/commute-map", 8000, "commuteMap").then(function (res) {
        if (!res || !res.ok || !res.map) { paintBtn(); return; }
        serverUp = true; cmMap = res.map; if (res.origin) cmOrigin = res.origin;
        paintCommuteCache(); applySort(); paintBtn();
        fillCommute();
        bridgeFetch("https://jk.local/api/commute-quota", 6000, "commuteMap").then(function (q) {
          if (q && q.ok && q.quota) { quota = q.quota; paintBtn(); }
        });
      });
    }
    function rowRatingRec(it) {
      var g = gnoOf(it);
      var rec = (g && ratingMap && ratingMap[g]) || null;
      if (!rec && ratingByCo) { var nm = normCo(coOf(it)); if (nm && ratingByCo[nm]) rec = ratingByCo[nm]; }
      return rec;
    }
    function paintRatings() {
      cards().forEach(function (it) {
        var g = gnoOf(it), rec = rowRatingRec(it);
        var val = rec && rec.rating != null ? rec.rating : null;
        var unk = val == null ? unknownRatingBadge(rWhy[g]) : null;
        var loading = !!(unk && rWhy[g] && rWhy[g].k === "loading");
        var old = it.querySelector(".jkRatingBadge"); if (old) old.remove();
        var b = el("span", "display:inline-block;background:" + badgeWarnColor(ratingIsWarn(val), loading) + ";color:#fff;" +
          "padding:2px 9px;border-radius:9px;font:700 12px/1.45 'Malgun Gothic','Apple SD Gothic Neo',sans-serif", unk ? unk.txt : "🪐 " + val);
        b.className = "jkRatingBadge"; b.style.order = "2";
        b.title = unk ? unk.tip : ("잡플래닛 평점 " + val + altNote(rec, coOf(it)));
        boxOf(it).appendChild(noToggle(b));
        if (val != null && !isNaN(val)) it.setAttribute("data-jk-rating", String(val)); else it.removeAttribute("data-jk-rating");
      });
    }
    var rFilling = false;
    function fillMissingRatings() {
      if (!ratingMap || rFilling) return;
      var todo = [];
      cards().forEach(function (it) {
        if (it.getAttribute("data-jk-rfill")) return;
        var g = gnoOf(it); if (!g || ratingMap[g]) return;
        var co = coOf(it);
        if (co && ratingByCo && ratingByCo[normCo(co)]) return;
        if (!co) { rWhy[g] = { k: "noco" }; return; }
        it.setAttribute("data-jk-rfill", "1");
        rWhy[g] = { k: "loading", co: co };
        todo.push({ it: it, gno: g, co: co });
      });
      if (!todo.length) { setRStatus(""); paintRatings(); return; }
      paintRatings();
      rFilling = true;
      var doneN = 0, startN = 0, POOL = Math.min(6, todo.length);
      setRStatus("· 평점 " + doneN + "/" + todo.length);
      function finOne(job, res) {
        var val = res && res.v != null ? res.v : null;
        rWhy[job.gno] = val == null ? { k: (res && res.why) || "timeout", co: job.co } : null;
        var alt = (res && res.alt) || null;
        ratingMap[job.gno] = { rating: val, co: job.co, alt: alt };
        if (val != null) {
          (ratingByCo = ratingByCo || {})[normCo(job.co)] = { rating: val, co: job.co, alt: alt };
          bridgeFetch("https://jk.local/api/rating?gno=" + encodeURIComponent(job.gno) +
            "&co=" + encodeURIComponent(job.co) + "&rating=" + encodeURIComponent(val) +
            (alt && alt.to ? "&alt=" + encodeURIComponent(alt.to) : ""), 6000, "commuteMap");
        }
        doneN++;
        setRStatus(doneN >= todo.length ? "" : "· 평점 " + doneN + "/" + todo.length);
        paintRatings();
        if (doneN >= todo.length) { rFilling = false; fillMissingRatings(); }
        else pump();
      }
      function pump() {
        while (startN < todo.length && (startN - doneN) < POOL) {
          (function (job) { fetchOneRating(job.co, 25000).then(function (res) { finOne(job, res); }); })(todo[startN++]);
        }
      }
      pump();
    }
    function loadRating() {
      bridgeFetch("https://jk.local/api/rating-map", 8000, "commuteMap").then(function (res) {
        if (!res || !res.ok || !res.map) return;
        ratingMap = res.map; ratingByCo = res.byCo || {};
        paintRatings();
        fillMissingRatings();
      });
    }
    var SORTS = [
      { key: "",         label: "↺ 기본순",         tip: "잡코리아가 추천한 원래 순서로 되돌려요" },
      { key: "commute",  label: "🚇 통근 가까운 순", tip: "통근시간이 짧은 공고부터 — 아직 계산 안 한 줄은 맨 끝" },
      { key: "deadline", label: "⏰ 마감임박순",     tip: "마감이 가까운 공고부터 — 상시채용·이미 마감된 줄은 맨 끝" }
    ];
    function ordOf(it) { return parseInt(it.getAttribute("data-jk-ord") || "0", 10); }
    function dlVal(it) {
      var c = it.getAttribute("data-jk-dl");
      if (c != null) return c === "" ? null : parseInt(c, 10);
      var v = deadlineSortVal(dlTextOf(it));
      it.setAttribute("data-jk-dl", v == null ? "" : String(v));
      return v;
    }
    function sortVal(it) {
      if (sortMode === "commute") { var m = it.getAttribute("data-jk-min"); return m == null ? null : parseInt(m, 10); }
      if (sortMode === "deadline") return dlVal(it);
      return null;
    }
    function reorder() {
      if (!root) return;
      var list = cards(); if (!list.length) return;
      list.forEach(function (it) { if (it.getAttribute("data-jk-ord") == null) it.setAttribute("data-jk-ord", String(_ord++)); });
      if (!sortMode) { list.sort(function (a, b) { return ordOf(a) - ordOf(b); }); list.forEach(function (it) { root.appendChild(it); }); return; }
      var known = [], unknown = [];
      list.forEach(function (it) { var v = sortVal(it); if (v == null || isNaN(v)) unknown.push(it); else known.push(it); });
      known.sort(function (a, b) { return (sortVal(a) - sortVal(b)) || (ordOf(a) - ordOf(b)); });
      unknown.sort(function (a, b) { return ordOf(a) - ordOf(b); });
      known.forEach(function (it) { root.appendChild(it); });
      unknown.forEach(function (it) { root.appendChild(it); });
    }
    function applySort() { if (sortMode) reorder(); }
    function renderSortChips() {
      SORTS.forEach(function (o) {
        var c = sortEls[o.key]; if (!c) return; var on = sortMode === o.key;
        c.style.cssText = "border:2px solid " + (on ? "#4f46e5" : "#cbd5e1") + ";padding:5px 8px;border-radius:8px;" +
          "font:800 13px/1 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;cursor:pointer;white-space:nowrap;background:" + (on ? "#4f46e5" : "#fff") +
          ";color:" + (on ? "#fff" : "#64748b");
        c.textContent = o.label; c.title = o.tip;
      });
    }
    function setRStatus(txt) {
      if (!note) return;
      if (!rStatus) { rStatus = el("span", "font-size:12px;color:#94a3b8;font-weight:700;margin-left:4px"); note.appendChild(rStatus); }
      rStatus.textContent = txt || "";
    }
    function paintBtn() {
      if (!btnCm) return;
      var n = cmTodo().length;
      var q = quota ? (" · 오늘 남은 " + quota.left + "/" + quota.limit) : "";
      var dead = quota && quota.exceeded;
      btnCm.disabled = !serverUp || cmFilling || !n || !!dead;
      btnCm.textContent = !serverUp ? "🚇 통근 계산 안 됨"
                        : dead      ? "🚇 오늘 한도 소진 (0/" + quota.limit + ")"
                        : cmFilling ? "🚇 통근 계산 중… (" + n + "건 남음)"
                        : !n        ? "🚇 통근 전부 표시됨"
                                    : "🚇 통근 계산 (" + n + "건" + q + ")";
      btnCm.style.cssText = "border:2px solid " + (btnCm.disabled ? "#cbd5e1" : "#0a8f5b") + ";background:" + (btnCm.disabled ? "#f1f5f9" : "#0a8f5b") +
        ";color:" + (btnCm.disabled ? "#94a3b8" : "#fff") + ";padding:6px 10px;border-radius:8px;white-space:nowrap;" +
        "font:800 13px/1 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;cursor:" + (btnCm.disabled ? "default" : "pointer");
      btnCm.title = dead ? "오늘 길찾기를 많이 불러 쉬어 가요 — 날이 바뀌면 다시 계산할 수 있어요"
                         : "누르면 캐시에 없는 공고의 근무지주소를 읽어 통근시간을 계산해요(네이버 지도 대중교통 · 평일 오전 8시 출발 기준).";
    }
    function mountBar() {
      if (bar || !root) return;
      bar = noToggle(el("div", "display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0 8px;padding:8px 10px;" +
        "background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px"));
      bar.id = "jkOnPassBar";
      bar.appendChild(el("span", "font:800 13px/1 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#475569;white-space:nowrap", "↕ 정렬"));
      SORTS.forEach(function (o) {
        var c = el("button"); sortEls[o.key] = c;
        c.onclick = function () { sortMode = o.key; renderSortChips(); reorder(); };
        bar.appendChild(noToggle(c));
      });
      btnCm = el("button"); btnCm.id = "jkOnPassCalc";
      btnCm.onclick = function () { fillCommute(); };
      bar.appendChild(noToggle(btnCm));
      note = noToggle(el("span", "font-size:12px;color:#94a3b8;font-weight:700;margin-left:auto;white-space:nowrap", "도우미 v" + JK_VER));
      bar.appendChild(note);
      root.parentNode.insertBefore(bar, root);
      renderSortChips(); paintBtn();
    }
    var tries = 0;
    (function wait() {
      root = document.querySelector(LIST_SEL);
      if (root && cards().length) return start();
      if (++tries > 30) return;
      setTimeout(wait, 500);
    })();
    function start() {
      cards().forEach(function (it) { if (it.getAttribute("data-jk-ord") == null) it.setAttribute("data-jk-ord", String(_ord++)); });
      mountBar();
      loadCommute();
      loadRating();
      var t = null;
      try {
        new MutationObserver(function () {
          clearTimeout(t);
          t = setTimeout(function () {
            if (!document.getElementById("jkOnPassBar")) { bar = null; mountBar(); }
            paintCommuteCache(); paintRatings(); paintBtn(); applySort();
          }, 300);
        }).observe(root, { childList: true, subtree: true });
      } catch (e) {}
    }
  }
  function resumeTitleOf(t) {
    var s = t + " " + RT_SUFFIX;
    if (s.length <= RT_MAXLEN) return s;
    var head = t.slice(0, Math.max(1, RT_MAXLEN - RT_SUFFIX.length - 2)).replace(/\s+$/, "");
    return head + "… " + RT_SUFFIX;
  }
  function resumeWriteUrl() {
    return isSR ? "https://www.saramin.co.kr/zf_user/member/resume-manage/write?template_cd=1"
                : "https://www.jobkorea.co.kr/User/Resume/Write";
  }
  function stashResumeTitle(v) {
    try { localStorage.setItem(RT_KEY, JSON.stringify({ t: v, at: Date.now() })); return true; } catch (e) { return false; }
  }
  function dropResumeTitle() { try { localStorage.removeItem(RT_KEY); } catch (e) {} }
  function peekResumeTitle() {
    var raw = null;
    try { raw = localStorage.getItem(RT_KEY); } catch (e) { return ""; }
    if (!raw) return "";
    var o = null;
    try { o = JSON.parse(raw); } catch (e) { o = null; }
    if (!o || !o.t || !o.at || (Date.now() - o.at) > RT_TTL) { dropResumeTitle(); return ""; }
    return String(o.t);
  }
  function initTitleCopy() {
    if (!isTop) return;
    var BID = "jkTitleCopyBtn";
    var LABEL = resumeWriteUrl() ? "📝 이력서 작성" : "📋 제목 복사";
    function nz(s) { return (s || "").replace(/\s+/g, " ").trim(); }
    function stripBadge(s) {
      return nz(String(s || "")
        .replace(/\s*\(\s*D-\s*\d+\s*\)\s*$/, "")
        .replace(/\s*\(\s*(오늘|내일)\s*마감\s*\)\s*$/, ""));
    }
    function fromLd() {
      var ss = document.querySelectorAll('script[type="application/ld+json"]'), i, k, j, arr;
      for (i = 0; i < ss.length; i++) {
        try { j = JSON.parse(ss[i].textContent || "{}"); } catch (e) { continue; }
        arr = Object.prototype.toString.call(j) === "[object Array]" ? j : [j];
        for (k = 0; k < arr.length; k++) {
          if (arr[k] && arr[k]["@type"] === "JobPosting" && arr[k].title) return nz(String(arr[k].title));
        }
      }
      return "";
    }
    function fromOg() {
      var og = document.querySelector('meta[property="og:title"]');
      var s = nz((og && og.getAttribute("content")) || document.title || "");
      s = nz(s.replace(/\s*[|｜\-–—]\s*(잡코리아|사람인)\s*$/, ""));
      var m;
      if (isSR) { m = s.match(/^\[[^\]]{1,40}\]\s*(.+)$/); if (m) return nz(m[1]); }
      else { m = s.match(/\s채용\s*-\s*(.+)$/); if (m) return nz(m[1]); }
      return s;
    }
    function pick() {
      var raw = fromLd() || fromOg();
      return { raw: raw, clean: stripBadge(raw) };
    }
    function visible(e) { return e && e.offsetParent !== null; }
    function leaner(a, b) {
      return (!a || b.getElementsByTagName("*").length < a.getElementsByTagName("*").length) ? b : a;
    }
    function findHost(t) {
      if (!t.clean) return null;
      var pref = isSR ? ["h1.tit_job", ".tit_job", ".job_tit", "h1", "h2"] : ["h1", "h2", "h3"];
      var wants = t.raw === t.clean ? [t.clean] : [t.clean, t.raw];
      var i, q, w, list, e, s;
      for (w = 0; w < wants.length; w++) {
        for (i = 0; i < pref.length; i++) {
          list = document.querySelectorAll(pref[i]);
          for (q = 0; q < list.length; q++) {
            if (nz(list[q].textContent) === wants[w] && visible(list[q])) return list[q];
          }
        }
      }
      var all = document.querySelectorAll("h1,h2,h3,h4,div,span,strong,p"), best = null, loose = null;
      for (i = 0; i < all.length; i++) {
        e = all[i];
        if (!visible(e)) continue;
        s = nz(e.textContent);
        if (!s) continue;
        if (s === t.clean || s === t.raw) { best = leaner(best, e); continue; }
        if (!best && s.length >= 10 && s.length >= t.clean.length * 0.6 && t.clean.indexOf(s) === 0) {
          loose = leaner(loose, e);
        }
      }
      return best || loose;
    }
    function copyFallback(txt) {
      try {
        var ta = document.createElement("textarea");
        ta.value = txt;
        ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
        document.body.appendChild(ta); ta.focus(); ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return !!ok;
      } catch (e) { return false; }
    }
    function flash(b, ok, txt) {
      b.textContent = txt || (ok ? "✔ 복사됨" : "✖ 복사 실패");
      b.style.background = ok ? "#00a68f" : "#dc2626";
      b.style.color = "#fff";
      b.style.borderColor = ok ? "#00a68f" : "#dc2626";
      setTimeout(function () {
        b.textContent = LABEL;
        b.style.background = "#fff"; b.style.color = "#00a68f"; b.style.borderColor = "#00a68f";
      }, 1300);
    }
    function doCopy(txt, b, quiet) {
      function done(ok) { if (!quiet) flash(b, ok); }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(
            function () { done(true); },
            function () { done(copyFallback(txt)); });
          return;
        }
      } catch (e) {}
      done(copyFallback(txt));
    }
    function mount() {
      if (document.getElementById(BID)) return true;
      var t = pick();
      if (!t.clean) return false;
      var host = findHost(t);
      if (!host || !host.parentNode) return false;
      var b = el("button",
        "margin-left:8px;vertical-align:middle;padding:3px 9px;border:1px solid #00a68f;" +
        "border-radius:7px;background:#fff;color:#00a68f;cursor:pointer;white-space:nowrap;" +
        "display:inline-block;font:700 12px/1.4 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;",
        LABEL);
      b.id = BID;
      var wUrl = resumeWriteUrl();
      b.title = wUrl
        ? ("이력서 등록 화면을 새 탭으로 열고 제목을 자동으로 넣습니다\n" + resumeTitleOf(t.clean) +
           "\n(제목은 클립보드에도 복사됩니다)")
        : ("공고 제목을 클립보드에 복사합니다 — 이력서 제목에 붙여 넣으세요\n" + t.clean);
      b.setAttribute("data-jk-title", t.clean);
      b.setAttribute("data-jk-resume-title", resumeTitleOf(t.clean));
      b.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        doCopy(t.clean, b, !!wUrl);
        if (!wUrl) return;
        stashResumeTitle(resumeTitleOf(t.clean));
        flash(b, true, "📝 여는 중…");
        var w = null;
        try { w = window.open(wUrl, "_blank"); } catch (e) { w = null; }
        if (!w) { try { __jkLoc.href = wUrl; } catch (e) {} }
      });
      var cs = null; try { cs = getComputedStyle(host); } catch (e) {}
      var clipped = cs && (cs.whiteSpace === "nowrap" || cs.textOverflow === "ellipsis" || cs.overflow === "hidden");
      if (!clipped) host.appendChild(b);
      else if (host.nextSibling) host.parentNode.insertBefore(b, host.nextSibling);
      else host.parentNode.appendChild(b);
      return true;
    }
    var tries = 0;
    (function schedule() {
      if (mount()) return;
      if (++tries > 40) return;
      setTimeout(schedule, 500);
    })();
    try {
      var moT = 0;
      new MutationObserver(function () {
        if (document.getElementById(BID)) return;
        clearTimeout(moT);
        moT = setTimeout(mount, 300);
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }
  function findResumeTitleInput() {
    var sels = isSR
      ? ['input.resume_title_input', 'input[name="title"].resume_title_input', "#title"]
      : ["#UserResume_M_Resume_Title", 'input[name="UserResume.M_Resume_Title"]'];
    var i, e;
    for (i = 0; i < sels.length; i++) {
      e = document.querySelector(sels[i]);
      if (e && e.tagName === "INPUT") return e;
    }
    if (isSR) return null;
    var ins = document.querySelectorAll("input[type=text]"), r, y, best = null, bestY = 1e9;
    for (i = 0; i < ins.length; i++) {
      r = ins[i].getBoundingClientRect();
      if (r.width < 300 || r.height < 24) continue;
      y = r.top + (window.pageYOffset || 0);
      if (y < bestY) { bestY = y; best = ins[i]; }
    }
    return bestY < 400 ? best : null;
  }
  function setInputValue(inp, v) {
    try {
      var d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      if (d && d.set) d.set.call(inp, v); else inp.value = v;
    } catch (e) { inp.value = v; }
    var evs = ["input", "change", "keyup", "blur"], i;
    for (i = 0; i < evs.length; i++) {
      try { inp.dispatchEvent(new Event(evs[i], { bubbles: true })); } catch (e) {}
    }
  }
  function initResumeTitleFill() {
    if (!isTop) return;
    var want = peekResumeTitle();
    if (!want) return;
    var tries = 0;
    (function go() {
      var inp = findResumeTitleInput();
      if (inp) {
        setInputValue(inp, want);
        dropResumeTitle();
        try { toast("📝 이력서 제목을 넣었습니다 — " + want, 3600); } catch (e) {}
        return;
      }
      if (++tries > 60) {
        try { console.warn("[JK] 이력서 제목 칸을 못 찾았습니다 — 제목은 클립보드에 있습니다"); } catch (e) {}
        return;
      }
      setTimeout(go, 250);
    })();
  }
  function calSet(k, v) {
    CAL_POST[k] = v == null ? "" : String(v);
    calPaint();
  }
  function calTx(e) { return e ? String(e.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function calOgTitle() {
    var og = document.querySelector('meta[property="og:title"]');
    return String((og && og.getAttribute("content")) || document.title || "").replace(/\s+/g, " ").trim();
  }
  function srRecIdx() { return (__jkLoc.search.match(/[?&]rec_idx=(\d+)/) || [])[1] || ""; }
  function calCleanTitle(s) {
    s = String(s || "").replace(/\s+/g, " ").trim().replace(/\s*[|｜\-–—]\s*(잡코리아|사람인)\s*$/, "");
    for (var i = 0; i < 3; i++) s = s.replace(/\s*\(\s*(D-\s*\d+|상시\s*채용|채용\s*시\s*마감|오늘\s*마감|내일\s*마감)\s*\)\s*$/, "");
    return s.trim();
  }
  function calTitleNow() {
    var tb = document.getElementById("jkTitleCopyBtn"), t = tb && tb.getAttribute("data-jk-title");
    if (t) return calCleanTitle(t);
    var og = calCleanTitle(calOgTitle()), m;
    if (isSR) { m = og.match(/^\[[^\]]{1,40}\]\s*(.+)$/); return m ? m[1].trim() : og; }
    m = og.match(/\s채용\s*-\s*(.+)$/);
    return m ? m[1].trim() : og;
  }
  function calCompanyNow() {
    if (CAL_POST.company) return CAL_POST.company;
    var og = calOgTitle(), m;
    if (isSR) { m = og.match(/^\s*\[([^\]]{1,40})\]/); return m ? m[1].trim() : ""; }
    m = og.match(/^(.{1,40}?)\s채용\s*-/);
    return m ? m[1].trim() : "";
  }
  function calPostLink() {
    if (isSR) { var r = srRecIdx(); return r ? "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=" + r : __jkLoc.href.split("#")[0]; }
    var g = (__jkLoc.pathname.match(/\/recruit\/gi_read\/(\d+)/i) || [])[1];
    return g ? "https://www.jobkorea.co.kr/Recruit/GI_Read/" + g : __jkLoc.href.split("#")[0];
  }
  function calDeadlineRaw() {
    var i, k;
    if (isSR) {
      var rec = srRecIdx(), hs = document.querySelectorAll(".jv_howto");
      for (i = 0; i < hs.length; i++) {
        if (rec && hs.length > 1 && String(hs[i].innerHTML || "").indexOf(rec) < 0) continue;
        var cp = hs[i].querySelector("p.copy");
        if (cp && /상시|채용\s*시/.test(calTx(cp))) return { v: "상시", from: "page" };
        var dts = hs[i].querySelectorAll("dl.info_period dt");
        for (k = 0; k < dts.length; k++) {
          if (/마감/.test(calTx(dts[k])) && calTx(dts[k].nextElementSibling)) return { v: calTx(dts[k].nextElementSibling), from: "page" };
        }
      }
      var og = calOgTitle();
      if (/\(\s*(상시\s*채용|채용\s*시\s*마감)\s*\)/.test(og)) return { v: "상시", from: "og" };
      var dm = og.match(/\(\s*D-\s*(\d{1,3})\s*\)/);
      return dm ? { v: "D-" + dm[1], from: "og" } : { v: "", from: "" };
    }
    var ls = document.querySelectorAll("span, dt, th, td, div, p, strong");
    for (i = 0; i < ls.length; i++) {
      var e = ls[i];
      if (e.childElementCount || calTx(e) !== "마감일" || (e.closest && e.closest("#jkJpSide"))) continue;
      var cell = (e.parentElement && e.parentElement.nextElementSibling) || e.nextElementSibling, v = calTx(cell);
      if (/상시|채용\s*시/.test(v)) return { v: "상시", from: "page" };
      if (/20\d{2}\s*[.\-\/]\s*\d{1,2}\s*[.\-\/]\s*\d{1,2}/.test(v)) return { v: v, from: "page" };
    }
    var ss = document.querySelectorAll('script[type="application/ld+json"]');
    for (i = 0; i < ss.length; i++) {
      try {
        var j = JSON.parse(ss[i].textContent || "null"), arr = Object.prototype.toString.call(j) === "[object Array]" ? j : [j];
        for (k = 0; k < arr.length; k++) {
          if (arr[k] && arr[k]["@type"] === "JobPosting" && arr[k].validThrough) return { v: String(arr[k].validThrough), from: "jsonld" };
        }
      } catch (e2) { }
    }
    return { v: "", from: "" };
  }
  function calInfoNow() {
    var d = calDeadlineRaw();
    return { company: calCompanyNow(), title: calTitleNow(), deadline: d.v, dlFrom: d.from, addr: CAL_POST.addr,
             commute: CAL_POST.commute, rating: CAL_POST.rating, site: isSR ? "사람인" : "잡코리아", link: calPostLink() };
  }
  function calPaint() {
    var b = document.getElementById(CAL_BTN_ID);
    if (!b) return;
    try { b.setAttribute("data-jk-cal", JSON.stringify(calInfoNow())); } catch (e) { }
  }
  function calOpenCard() {
    bridgeFetch(null, 6000, "calCard", { cal: calInfoNow() }).then(function (r) {
      if (r && r.ok) return;
      if (r && r.err === "extension reloaded") return;
      toast("담기 카드를 열지 못했어요 — 이 탭을 새로고침(F5)한 뒤 다시 눌러 주세요", 3600);
    });
  }
  function calQuick() {
    calDone("담는 중…", false);
    bridgeFetch(null, 20000, "calQuick", { cal: calInfoNow() }).then(function (r) {
      if (r && r.ok) {
        calDone(r.mode === "gcal"
          ? (r.op === "update" ? "📌 스크랩 공고 일정을 고쳤어요 ✓" : "📌 구글 캘린더 «스크랩 공고» 에 담았어요 ✓")
          : (r.op === "update" ? "📌 이미 담은 공고라 내용을 고쳤어요 ✓" : "📌 담았어요 ✓ — 사이드바 📅 달력에서 보여요"), true,
          r.mode === "gcal" ? "" : "구글 캘린더(폰)에도 넣으려면 설정(⚙)에서 «구글 계정 연결»");
        return;
      }
      if (r && r.err === "extension reloaded") { calDone("", false); return; }
      calDone(r && r.err === "too fast" ? "방금 담았어요 — 잠시 뒤 다시 눌러 주세요"
        : !r ? "확장과 연결하지 못했어요 — 이 탭을 새로고침(F5)한 뒤 다시 눌러 주세요"
        : "못 담았어요 — " + (r.err || "이유를 모르겠어요"), false, "", !!(r && r.fallback));
    });
  }
  function calDone(text, ok, tip, canEdit) {
    var old = document.getElementById("jkCalDone");
    if (old) old.remove();
    if (!text) return;
    var box = el("div", "position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:2147483600;display:flex;align-items:center;gap:8px;" +
      "background:#1f2937;color:#fff;padding:10px 10px 10px 18px;border-radius:10px;font:600 14.5px/1.45 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:86vw");
    box.id = "jkCalDone";
    var msg = el("span", "", text);
    if (tip) msg.title = tip;
    box.appendChild(msg);
    function btn(label, id, fn) {
      var b = el("button", "border:none;border-radius:8px;background:none;color:#93c5fd;font:800 14px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;" +
        "cursor:pointer;padding:5px 8px;white-space:nowrap", label);
      if (id) b.id = id;
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); fn(b); });
      box.appendChild(b);
      return b;
    }
    if (ok || canEdit) btn("고치기", "jkCalDoneEdit", function () { box.remove(); calOpenCard(); }).title = "회사·제목·마감일·근무지를 고칠 수 있는 담기 카드를 열어요";
    if (ok) btn("되돌리기", "jkCalDoneUndo", function (b) {
      b.disabled = true; b.textContent = "되돌리는 중…";
      bridgeFetch(null, 20000, "calQuickUndo").then(function (r) {
        calDone(r && r.ok ? "되돌렸어요 ✓" : "되돌리지 못했어요 — " + ((r && r.err) || "응답이 없어요"), false);
      });
    });
    if (text !== "담는 중…") btn("✕", "", function () { box.remove(); }).title = "닫기";
    document.body.appendChild(box);
    setTimeout(function () { if (box.isConnected) box.remove(); }, ok ? 9000 : 5000);
  }
  function calWatchScrap() {
    var rec = isSR ? srRecIdx() : "";
    if (isSR && !rec) return;
    function own(t) {
      if (!t || !t.closest) return null;
      if (!isSR) return t.closest('button[data-sentry-component="ScrapButton"]');
      var b = t.closest(".btn_scrap");
      return b && (b.getAttribute("rec_idx") === rec || (" " + b.className + " ").indexOf(" scrap-" + rec + " ") >= 0) ? b : null;
    }
    function isOn() {
      if (!isSR) return !!document.querySelector('button[data-sentry-component="ScrapButton"] [class*="system_scrap_on"]');
      var bs = document.querySelectorAll(".btn_scrap.scrap-" + rec + ', .btn_scrap[rec_idx="' + rec + '"]');
      for (var i = 0; i < bs.length; i++) {
        if (bs[i].getAttribute("scraped") === "y" || bs[i].getAttribute("aria-pressed") === "true" || /(^|\s)on(\s|$)/.test(bs[i].className)) return true;
      }
      return false;
    }
    document.addEventListener("click", function (e) {
      if (!own(e.target) || isOn()) return;
      var t0 = Date.now();
      (function poll() {
        if (isOn()) { calScrapPrompt(); return; }
        if (Date.now() - t0 < 8000) setTimeout(poll, 250);
      })();
    }, true);
  }
  function calScrapPrompt() {
    var old = document.getElementById("jkCalAsk");
    if (old) old.remove();
    var box = el("div", "position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:2147483600;display:flex;align-items:center;gap:12px;" +
      "background:#1f2937;color:#fff;padding:10px 10px 10px 18px;border-radius:10px;font:600 14.5px/1.45 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:86vw");
    box.id = "jkCalAsk";
    box.appendChild(el("span", "", "스크랩했어요 — 📅 캘린더에도 담을까요?"));
    var go = el("button", "border:none;border-radius:8px;background:#2563eb;color:#fff;font:800 14px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;" +
      "cursor:pointer;padding:6px 14px;white-space:nowrap", "담기");
    go.id = "jkCalAskGo";
    var no = el("button", "border:none;background:none;color:#cbd5e1;font:700 15px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;cursor:pointer;padding:4px 6px", "✕");
    no.title = "닫기";
    go.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); box.remove(); calQuick(); });
    no.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); box.remove(); });
    box.appendChild(go); box.appendChild(no);
    document.body.appendChild(box);
    setTimeout(function () { if (box.isConnected) box.remove(); }, 9000);
  }
  function initCalAdd() {
    if (!isTop || window.__jkCalAdd) return;
    window.__jkCalAdd = true;
    try { document.addEventListener("jkCalRefresh", calPaint); } catch (e) { }
    try { calWatchScrap(); } catch (e) { console.warn("[CAL]", e); }
    function mount() {
      if (document.getElementById(CAL_BTN_ID)) return true;
      var anchor = document.getElementById("jkTitleCopyBtn");
      if (!anchor || !anchor.parentNode) return false;
      var b = el("button",
        "margin-left:6px;vertical-align:middle;padding:3px 9px;border:1px solid #2563eb;border-radius:7px;background:#fff;color:#2563eb;" +
        "cursor:pointer;white-space:nowrap;display:inline-block;font:700 12px/1.4 'Malgun Gothic','Apple SD Gothic Neo',sans-serif;", CAL_LABEL);
      b.id = CAL_BTN_ID;
      b.title = "누르면 바로 담겨요(새 창 없음) — 고칠 게 있으면 담은 뒤 [고치기] 또는 📅 달력에서 그 일정 오른쪽 클릭\n" +
        "설정에서 «구글 계정 연결» 을 했으면 구글 캘린더(📌 스크랩 공고)에 · 아니면 이 브라우저(📅 달력 · 스크랩 모음)에";
      b.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); calQuick(); });
      anchor.parentNode.insertBefore(b, anchor.nextSibling);
      calPaint();
      return true;
    }
    var tries = 0;
    (function schedule() {
      if (mount()) return;
      if (++tries > 60) return;
      setTimeout(schedule, 500);
    })();
    try {
      var moT = 0;
      new MutationObserver(function () {
        if (document.getElementById(CAL_BTN_ID)) return;
        clearTimeout(moT);
        moT = setTimeout(mount, 350);
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { }
  }
  function jssPostId() {
    var m = __jkLoc.search.match(/[?&]ec=(\d+)/);
    if (m) return m[1];
    m = __jkLoc.pathname.match(/^\/recruit\/(\d+)/);
    return m ? m[1] : "";
  }
  function jssCoLink(root) {
    var ls = root.querySelectorAll('a[href^="/companies/"]');
    for (var i = 0; i < ls.length; i++) {
      if (!/^\/companies\/\d+\/?(\?|$)/.test(ls[i].getAttribute("href") || "")) continue;
      var h = ls[i].querySelector("h2,h3,h4") || ls[i];
      var t = (h.textContent || "").replace(/\s+/g, " ").trim();
      if (t && t.length <= 40) return { a: ls[i], name: t };
    }
    return null;
  }
  function jssPosting() {
    var hs = document.querySelectorAll("h1"), vw = window.innerWidth, best = null, bestDist = 1e9, i, k;
    function postOf(h1) {
      var title = (h1.textContent || "").replace(/\s+/g, " ").trim();
      if (!title) return null;
      var n = h1.parentElement, co = null;
      for (k = 0; n && n !== document.body && k < 6; k++, n = n.parentElement) { co = jssCoLink(n); if (co) break; }
      return co ? { company: co.name, title: title, h1: h1 } : null;
    }
    for (i = 0; i < hs.length; i++) {
      var h1 = hs[i];
      if (h1.closest && h1.closest("#jkJpSide")) continue;
      var r = h1.getBoundingClientRect();
      if (!(r.width > 0 && r.right > 0 && r.left < vw)) continue;
      var dist = Math.abs((r.left + r.right) / 2 - vw / 2);
      if (dist >= bestDist) continue;
      var p = postOf(h1);
      if (p) { best = p; bestDist = dist; }
    }
    if (!best && hs.length === 1 && !(hs[0].closest && hs[0].closest("#jkJpSide"))) best = postOf(hs[0]);
    return best;
  }
  function jssArrowDodge() {
    var s = document.getElementById("jkJpSide"), sr = s ? s.getBoundingClientRect() : null;
    var open = !!(sr && sr.width > 0 && sr.left < window.innerWidth - 4);
    var ims = document.querySelectorAll('img[alt="right icon"]');
    for (var i = 0; i < ims.length; i++) {
      var box = ims[i].closest ? (ims[i].closest(".fixed") || ims[i].parentElement) : ims[i].parentElement;
      if (!box) continue;
      if (box.__jkDodge) { box.style.translate = box.__jkDodge.t; box.__jkDodge = null; }
      if (!open) continue;
      var br = box.getBoundingClientRect();
      if (br.width <= 0 || br.right <= sr.left - 8) continue;
      box.__jkDodge = { t: box.style.translate || "" };
      box.style.translate = (-Math.ceil(br.right - sr.left + 16)) + "px 0px";
    }
  }
  function jssNear(a, b) {
    for (var d = 0, n = a; n; d++, n = n.parentElement) if (n.contains(b)) return d;
    return 999;
  }
  function jssAddr(scan) {
    var post = jssPosting(); if (!post) return null;
    var i, best = null, bestD = 999;
    var ecs = document.querySelectorAll('[data-sentry-component="EmploymentContent"]');
    for (i = 0; i < ecs.length; i++) {
      var sr = ecs[i].shadowRoot, box = sr && (sr.querySelector(".content") || sr.querySelector(".html-container"));
      var tx = box ? (box.innerText || "") : "";
      if (!tx.trim()) continue;
      var a = scan(tx), dd = jssNear(ecs[i], post.h1);
      if (a && dd < bestD) { best = a; bestD = dd; }
    }
    if (best) return { addr: best, hq: false };
    var ds = document.querySelectorAll("div");
    for (i = 0; i < ds.length; i++) {
      var lab = ds[i];
      if (lab.childElementCount || (lab.textContent || "").trim() !== "주소지") continue;
      var sib = lab.nextElementSibling; if (!sib) continue;
      var v = sib.querySelector(".ellipsis") || sib.firstElementChild || sib;
      var t = (v.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length < 6) continue;
      var d2 = jssNear(lab, post.h1);
      if (d2 < bestD) { best = t; bestD = d2; }
    }
    return best ? { addr: best, hq: true } : null;
  }
  function initJss() {
    var cur = "", pend = "", pendT = null, missSince = 0, tickT = null;
    function keyNow() {
      var id = jssPostId(); if (!id) return { id: "", k: "" };
      var p = jssPosting();
      return { id: id, k: p ? id + "|" + p.company : "" };
    }
    function kill() { if (sbKill) { try { sbKill(); } catch (e) {} sbKill = null; } cur = ""; }
    function tick() {
      tickT = null;
      try { jssArrowDodge(); } catch (e) {}
      var s = keyNow();
      if (!s.id) { pend = ""; missSince = 0; if (cur) kill(); return; }
      if (!s.k) {
        if (!missSince) missSince = Date.now();
        else if (cur && Date.now() - missSince > 4000) { missSince = 0; kill(); }
        return;
      }
      missSince = 0;
      if (s.k === cur) { pend = ""; return; }
      if (s.k === pend) return;
      pend = s.k;
      if (pendT) clearTimeout(pendT);
      pendT = setTimeout(function () {
        pendT = null;
        var s2 = keyNow();
        if (!s2.k || s2.k !== pend) return;
        cur = pend; pend = "";
        try { initSidebar(); } catch (e) { console.warn("[JSS]", e); }
        try { jssArrowDodge(); } catch (e) {}
        try { console.log("%c[자소설] 사이드바 → " + cur, "background:#00a68f;color:#fff;padding:2px 7px;border-radius:5px;font-weight:800"); } catch (e) {}
      }, 700);
    }
    function soon() { if (!tickT) tickT = setTimeout(tick, 150); }
    try { new MutationObserver(soon).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    window.addEventListener("popstate", soon);
    setInterval(tick, 1000);
    tick();
  }
  function initSidebar() {
    if (sbKill) { try { sbKill(); } catch (e) {} sbKill = null; }
    function rawCompany() {
      if (isJS) { var jp = jssPosting(); return jp ? jp.company : ""; }
      if (isSR) {
        var sa = document.querySelectorAll('a[href*="/company-info/view"]');
        for (var k = 0; k < sa.length; k++) { var st = (sa[k].textContent || "").replace(/\s+/g, " ").trim(); if (st && st.length < 30) return st; }
        var sog = document.querySelector('meta[property="og:title"]');
        var stt = (sog && sog.getAttribute("content")) || document.title || "";
        var sm = stt.match(/^\s*\[([^\]]{2,30})\]/);
        return sm ? sm[1].trim() : "";
      }
      var ls = document.querySelectorAll('a[href*="/Co_Read/"]');
      for (var i = 0; i < ls.length; i++) { var h = ls[i].getAttribute("href") || ""; if (/Oem/i.test(h)) continue; var t = (ls[i].textContent || "").trim(); if (t && t.length < 30) return t; }
      var ti = document.title || ""; var og = document.querySelector('meta[property="og:title"]'); if (og) ti = og.getAttribute("content") || ti;
      return (ti.split("채용")[0] || "").trim();
    }
    var company = rawCompany(); if (!company) return;
    calSet("company", company);
    var q = clean(company) || company;
    var DEFW = 420, MINW = 300;
    function maxW() { return Math.max(MINW + 60, Math.floor(window.innerWidth * 0.85)); }
    var W = DEFW;
    try { W = parseInt(localStorage.getItem("jkJpW"), 10) || DEFW; } catch (e) {}
    W = Math.max(MINW, Math.min(W, maxW()));
    var jpUrl = "https://www.jobplanet.co.kr/search?query=" + encodeURIComponent(q);
    function openBg(url) {
      bridgeFetch(url, 3000, "openTab").then(function (res) {
        if (!res || !res.ok) { try { window.open(url, "_blank", "noopener"); } catch (e) {} }
      });
    }
    var col0 = false; try { col0 = localStorage.getItem("jkJpCollapsed") === "1"; } catch (e) {}
    var side = el("div", "position:fixed;top:0;right:0;height:100vh;width:" + W + "px;z-index:2147483000;background:#f1f5f9;" +
      "box-shadow:-6px 0 24px rgba(0,0,0,.18);font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;display:flex;flex-direction:column;overflow:hidden;" +
      "transform:" + (col0 ? "translateX(calc(100% + 30px))" : "translateX(0)"));
    side.id = "jkJpSide";
    function sbGone() { return !side.isConnected && side.__jkBuilt === true; }
    var head = el("div", "flex:0 0 auto;background:#00c3aa;color:#fff;padding:13px 14px;display:flex;align-items:center;gap:8px");
    var htit = el("div", "flex:1;font-weight:700;font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;" +
      "text-decoration:underline;text-decoration-color:rgba(255,255,255,.5);text-underline-offset:3px", "🪐 " + company);
    htit.title = "클릭 → 잡플래닛을 백그라운드 탭으로 열기";
    htit.onclick = function () { openBg(jpUrl); toast("잡플래닛을 백그라운드 탭으로 열었어요 🪐", 1500); };
    var colBtn = el("button", "background:rgba(255,255,255,.25);border:none;color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:14.5px", "접기 ▸");
    var FS_KEY = "jkJpFontScale", FS_MIN = 0.8, FS_MAX = 1.8, FS_STEP = 0.1;
    var fscale = 1; try { fscale = parseFloat(localStorage.getItem(FS_KEY)) || 1; } catch (e) {}
    fscale = Math.max(FS_MIN, Math.min(fscale, FS_MAX));
    function fsBtn(tx) { return el("button", "background:rgba(255,255,255,.25);border:none;color:#fff;border-radius:8px;padding:5px 8px;cursor:pointer;font-size:14.5px;font-weight:800;line-height:1", tx); }
    var fsDown = fsBtn("가－"), fsUp = fsBtn("가＋");
    function applyFontScale() {
      side.style.zoom = fscale;
      side.style.height = (100 / fscale) + "vh";
      try { localStorage.setItem(FS_KEY, String(fscale)); } catch (e) {}
      var pct = Math.round(fscale * 100) + "%";
      fsDown.title = "글씨 작게 (현재 " + pct + ")"; fsUp.title = "글씨 크게 (현재 " + pct + ")";
      fsDown.style.opacity = fscale <= FS_MIN + 0.001 ? ".4" : "1";
      fsUp.style.opacity = fscale >= FS_MAX - 0.001 ? ".4" : "1";
    }
    function stepFont(d) { fscale = Math.max(FS_MIN, Math.min(FS_MAX, Math.round((fscale + d) * 100) / 100)); applyFontScale(); }
    fsDown.onclick = function (e) { e.stopPropagation(); stepFont(-FS_STEP); };
    fsUp.onclick = function (e) { e.stopPropagation(); stepFont(FS_STEP); };
    var calVBtn = null;
    if (!isJS) {
      calVBtn = el("button", "background:rgba(255,255,255,.25);border:none;color:#fff;border-radius:8px;padding:5px 8px;cursor:pointer;font-size:14.5px;line-height:1", "📅");
      calVBtn.id = "jkCalViewBtn";
      calVBtn.title = "달력 — 스크랩 공고 · 취업캘린더 일정 보기 (다시 누르면 닫기)";
      calVBtn.onclick = function (e) {
        e.stopPropagation();
        bridgeFetch(null, 6000, "calView", {}).then(function (r) {
          if (r && r.ok) return;
          if (r && r.err === "extension reloaded") return;
          toast("달력을 열지 못했어요 — 이 탭을 새로고침(F5)한 뒤 다시 눌러 주세요", 3600);
        });
      };
    }
    head.appendChild(htit); if (calVBtn) head.appendChild(calVBtn); head.appendChild(fsDown); head.appendChild(fsUp); head.appendChild(colBtn);
    applyFontScale();
    var scroll = el("div", "flex:1 1 auto;overflow-y:auto;padding:12px");
    var card = el("div", "background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.09)");
    card.innerHTML = '<div style="color:#64748b;font-size:15px">잡플래닛 불러오는 중… ⏳</div>';
    var mWrap = el("div", "");
    var rvWrap = el("div", "");
    var paneA = el("div", "");
    paneA.appendChild(card); paneA.appendChild(mWrap);
    var cmCard = el("div", "background:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 2px 12px rgba(0,0,0,.09);margin-bottom:12px");
    cmCard.innerHTML = '<div style="color:#64748b;font-size:16px">🚇 통근 계산 중…</div>';
    scroll.appendChild(cmCard); scroll.appendChild(paneA); scroll.appendChild(rvWrap);
    var tabBar = el("div", "flex:0 0 auto;display:flex;gap:6px;background:#00c3aa;padding:8px 10px 0");
    var TAB_ON = "flex:1;border:none;border-radius:10px 10px 0 0;padding:9px 4px;cursor:pointer;font-size:14.5px;font-weight:800;background:#f1f5f9;color:#0f172a";
    var TAB_OFF = "flex:1;border:none;border-radius:10px 10px 0 0;padding:9px 4px;cursor:pointer;font-size:14.5px;font-weight:700;background:rgba(255,255,255,.22);color:#fff";
    var tabA = el("button", TAB_ON, "📊 평점");
    var tabB = el("button", TAB_OFF, "📖 리뷰");
    tabBar.appendChild(tabA); tabBar.appendChild(tabB);
    var TABKEY = "jkJpTab";
    function setTab(rv) {
      paneA.style.display = rv ? "none" : "";
      rvWrap.style.display = rv ? "" : "none";
      tabA.style.cssText = rv ? TAB_OFF : TAB_ON;
      tabB.style.cssText = rv ? TAB_ON : TAB_OFF;
      scroll.scrollTop = 0;
      try { localStorage.setItem(TABKEY, rv ? "rv" : "main"); } catch (e) {}
    }
    tabA.onclick = function () { setTab(false); };
    tabB.onclick = function () { setTab(true); };
    side.appendChild(head); side.appendChild(tabBar); side.appendChild(scroll); document.body.appendChild(side);
    side.__jkBuilt = true;
    var initRv = false; try { initRv = localStorage.getItem(TABKEY) === "rv"; } catch (e) {}
    setTab(initRv);
    var jsHq = false;
    var srAjaxAddr = null, srAjaxTried = false;
    function jkExtractAddr() {
      function scan(txt) {
        if (!txt) return null;
        var LABELS = ["근무지주소", "근무예정지역", "근무예정지", "사업장소재지", "사업장 소재지", "근무지역", "근무지", "주소"];
        var lines = txt.split("\n").map(function (s) { return s.trim(); });
        for (var i = 0; i < lines.length; i++) {
          for (var L = 0; L < LABELS.length; L++) {
            if (lines[i] === LABELS[L] && i + 1 < lines.length) { var nx = lines[i + 1].trim(); if (nx.length > 5 && LABELS.indexOf(nx) < 0) return nx; }
            if (lines[i].indexOf(LABELS[L]) === 0 && lines[i].length > LABELS[L].length + 5) { var v = lines[i].slice(LABELS[L].length).replace(/^[:\s]+/, "").trim(); if (v.length > 5) return v; }
          }
        }
        var m = txt.match(/(서울특별시|서울|경기도?|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)[^\n]{2,45}?(로|길)\s?\d[\d\-]*/);
        return m ? m[0].trim() : null;
      }
      if (isJS) {
        var ja = jssAddr(scan);
        jsHq = !!(ja && ja.hq);
        return ja ? ja.addr : null;
      }
      if (isSR) {
        if (srAjaxAddr) return srAjaxAddr;
        var want = normCo(rawCompany() || ""), locs = document.querySelectorAll(".jv_location[data-address]");
        for (var q = 0; q < locs.length; q++) {
          var cn = normCo(locs[q].getAttribute("data-company-name") || "");
          if (want && cn && cn !== want) continue;
          var la = srCleanAddr(locs[q].getAttribute("data-address"));
          if (la.length > 4) return la;
        }
        var myRec = (__jkLoc.search.match(/[?&]rec_idx=(\d+)/) || [])[1];
        var sifr = document.querySelectorAll("iframe");
        for (var w = 0; w < sifr.length; w++) {
          var ssrc = sifr[w].getAttribute("src") || "";
          if (!myRec || ssrc.indexOf("view-detail") < 0 || !new RegExp("[?&]rec_idx=" + myRec + "(\\D|$)").test(ssrc)) continue;
          try { var sd = sifr[w].contentDocument; if (sd && sd.body) { var sr2 = scan(sd.body.innerText); if (sr2) return sr2; } } catch (e) {}
        }
        return null;
      }
      var a = scan(pageTextNoFooter());
      if (a) return a;
      var ifr = document.querySelectorAll("iframe");
      for (var i = 0; i < ifr.length; i++) { try { var doc = ifr[i].contentDocument; if (doc && doc.body) { var r = scan(doc.body.innerText); if (r) return r; } } catch (e) {} }
      return null;
    }
    var SIDO = { 서울: "서울", 서울특별시: "서울", 경기: "경기", 경기도: "경기", 인천: "인천", 인천광역시: "인천",
      부산: "부산", 부산광역시: "부산", 대구: "대구", 대구광역시: "대구", 대전: "대전", 대전광역시: "대전",
      광주: "광주", 광주광역시: "광주", 울산: "울산", 울산광역시: "울산", 세종: "세종", 세종특별자치시: "세종",
      강원: "강원", 강원도: "강원", 강원특별자치도: "강원", 충북: "충북", 충청북도: "충북", 충남: "충남", 충청남도: "충남",
      전북: "전북", 전라북도: "전북", 전북특별자치도: "전북", 전남: "전남", 전라남도: "전남",
      경북: "경북", 경상북도: "경북", 경남: "경남", 경상남도: "경남", 제주: "제주", 제주도: "제주", 제주특별자치도: "제주" };
    function jkRegionOf(addr) {
      var head = ((addr || "").trim().split(/\s+/)[0] || "");
      if (SIDO[head]) return SIDO[head];
      var keys = Object.keys(SIDO).sort(function (a, b) { return b.length - a.length; });
      for (var i = 0; i < keys.length; i++) if (head.indexOf(keys[i]) === 0) return SIDO[keys[i]];
      return "";
    }
    var jkRegion = "";
    var jkRegionHq = false;
    function sendRegionToScraper() {
      if (!jkRegion) return;
      try { if (scr && scr.contentWindow) scr.contentWindow.postMessage({ __jkRegion: jkRegion, __jkHq: jkRegionHq }, "https://www.jobplanet.co.kr"); } catch (e) {}
    }
    function cmFail(why, hint, routeAddr) {
      cmCard.style.display = "";
      cmCard.style.borderLeft = "5px solid #94a3b8";
      cmCard.innerHTML =
        '<div style="font-weight:800;font-size:18px;color:#475569">🚇 통근 미확인</div>' +
        '<div style="margin-top:6px;color:#64748b;font-size:15px;line-height:1.55">' + esc(why) + '</div>' +
        (hint ? '<div style="margin-top:5px;color:#94a3b8;font-size:12.5px">' + esc(hint) + '</div>' : '');
      cmAddPicker();
      if (routeAddr) cmAddRoute(routeAddr);
    }
    function cmAddRoute(addr) {
      if (sbGone() || !addr || cmCard.querySelector(".jkRouteLink")) return;
      var a = el("span", "display:inline-block;margin-top:7px;cursor:pointer;color:#0a8f5b;text-decoration:underline;font:700 13px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif",
                 "🗺 네이버 지도에서 경로 보기");
      a.className = "jkRouteLink";
      a.title = "출발 위치 → 이 공고 근무지 대중교통 경로를 네이버 지도 새 탭으로 열어요";
      a.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        bridgeFetch(null, 8000, "openRoute", { addr: addr }).then(function (r) { if (!r || !r.ok) toast("지도를 열지 못했어요 — 잠시 뒤 다시 눌러 주세요", 2200); });
      });
      cmCard.appendChild(a);
    }
    function jkFillCommute(tries) {
      tries = tries || 0;
      if (sbGone()) return;
      var addr = jkExtractAddr();
      if (!addr) {
        if (tries < 6) { setTimeout(function () { jkFillCommute(tries + 1); }, 700); return; }
        if (isSR && !srAjaxTried) {
          srAjaxTried = true;
          srFetchAddr((__jkLoc.search.match(/[?&]rec_idx=(\d+)/) || [])[1]).then(function (a2) {
            if (sbGone()) return;
            srAjaxAddr = a2 || null;
            jkFillCommute(6);
          });
          return;
        }
        if (isJS) cmFail("이 공고에서 근무지도 기업 주소지도 못 찾았어요.",
                         "상세 요강이 그림이라 글자를 못 읽고, 자소설 「기업 정보」에도 주소지가 비어 있는 경우예요.");
        else cmFail("이 공고에서 근무지주소를 못 찾았어요.",
               "공고에 주소 표기가 없거나, 새 형식(React) 공고라 주소를 나중에 그리는 경우예요.");
        return;
      }
      calSet("addr", addr); calSet("commute", "");
      var rg = jkRegionOf(addr);
      var rgHq = !!(isJS && jsHq);
      if (rg && (rg !== jkRegion || rgHq !== jkRegionHq)) { jkRegion = rg; jkRegionHq = rgHq; sendRegionToScraper(); }
      bridgeFetch("https://jk.local/api/commute-addr?addr=" + encodeURIComponent(addr), 9000, "commuteMap").then(function (res) {
        if (sbGone()) return;
        if (!res || !res.ok) {
          if (res && res.err) cmFail("통근 계산에 실패했어요.", "오류: " + res.err, addr);
          else cmFail("통근 계산 응답이 없어요.", "잠시 뒤 공고를 새로고침해 보세요.", addr);
          return;
        }
        if (res.min == null) {
          if (res.no_origin || /출발 위치/.test(res.reason || "")) {
            cmFail("출발 위치가 아직 없어요.", res.reason, addr);
          } else if (res.busy) {
            cmFail("대중교통 조회가 잠시 막혔어요.", (res.reason || "") + " · 이미 계산해 둔 회사는 그대로 보여요.", addr);
          } else if (res.quota_exceeded) {
            cmFail("오늘치 대중교통 조회 횟수를 다 썼어요.",
                   (res.reason || "오늘 길찾기를 많이 불렀어요 — 날이 바뀌면 다시 됩니다") + " · 이미 계산해 둔 회사는 그대로 보여요.", addr);
          } else {
            cmFail("주소는 찾았는데(" + addr + ") 대중교통 경로를 못 구했어요.",
                   res.reason ? ("사유: " + res.reason) : "주소가 너무 짧거나 대중교통 경로가 없는 위치일 수 있어요.", addr);
          }
          return;
        }
        var m = res.min, n = parseInt(m, 10);
        var color = isNaN(n) ? "#64748b" : (n <= 30 ? "#0a8f5b" : (n <= 60 ? "#b8860b" : "#dc2626"));
        var origin = res.origin || "집";
        calSet("commute", m + "분 (" + origin + " 기준)");
        cmCard.style.borderLeft = "5px solid " + color;
        var qt = res.quota, qline = "";
        if (qt && typeof qt.left === "number") {
          var qc = qt.left <= 5 ? "#dc2626" : (qt.left <= 12 ? "#b8860b" : "#94a3b8");
          qline = ' · 오늘 남은 조회 <b style="color:' + qc + '">' + qt.left + '/' + qt.limit + '</b>';
        }
        cmCard.innerHTML =
          '<div style="font-weight:800;font-size:18px;color:#0f172a">🚇 출근 <span style="color:' + color + '">' + m + '분</span></div>' +
          '<div style="margin-top:6px;color:#334155;font-size:15px;line-height:1.55">' + esc(origin) + ' <b style="color:#0f172a">→</b> ' + esc(addr) + '</div>' +
          '<div style="margin-top:5px;color:#94a3b8;font-size:12.5px">출처: 네이버 지도 대중교통(평일 오전 8시 출발)' +
            ' · <b>' + esc(origin) + '→회사(출근)</b> 기준' + (res.walk ? " · 걸어서 갈 거리라 도보 추정" : "") + qline + '</div>' +
          (isJS && jsHq ? '<div style="margin-top:5px;color:#b8860b;font-size:12.5px;font-weight:700">⚠ 자소설 「기업 정보」의 주소지(본사) 기준 — 실제 근무지와 다를 수 있어요</div>' : '');
        cmAddPicker();
        cmAddRoute(addr);
      });
    }
    function cmAddPicker() {
      if (sbGone() || cmCard.querySelector(".jkOriginPick")) return;
      var p = originPicker(function () { cmCard.innerHTML = '<div style="color:#64748b">🚇 다시 계산 중…</div>'; jkFillCommute(); });
      p.style.cssText += ";float:right;margin:-2px 0 0 8px";
      cmCard.insertBefore(p, cmCard.firstChild);
    }
    jkFillCommute();
    var handle = el("div", "position:absolute;left:0;top:0;width:8px;height:100%;cursor:ew-resize;z-index:9;background:transparent");
    handle.id = "jkJpHandle"; handle.title = "◀▶ 드래그해서 폭 조절";
    handle.onmouseenter = function () { handle.style.background = "rgba(0,195,170,.5)"; };
    handle.onmouseleave = function () { handle.style.background = "transparent"; };
    handle.addEventListener("mousedown", function (e) {
      e.preventDefault();
      var startX = e.clientX, startW = side.getBoundingClientRect().width;
      var ov = el("div", "position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483300;cursor:ew-resize");
      document.body.appendChild(ov);
      side.style.transition = "none";
      function mv(ev) { W = Math.max(MINW, Math.min((startW + (startX - ev.clientX)) / fscale, maxW())); side.style.width = W + "px"; }
      function up() {
        document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up);
        ov.remove(); side.style.transition = "transform .22s ease";
        try { localStorage.setItem("jkJpW", String(Math.round(W))); } catch (e2) {}
      }
      document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
    });
    side.appendChild(handle);
    var scr = el("iframe", "position:fixed;left:-10000px;top:0;width:400px;height:900px;border:0");
    scr.src = "https://www.jobplanet.co.kr/search/companies?query=" + encodeURIComponent(stripEntityMark(q)) + "&jk_embed=1" +
      (jkRegion ? "&jk_region=" + encodeURIComponent(jkRegion) + (jkRegionHq ? "&jk_hq=1" : "") : "");
    document.body.appendChild(scr);
    scr.addEventListener("load", sendRegionToScraper);
    function startReviewsEarly(cid) {
      if (!cid || sbGone()) return;
      cid = String(cid);
      if (autoTried) {
        if (rvCid && rvCid !== cid) { autoTried = false; rvWrap.innerHTML = ""; }
        else return;
      }
      autoLoadReviews("https://www.jobplanet.co.kr/companies/" + encodeURIComponent(cid) + "/reviews");
    }
    cidLoad(q, function (cid) { startReviewsEarly(cid); });
    var tab = el("button", "position:fixed;top:120px;right:0;z-index:2147483000;background:#00c3aa;color:#fff;border:none;" +
      "padding:12px 8px;border-radius:12px 0 0 12px;cursor:pointer;font-size:18px;box-shadow:-4px 0 14px rgba(0,0,0,.2);display:none", "🪐");
    tab.title = "잡플래닛 사이드바 열기"; document.body.appendChild(tab);
    var COL = "jkJpCollapsed";
    function setCol(c) { side.style.transform = c ? "translateX(calc(100% + 30px))" : "translateX(0)"; tab.style.display = c ? "block" : "none"; localStorage.setItem(COL, c ? "1" : "0"); }
    colBtn.onclick = function () { setCol(true); }; tab.onclick = function () { setCol(false); };
    setCol(col0);
    requestAnimationFrame(function () { requestAnimationFrame(function () { side.style.transition = "transform .22s ease"; }); });
    var fetchTimer = null, fetchWin = null;
    function onJpMsg(ev) {
      if (!ev.data || ev.data.__jk !== "jp" || !isJpOrigin(ev.origin)) return;
      if (sbGone()) return;
      var d = ev.data;
      if (d.notFound) {
        setTab(false);
        jpNotFound = true; tryJpFb();
        card.innerHTML = '<div style="font-size:15.5px;color:#334155;margin-bottom:8px">잡플래닛에서 <b>' + esc(company) + '</b> 를 못 찾았어요.</div>' +
          '<div style="font-size:13px;color:#64748b;line-height:1.6;margin-bottom:10px">이유는 둘 중 하나예요 — ① 잡플래닛에 <b>등록명이 다르게</b> 올라와 있어 못 찾았거나(예: 영문 사명이 한글로 등록), ② 리뷰가 없어 <b>아직 미등록</b>이거나. 아래 링크로 직접 검색해보면 바로 구분돼요. 입퇴사 비율(아래)은 국민연금 공공데이터라 별개로 표시돼요.</div>' +
          '<a href="https://www.jobplanet.co.kr/search?query=' + encodeURIComponent(stripEntityMark(q)) + '" target="_blank" style="color:#00a68f;font-weight:700;font-size:14.5px">잡플래닛에서 직접 검색 →</a>';
        return;
      }
      if (d.earlyCid && !d.data) { startReviewsEarly(String(d.earlyCid)); return; }
      if (d.data) renderCard(d.data, d.amb || manualAmb);
      if (d.reviews) {
        if (fetchTimer) { clearTimeout(fetchTimer); fetchTimer = null; }
        renderReviews(d.reviews, d.rvUrl, d.partial);
        if (d.partial) {
          fetchTimer = setTimeout(function () {
            renderReviews(d.reviews, d.rvUrl, false, true);
            try { if (fetchWin && !fetchWin.closed) fetchWin.close(); } catch (e) {}
          }, 30000);
        } else {
          try { if (fetchWin && !fetchWin.closed) fetchWin.close(); } catch (e) {}
          fetchWin = null;
        }
      }
    }
    window.addEventListener("message", onJpMsg);
    sbKill = function () {
      try { window.removeEventListener("message", onJpMsg); } catch (e) {}
      try { if (fetchTimer) { clearTimeout(fetchTimer); fetchTimer = null; } } catch (e) {}
      try { if (fetchWin && !fetchWin.closed) fetchWin.close(); } catch (e) {}
      [side, scr, tab].forEach(function (n) { try { if (n && n.parentNode) n.parentNode.removeChild(n); } catch (e) {} });
    };
    var rvCitySel = {}, rvJobSel = {};
    var KO_CITY = /(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|해외)/;
    function cityOf(r) {
      if (r.city) return r.city;
      var m = (r.meta || "").match(KO_CITY);
      return m ? m[1] : "";
    }
    function jobOf(r) { return r.job || ""; }
    function applyRvFilters() {
      var cs = Object.keys(rvCitySel).filter(function (k) { return rvCitySel[k]; });
      var js = Object.keys(rvJobSel).filter(function (k) { return rvJobSel[k]; });
      var shown = 0, tot = 0;
      [].slice.call(rvWrap.querySelectorAll("[data-jk-city]")).forEach(function (d) {
        tot++;
        var ok = (!cs.length || cs.indexOf(d.getAttribute("data-jk-city")) >= 0) &&
                 (!js.length || js.indexOf(d.getAttribute("data-jk-job")) >= 0);
        d.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      var on = cs.length || js.length;
      var c = document.getElementById("jkRvCnt");
      if (c) c.textContent = on ? ("표시 " + shown + " / 전체 " + tot) : "";
      var z = document.getElementById("jkRvZero");
      if (z) z.style.display = (on && !shown) ? "" : "none";
    }
    function buildChipBar(list, opts) {
      var cnt = {}, order = [];
      list.forEach(function (r) { var v = opts.valueOf(r) || "미표기"; if (!(v in cnt)) { cnt[v] = 0; order.push(v); } cnt[v]++; });
      Object.keys(opts.sel()).forEach(function (k) { if (!(k in cnt)) delete opts.sel()[k]; });
      if (order.length < 2) return null;
      order.sort(function (a, b) { return cnt[b] - cnt[a]; });
      var bar = el("div", "display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin:0 2px 10px;padding:8px 10px;" +
        "background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px");
      bar.appendChild(el("span", "flex:0 0 52px;font-size:13.5px;color:#475569;font-weight:800;white-space:nowrap", opts.label));
      var paints = [];
      order.forEach(function (v) {
        var b = el("button");
        function paint() {
          var on = !!opts.sel()[v];
          b.style.cssText = "border:2px solid " + (on ? opts.color : "#cbd5e1") + ";background:" + (on ? opts.color : "#fff") +
            ";color:" + (on ? "#fff" : "#64748b") + ";padding:5px 9px;border-radius:9px;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap";
          b.textContent = v + " " + cnt[v];
        }
        paints.push(paint); paint();
        b.onclick = function () { opts.sel()[v] = !opts.sel()[v]; paint(); applyRvFilters(); };
        bar.appendChild(b);
      });
      var allB = el("button", "border:none;background:none;color:#2563eb;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline", "전체 보기");
      allB.onclick = function () { opts.clear(); paints.forEach(function (p) { p(); }); applyRvFilters(); };
      bar.appendChild(allB);
      return bar;
    }
    function buildRvFilterBars(list) {
      var bars = [
        buildChipBar(list, { label: "📍 지역", color: "#4f46e5",
          valueOf: cityOf, sel: function () { return rvCitySel; }, clear: function () { rvCitySel = {}; } }),
        buildChipBar(list, { label: "💼 직무", color: "#0d9488",
          valueOf: jobOf, sel: function () { return rvJobSel; }, clear: function () { rvJobSel = {}; } })
      ].filter(Boolean);
      var anchor = document.getElementById("jkRvHead");
      bars.forEach(function (bar) {
        if (anchor && anchor.parentNode) { anchor.parentNode.insertBefore(bar, anchor.nextSibling); anchor = bar; }
        else rvWrap.insertBefore(bar, rvWrap.firstChild);
      });
      applyRvFilters();
    }
    function renderReviews(list, rvUrl, partial, stalled) {
      if (sbGone()) return;
      tabB.textContent = "📖 리뷰 " + (list.length || 0) + (partial ? "…" : "");
      if (list.length) {
        var mb = document.getElementById("jkRev"), mh = document.getElementById("jkRevHint");
        if (mb) mb.style.display = "none";
        if (mh) mh.style.display = "none";
      }
      var moreLink = '<a href="' + esc(jpUrlOk(rvUrl) || "#") + '" target="_blank" style="color:#00a68f;font-weight:700;font-size:14px">잡플래닛에서 보기 →</a>';
      if (!list.length) {
        rvWrap.innerHTML = '<div style="background:#fff;border-radius:12px;padding:14px;margin-top:12px;font-size:14.5px;color:#334155;box-shadow:0 2px 10px rgba(0,0,0,.07)">' +
          '리뷰 원문을 못 읽었어요. 잡플래닛 로그인이 풀렸을 수 있어요 (그 창에서 카카오 로그인 한 번이면 다시 됨).<br><br>' + moreLink + '</div>';
        return;
      }
      var label = partial ? (list.length + "건… 더 가져오는 중 ⏳")
        : stalled ? (list.length + "건 (여기까지 가져와짐)")
        : (list.length + "건" + (list.length >= REVIEW_MAX ? " (최신 " + REVIEW_MAX + "건)" : " (전부)"));
      var h = '<div id="jkRvHead"><div style="font-weight:800;color:#0f172a;font-size:16px;margin:14px 2px 3px">📖 리뷰 원문 ' + label +
        ' <span id="jkRvCnt" style="color:#4f46e5;font-size:13px;font-weight:800"></span></div>' +
        '<div style="color:#b6c2cf;font-size:11px;margin:0 2px 8px">출처: 잡플래닛 리뷰 API 자동 연동 · 전직원 리뷰만 (현직원 제외)</div></div>' +
        '<div id="jkRvZero" style="display:none;background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;font-size:14px;color:#64748b;box-shadow:0 2px 10px rgba(0,0,0,.07)">고른 조건(지역·직무)의 리뷰가 없어요 — 위 <b>전체 보기</b>를 누르면 다시 다 나와요.</div>';
      function nl2br(s) { return esc(s).replace(/\n+/g, "<br>"); }
      list.forEach(function (r) {
        h += '<div data-jk-city="' + esc(cityOf(r) || "미표기") + '" data-jk-job="' + esc(jobOf(r) || "미표기") + '" style="background:#fff;border-radius:12px;padding:13px;box-shadow:0 2px 10px rgba(0,0,0,.07);margin-bottom:10px;font-size:14px;line-height:1.6;word-break:break-word">';
        if (r.title) h += '<div style="color:#0f172a;font-weight:800;font-size:15px;margin-bottom:3px">' + esc(r.title) + '</div>';
        if (r.meta) h += '<div style="color:#94a3b8;font-size:12.5px;margin-bottom:7px">' + esc(r.meta) + '</div>';
        if (r.pros) h += '<div style="margin-bottom:7px"><span style="color:#16a34a;font-weight:800">장점</span><br>' + nl2br(r.pros) + '</div>';
        if (r.cons) h += '<div style="margin-bottom:7px"><span style="color:#dc2626;font-weight:800">단점</span><br>' + nl2br(r.cons) + '</div>';
        if (r.wish) h += '<div><span style="color:#64748b;font-weight:800">경영진에 바라는 점</span><br>' + nl2br(r.wish) + '</div>';
        h += '</div>';
      });
      h += '<div style="text-align:center;margin:4px 0 8px">' + moreLink + '</div>';
      rvWrap.innerHTML = h;
      buildRvFilterBars(list);
    }
    function bar(label, v) {
      var pct = Math.max(0, Math.min(100, (parseFloat(v) || 0) / 5 * 100));
      return '<div style="display:flex;align-items:center;gap:8px;margin:6px 0">' +
        '<div style="width:76px;color:#475569;font-size:13.5px;flex:0 0 auto">' + label + '</div>' +
        '<div style="flex:1;height:9px;background:#eef2f7;border-radius:5px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:#00c3aa"></div></div>' +
        '<div style="width:34px;text-align:right;color:#0f172a;font-size:13.5px;font-weight:700">' + (v || "-") + '</div></div>';
    }
    var manualAmb = null;
    function switchCompany(cid, amb) {
      if (!cid || !amb || !amb.picked) return;
      var all = [amb.picked].concat(amb.others || []), picked = null, others = [];
      all.forEach(function (c) {
        if (!c) return;
        if (!picked && String(c.id) === String(cid)) picked = c; else others.push(c);
      });
      if (!picked) return;
      manualAmb = { n: amb.n, q: amb.q, want: amb.want, picked: picked, others: others, manual: true };
      card.innerHTML = '<div style="color:#64748b;font-size:15px"><b style="color:#0f172a">' + esc(picked.name || "") +
        '</b> 로 바꾸는 중… ⏳</div>';
      rvWrap.innerHTML = ""; autoTried = false; rvCid = null;
      if (fetchTimer) { clearTimeout(fetchTimer); fetchTimer = null; }
      if (fbUsed) { pendingFb = fbUsed; jpReviewsUrl = null; }
      setTab(false);
      scr.src = "https://www.jobplanet.co.kr/companies/" + encodeURIComponent(cid) + "/reviews?jk_embed=1#jk";
    }
    function ambHtml(amb) {
      if (!amb || !amb.n || amb.n < 2) return "";
      function line(c, cur) {
        var bits = [];
        if (c.region) {
          var g = amb.want ? (c.region === amb.want ? 1 : -1) : 0;
          bits.push(g === 1 ? '<b style="color:#0a8f5b">' + esc(c.region) + ' ✓</b>'
                  : g === -1 ? '<span style="color:#c2410c">' + esc(c.region) + ' ✗</span>'
                  : esc(c.region));
        }
        if (c.emp) bits.push(esc(c.emp + "명"));
        if (c.hiring) bits.push(esc("채용 중 " + c.hiring));
        return '<div style="margin-top:4px;font-size:12.5px;' + (cur ? 'color:#0f172a;font-weight:800' : 'color:#64748b') + '">' +
          (cur ? '✅ ' : '• ') + esc(String(c.name || "?")) + ' ★' + esc(numTxt(c.rating) || "-") +
          (bits.length ? ' <span style="color:#94a3b8">(' + bits.join(" · ") + ')</span>' : '') +
          (cur ? (amb.manual ? ' <span style="color:#94a3b8;font-weight:600">(직접 고름)</span>' : '')
               : ' <a class="jkAmbSw" data-cid="' + esc(c.id) + '" href="#" title="이 사이드바를 이 회사로 바꿔요"' +
                 ' style="color:#00a68f;font-weight:700;cursor:pointer">이걸로 보기 →</a>' +
                 ' <a href="https://www.jobplanet.co.kr/companies/' + esc(c.id) + '/reviews" target="_blank"' +
                 ' title="새 탭에서 잡플래닛 열기" style="color:#94a3b8;font-weight:700;text-decoration:none">↗</a>') +
          '</div>';
      }
      var rows = line(amb.picked, true);
      (amb.others || []).forEach(function (c) { rows += line(c, false); });
      return '<div style="margin-top:10px;padding:10px 11px;background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:9px">' +
        '<div style="font-weight:800;font-size:13.5px;color:#9a3412">⚠ 잡플래닛에 같은 이름 회사가 ' + amb.n + '개예요</div>' +
        '<div style="margin-top:3px;color:#7c2d12;font-size:12px;line-height:1.5">' +
        (amb.manual ? '직접 고른 회사예요. 아래에서 다른 회사로 다시 바꿀 수 있어요.'
                    : (amb.want ? '채용 중 → 지역 → 사원수 순으로 골랐어요 (공고 근무지 <b>' + esc(amb.want) + '</b>). 아래에서 맞는지 확인해 주세요.'
                                : '채용 중·사원수로 골랐어요. 아래에서 맞는지 확인해 주세요.')) + '</div>' +
        rows + '</div>';
    }
    function renderCard(x, amb) {
      if (sbGone()) return;
      var full = numTxt(x.rating) ? Math.max(0, Math.min(5, Math.round(Number(numTxt(x.rating))) || 0)) : 0;
      var stars = "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
      var cats = "";
      if (x.welfare) cats += bar("복지/급여", numTxt(x.welfare));
      if (x.worklife) cats += bar("워라밸", numTxt(x.worklife));
      if (x.culture) cats += bar("사내문화", numTxt(x.culture));
      if (x.promotion) cats += bar("승진기회", numTxt(x.promotion));
      if (x.exec) cats += bar("경영진", numTxt(x.exec));
      var counts = [];
      if (x.reviewCnt) counts.push("리뷰 " + numTxt(x.reviewCnt));
      if (x.salaryCnt) counts.push("연봉 " + numTxt(x.salaryCnt));
      if (x.interviewCnt) counts.push("면접 " + numTxt(x.interviewCnt));
      var reviewsUrl = jpUrlOk(x.url) || ("https://www.jobplanet.co.kr/search?query=" + encodeURIComponent(q));
      jpUrl = reviewsUrl;
      calSet("rating", numTxt(x.rating));
      card.innerHTML =
        '<div style="display:flex;align-items:baseline;gap:10px">' +
          '<div style="font-size:44px;font-weight:800;color:#0f172a;line-height:1">' + (numTxt(x.rating) || "-") + '</div>' +
          '<div><div style="color:#f59e0b;font-size:22px;letter-spacing:2px">' + stars + '</div>' +
          '<div id="jkCoName" title="클릭 → 잡플래닛을 백그라운드 탭으로 열기" style="color:#64748b;font-size:13.5px;cursor:pointer;text-decoration:underline;text-underline-offset:2px">' + esc(x.name || company) +
            (numTxt(x.totalReviewers) ? ' · 리뷰어 ' + numTxt(x.totalReviewers) + '명' : '') + '</div></div></div>' +
        ambHtml(amb) +
        '<div id="jkRatingCond"></div>' +
        (cats ? '<div style="margin-top:12px">' + cats + '</div>' : '') +
        (numTxt(x.recommend) ? '<div style="margin-top:9px;color:#16a34a;font-size:15px;font-weight:700">👍 기업추천율 ' + numTxt(x.recommend).replace(/%/g, "") + '%</div>' : '') +
        (counts.length ? '<div style="margin-top:7px;color:#334155;font-size:14px">' + counts.join("  ·  ") + '</div>' : '') +
        '<button id="jkRev" style="margin-top:14px;width:100%;color:#fff;background:#ff7a00;border:none;padding:12px;border-radius:10px;font-weight:800;font-size:15px;cursor:pointer;display:none">📖 리뷰 원문 불러오기 (창 잠깐 깜빡)</button>' +
        '<div id="jkRevHint" style="margin-top:6px;color:#94a3b8;font-size:12.5px;line-height:1.45;display:none">자동 로딩이 안 될 때만 이 버튼을 쓰면 돼요 — 작은 창이 몇 초 열렸다 닫히며 가져와요.</div>' +
        '<div style="margin-top:9px;color:#b6c2cf;font-size:11px">출처: 잡플래닛 기업리뷰 연동 (평점·통계 자동 수집)</div>';
      var cn = document.getElementById("jkCoName");
      if (cn) cn.onclick = function () { openBg(reviewsUrl); toast("잡플래닛을 백그라운드 탭으로 열었어요 🪐", 1500); };
      card.querySelectorAll("a.jkAmbSw").forEach(function (a) {
        a.onclick = function (e) {
          e.preventDefault();
          var cid = a.getAttribute("data-cid"), nm = "";
          [amb.picked].concat((amb && amb.others) || []).forEach(function (c) { if (c && String(c.id) === String(cid)) nm = c.name || ""; });
          switchCompany(cid, amb);
          toast("사이드바를 " + (nm || "다른 회사") + " 로 바꿔요 🪐", 1800);
        };
      });
      var rb = document.getElementById("jkRev");
      if (rb) rb.onclick = function () {
        rvWrap.innerHTML = '<div style="background:#fff;border-radius:12px;padding:14px;margin-top:12px;font-size:14.5px;color:#64748b;box-shadow:0 2px 10px rgba(0,0,0,.07)">리뷰 가져오는 중… ⏳ (작은 창이 몇 초 열렸다 닫혀요)</div>';
        var w = 480, h = 640;
        var left = Math.max(0, (screen.availWidth || 1400) - w - 10), top = Math.max(0, (screen.availHeight || 900) - h - 60);
        var fetchUrl = reviewsUrl + (reviewsUrl.indexOf("?") >= 0 ? "&" : "?") + "jk_fetch=1";
        fetchWin = window.open(fetchUrl, "jpFetch", "width=" + w + ",height=" + h + ",left=" + left + ",top=" + top + ",scrollbars=yes");
        if (fetchTimer) clearTimeout(fetchTimer);
        fetchTimer = setTimeout(function () {
          rvWrap.innerHTML = '<div style="background:#fff;border-radius:12px;padding:14px;margin-top:12px;font-size:14.5px;color:#334155;box-shadow:0 2px 10px rgba(0,0,0,.07)">' +
            '리뷰를 못 가져왔어요. 잡플래닛 로그인이 풀렸을 수 있어요 — <a href="' + esc(reviewsUrl) + '" target="_blank" style="color:#00a68f;font-weight:700">이 링크에서 카카오 로그인 한 번 →</a> 하고 다시 눌러줘요.</div>';
        }, 45000);
      };
      var cardCid = (reviewsUrl.match(/\/companies\/(\d+)\//) || [])[1] || "";
      if (rvCid && cardCid && rvCid !== cardCid) { autoTried = false; rvWrap.innerHTML = ""; }
      if (cardCid && !(amb && amb.n >= 2)) cidSave(q, cardCid);
      autoLoadReviews(reviewsUrl);
      jpReviewsUrl = reviewsUrl; tryJpFb();
      reportRating(x.rating, x.reviewCnt);
    }
    function reportRating(rv, reviews) {
      var gno = (path.match(/\/recruit\/gi_read\/(\d+)/) || [])[1] || "";
      var val = parseFloat(rv);
      var url = "https://jk.local/api/rating?gno=" + encodeURIComponent(gno) +
        "&co=" + encodeURIComponent(company) +
        "&rating=" + encodeURIComponent(isNaN(val) ? "" : val) +
        "&reviews=" + encodeURIComponent(reviews || "");
      bridgeFetch(url, 6000, "commuteMap").then(function (res) {
        if (sbGone()) return;
        var box = document.getElementById("jkRatingCond");
        if (!box || !res || !res.ok || !res.enabled) return;
        var min = Number(res.min) || 0;
        if (!min || isNaN(val)) return;
        var pass = val >= min;
        box.style.cssText = "margin-top:10px;padding:8px 11px;border-radius:9px;font-size:13.5px;font-weight:800;" +
          (pass ? "background:#e7f8f0;color:#0a8f5b" : "background:#fdeaea;color:#c62828");
        box.innerHTML = (pass ? "✔ 평점 기준 통과" : "✘ 평점 기준 미달") +
          ' <span style="font-weight:600;opacity:.85">· 하한 ' + min.toFixed(1) + '점 / 현재 ' + val.toFixed(1) + '점</span>';
      });
    }
    var metricsTried = false, jpReviewsUrl = null, jpNotFound = false, pendingFb = null, jkBizNo = null;
    var fbUsed = null;
    function queueFb(su, staleYm) { pendingFb = { su: su, staleYm: staleYm }; tryJpFb(); }
    function tryJpFb() {
      if (!pendingFb) return;
      if (jpReviewsUrl) { var f = pendingFb; pendingFb = null; jpFallback(jpReviewsUrl, f.su, f.staleYm); }
      else if (jpNotFound) { var f2 = pendingFb; pendingFb = null; renderNoData(f2.su, f2.staleYm); }
    }
    function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    function ratioParts(pct, sample) {
      var col = pct <= 85 ? "#16a34a" : pct <= 115 ? "#b45309" : "#dc2626";
      var word = pct <= 85 ? "순증 👍" : pct <= 115 ? "유지" : "순유출 ⚠";
      if (sample != null && sample < 6) word += " · 표본 적음";
      return { col: col, word: word };
    }
    function ratioCard(o) {
      var pct = o.sumIn > 0 ? Math.round(o.sumOut / o.sumIn * 100) : 999;
      var col, verdict, growth;
      if (pct <= 85) { col = "#16a34a"; verdict = "사람 늘어남 👍"; growth = "들어온 사람 > 나간 사람 → <b>인원 느는 중</b>"; }
      else if (pct <= 115) { col = "#b45309"; verdict = "인원 유지"; growth = "들어온 사람 ≈ 나간 사람 → <b>인원 거의 그대로</b>"; }
      else { col = "#dc2626"; verdict = "사람 빠짐 ⚠"; growth = "나간 사람 > 들어온 사람 → <b>인원 주는 중</b>"; }
      var small = (o.sumIn + o.sumOut) < 6;
      if (o.tentative) { col = "#94a3b8"; verdict = "참고만"; }
      var h =
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">' +
          '<span style="font-weight:800;color:#0f172a;font-size:15px">🔄 직원 들고남 <span style="color:#94a3b8;font-weight:400;font-size:11.5px">최근 1년</span></span>' +
          '<span style="font-size:16.5px;font-weight:800;color:' + col + '">' + verdict + '</span></div>' +
        '<div style="margin-top:8px;color:#334155;font-size:13.5px;line-height:1.55">' +
          '입사 <b>' + fmtN(o.sumIn) + '명</b> · 퇴사 <b>' + fmtN(o.sumOut) + '명</b> <span style="color:#94a3b8">(퇴사=입사의 ' + pct + '%)</span><br>' +
          '<span style="color:' + col + '">↳ ' + growth + '</span>' + (small && !o.tentative ? ' <span style="color:#94a3b8">· 표본 적어 참고만</span>' : '') +
        '</div>';
      if (o.churn != null) {
        var oneIn = o.churn > 0 ? Math.round(100 / o.churn) : 0;
        var freq = o.churn >= 25 ? "이직 잦은 편" : o.churn >= 12 ? "이직 보통" : "이직 적은 편";
        h += '<div style="margin-top:6px;color:#334155;font-size:13.5px;line-height:1.55">' +
          '이직률 <b>' + o.churn + '%</b>' + (oneIn >= 2 ? ' <span style="color:#64748b">— 1년에 직원 ' + oneIn + '명 중 1명꼴 퇴사</span>' : '') +
          ' <span style="color:#94a3b8">(' + freq + ')</span></div>';
      }
      if (o.note) h += '<div style="margin-top:5px;color:#94a3b8;font-size:12px">' + o.note + '</div>';
      h += '<div style="margin-top:7px;color:#b6c2cf;font-size:11px">' + (o.totalLabel ? o.totalLabel + ' · ' : '') + '출처: ' + o.source + '</div>';
      return h;
    }
    function npsCard(bodyHtml, title) {
      if (sbGone()) return null;
      mWrap.innerHTML = '<div id="jkNps" title="' + title + '" ' +
        'style="background:#fff;border-radius:14px;padding:14px;box-shadow:0 2px 12px rgba(0,0,0,.09);margin-top:12px;cursor:pointer">' + bodyHtml + '</div>';
      return document.getElementById("jkNps");
    }
    function autoLoadMetrics() {
      if (metricsTried) return; metricsTried = true;
      var co = null, ls = isJS ? [] : document.querySelectorAll('a[href*="/company/"]');
      for (var i = 0; i < ls.length; i++) {
        var h = ls[i].getAttribute("href") || "";
        if (/Oem/i.test(h)) continue;
        var cm = h.match(/\/company\/(\d+)/);
        if (cm) { co = cm[1]; break; }
      }
      if (!co) { npsTry(null, null); return; }
      var su = "/company/" + co + "/salary";
      fetch(su, { credentials: "same-origin" }).then(function (r) { return r.text(); }).then(function (h) {
        var bz = h.match(/"BizNo"\s*:\s*"(\d{10})"/); if (bz) jkBizNo = bz[1];
        var re = /DataYm\\?":\\?"(\d{6})\\?",\\?"PrsnIn\\?":(\d+),\\?"PrsnOut\\?":(\d+),\\?"Prsn\\?":(\d+)/g;
        var seen = {}, m;
        while ((m = re.exec(h))) { seen[m[1]] = { ym: m[1], pin: +m[2], pout: +m[3], prsn: +m[4] }; }
        var rows = [];
        Object.keys(seen).sort().forEach(function (k) {
          var r0 = seen[k]; if (r0.pin || r0.pout || r0.prsn) rows.push(r0);
        });
        if (rows.length >= 2) {
          var lastYm = rows[rows.length - 1].ym;
          var nowD = new Date(), nowYm = nowD.getFullYear() * 12 + nowD.getMonth() + 1;
          var lY = parseInt(lastYm.slice(0, 4), 10) * 12 + parseInt(lastYm.slice(4), 10);
          if (nowYm - lY <= 15) { renderNpsJK(rows, su); return; }
          npsTry(su, lastYm); return;
        }
        npsTry(su, null);
      }).catch(function () { npsTry(su, null); });
    }
    function renderNpsJK(rows, su) {
      var sumIn = 0, sumOut = 0, sumPrsn = 0;
      rows.forEach(function (r) { sumIn += r.pin; sumOut += r.pout; sumPrsn += r.prsn; });
      if (!sumIn) { mWrap.innerHTML = ""; return; }
      var pct = Math.round(sumOut / sumIn * 100);
      var churn = Math.round(sumOut / (sumPrsn / rows.length) * 100);
      var first = rows[0], last = rows[rows.length - 1];
      var p = ratioParts(pct, sumIn + sumOut);
      var ymTxt = last.ym.slice(0, 4) + "." + last.ym.slice(4);
      var n = npsCard(
        ratioCard({ sumIn: sumIn, sumOut: sumOut, churn: churn,
          totalLabel: "직원수 " + fmtN(first.prsn) + "→" + fmtN(last.prsn) + "명 (" + ymTxt + " 기준)",
          source: "국민연금공단 공공데이터 · 잡코리아 기업정보 연동" }),
        "클릭 → 잡코리아 기업정보 연봉·입퇴사 페이지를 백그라운드 탭으로");
      if (n) n.onclick = function () { openBg("https://www.jobkorea.co.kr" + su); toast("잡코리아 기업정보를 백그라운드 탭으로 열었어요", 1500); };
    }
    function srCsnOnPage() {
      if (!isSR) return "";
      var a = document.querySelector('a[href*="company-info/view"]');
      var m = a && (a.getAttribute("href") || "").match(/csn[=\/]([A-Za-z0-9%+=_-]+)/);
      return m ? decodeURIComponent(m[1]) : "";
    }
    function npsTry(su, staleYm) {
      var where = ""; try { where = jkExtractAddr() || ""; } catch (e) {}
      bridgeFetch(null, 40000, "npsSearch", { name: clean(company) || company, bizno: jkBizNo || "", addr: where, csn: srCsnOnPage() }).then(function (res) {
        if (sbGone()) return;
        if (res && res.ok && res.rows && res.rows.length >= 2) { renderNpsAPI(res, su); return; }
        if (res && res.err) console.warn("[JK] 입퇴사 2순위(사람인):", res.err);
        queueFb(su, staleYm);
      });
    }
    function renderNpsAPI(res, su) {
      var rows = res.rows, sumIn = 0, sumOut = 0;
      rows.forEach(function (r) { sumIn += r.pin; sumOut += r.pout; });
      if (!sumIn && !sumOut) { queueFb(su, null); return; }
      var pct = sumIn > 0 ? Math.round(sumOut / sumIn * 100) : 999;
      var churn = res.cnt > 0 ? Math.round(sumOut / res.cnt * 100) : null;
      var p = ratioParts(pct, sumIn + sumOut);
      var last = rows[rows.length - 1];
      var fromSr = res.src === "saramin";
      var who = fromSr ? esc(String(res.wkplNm || "") + (res.region ? " · " + res.region : "")) : "";
      var n = npsCard(
        ratioCard({ sumIn: sumIn, sumOut: sumOut, churn: churn,
          totalLabel: "전체 직원 " + fmtN(res.cnt) + "명 (" + last.ym.slice(0, 4) + "." + last.ym.slice(4) + " 기준)",
          source: fromSr ? "국민연금(사람인 기업정보 연동)" : "국민연금공단 OpenAPI 직접 연동",
          note: fromSr && who ? "사람인 «" + who + "» 기준" + (res.cands > 1 ? " — 같은 이름 " + res.cands + "곳 중 공고 근무지와 지역이 맞는 곳" : "") : null }),
        fromSr ? "클릭 → 사람인 기업정보를 백그라운드 탭으로"
               : (su ? "클릭 → 잡코리아 기업정보 연봉 페이지를 백그라운드 탭으로" : "국민연금공단 사업장: " + esc(String(res.wkplNm || ""))));
      if (n && fromSr && res.url) n.onclick = function () { openBg(res.url); toast("사람인 기업정보를 백그라운드 탭으로 열었어요", 1500); };
      else if (n && su) n.onclick = function () { openBg("https://www.jobkorea.co.kr" + su); toast("잡코리아 기업정보를 백그라운드 탭으로 열었어요", 1500); };
      else if (n) n.style.cursor = "default";
    }
    function renderNoData(su, staleYm) {
      var why = staleYm
        ? "잡코리아 국민연금 자료가 " + staleYm.slice(0, 4) + "." + staleYm.slice(4) + "에 멈춰 있고, 사람인·잡플래닛에도 없어요."
        : "잡코리아·사람인·잡플래닛 어디에도 이 회사의 국민연금 입퇴사 자료가 없어요.";
      var n = npsCard(
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">' +
          '<span style="font-weight:800;color:#0f172a;font-size:15px">🔄 퇴사/입사 비율</span>' +
          '<span style="font-size:15px;font-weight:800;color:#94a3b8">데이터 없음</span></div>' +
        '<div style="margin-top:6px;color:#94a3b8;font-size:13px">' + why + (su ? " 카드를 누르면 잡코리아 원본을 볼 수 있어요." : "") + '</div>',
        su ? "클릭 → 잡코리아 기업정보 연봉 페이지를 백그라운드 탭으로" : "입퇴사 데이터 출처 없음");
      if (n && su) n.onclick = function () { openBg("https://www.jobkorea.co.kr" + su); toast("잡코리아 기업정보를 백그라운드 탭으로 열었어요", 1500); };
      else if (n) n.style.cursor = "default";
    }
    function jpFallback(reviewsUrl, su, staleYm) {
      fbUsed = { su: su, staleYm: staleYm };
      var cidm = reviewsUrl.match(/\/companies\/(\d+)\//); if (!cidm) { renderNoData(su, staleYm); return; }
      var base = "https://www.jobplanet.co.kr/companies/" + cidm[1];
      function stripHtml(h) {
        return (h || "").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ")
          .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      }
      bridgeFetch(base + "/salaries", 15000).then(function (res) {
        var ts = stripHtml(res && res.ok ? res.html : "");
        var byY = {}, mm, reH = /(\d{4})\s*년\s*입사자\s*([0-9,]+)\s*명/g, reQ = /(\d{4})\s*년\s*퇴사자\s*([0-9,]+)\s*명/g;
        while ((mm = reH.exec(ts))) { (byY[mm[1]] = byY[mm[1]] || {}).h = parseInt(mm[2].replace(/,/g, ""), 10); }
        while ((mm = reQ.exec(ts))) { (byY[mm[1]] = byY[mm[1]] || {}).q = parseInt(mm[2].replace(/,/g, ""), 10); }
        var yrs = Object.keys(byY).filter(function (y) { return byY[y].h > 0 && byY[y].q >= 0; }).sort();
        if (!yrs.length) { renderNoData(su, staleYm); return; }
        var nowY = new Date().getFullYear();
        var done = yrs.filter(function (y) { return +y < nowY; });
        var yr = done.length ? done[done.length - 1] : yrs[yrs.length - 1];
        var hN = byY[yr].h, qN = byY[yr].q, partial = (+yr >= nowY), small = (hN + qN) < 12;
        var n = npsCard(
          ratioCard({ sumIn: hN, sumOut: qN, churn: null, totalLabel: yr + "년 기준",
            source: "국민연금(잡플래닛 연동)", tentative: (partial || small),
            note: partial ? "올해 누적치라 아직 참고만" : (small ? "표본 적어 참고만" : null) }),
          "클릭 → 잡플래닛 연봉 페이지(국민연금 데이터)를 백그라운드 탭으로");
        if (n) n.onclick = function () { openBg(base + "/salaries"); toast("잡플래닛을 백그라운드 탭으로 열었어요 🪐", 1500); };
      });
    }
    function isCurrentEmployee(rv) {
      var e = rv && rv.employ_status_name;
      if (e === true) return true;
      if (e === false) return false;
      if (typeof e === "string") {
        var s = e.replace(/\s/g, "");
        if (s.indexOf("현직") >= 0) return true;
        if (s.indexOf("전직") >= 0) return false;
      }
      return false;
    }
    var autoTried = false, rvCid = null;
    function showManualButton() {
      if (sbGone()) return;
      var b = document.getElementById("jkRev"), h2 = document.getElementById("jkRevHint");
      if (b) b.style.display = "";
      if (h2) h2.style.display = "";
    }
    var RV_POOL = 5;
    function autoLoadReviews(reviewsUrl) {
      if (autoTried) return; autoTried = true;
      var cidm = reviewsUrl.match(/\/companies\/(\d+)\//);
      if (!cidm) { showManualButton(); return; }
      var cid = cidm[1];
      rvCid = cid;
      rvWrap.innerHTML = '<div style="background:#fff;border-radius:12px;padding:14px;margin-top:12px;font-size:14.5px;color:#64748b;box-shadow:0 2px 10px rgba(0,0,0,.07)">리뷰 자동 로딩 중… ⏳</div>';
      var acc = [], sig = {}, sawAny = false, curN = 0, lockedN = 0, auth = null;
      var MAXPAGE = 80;
      var pages = {}, pool = RV_POOL, stopPage = MAXPAGE, next = 2;
      var retry = [], retryRound = 0, hitBlock = false, truncated = false;
      var t0 = Date.now(), reqN = 0;
      function rvLog(how) {
        try {
          console.log("%c[리뷰] " + how + " " + acc.length + "건 · 요청 " + reqN + "회 · " +
            ((Date.now() - t0) / 1000).toFixed(1) + "초", "background:#00a68f;color:#fff;padding:2px 7px;border-radius:5px;font-weight:800");
        } catch (e) {}
      }
      function apiUrl(p) {
        return "https://www.jobplanet.co.kr/api/v4/companies/reviews/list?device=desktop&company_id=" + cid + "&page=" + p;
      }
      function getPage(p) {
        reqN++;
        return bridgeFetch(apiUrl(p), 12000).then(function (res) {
          var j = null;
          try { j = JSON.parse((res && res.html) || "null"); } catch (e) {}
          var d = (j && j.data) || null;
          return { p: p, ok: !!(res && res.ok && d && d.items), d: d };
        });
      }
      function rebuild() {
        acc = []; sig = {}; sawAny = false; curN = 0; lockedN = 0;
        Object.keys(pages).map(Number).sort(function (a, b) { return a - b; }).forEach(function (p) {
          pages[p].forEach(function (rv) {
            sawAny = true;
            var isCur = isCurrentEmployee(rv);
            if (isCur) curN++;
            if (!(rv.pros || "").trim() && !(rv.cons || "").trim() && !(rv.message_to_management || "").trim()) { lockedN++; return; }
            if (isCur) return;
            var k = (rv.pros || "") + "|" + (rv.cons || "");
            if (sig[k]) return;
            sig[k] = 1;
            var city = (rv.city_name && rv.city_name.name) || "";
            var metaBits = [];
            if (rv.score && rv.score.overall) metaBits.push("★" + rv.score.overall);
            else if (rv.overall) metaBits.push("★" + rv.overall);
            if (rv.date) metaBits.push(rv.date);
            if (rv.occupation_name) metaBits.push(rv.occupation_name);
            if (city) metaBits.push(city);
            acc.push({ title: rv.title || "", meta: metaBits.join(" · "), city: city, job: rv.occupation_name || "",
                       pros: rv.pros || "", cons: rv.cons || "", wish: (rv.message_to_management || "").trim() });
          });
        });
      }
      function absorb(r) {
        if (!r.ok) { retry.push(r.p); hitBlock = true; return; }
        var rv = [];
        (r.d.items || []).forEach(function (it) {
          if (it && it.type === "COMPANY_REVIEW" && it.review) rv.push(it.review);
        });
        pages[r.p] = rv;
        if (!rv.length && r.p < stopPage) stopPage = r.p;
      }
      function paint() {
        if (!acc.length) return;
        var more = (next <= stopPage || retry.length > 0) && acc.length < REVIEW_MAX;
        renderReviews(acc.slice(0, REVIEW_MAX), reviewsUrl, more);
      }
      function seq(list, i, cb) {
        if (sbGone()) return;
        if (i >= list.length) { cb(); return; }
        getPage(list[i]).then(function (r) { absorb(r); rebuild(); paint(); seq(list, i + 1, cb); });
      }
      function drive() {
        if (sbGone()) return;
        if (acc.length >= REVIEW_MAX) { done(); return; }
        var batch = [];
        while (batch.length < pool && next <= stopPage) batch.push(next++);
        if (!batch.length) {
          if (retry.length && retryRound < 2) {
            retryRound++; pool = 1;
            var again = retry; retry = [];
            seq(again, 0, drive);
            return;
          }
          if (retry.length) truncated = true;
          done(); return;
        }
        Promise.all(batch.map(getPage)).then(function (rs) {
          rs.forEach(absorb);
          if (hitBlock && pool > 1) { pool = 1; hitBlock = false; }
          rebuild(); paint();
          drive();
        });
      }
      function start() {
        getPage(1).then(function (r1) {
          if (!r1.ok) { fail(); return; }
          auth = { userId: (r1.d.user_id == null ? null : r1.d.user_id),
                   viewOk: r1.d.is_review_view_status !== false,
                   total: r1.d.total_count || 0 };
          absorb(r1);
          if (!pages[1] || !pages[1].length) { fail(); return; }
          rebuild();
          if (lockedN === pages[1].length) { done(); return; }
          var tp = parseInt(r1.d.total_page, 10);
          if (tp > 0 && tp < stopPage) stopPage = tp;
          paint();
          drive();
        });
      }
      rvLoad(cid, function (c) {
        if (c && c.list && c.list.length) {
          acc = c.list.slice(0);
          renderReviews(acc.slice(0, REVIEW_MAX), reviewsUrl, true);
          getPage(1).then(function (r1) {
            if (!r1.ok) { renderReviews(acc.slice(0, REVIEW_MAX), reviewsUrl, false); return; }
            var tot = (r1.d && r1.d.total_count) || 0;
            if (tot && c.total && tot === c.total) {
              renderReviews(acc.slice(0, REVIEW_MAX), reviewsUrl, false);
              rvLog("캐시");
              return;
            }
            acc = []; pages = {}; retry = []; retryRound = 0; pool = RV_POOL; stopPage = MAXPAGE; next = 2;
            start();
          });
          return;
        }
        start();
      });
      function renderBlocked() {
        var loggedOut = !auth || auth.userId == null;
        tabB.textContent = "📖 리뷰 🔒";
        var total = (auth && auth.total) || 0;
        rvWrap.innerHTML = '<div style="background:#fff;border-radius:12px;padding:15px;margin-top:12px;font-size:14.5px;color:#334155;line-height:1.65;box-shadow:0 2px 10px rgba(0,0,0,.07);border-left:5px solid #f59e0b">' +
          '<div style="font-weight:800;font-size:15.5px;color:#0f172a;margin-bottom:6px">🔒 리뷰 본문이 잠겨 있어요</div>' +
          (loggedOut
            ? '<b>잡플래닛 로그인이 풀렸어요.</b> 리뷰' + (total ? ' ' + total + '건' : '') + '이 있는데 본문(장점·단점)만 빈 채로 옵니다.'
            : '잡플래닛에 로그인은 돼 있는데 <b>리뷰 열람 권한이 없어요</b> — 잡플래닛은 내 리뷰를 1건 쓰거나 열람권이 있어야 남의 리뷰 본문을 보여줘요.') +
          '<div style="margin-top:9px;color:#64748b;font-size:13px">※ 별점·입퇴사 카드는 로그인과 무관하게 계속 나와요.</div>' +
          '<div style="margin-top:11px;display:flex;gap:8px;flex-wrap:wrap">' +
          '<a href="' + (loggedOut ? 'https://www.jobplanet.co.kr/users/sign_in' : esc(reviewsUrl)) + '" target="_blank" style="background:#00a68f;color:#fff;text-decoration:none;padding:8px 12px;border-radius:9px;font-weight:800;font-size:14px">' +
          (loggedOut ? '잡플래닛 로그인하러 가기 →' : '잡플래닛에서 보기 →') + '</a>' +
          (loggedOut ? '<a href="' + esc(reviewsUrl) + '" target="_blank" style="color:#00a68f;font-weight:700;font-size:14px;align-self:center">잡플래닛에서 보기 →</a>' : '') +
          '</div>' +
          (loggedOut ? '<div style="margin-top:9px;color:#94a3b8;font-size:12.5px">로그인한 뒤 이 공고 페이지를 새로고침(F5)하면 리뷰가 바로 떠요.</div>' : '') +
          '</div>';
      }
      function done() {
        if (sbGone()) return;
        if (!acc.length) {
          if (lockedN) { renderBlocked(); return; }
          if (sawAny) {
            tabB.textContent = "📖 리뷰 0";
            rvWrap.innerHTML = '<div style="background:#fff;border-radius:12px;padding:14px;margin-top:12px;font-size:14.5px;color:#334155;box-shadow:0 2px 10px rgba(0,0,0,.07)">전직원 리뷰가 아직 없어요 (현직원 리뷰' + (curN ? ' ' + curN + '건' : '') + '만 있는 회사예요).<br><br><a href="' + esc(reviewsUrl) + '" target="_blank" style="color:#00a68f;font-weight:700;font-size:14px">잡플래닛에서 보기 →</a></div>';
            return;
          }
        }
        var list = acc.slice(0, REVIEW_MAX);
        renderReviews(list, reviewsUrl, false, truncated);
        if (truncated) {
          var nt = el("div", "background:#fffbeb;border-left:4px solid #f59e0b;border-radius:10px;padding:11px 12px;" +
            "margin-top:10px;font-size:13.5px;color:#92400e;line-height:1.55",
            "잡플래닛이 잠깐 요청을 막아서 여기까지만 가져왔어요. 조금 뒤 새로고침(F5)하면 나머지도 옵니다.");
          rvWrap.appendChild(nt);
        }
        if (!truncated) rvSave(cid, list, (auth && auth.total) || 0);
        rvLog(truncated ? "일부(막힘)" : "완료");
      }
      function fail() {
        showManualButton();
        rvWrap.innerHTML = '<div style="background:#fff;border-radius:12px;padding:12px;margin-top:12px;font-size:13.5px;color:#94a3b8;box-shadow:0 2px 10px rgba(0,0,0,.07)">자동 로딩이 안 됐어요 — 위 주황 버튼으로 불러올 수 있어요.</div>';
      }
    }
    autoLoadMetrics();
  }
  function srLabel(t) { return el("span", "font-size:14px;color:#475569;font-weight:800;white-space:nowrap", t); }
  function srPanel() {
    return el("div", "display:flex;flex-direction:column;gap:7px;margin:10px 0 14px;padding:10px 12px;" +
      "background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif");
  }
  function srRow(panel, label, topLine) {
    var r = el("div", "display:flex;gap:6px;align-items:center;flex-wrap:wrap" +
      (topLine ? ";border-top:1px solid #e2e8f0;padding-top:9px;margin-top:1px" : ""));
    if (label) { var L = srLabel(label); L.style.cssText += ";flex:0 0 96px"; r.appendChild(L); }
    panel.appendChild(r);
    return r;
  }
  function srVerBadge() { return el("span", "font-size:11px;color:#94a3b8;margin-left:auto;white-space:nowrap", "도우미 v" + JK_VER); }
  function initSrScrap() {
    if (window.__srScrap) return; window.__srScrap = true;
    function rows() {
      var r = [].slice.call(document.querySelectorAll("li.row[data-idx]")).filter(function (li) {
        return !(li.closest && li.closest(".related"));
      });
      if (r.length) return r;
      return [].slice.call(document.querySelectorAll("li.row")).filter(function (li) { return li.querySelector("input.idx_chk"); });
    }
    function rowChk(li) {
      var c = li.querySelector("input.idx_chk") || li.querySelector("input.jkSrChk");
      if (c) return c;
      c = document.createElement("input");
      c.type = "checkbox"; c.className = "jkSrChk";
      c.style.cssText = "position:absolute;left:5px;top:50%;transform:translateY(-50%);width:17px;height:17px;cursor:pointer;z-index:5";
      if (getComputedStyle(li).position === "static") li.style.position = "relative";
      li.style.paddingLeft = "26px";
      c.addEventListener("change", function () { updateSelBtn(); });
      li.appendChild(c);
      return c;
    }
    function recIdx(li) {
      var c = li.querySelector("input.idx_chk");
      return li.getAttribute("data-idx") || (c && c.value) || "";
    }
    function coName(li) { var a = li.querySelector(".col_corp a"); return a ? (a.textContent || "").replace(/\s+/g, " ").trim() : ""; }
    function titleLink(li) { return li.querySelector(".col_informs strong.tit a"); }
    function informText(li) { var u = li.querySelector(".col_informs ul.inform"); return u ? (u.innerText || "") : (li.innerText || ""); }
    function dateText(li) { var d = li.querySelector(".col_btns .date"); return d ? (d.textContent || "").trim() : ""; }
    function isClosed(li) {
      var t = (li.innerText || "");
      if (/채용마감|마감된\s*공고|공고마감/.test(t)) return true;
      if (/(^|\s)(end|closed)(\s|$)/i.test(li.className)) return true;
      var v = deadlineDays(dateText(li));
      return v != null && v < 0;
    }
    var srCmRange = null, srRtRange = null;
    var _srHid = { t: 0, r: 0 }, _srPending = 0;
    function srRowMin(li) { var m = li.getAttribute("data-sr-min"); return m == null ? null : parseFloat(m); }
    function srRowRating(li) { var r = li.getAttribute("data-sr-rating"); return r == null ? null : parseFloat(r); }
    function srTOn() { return !!(srCmRange && srCmRange.on()); }
    function srROn() { return !!(srRtRange && srRtRange.on()); }
    function rowTtier(li) { var t = li.getAttribute("data-sr-tier"); return t || (serverUp ? "pending" : "gray"); }
    var srPendNote = el("span", "font-size:13px;color:#64748b;font-weight:700;margin-left:6px", "");
    var srRNote = el("span", "font-size:13px;color:#64748b;font-weight:700;margin-left:6px", "");
    function srRenderNotes() {
      var m = [];
      if (_srPending) m.push("⏳ 계산 중 " + _srPending + "건 — 끝나면 자동으로 채워져요");
      if (srTOn() && _srHid.t) m.push("시간 미확인 " + _srHid.t + "건 숨김");
      srPendNote.textContent = m.join(" · ");
      srRNote.textContent = (srROn() && _srHid.r) ? ("평점 미확인 " + _srHid.r + "건 숨김") : "";
    }
    function rowRtier(li) { return li.getAttribute("data-sr-rtier") || "unknown"; }
    function applyFilters() {
      var shown = 0, tot = 0, tOn = srTOn(), rOn = srROn();
      _srHid.t = _srHid.r = 0;
      rows().forEach(function (li) {
        tot++;
        if (tOn && srRowMin(li) === null) _srHid.t++;
        if (rOn && srRowRating(li) === null) _srHid.r++;
        var ok = (!tOn || srCmRange.pass(srRowMin(li))) &&
                 (!rOn || srRtRange.pass(srRowRating(li)));
        li.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      srRenderNotes();
      if (cntEl) cntEl.textContent = (tOn || rOn) ? ("표시 " + shown + " / 전체 " + tot) : "";
      updateSelBtn();
      applySort();
    }
    function recount() {
      var tc = {}, rc = {};
      rows().forEach(function (li) {
        markRow(li);
        srRowDelBtn(li);
        tc[rowTtier(li)] = (tc[rowTtier(li)] || 0) + 1;
        rc[rowRtier(li)] = (rc[rowRtier(li)] || 0) + 1;
      });
      _srPending = tc.pending || 0;
      srRenderNotes();
      var n = rows().length;
      srScopeNote.textContent = n ? ("내 스크랩 " + n + "건 기준 (아래 추천 공고는 제외)")
                                  : "내 스크랩 0건 — 아래 '나와 비슷한 사람들이 스크랩한 공고'(추천)는 필터·삭제 대상이 아니에요";
      updateDelBtn();
    }
    function markRow(li) {
      var old = li.querySelector(".srCareerChip"); if (old) old.remove();
      var expTok = expOnly(careerCell(li, true));
      if (expTok) {
        var c = el("span", "display:inline-block;margin-left:7px;vertical-align:middle;background:#fee2e2;color:#b91c1c;" +
          "padding:2px 8px;border-radius:8px;font:800 12.5px/1.5 'Malgun Gothic','Apple SD Gothic Neo',sans-serif", "⚠ " + expTok);
        c.className = "srCareerChip";
        var host = badgeHost(li);
        if (host) host.insertBefore(c, host.firstChild);
        else { var t = titleLink(li); if (t && t.parentNode) t.parentNode.insertBefore(c, t.nextSibling); }
      }
      var oldAp = li.querySelector(".srAppliedChip"); if (oldAp) oldAp.remove();
      if (/지원\s*완료/.test((li.innerText || "").replace(/\s+/g, " "))) {
        var ap = el("span", "display:inline-block;margin-left:7px;vertical-align:middle;background:#eff6ff;color:#1d4ed8;" +
          "padding:2px 8px;border-radius:8px;font:800 12.5px/1.5 'Malgun Gothic','Apple SD Gothic Neo',sans-serif", "✅ 지원완료");
        ap.className = "srAppliedChip"; ap.title = "이미 지원한 공고 — 🗑 일괄삭제(지원완료 칩을 켰을 때)의 대상";
        var host2 = badgeHost(li);
        if (host2) host2.appendChild(ap);
        else { var t2 = titleLink(li); if (t2 && t2.parentNode) t2.parentNode.insertBefore(ap, t2.nextSibling); }
      }
    }
    var serverUp = false, cmOrigin = "집";
    function tierOfMin(n) { return isNaN(n) ? "gray" : (n <= 30 ? "green" : (n <= 60 ? "yellow" : "red")); }
    function badgeHost(li) {
      var host = li.querySelector(".srBadgeHost");
      if (host) return host;
      var tit = li.querySelector(".col_informs strong.tit");
      if (!tit || !tit.parentNode) return null;
      host = el("span", "display:inline-flex;flex-wrap:wrap;align-items:center;vertical-align:middle;white-space:normal");
      host.className = "srBadgeHost";
      tit.parentNode.insertBefore(host, tit.nextSibling);
      return host;
    }
    function attachBadge(li, info) {
      var n = parseInt(info.min, 10);
      var st = info.pending ? "pending" : (isNaN(n) ? "unknown" : "ok");
      var old = li.querySelector(".srCommuteBadge");
      if (old) {
        var os = old.getAttribute("data-sr-st") || "ok";
        if (os === "ok" || os === st) return;
        old.remove();
      }
      var tier = st === "pending" ? "pending" : tierOfMin(n);
      li.setAttribute("data-sr-tier", tier);
      if (st === "ok") li.setAttribute("data-sr-min", String(n));
      var COL = { green: BADGE_GRAY, yellow: BADGE_GRAY, red: BADGE_WARN, gray: BADGE_GRAY, pending: BADGE_PENDING };
      var b = el("span", "display:inline-block;margin-left:7px;vertical-align:middle;background:" + COL[tier] + ";color:#fff;" +
        "padding:2px 9px;border-radius:9px;font:700 12px/1.45 'Malgun Gothic','Apple SD Gothic Neo',sans-serif",
        st === "pending" ? "🚇 계산 중…" : (st === "unknown" ? "🚇 통근 미확인" : ("🚇 " + (info.approx ? "약 " : "") + info.min + "분")));
      b.className = "srCommuteBadge"; b.setAttribute("data-sr-st", st);
      b.title = st === "pending" ? "지금 공고에서 근무지주소를 읽어 계산 중입니다(보통 몇 초)."
              : (isNaN(n) ? (info.why || "통근 미확인")
                          : (cmOrigin + " → " + (info.addr || "") + " (대중교통 " + info.min + "분)" +
                             (info.approx ? " · 공고에 상세주소가 없어 목록의 지역 기준 대략치예요" : "")));
      var host = badgeHost(li);
      if (host) host.appendChild(b);
      else { var t = titleLink(li); if (t && t.parentNode) t.parentNode.insertBefore(b, t.nextSibling); }
    }
    function extractAddrFromHtml(html) {
      var txt = String(html || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, "\n");
      txt = txt.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
      var LAB = ["근무지주소", "근무예정지", "사업장소재지", "근무지역", "근무지", "주소"];
      var lines = txt.split("\n").map(function (s) { return s.replace(/\s+/g, " ").trim(); }).filter(Boolean);
      for (var i = 0; i < lines.length; i++) {
        for (var L = 0; L < LAB.length; L++) {
          if (lines[i] === LAB[L] && i + 1 < lines.length) { var nx = lines[i + 1]; if (nx.length > 5 && LAB.indexOf(nx) < 0) return nx; }
          if (lines[i].indexOf(LAB[L]) === 0 && lines[i].length > LAB[L].length + 5) {
            var v = lines[i].slice(LAB[L].length).replace(/^[:\s]+/, "").trim(); if (v.length > 5) return v;
          }
        }
      }
      var m = txt.match(/(서울특별시|서울|경기도?|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)[^\n]{2,45}?(로|길)\s?\d[\d\-]*/);
      return m ? m[0].trim() : null;
    }
    var srCmMap = null;
    function srReport(key, min, addr, approx) {
      bridgeFetch("https://jk.local/api/commute-report?gno=" + encodeURIComponent(key) +
        "&min=" + encodeURIComponent(min) + "&addr=" + encodeURIComponent(addr || "") +
        (approx ? "&approx=1" : ""), 6000, "commuteMap");
    }
    function paintCommuteCache() {
      if (!srCmMap) return;
      rows().forEach(function (li) {
        if (li.querySelector(".srCommuteBadge")) return;
        var rec = srCmMap["sr" + recIdx(li)];
        if (!rec || isNaN(parseInt(rec.min, 10))) return;
        attachBadge(li, { min: rec.min, addr: rec.addr, approx: !!rec.approx });
      });
    }
    var filling = false;
    function fillCommute() {
      if (!serverUp || filling) return;
      var todo = rows().filter(function (li) {
        var b = li.querySelector(".srCommuteBadge"), st = b && (b.getAttribute("data-sr-st") || "ok");
        if (st === "ok" || st === "pending") return false;
        return parseInt(li.getAttribute("data-sr-cfill") || "0", 10) < 2;
      });
      if (!todo.length) return;
      filling = true;
      todo.forEach(function (li) { attachBadge(li, { min: "?", pending: true }); });
      recount();
      var i = 0, active = 0, CONC = 3;
      function one(li) {
        li.setAttribute("data-sr-cfill", String(parseInt(li.getAttribute("data-sr-cfill") || "0", 10) + 1));
        var idx = recIdx(li);
        var rowAddr = null;
        var lis = li.querySelectorAll(".col_informs ul.inform li");
        if (lis.length) rowAddr = (lis[lis.length - 1].textContent || "").trim();
        return srFetchAddr(idx)
          .then(function (a0) {
            if (a0) return a0;
            return fetch("/zf_user/jobs/relay/view?rec_idx=" + idx, { credentials: "same-origin" })
              .then(function (r) { return r.ok ? r.text() : ""; })
              .then(function (html) {
                var im = String(html).match(new RegExp("view-detail\\?[^\"'&]*rec_idx=" + idx + "(?!\\d)[^\"']*"));
                if (!im) return rowAddr;
                return fetch("/zf_user/jobs/relay/" + im[0].replace(/&amp;/g, "&"), { credentials: "same-origin" })
                  .then(function (r) { return r.ok ? r.text() : ""; })
                  .then(function (h2) { return extractAddrFromHtml(cutFooterHtml(h2)) || rowAddr; })
                  .catch(function () { return rowAddr; });
              });
          })
          .then(function (addr) {
            if (!addr) { attachBadge(li, { min: "?", why: "공고·목록에서 근무지를 못 찾았어요" }); return; }
            return bridgeFetch("https://jk.local/api/commute-addr?addr=" + encodeURIComponent(addr), 9000, "commuteMap")
              .then(function (res) {
                if (res && res.ok && res.min != null) {
                  var approx = !!rowAddr && addr === rowAddr;
                  attachBadge(li, { min: res.min, addr: addr, approx: approx });
                  srReport("sr" + idx, res.min, addr, approx);
                } else {
                  var why = (res && res.ok) ? (res.reason || ("주소는 찾았는데(" + addr + ") 대중교통 경로를 못 구했어요"))
                                            : "통근 계산 실패 — 대시보드 서버 응답 없음";
                  if (res && res.quota_exceeded) li.setAttribute("data-sr-cfill", "9");
                  attachBadge(li, { min: "?", why: why });
                }
              });
          })
          .catch(function () { attachBadge(li, { min: "?", why: "통근 계산 중 오류" }); });
      }
      function pump() {
        if (i >= todo.length) { if (!active) { filling = false; recount(); applyFilters(); setTimeout(fillCommute, 1200); } return; }
        while (active < CONC && i < todo.length) {
          (function (li) { active++; withTimeout(one(li), 25000, function () { attachBadge(li, { min: "?", why: LATE_WHY }); }).then(function () { active--; recount(); applyFilters(); pump(); }); })(todo[i++]);
        }
      }
      pump();
    }
    var ratingMap = null, ratingByCo = null, ratingMin = 0, ratingEnabled = true, rFilling = false;
    function normCo(s) { return (s || "").replace(/\(주\)|\(유\)|주식회사|유한회사|[㈜㈐\s()·,.\-&'"]/g, "").toUpperCase(); }
    function rowRatingRec(li) {
      var key = "sr" + recIdx(li);
      var rec = (ratingMap && ratingMap[key]) || null;
      if (!rec && ratingByCo) { var nm = normCo(coName(li)); if (nm && ratingByCo[nm]) rec = ratingByCo[nm]; }
      return rec;
    }
    function rowRating(li) {
      var rec = rowRatingRec(li);
      return rec && rec.rating != null ? rec.rating : null;
    }
    var rWhy = {};
    function paintRatings() {
      rows().forEach(function (li) {
        var val = rowRating(li);
        var rt = val == null ? "unknown" : ((ratingEnabled && ratingMin && val < ratingMin) ? "low" : "ok");
        var unk = val == null ? unknownRatingBadge(rWhy["sr" + recIdx(li)]) : null;
        li.setAttribute("data-sr-rtier", rt);
        if (val != null && !isNaN(val)) li.setAttribute("data-sr-rating", String(val)); else li.removeAttribute("data-sr-rating");
        var old = li.querySelector(".srRatingBadge"); if (old) old.remove();
        var b = el("span", "display:inline-block;margin-left:6px;vertical-align:middle;background:" +
          badgeWarnColor(ratingIsWarn(val), !!(unk && rWhy["sr" + recIdx(li)] && rWhy["sr" + recIdx(li)].k === "loading")) + ";color:#fff;" +
          "padding:2px 9px;border-radius:9px;font:700 12px/1.45 'Malgun Gothic','Apple SD Gothic Neo',sans-serif", unk ? unk.txt : "🪐 " + val);
        b.className = "srRatingBadge";
        b.title = unk ? unk.tip : ("잡플래닛 평점 " + val + (ratingMin ? " (기준 " + ratingMin + ")" : "") +
                                   altNote(rowRatingRec(li), coName(li)));
        var host = badgeHost(li), cb = li.querySelector(".srCommuteBadge");
        if (host) { if (cb && cb.parentNode === host) host.insertBefore(b, cb.nextSibling); else host.appendChild(b); }
        else { var t = titleLink(li); if (t && t.parentNode) t.parentNode.insertBefore(b, t.nextSibling); }
      });
    }
    function fetchOneRating(company, timeoutMs) {
      return new Promise(function (resolve) {
        var qq = clean(company) || company, done = false, ifr = null, to = null;
        function finish(v, why, alt) {
          if (done) return; done = true;
          if (to) clearTimeout(to);
          window.removeEventListener("message", onMsg);
          try { if (ifr && ifr.parentNode) ifr.parentNode.removeChild(ifr); } catch (e) {}
          resolve({ v: v, why: why || null, alt: alt || null });
        }
        function onMsg(ev) {
          if (done || !ev.data || ev.data.__jk !== "jp" || !isJpOrigin(ev.origin)) return;
          if (ifr && ev.source !== ifr.contentWindow) return;
          if (ev.data.notFound) return finish(null, "notfound");
          if (ev.data.data) { var r = parseFloat(ev.data.data.rating); return finish(isNaN(r) ? null : r, isNaN(r) ? "norating" : null, ev.data.alt); }
        }
        window.addEventListener("message", onMsg);
        ifr = el("iframe", "position:fixed;left:-10000px;top:0;width:400px;height:900px;border:0");
        ifr.src = "https://www.jobplanet.co.kr/search/companies?query=" + encodeURIComponent(stripEntityMark(qq)) + "&jk_embed=1";
        (document.body || document.documentElement).appendChild(ifr);
        to = setTimeout(function () { finish(null, "timeout"); }, timeoutMs || 18000);
      });
    }
    function fillRatings() {
      if (!ratingMap || rFilling) return;
      var todo = [];
      rows().forEach(function (li) {
        if (li.getAttribute("data-sr-rfill")) return;
        if (rowRating(li) != null) return;
        var co = coName(li); if (!co) { rWhy["sr" + recIdx(li)] = { k: "noco" }; return; }
        li.setAttribute("data-sr-rfill", "1");
        rWhy["sr" + recIdx(li)] = { k: "loading", co: co };
        todo.push({ li: li, key: "sr" + recIdx(li), co: co });
      });
      if (!todo.length) { paintRatings(); return; }
      rFilling = true;
      paintRatings();
      var startN = 0, doneN = 0, POOL = Math.min(6, todo.length);
      function fin(job, res) {
        var val = res && res.v != null ? res.v : null;
        rWhy[job.key] = val == null ? { k: (res && res.why) || "timeout", co: job.co } : null;
        var alt = (res && res.alt) || null;
        ratingMap[job.key] = { rating: val, co: job.co, alt: alt };
        if (val != null) {
          (ratingByCo = ratingByCo || {})[normCo(job.co)] = { rating: val, co: job.co, alt: alt };
          bridgeFetch("https://jk.local/api/rating?gno=" + encodeURIComponent(job.key) +
            "&co=" + encodeURIComponent(job.co) + "&rating=" + encodeURIComponent(val) +
            (alt && alt.to ? "&alt=" + encodeURIComponent(alt.to) : ""), 6000, "commuteMap");
        }
        doneN++; paintRatings(); recount(); applyFilters();
        if (doneN >= todo.length) { rFilling = false; fillRatings(); } else pump();
      }
      function pump() {
        while (startN < todo.length && (startN - doneN) < POOL) {
          (function (job) { fetchOneRating(job.co, 25000).then(function (res) { fin(job, res); }); })(todo[startN++]);
        }
      }
      pump();
    }
    var cntEl = el("span", "font-size:13px;color:#4f46e5;font-weight:800;white-space:nowrap");
    var panel = srPanel();
    var sortMode = "", _srOrd = 0, srSortEls = {}, srSorting = false;
    var SORTS = [
      { key: "",         label: "↺ 기본순",         tip: "스크랩한 원래 순서로 되돌려요" },
      { key: "commute",  label: "🚇 통근 가까운 순", tip: "통근시간이 짧은 공고부터 — 아직 계산 중이거나 못 구한 줄은 맨 끝" },
      { key: "deadline", label: "⏰ 마감임박순",     tip: "마감이 가까운 공고부터 — 상시채용·이미 마감된 줄은 맨 끝" }
    ];
    function renderSortChips() {
      SORTS.forEach(function (o) {
        var c = srSortEls[o.key]; if (!c) return; var on = sortMode === o.key;
        c.style.cssText = "border:2px solid " + (on ? "#4f46e5" : "#cbd5e1") + ";padding:6px 10px;border-radius:9px;" +
          "font-size:13.5px;font-weight:800;cursor:pointer;white-space:nowrap;background:" + (on ? "#4f46e5" : "#fff") +
          ";color:" + (on ? "#fff" : "#64748b");
        c.textContent = o.label;
        c.title = o.tip;
      });
    }
    function srOrd(li) { return parseInt(li.getAttribute("data-sr-ord") || "0", 10); }
    function dlVal(li) {
      var c = li.getAttribute("data-sr-dl");
      if (c != null) return c === "" ? null : parseInt(c, 10);
      var v = deadlineSortVal(dateText(li));
      li.setAttribute("data-sr-dl", v == null ? "" : String(v));
      return v;
    }
    function sortVal(li) {
      if (sortMode === "commute") { var m = li.getAttribute("data-sr-min"); return m == null ? null : parseInt(m, 10); }
      if (sortMode === "deadline") return dlVal(li);
      return null;
    }
    function reorder() {
      var list = rows(); if (!list.length) return;
      var parent = list[0].parentNode; if (!parent) return;
      srSorting = true;
      try {
        list.forEach(function (li) { if (li.getAttribute("data-sr-ord") == null) li.setAttribute("data-sr-ord", String(_srOrd++)); });
        if (!sortMode) { list.slice().sort(function (a, b) { return srOrd(a) - srOrd(b); }).forEach(function (li) { parent.appendChild(li); }); return; }
        var known = [], unknown = [];
        list.forEach(function (li) { var v = sortVal(li); if (v == null || isNaN(v)) unknown.push(li); else known.push(li); });
        known.sort(function (a, b) { return (sortVal(a) - sortVal(b)) || (srOrd(a) - srOrd(b)); });
        unknown.sort(function (a, b) { return srOrd(a) - srOrd(b); });
        known.forEach(function (li) { parent.appendChild(li); });
        unknown.forEach(function (li) { parent.appendChild(li); });
      } finally { setTimeout(function () { srSorting = false; }, 0); }
    }
    function applySort() { if (sortMode) reorder(); }
    var rowSsr = srRow(panel, "↕ 정렬");
    SORTS.forEach(function (o) {
      var c = el("button"); srSortEls[o.key] = c;
      c.onclick = function () { sortMode = o.key; renderSortChips(); reorder(); };
      rowSsr.appendChild(c);
    });
    renderSortChips();
    var rowTsr = srRow(panel, "🚇 통근");
    srCmRange = numRange(rowTsr, "분", "5", function () { applyFilters(); });
    rowTsr.appendChild(srPendNote);
    var rowR = srRow(panel, "🪐 평점");
    srRtRange = numRange(rowR, "점", "0.1", function () { applyFilters(); });
    rowR.appendChild(srRNote); rowR.appendChild(cntEl); rowR.appendChild(srVerBadge());
    var rowA = srRow(panel, "", true);
    var srScopeNote = el("span", "font-size:12.5px;color:#64748b;font-weight:700;margin-left:auto;white-space:nowrap");
    function visibleRows() { return rows().filter(function (li) { return li.style.display !== "none"; }); }
    var srTools = el("span", "margin-left:auto;display:none;align-items:center;gap:10px");
    var srVisDel = el("button", "border:none;background:#334155;color:#fff;padding:6px 10px;border-radius:9px;font-size:13.5px;font-weight:800;cursor:pointer;white-space:nowrap");
    var srReset = el("button", "border:none;background:none;color:#64748b;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline;padding:0;white-space:nowrap", "필터 초기화");
    srReset.onclick = function () {
      if (srCmRange) srCmRange.clear(); if (srRtRange) srRtRange.clear();
      recount(); applyFilters();
    };
    srTools.appendChild(srVisDel); srTools.appendChild(srReset);
    rowTsr.appendChild(srTools);
    rowTsr.insertBefore(originPicker(function () { __jkLoc.reload(); }), srPendNote);
    function updateSelBtn() {
      if (!srTools) return;
      var on = srTOn() || srROn(), n = visibleRows().length;
      srTools.style.display = on ? "inline-flex" : "none";
      srVisDel.textContent = "🗑 보이는 " + n + "건 삭제";
      srVisDel.style.opacity = n ? "1" : ".45";
      srVisDel.title = "지금 필터에 걸려 보이는 공고만 스크랩에서 한 번에 삭제(확인창에 목록)";
    }
    srVisDel.onclick = function () {
      if (!(srTOn() || srROn())) return;
      var tgt = visibleRows();
      if (!tgt.length) { toast("지금 보이는 공고가 없어요"); return; }
      if (!window.confirm("지금 보이는 공고 " + tgt.length + "건을 스크랩에서 삭제할까요?\n\n" +
          delPreview(tgt.map(function (li) { return srRowInfo(li, "보이는"); })) + "\n\n(필터로 숨은 공고는 안 건드려요)")) return;
      rows().forEach(function (li) { var c = rowChk(li); if (c) c.checked = false; });
      tgt.forEach(function (li) { var c = rowChk(li); if (c) c.checked = true; });
      deleteChecked(tgt.length);
    };
    function nativeDeleteBtn() {
      var bs = [].slice.call(document.querySelectorAll("button,a"));
      for (var i = 0; i < bs.length; i++) {
        var t = (bs[i].innerText || "").replace(/\s+/g, "");
        if (t === "삭제" && /btn_invert|BtnType/.test(bs[i].className || "")) return bs[i];
      }
      return null;
    }
    function unscrapBtn(li) {
      return li.querySelector("button.like_btn") ||
             li.querySelector("[class*='scrap-" + recIdx(li) + "']");
    }
    function srRowDelete(li, btn) {
      var nb = unscrapBtn(li) || li.querySelector("button.delete_scrap_list_btn");
      if (!nb) { toast("이 줄의 스크랩 해제 버튼을 못 찾았어요 — 새로고침 후 다시"); return; }
      var info = srRowInfo(li, "");
      var oc = window.confirm, oa = window.alert;
      window.confirm = function () { return true; }; window.alert = function () {};
      btn.disabled = true; li.style.opacity = ".45";
      var isToggle = nb.matches && nb.matches("button.like_btn, [class*='scrap-']");
      try { nb.click(); } catch (e) {}
      setTimeout(function () {
        window.confirm = oc; window.alert = oa;
        var parent = li.parentNode, next = li.nextSibling;
        li.remove();
        recount(); applyFilters();
        var msg = "🗑 삭제했어요: " + (info.co ? info.co + " — " : "") + (info.title || "").trim().slice(0, 34);
        if (!isToggle) { toast(msg, 2600); return; }
        toastUndo(msg, function (done) {
          if (parent) { if (next && next.parentNode === parent) parent.insertBefore(li, next); else parent.appendChild(li); }
          window.confirm = function () { return true; }; window.alert = function () {};
          try { nb.click(); } catch (e) {}
          setTimeout(function () {
            window.confirm = oc; window.alert = oa;
            li.style.opacity = ""; btn.disabled = false; btn.style.background = "transparent"; btn.style.color = "#94a3b8";
            recount(); applyFilters();
            done(true, "되돌렸어요 ✅");
          }, 700);
        });
      }, 700);
    }
    function srRowDelBtn(li) {
      if (li.querySelector(".jkRowDel")) return;
      (li.querySelector(".col_btns") || li).appendChild(rowDelX(function (b) { srRowDelete(li, b); }));
    }
    function deleteChecked(n) {
      var oc = window.confirm, oa = window.alert;
      window.confirm = function () { return true; }; window.alert = function () {};
      function restore() { setTimeout(function () { window.confirm = oc; window.alert = oa; }, 4000); }
      var nb = nativeDeleteBtn();
      if (nb) {
        try { nb.click(); } finally { restore(); }
        toast("🗑 " + n + "건 삭제 요청했어요", 2200);
        return;
      }
      var tgt = rows().filter(function (li) { var c = rowChk(li); return c && c.checked; });
      var i = 0, okN = 0, miss = 0;
      (function step() {
        if (i >= tgt.length) {
          restore();
          toast("🗑 " + okN + "건 스크랩 해제했어요" + (miss ? (" (버튼 못 찾음 " + miss + "건)") : "") + " — 목록을 새로고침해요", 2600);
          setTimeout(function () { __jkLoc.reload(); }, 1400);
          return;
        }
        var b = unscrapBtn(tgt[i++]);
        if (b) { try { b.click(); okN++; } catch (e) { miss++; } } else miss++;
        setTimeout(step, 420);
      })();
    }
    var delBtn = el("button", "border:none;background:#dc2626;color:#fff;padding:6px 11px;border-radius:9px;font-size:14px;font-weight:800;cursor:pointer;white-space:nowrap");
    function closedRows() { return rows().filter(isClosed); }
    function expRows() { return rows().filter(function (li) { return !!expOnly(careerCell(li, true)); }); }
    function srRowInfo(li, tag) {
      var t = titleLink(li);
      return { tag: tag, co: coName(li), title: t ? (t.getAttribute("title") || t.textContent || "") : "" };
    }
    var srKinds = loadDelKinds();
    function srIsApplied(li) { return /지원\s*완료/.test((li.innerText || "").replace(/\s+/g, " ")); }
    function srIsKind(li, k) {
      if (k === "closed") return isClosed(li);
      if (k === "career") return !!expOnly(careerCell(li, true));
      if (k === "applied") return srIsApplied(li);
      return false;
    }
    function srRowKind(li) {
      for (var i = 0; i < KINDS.length; i++) if (srKinds[KINDS[i].k] && srIsKind(li, KINDS[i].k)) return KINDS[i].lb;
      return "";
    }
    var srKindGrp = delKindsGroup(srKinds, function () { updateDelBtn(); });
    srKindGrp.add(delBtn);
    function updateDelBtn() {
      var all = rows(), n = all.filter(function (li) { return !!srRowKind(li); }).length, counts = {};
      KINDS.forEach(function (x) { counts[x.k] = all.filter(function (li) { return srIsKind(li, x.k); }).length; });
      srKindGrp.paint(counts);
      delBtn.textContent = delKindsLabel(srKinds, n);
      delBtn.style.opacity = (kindStr(srKinds) && n) ? "1" : ".45";
    }
    delBtn.onclick = function () {
      if (!kindStr(srKinds)) { toast("지울 종류(마감·경력직·지원완료)를 하나 이상 켜 주세요"); return; }
      var tgt = [], items = [], by = {};
      KINDS.forEach(function (x) {
        rows().forEach(function (li) {
          if (srRowKind(li) !== x.lb) return;
          tgt.push(li); items.push(srRowInfo(li, x.lb)); by[x.lb] = (by[x.lb] || 0) + 1;
        });
      });
      if (!tgt.length) { toast(kindNames(srKinds) + " 공고가 없어요 ✅"); return; }
      if (!window.confirm("스크랩에서 삭제할까요? (고른 종류: " + kindNames(srKinds) + ")\n" +
          KINDS.filter(function (x) { return by[x.lb]; }).map(function (x) { return "· " + x.lb + " " + by[x.lb] + "건"; }).join("\n") +
          "\n= 총 " + tgt.length + "건\n\n" + delPreview(items) +
          "\n\n(고르지 않은 종류와 신입·경력무관 표기가 있는 공고는 안 지워요)")) return;
      rows().forEach(function (li) { var c = rowChk(li); if (c) c.checked = false; });
      tgt.forEach(function (li) { var c = rowChk(li); if (c) c.checked = true; });
      updateSelBtn();
      deleteChecked(tgt.length);
    };
    rowA.appendChild(srKindGrp.box); rowA.appendChild(srScopeNote);
    function scrapListBox() {
      var b = document.querySelector(".activity_list.basic");
      if (b) return b;
      var r = rows()[0];
      var byRow = r && (r.closest(".activity_list") || r.closest("ul") || r.parentNode);
      if (byRow && !(byRow.closest && byRow.closest(".related"))) return byRow;
      var lists = [].slice.call(document.querySelectorAll(".activity_list"));
      for (var i = 0; i < lists.length; i++) if (!lists[i].classList.contains("related")) return lists[i];
      return null;
    }
    function mount() {
      if (document.getElementById("srBar1")) return;
      var anchor = scrapListBox();
      if (!anchor || !anchor.parentNode || (anchor.closest && anchor.closest(".related"))) return;
      panel.id = "srBar1";
      anchor.parentNode.insertBefore(panel, anchor);
    }
    mount();
    recount(); applyFilters();
    bridgeFetch("https://jk.local/api/commute-map", 8000, "commuteMap").then(function (res) {
      if (!res || !res.ok) return;
      serverUp = true; if (res.origin) cmOrigin = res.origin;
      srCmMap = res.map || {}; paintCommuteCache(); recount();
      fillCommute();
    });
    bridgeFetch("https://jk.local/api/rating-map", 8000, "commuteMap").then(function (res) {
      if (!res || !res.ok || !res.map) return;
      ratingMap = res.map; ratingByCo = res.byCo || {}; ratingMin = res.min || 0; ratingEnabled = res.enabled !== false;
      paintRatings(); recount(); applyFilters(); fillRatings();
    });
    var mo = new MutationObserver(function () {
      if (srSorting) return;
      if (!document.getElementById("srBar1")) mount();
      recount(); applyFilters(); if (serverUp) { paintCommuteCache(); fillCommute(); } if (ratingMap) { paintRatings(); fillRatings(); }
    });
    var host2 = document.querySelector("li.row") && document.querySelector("li.row").parentNode;
    if (host2) mo.observe(host2, { childList: true });
  }
  function initSrSearch(cfg) {
    if (!SEARCH_FEATURES_ON) return;
    cfg = cfg || {};
    var GUARD = cfg.guard || "__srSearch";
    var BAR_ID = cfg.barId || "srSearchBar";
    var SEL_CARD = cfg.card || ".item_recruit";
    var SEL_HIDE = cfg.hide || null;
    var SEL_TITLE = cfg.title || ".job_tit a";
    var SEL_COND = cfg.cond || ".job_condition";
    var anchorOf = cfg.anchor || function () {
      var f = document.querySelector(SEL_CARD);
      return f && (f.closest(".content") || f.parentNode);
    };
    if (window[GUARD]) return; window[GUARD] = true;
    var EXC_KEY = "jkExcludeTitles";
    var load = wordsLocal, save = wordsSave;
    var exc = load(EXC_KEY);
    var cTog = null;
    function cards() { return [].slice.call(document.querySelectorAll(SEL_CARD)); }
    function hideTarget(c) { return (SEL_HIDE && c.closest(SEL_HIDE)) || c; }
    function titleOf(c) {
      var a = c.querySelector(SEL_TITLE);
      return ((a && (a.getAttribute("title") || a.textContent)) || "").replace(/\s+/g, " ").trim().toLowerCase();
    }
    function condOf(c) { var j = c.querySelector(SEL_COND); return j ? (j.innerText || "") : (c.innerText || ""); }
    var cntEl = el("span", "font-size:13px;color:#4f46e5;font-weight:800;white-space:nowrap");
    function apply() {
      var shown = 0, hid = 0, okN = 0, cOn = !!(cTog && cTog.st.on);
      cards().forEach(function (c) {
        var ck = careerKey(condOf(c));
        c.setAttribute("data-sr-ctier", ck);
        if (ck === "ok") okN++;
        var t = titleOf(c);
        var okExc = !exc.some(function (w) { return t.indexOf(w.toLowerCase()) >= 0; });
        var ok = okExc && (!cOn || ck === "ok");
        hideTarget(c).style.display = ok ? "" : "none";
        if (ok) shown++; else hid++;
      });
      if (cTog) cTog.render(okN);
      cntEl.textContent = "표시 " + shown + " · 숨김 " + hid;
    }
    cTog = careerToggle(apply);
    function wordBox(list, key, color) {
      var wrap = el("div", "display:flex;gap:5px;align-items:center;flex-wrap:wrap");
      var inp = el("input");
      inp.type = "text"; inp.placeholder = "문구 입력 후 엔터";
      inp.style.cssText = "border:2px solid " + color + ";border-radius:9px;padding:5px 9px;font-size:13.5px;width:150px;outline:none";
      inp.onkeydown = function (e) {
        if (e.key !== "Enter") return;
        var v = (inp.value || "").trim(); if (!v) return;
        if (list.indexOf(v) < 0) list.push(v);
        save(key, list); inp.value = ""; paint(); apply();
      };
      var chips = el("span", "display:flex;gap:4px;flex-wrap:wrap");
      function paint() {
        chips.innerHTML = "";
        list.forEach(function (w, i) {
          var c = el("button", "border:none;background:" + color + ";color:#fff;padding:4px 8px;border-radius:8px;font-size:12.5px;font-weight:800;cursor:pointer", w + " ✕");
          c.title = "클릭하면 제거";
          c.onclick = function () { list.splice(i, 1); save(key, list); paint(); apply(); };
          chips.appendChild(c);
        });
      }
      paint();
      wrap.repaint = paint;
      wrap.appendChild(inp); wrap.appendChild(chips);
      return wrap;
    }
    var bar = el("div", "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 14px;padding:10px 12px;" +
      "background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif");
    var boxExc = wordBox(exc, EXC_KEY, "#e11d48");
    bar.appendChild(cTog.el);
    bar.appendChild(srLabel("🚫 제외"));
    bar.appendChild(boxExc);
    bar.appendChild(cntEl);
    bar.appendChild(srVerBadge());
    wordsSync([EXC_KEY], function (out) {
      if (out[EXC_KEY]) { exc.length = 0; [].push.apply(exc, out[EXC_KEY]); }
      if (boxExc.repaint) boxExc.repaint();
      apply();
    });
    function mount() {
      if (document.getElementById(BAR_ID)) return;
      var box = anchorOf();
      if (!box || !box.parentNode) return;
      bar.id = BAR_ID;
      box.parentNode.insertBefore(bar, box);
    }
    mount(); apply();
    var busy = false, timer = null;
    var mo = new MutationObserver(function () {
      if (busy) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        busy = true;
        try { mount(); apply(); } finally { setTimeout(function () { busy = false; }, 60); }
      }, 180);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  function runReviewFetcher() {
    var MAXR = REVIEW_MAX, MAXP = 40;
    var cid = (__jkLoc.pathname.match(/\/companies\/(\d+)/) || [])[1] || null;
    try { if (!cid) cid = sessionStorage.getItem("jkFetchActive"); } catch (e) {}
    if (!cid) return;
    try { sessionStorage.setItem("jkFetchActive", cid); } catch (e) {}
    var onReviews = __jkLoc.pathname.indexOf("/companies/" + cid + "/reviews") === 0;
    var rvUrl = __jkLoc.origin + "/companies/" + cid + "/reviews";
    var KEY = "jkFetchAcc:" + cid;
    function getAcc() { try { return JSON.parse(sessionStorage.getItem(KEY) || "null") || { reviews: [] }; } catch (e) { return { reviews: [] }; } }
    function setAcc(a) { try { sessionStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
    function clearAcc() { try { sessionStorage.removeItem(KEY); } catch (e) {} }
    function pageNo() { var m = __jkLoc.search.match(/[?&]page=(\d+)/); return m ? +m[1] : 1; }
    function post(reviews, partial) {
      try {
        var payload = { __jk: "jp", reviews: reviews.slice(0, MAXR), partial: !!partial, rvUrl: rvUrl };
        if (window.opener) ["https://www.jobkorea.co.kr", "https://www.saramin.co.kr",
                            "https://jasoseol.com", "https://www.jasoseol.com"].forEach(function (o) {
          try { window.opener.postMessage(payload, o); } catch (e) {}
        });
      } catch (e) {}
    }
    var LABELS = { "장점": "pros", "단점": "cons", "경영진에 바라는 점": "wish" };
    function chips() {
      var out = [];
      document.querySelectorAll("div,span,dt").forEach(function (e) {
        if (e.children.length <= 1 && LABELS[(e.textContent || "").trim()]) out.push(e);
      });
      return out;
    }
    function blockOf(chip) {
      var cur = chip;
      for (var i = 0; i < 4 && cur; i++) {
        if (String(cur.className || "").indexOf("whitespace-pre-wrap") >= 0) return cur;
        cur = cur.parentElement;
      }
      return chip.parentElement && chip.parentElement.parentElement;
    }
    function collect() {
      var map = [];
      function recOf(card) {
        for (var i = 0; i < map.length; i++) if (map[i][0] === card) return map[i][1];
        var r = {}; map.push([card, r]); return r;
      }
      chips().forEach(function (chip) {
        var label = (chip.textContent || "").trim();
        var block = blockOf(chip); if (!block) return;
        var card = block.parentElement || block;
        var txt = (block.innerText || "").trim();
        if (txt.indexOf(label) === 0) txt = txt.slice(label.length).trim();
        if (txt) recOf(card)[LABELS[label]] = txt;
      });
      var arr = [];
      map.forEach(function (pair) {
        var card = pair[0], rec = pair[1];
        if (!rec.pros && !rec.cons) return;
        var root = (card.parentElement && card.parentElement.parentElement) || card;
        rec.meta = ((root.innerText || "").split("장점")[0] || "").replace(/\s+/g, " ").trim().slice(0, 140);
        if (/현\s*직/.test(rec.meta)) return;
        arr.push(rec);
      });
      return arr;
    }
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      window.scrollTo(0, 600 * tries);
      var got = onReviews ? collect() : [];
      var done = got.length >= 1 && tries >= 3;
      var limit = onReviews ? 20 : 3;
      if (!done && tries <= limit) return;
      clearInterval(iv);
      var acc = getAcc();
      var sig = {};
      acc.reviews.forEach(function (r) { sig[(r.pros || "") + "|" + (r.cons || "")] = 1; });
      var fresh = got.filter(function (r) {
        var k = (r.pros || "") + "|" + (r.cons || "");
        if (sig[k]) return false; sig[k] = 1; return true;
      });
      acc.reviews = acc.reviews.concat(fresh);
      var p = pageNo();
      if (onReviews && fresh.length >= 1 && acc.reviews.length < MAXR && p < MAXP) {
        setAcc(acc);
        post(acc.reviews, true);
        __jkLoc.href = rvUrl + "?page=" + (p + 1) + "&jk_fetch=1";
      } else {
        try { sessionStorage.removeItem("jkFetchActive"); } catch (e) {}
        clearAcc();
        post(acc.reviews, false);
        setTimeout(function () { try { window.close(); } catch (e) {} }, 250);
      }
    }, 450);
  }
  function runJobplanetScraper() {
    var PARENT_OK = /^https:\/\/([a-z0-9-]+\.)*(jobkorea\.co\.kr|saramin\.co\.kr|jasoseol\.com)$/;
    var parentOrigin = "";
    try { var _ao = __jkLoc.ancestorOrigins; if (_ao && _ao.length) parentOrigin = String(_ao[0]); } catch (e) {}
    if (!PARENT_OK.test(parentOrigin)) return;
    function post(m) { try { window.parent.postMessage(Object.assign({ __jk: "jp" }, m), parentOrigin); } catch (e) {} }
    var p = __jkLoc.pathname, se = __jkLoc.search, ha = __jkLoc.hash;
    if (!(/[?&]jk_embed=1/.test(se) || ha.indexOf("jk") >= 0)) return;
    var PAIRS = [["POSCO", "포스코"], ["SOIL", "에스오일"], ["KTG", "케이티앤지"], ["BGF", "비지에프"],
      ["SPC", "에스피씨"], ["IBK", "아이비케이"], ["HDC", "에이치디씨"], ["BNK", "비엔케이"],
      ["DGB", "디지비"], ["KDB", "케이디비"], ["NH", "엔에이치"], ["KB", "케이비"], ["KT", "케이티"],
      ["LG", "엘지"], ["GS", "지에스"], ["SK", "에스케이"], ["CJ", "씨제이"], ["DB", "디비"],
      ["DL", "디엘"], ["LS", "엘에스"], ["LX", "엘엑스"], ["HL", "에이치엘"], ["HD", "에이치디"],
      ["AK", "에이케이"], ["MG", "엠지"], ["OK", "오케이"], ["GC", "지씨"]];
    var LMAP = { A: "에이", B: "비", C: "씨", D: "디", E: "이", F: "에프", G: "지", H: "에이치", I: "아이",
      J: "제이", K: "케이", L: "엘", M: "엠", N: "엔", O: "오", P: "피", Q: "큐", R: "알", S: "에스",
      T: "티", U: "유", V: "브이", W: "더블유", X: "엑스", Y: "와이", Z: "제트" };
    function letterMap(s) { return s.replace(/[A-Z]/g, function (c) { return LMAP[c] || c; }); }
    var WORDS = [["AMOREPACIFIC", "아모레퍼시픽"], ["MARKETKURLY", "마켓컬리"], ["GREENCROSS", "녹십자"],
      ["MIRAEASSET", "미래에셋"], ["OLIVEYOUNG", "올리브영"], ["CELLTRION", "셀트리온"], ["SHINSEGAE", "신세계"],
      ["NETMARBLE", "넷마블"], ["NONGSHIM", "농심"], ["BINGGRAE", "빙그레"], ["PULMUONE", "풀무원"],
      ["KRAFTON", "크래프톤"], ["HYUNDAI", "현대"], ["SAMSUNG", "삼성"], ["NCSOFT", "엔씨소프트"],
      ["COUPANG", "쿠팡"], ["YANOLJA", "야놀자"], ["DAEWOONG", "대웅"], ["HYOSUNG", "효성"], ["MUSINSA", "무신사"],
      ["SHINHAN", "신한"], ["DONGWON", "동원"], ["OTTOGI", "오뚜기"], ["DAESANG", "대상"], ["ZIGZAG", "지그재그"],
      ["DOOSAN", "두산"], ["HANWHA", "한화"], ["HANJIN", "한진"], ["KOLON", "코오롱"], ["LOTTE", "롯데"],
      ["EMART", "이마트"], ["ORION", "오리온"], ["KUMHO", "금호"], ["KYOBO", "교보"], ["WOORI", "우리"],
      ["NAVER", "네이버"], ["KAKAO", "카카오"], ["HANMI", "한미"], ["YUHAN", "유한"], ["NEXON", "넥슨"],
      ["GMARKET", "지마켓"], ["HANSSEM", "한샘"], ["DAEKYO", "대교"], ["KYOWON", "교원"], ["ELAND", "이랜드"],
      ["KURLY", "컬리"], ["TOSS", "토스"], ["LINE", "라인"], ["HANA", "하나"], ["NICE", "나이스"], ["TMON", "티몬"]];
    function wordMap(s) {
      WORDS.forEach(function (pr) {
        if (s === pr[0]) { s = pr[1]; return; }
        if (pr[0].length >= 5) s = s.split(pr[0]).join(pr[1]);
      });
      return s;
    }
    function applyWords(s) { return s.replace(/[A-Z]+/g, function (w) { return wordMap(w); }); }
    function normName(s) {
      s = stripEntityMark(s).replace(/\(주\)|\(유\)|\(재\)|\(사\)|[㈜㈐]|주식회사|\(매장\)/g, "")
        .toUpperCase().replace(/[\s()·,.\-&']/g, "");
      s = applyWords(s);
      PAIRS.forEach(function (pr) { s = s.split(pr[0]).join(pr[1]); });
      return letterMap(s);
    }
    function translitQuery(s) {
      s = stripEntityMark(s).toUpperCase();
      s = applyWords(s);
      PAIRS.forEach(function (pr) { s = s.split(pr[0]).join(pr[1]); });
      return letterMap(s);
    }
    function trimCoSuffix(s) {
      var t = String(s || "").replace(/\s+/g, " ").trim();
      var cut = t.replace(/(그\s*룹|홀딩스|지주|주식회사)\s*$/, "").trim();
      return (cut && cut !== t && cut.length >= 2) ? cut : "";
    }
    function stripSpaces(s) {
      var t = String(s || "").trim();
      var cut = t.replace(/\s+/g, "");
      return (cut && cut !== t && cut.length >= 2) ? cut : "";
    }
    if (p.indexOf("/search") === 0) {
      var q = decodeURIComponent((se.match(/query=([^&]+)/) || [])[1] || "").replace(/\+/g, " ");
      var stage = parseInt((se.match(/[?&]jk_retry=(\d+)/) || [])[1] || "0", 10);
      var q0 = decodeURIComponent((se.match(/[?&]jk_q0=([^&]*)/) || [])[1] || "").replace(/\+/g, " ") || q;
      var nq = normName(q), tries = 0;
      var wantRegion = decodeURIComponent((se.match(/[?&]jk_region=([^&]*)/) || [])[1] || "");
      var wantHq = /[?&]jk_hq=1(&|$)/.test(se);
      window.addEventListener("message", function (ev) {
        var o = String(ev.origin || "");
        if (o !== parentOrigin || ev.source !== window.parent) return;
        if (ev.data && ev.data.__jkRegion) { wantRegion = String(ev.data.__jkRegion); wantHq = ev.data.__jkHq === true; }
      });
      function candidates() {
        var out = [], seen = {}, order = 0;
        document.querySelectorAll('a[href*="/companies/"]').forEach(function (a) {
          var m = (a.getAttribute("href") || "").match(/\/companies\/(\d+)/); if (!m || seen[m[1]]) return;
          seen[m[1]] = 1;
          var own = (a.innerText || "").replace(/\s+/g, " ").trim();
          var rm = own.match(/^(.*?)\s*([1-5]\.[0-9])/);
          if (!rm) return;
          var nm = normName(rm[1]); if (!nm) return;
          var score = (nm === nq) ? 3 : (nm.indexOf(nq) === 0 || nq.indexOf(nm) === 0) ? 2
            : (nm.indexOf(nq) >= 0 || nq.indexOf(nm) >= 0) ? 1 : 0;
          if (!score) return;
          var emp = own.match(/([0-9,]+)\s*명/);
          var hir = own.match(/채용\s*중\s*([0-9]+)/);
          var reg = own.match(/[∙·・]\s*(서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)/);
          out.push({
            id: m[1], name: (rm[1] || "").trim(), rating: rm[2], score: score, order: order++,
            emp: emp ? parseInt(emp[1].replace(/,/g, ""), 10) : 0,
            hiring: hir ? parseInt(hir[1], 10) : 0,
            region: reg ? reg[1] : "",
            text: own.slice(0, 120)
          });
        });
        return out;
      }
      function regScore(c) { if (!wantRegion || !c.region) return 0; return c.region === wantRegion ? 1 : -1; }
      function choose(cs) {
        var top = 0; cs.forEach(function (c) { if (c.score > top) top = c.score; });
        var tied = cs.filter(function (c) { return c.score === top; });
        tied.sort(function (a, b) {
          if (wantHq) { var ha = regScore(a), hb = regScore(b); if (hb !== ha) return hb - ha; }
          if ((b.hiring > 0 ? 1 : 0) !== (a.hiring > 0 ? 1 : 0)) return (b.hiring > 0 ? 1 : 0) - (a.hiring > 0 ? 1 : 0);
          var ga = regScore(a), gb = regScore(b);
          if (gb !== ga) return gb - ga;
          if (b.emp !== a.emp) return b.emp - a.emp;
          var ra = parseFloat(a.rating) > 0 ? 1 : 0, rb = parseFloat(b.rating) > 0 ? 1 : 0;
          if (rb !== ra) return rb - ra;
          return a.order - b.order;
        });
        return { picked: tied[0], tied: tied };
      }
      function goSearch(nextQ, st) {
        __jkLoc.replace("https://www.jobplanet.co.kr/search/companies?query=" + encodeURIComponent(nextQ) +
          "&jk_embed=1&jk_retry=" + st + "&jk_q0=" + encodeURIComponent(q0) +
          (wantRegion ? "&jk_region=" + encodeURIComponent(wantRegion) + (wantHq ? "&jk_hq=1" : "") : ""));
        return true;
      }
      function nextQuery() {
        if (stage < 1) { var tq = translitQuery(q0); if (tq && tq !== q0.toUpperCase() && tq !== q) return goSearch(tq, 1); }
        if (stage < 2) { var sq = trimCoSuffix(q0); if (sq && sq !== q) return goSearch(sq, 2); }
        if (stage < 3) { var pq = stripSpaces(q0); if (pq && pq !== q) return goSearch(pq, 3); }
        return false;
      }
      var lastSig = "", stable = 0;
      var GIVEUP_RENDERED = 12, GIVEUP_BLANK = 24;
      var MIN_TICKS = 5;
      var giveUp = GIVEUP_RENDERED;
      var tm = setInterval(function () {
        tries++;
        var cs = candidates();
        giveUp = document.querySelectorAll('a[href*="/companies/"]').length ? GIVEUP_RENDERED : GIVEUP_BLANK;
        var sig = cs.map(function (c) { return c.id; }).join(",");
        if (sig && sig === lastSig) stable++; else { stable = 0; lastSig = sig; }
        if (cs.length && ((stable >= 2 && tries >= MIN_TICKS) || tries > giveUp)) {
          clearInterval(tm);
          var r = choose(cs);
          if (r.tied.length > 1) {
            try {
              sessionStorage.setItem("jkAmb:" + r.picked.id, JSON.stringify({
                n: r.tied.length, q: q, want: wantRegion,
                picked: { id: r.picked.id, name: r.picked.name, rating: r.picked.rating,
                          emp: r.picked.emp, hiring: r.picked.hiring, region: r.picked.region },
                others: r.tied.slice(1, 5).map(function (c) {
                  return { id: c.id, name: c.name, rating: c.rating, emp: c.emp, hiring: c.hiring, region: c.region };
                })
              }));
            } catch (e) {}
          }
          if (q0 && q0 !== q) {
            try { sessionStorage.setItem("jkAlt:" + r.picked.id, JSON.stringify({ from: q0, to: q })); } catch (e) {}
          }
          post({ earlyCid: r.picked.id });
          __jkLoc.replace("https://www.jobplanet.co.kr/companies/" + r.picked.id + "/reviews#jk");
          return;
        }
        if (tries > giveUp) {
          clearInterval(tm);
          if (!nextQuery()) post({ notFound: true });
        }
      }, 400);
      return;
    }
    if (/\/companies\/\d+\/reviews/.test(p)) {
      var ambCid = (p.match(/\/companies\/(\d+)/) || [])[1];
      var amb = null;
      try {
        var raw = sessionStorage.getItem("jkAmb:" + ambCid);
        if (raw) { amb = JSON.parse(raw); sessionStorage.removeItem("jkAmb:" + ambCid); }
      } catch (e) {}
      var alt = null;
      try {
        var rawAlt = sessionStorage.getItem("jkAlt:" + ambCid);
        if (rawAlt) { alt = JSON.parse(rawAlt); sessionStorage.removeItem("jkAlt:" + ambCid); }
      } catch (e) {}
      var t2 = 0, iv = setInterval(function () {
        t2++; var d = scrape();
        if (d.rating || t2 > 25) {
          clearInterval(iv); d.url = __jkLoc.origin + p;
          post(amb ? { data: d, amb: amb, alt: alt } : { data: d, alt: alt });
        }
      }, 400);
    }
    function scrape() {
      var t = (document.body.innerText || "").replace(/ /g, " ");
      function num(re) { var m = t.match(re); return m ? m[1] : null; }
      var big = null;
      document.querySelectorAll("*").forEach(function (e) {
        if (e.children.length === 0 && /^[1-5]\.[0-9]{1,2}$/.test((e.textContent || "").trim())) {
          var r = e.getBoundingClientRect(), fs = parseFloat(getComputedStyle(e).fontSize) || 0;
          if (r.top < 900 && (!big || fs > big.fs)) big = { v: e.textContent.trim(), fs: fs };
        }
      });
      return {
        rating: big ? big.v : null,
        totalReviewers: num(/통계\s*\(([0-9,]+)명\)/),
        welfare: num(/복지\/급여\s*([1-5]\.[0-9])/),
        worklife: num(/워라밸\s*([1-5]\.[0-9])/),
        culture: num(/사내문화\s*([1-5]\.[0-9])/),
        promotion: num(/승진\s*기회\s*([1-5]\.[0-9])/),
        exec: num(/경영진\s*([1-5]\.[0-9])/),
        recommend: num(/([0-9]+)%\s*기업\s*추천/),
        reviewCnt: num(/리뷰\s*([0-9,]+)/),
        salaryCnt: num(/연봉\s*([0-9,]+)/),
        interviewCnt: num(/면접\s*([0-9,]+)/),
        name: (t.match(/([^\n]{2,25}?)\s*[1-5]\.[0-9]\s/) || [])[1] || null
      };
    }
  }
})();
