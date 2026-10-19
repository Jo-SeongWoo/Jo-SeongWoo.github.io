var JKCal = (function () {
  "use strict";
  var TITLE_MAX = 100, CO_MAX = 40;
  var SITES = ["잡코리아", "사람인", "회사 채용 사이트"];
  var FAR_DAYS = 330;
  var SCRAP_KEY = "jkScraps", SCRAP_MAX = 500, UNDO_KEY = "jkCalUndo";
  var USER_KEY = "jkCalUser", USER_MAX = 300, DEL_UNDO_KEY = "jkCalDelUndo";
  var GCAL_CLIENT_ID = "377851069032-mnpo5t3h2vcc7tvh8a0977ap4o9ii81l.apps.googleusercontent.com";
  var GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
  var GCAL_API = "https://www.googleapis.com/calendar/v3";
  var GCAL_CAL_NAME = "📌 스크랩 공고", GCAL_CAL_DESC = "구직 도우미가 만든 캘린더";
  var GCAL_CAL_KEY = "jkGcalCal", GCAL_ON_KEY = "jkGcalOn", GCAL_NEED_KEY = "jkGcalNeed", GCAL_TOK_KEY = "jkGcalTok";
  function str(v) { return v == null ? "" : String(v); }
  function oneLine(v) { return str(v).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim(); }
  function clip(s, n) {
    var a = Array.from(str(s));
    if (a.length <= n) return a.join("");
    return a.slice(0, Math.max(1, n - 1)).join("").replace(/\s+$/, "") + "…";
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function kstToday(now) { return new Date((now == null ? Date.now() : now) + 9 * 3600 * 1000).toISOString().slice(0, 10); }
  function ymdPlus(ymd, days) {
    var p = ymd.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + days)).toISOString().slice(0, 10);
  }
  function ymdDiff(a, b) {
    function t(x) { var p = x.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
    return Math.round((t(b) - t(a)) / 86400000);
  }
  function isYmd(v) { return /^\d{4}-\d{2}-\d{2}$/.test(str(v)); }
  function validYmd(y, m, d) {
    y = +y; m = +m; d = +d;
    if (!(y >= 2000 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return "";
    if (new Date(Date.UTC(y, m - 1, d)).getUTCMonth() !== m - 1) return "";
    return y + "-" + pad2(m) + "-" + pad2(d);
  }
  function normDeadline(v, now) {
    var s = oneLine(v);
    if (!s) return "";
    var m = s.match(/(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/);
    if (m) return validYmd(m[1], m[2], m[3]);
    if (/상시|채용\s*시\s*(마감|까지)|^채용\s*시$/.test(s)) return "상시";
    m = s.match(/^D\s*-\s*(\d{1,3})$/i);
    if (m) return ymdPlus(kstToday(now), +m[1]);
    if (/^D\s*-\s*day$/i.test(s)) return kstToday(now);
    return "";
  }
  function bracketSafe(s) { return str(s).replace(/\[/g, "(").replace(/\]/g, ")"); }
  function fmtRating(v) {
    var n = parseFloat(oneLine(v).replace(/[^0-9.]/g, ""));
    return (!isNaN(n) && n > 0 && n <= 5) ? n.toFixed(1) : "";
  }
  function linkKey(u) {
    u = oneLine(u);
    if (!/^https?:\/\/[^\s]+$/i.test(u)) return "";
    var m = u.match(/^https?:\/\/(?:www\.|m\.)?jobkorea\.co\.kr\/Recruit\/GI_Read\/(\d+)/i);
    if (m) return "https://www.jobkorea.co.kr/Recruit/GI_Read/" + m[1];
    m = u.match(/^https?:\/\/(?:www\.|m\.)?saramin\.co\.kr\/[^?#]*\?(?:[^#]*&)?rec_idx=(\d+)/i);
    if (m) return "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=" + m[1];
    try {
      var x = new URL(u);
      Array.from(x.searchParams.keys()).forEach(function (k) { if (/^utm_/i.test(k)) x.searchParams.delete(k); });
      x.hash = "";
      return x.href.slice(0, 600);
    } catch (e) { return u.split("#")[0].slice(0, 600); }
  }
  function siteOf(v) { v = oneLine(v); return SITES.indexOf(v) >= 0 ? v : "회사 채용 사이트"; }
  function siteOfUrl(u) {
    u = str(u);
    if (/^https?:\/\/([a-z0-9-]+\.)*jobkorea\.co\.kr\//i.test(u)) return "잡코리아";
    if (/^https?:\/\/([a-z0-9-]+\.)*saramin\.co\.kr\//i.test(u)) return "사람인";
    return "회사 채용 사이트";
  }
  function clean(raw, now) {
    raw = raw || {};
    var dl = normDeadline(raw.deadline, now);
    if (raw.dlFrom === "jsonld" && isYmd(dl) && ymdDiff(kstToday(now), dl) > FAR_DAYS) dl = "";
    return {
      company: clip(oneLine(raw.company), 60),
      title: clip(oneLine(raw.title), 200),
      deadline: dl,
      addr: clip(oneLine(raw.addr).replace(/^(대한민국|한국)\s+/, ""), 150),
      commute: clip(oneLine(raw.commute), 40),
      rating: fmtRating(raw.rating),
      site: siteOf(raw.site),
      link: linkKey(raw.link)
    };
  }
  function eventTitle(info) {
    var co = clip(bracketSafe(oneLine(info.company)), CO_MAX), t = oneLine(info.title);
    return clip("📌 " + (co ? "[" + co + "] " : "") + (t || "공고"), TITLE_MAX);
  }
  function eventDetails(info) {
    var L = ["구직 도우미 스크랩"];
    if (info.deadline === "상시") L.push("마감: 상시"); else if (isYmd(info.deadline)) L.push("마감: " + info.deadline);
    if (info.addr) L.push("근무지: " + info.addr);
    if (info.commute) L.push("통근: " + info.commute);
    if (info.rating) L.push("평점: " + info.rating);
    if (info.site) L.push("사이트: " + info.site);
    if (info.link) L.push("링크: " + info.link);
    return L.join("\n");
  }
  function eventDay(info, now) { return isYmd(info.deadline) ? info.deadline : kstToday(now); }
  function calUrl(rawInfo, now) {
    var info = clean(rawInfo, now), day = eventDay(info, now);
    return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(eventTitle(info)) +
      "&dates=" + day.replace(/-/g, "") + "/" + ymdPlus(day, 1).replace(/-/g, "") +
      "&details=" + encodeURIComponent(eventDetails(info)) +
      (info.addr ? "&location=" + encodeURIComponent(info.addr) : "") +
      "&ctz=Asia/Seoul";
  }
  function newKey() {
    var C = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", a = new Uint8Array(24), s = "";
    crypto.getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += C.charAt(a[i] % C.length);
    return s;
  }
  function gcalClientOk(id) { id = str(id).trim(); return /^[0-9]{6,}-[A-Za-z0-9_]{8,}\.apps\.googleusercontent\.com$/.test(id) ? id : ""; }
  function gcalReady() { return !!gcalClientOk(GCAL_CLIENT_ID); }
  function gcalAuthUrl(clientId, redirectUri, state, silent) {
    return "https://accounts.google.com/o/oauth2/v2/auth?client_id=" + encodeURIComponent(clientId) +
      "&response_type=token&redirect_uri=" + encodeURIComponent(redirectUri) +
      "&scope=" + encodeURIComponent(GCAL_SCOPE) + "&state=" + encodeURIComponent(state) +
      "&prompt=" + (silent ? "none" : "select_account");
  }
  function gcalParseRedirect(u, state, now) {
    u = str(u);
    var i = u.indexOf("#"), q = {};
    var frag = i >= 0 ? u.slice(i + 1) : (u.split("?")[1] || "");
    frag.split("&").forEach(function (kv) {
      var p = kv.split("=");
      if (!p[0]) return;
      try { q[decodeURIComponent(p[0])] = decodeURIComponent(p.slice(1).join("=").replace(/\+/g, " ")); } catch (e) { }
    });
    if (q.error) return { err: oneLine(q.error).slice(0, 60) };
    if (state && q.state !== state) return { err: "state" };
    if (!q.access_token) return { err: "no_token" };
    if (q.scope && q.scope.split(" ").indexOf(GCAL_SCOPE) < 0) return { err: "scope" };
    var sec = parseInt(q.expires_in, 10);
    if (!(sec > 0 && sec < 86400)) sec = 3600;
    return { token: q.access_token, exp: (now == null ? Date.now() : now) + sec * 1000 };
  }
  function gcalEvent(info, now) {
    var day = eventDay(info, now);
    return { summary: eventTitle(info), description: eventDetails(info), location: info.addr || "",
             start: { date: day }, end: { date: ymdPlus(day, 1) }, transparency: "transparent", status: "confirmed" };
  }
  function gcalCalBody() { return { summary: GCAL_CAL_NAME, description: GCAL_CAL_DESC, timeZone: "Asia/Seoul" }; }
  function gcalErrText(r) {
    r = r || {};
    if (r.code === "auth") return "다시 연결이 필요해요 — 설정(⚙)에서 «구글 계정 연결» 을 한 번 더 눌러 주세요";
    if (r.code === "off") return "구글 계정이 연결돼 있지 않아요 — 설정(⚙)에서 «구글 계정 연결»";
    if (r.code === "noclient") return "구글 계정 연결은 준비 중이에요";
    if (r.code === "cancel") return "연결을 마치지 않았어요(창을 닫았거나 «허용» 을 누르지 않았어요)";
    if (r.code === "nocal") return "«" + GCAL_CAL_NAME + "» 캘린더를 만들지 못했어요" + (r.status ? "(HTTP " + r.status + ")" : "");
    if (r.code === "net") return "구글 캘린더에 연결하지 못했어요 — 인터넷 연결을 확인해 주세요";
    if (r.code === "timeout") return "구글 캘린더가 15초 안에 답하지 않았어요";
    if (r.code === "busy") return "구글 캘린더가 잠시 바빠요 — 조금 뒤 다시 눌러 주세요";
    if (r.code === "http") return "구글 캘린더가 오류를 냈어요(HTTP " + (r.status || "?") + ")";
    if (r.code === "gone") return "그 일정이 캘린더에 없어요(이미 지워졌을 수 있어요)";
    return oneLine(r.err) || "구글 캘린더 응답을 못 읽었어요";
  }
  var FIELDS = ["company", "title", "deadline", "addr", "commute", "rating", "site", "link"];
  function scrapKey(info) { return info.link || ("nolink:" + info.company + "|" + info.title); }
  function mergeScrap(list, info, now) {
    list = Array.isArray(list) ? list.slice() : [];
    var t = now == null ? Date.now() : now;
    var key = scrapKey(info);
    var i = -1;
    for (var j = 0; j < list.length; j++) { if (list[j] && list[j].key === key) { i = j; break; } }
    var cur = i >= 0 ? Object.assign({}, list[i]) : { key: key, addedAt: t };
    FIELDS.forEach(function (f) { if (info[f]) cur[f] = info[f]; });
    cur.calAt = t;
    if (i >= 0) list.splice(i, 1);
    list.unshift(cur);
    return list.length > SCRAP_MAX ? list.slice(0, SCRAP_MAX) : list;
  }
  function dday(deadline, now) {
    if (deadline === "상시") return { txt: "상시", cls: "always", n: null };
    if (!isYmd(deadline)) return { txt: "마감일 모름", cls: "none", n: null };
    var n = ymdDiff(kstToday(now), deadline);
    if (n < 0) return { txt: "마감", cls: "past", n: n };
    if (n === 0) return { txt: "D-day", cls: "soon", n: 0 };
    return { txt: "D-" + n, cls: n <= 3 ? "soon" : (n <= 7 ? "near" : "far"), n: n };
  }
  function sortScraps(list, now) {
    function grp(x) { var d = dday(x.deadline, now); return d.n == null ? 1 : (d.n < 0 ? 2 : 0); }
    return (list || []).slice().sort(function (a, b) {
      var ga = grp(a), gb = grp(b);
      if (ga !== gb) return ga - gb;
      if (ga === 0 && a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
      if (ga === 2 && a.deadline !== b.deadline) return a.deadline > b.deadline ? -1 : 1;
      return (b.addedAt || 0) - (a.addedAt || 0);
    });
  }
  function readPage(doc) {
    doc = doc || document;
    var out = { company: "", title: "", deadline: "", dlFrom: "", addr: "", link: "", site: "", commute: "", rating: "", from: [] };
    function s1(v) { return (v == null ? "" : String(v)).replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim(); }
    function meta(p) {
      var e = doc.querySelector('meta[property="' + p + '"]') || doc.querySelector('meta[name="' + p + '"]');
      return e ? s1(e.getAttribute("content")) : "";
    }
    var href = "";
    try { href = String((doc.location && doc.location.href) || ""); } catch (e) { href = ""; }
    out.link = href.split("#")[0];
    try {
      try { doc.dispatchEvent(new CustomEvent("jkCalRefresh")); } catch (e0) { }
      var hb = doc.getElementById("jkCalAddBtn"), hraw = hb && hb.getAttribute("data-jk-cal");
      if (hraw) {
        var ho = JSON.parse(hraw);
        if (ho && typeof ho === "object") {
          ["company", "title", "deadline", "dlFrom", "addr", "link", "site", "commute", "rating"].forEach(function (k) { if (ho[k] != null) out[k] = s1(ho[k]); });
          out.from.push("helper");
          return out;
        }
      }
    } catch (e) { }
    function findJP(o, depth) {
      if (!o || depth > 6 || typeof o !== "object") return null;
      if (Array.isArray(o)) {
        for (var i = 0; i < o.length; i++) { var r = findJP(o[i], depth + 1); if (r) return r; }
        return null;
      }
      var t = o["@type"];
      if (t === "JobPosting" || (Array.isArray(t) && t.indexOf("JobPosting") >= 0)) return o;
      for (var k in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k) || k === "hiringOrganization") continue;
        if (o[k] && typeof o[k] === "object") { var r2 = findJP(o[k], depth + 1); if (r2) return r2; }
      }
      return null;
    }
    function addrOf(a) {
      if (Array.isArray(a)) a = a[0];
      if (!a) return "";
      if (typeof a === "string") return s1(a);
      if (a.address) return addrOf(a.address);
      var st = s1(a.streetAddress), lo = s1(a.addressLocality), rg = s1(a.addressRegion), r = st;
      if (lo && r.indexOf(lo) < 0) r = lo + " " + r;
      if (rg && r.indexOf(rg) < 0) r = rg + " " + r;
      return s1(r);
    }
    var jp = null, lds = doc.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < lds.length && !jp; i++) {
      try { jp = findJP(JSON.parse(lds[i].textContent || "null"), 0); } catch (e) { jp = null; }
    }
    if (jp) {
      out.title = s1(jp.title || jp.name);
      var org = jp.hiringOrganization;
      if (Array.isArray(org)) org = org[0];
      out.company = s1(typeof org === "string" ? org : (org && (org.name || org.legalName)));
      if (jp.validThrough) { out.deadline = s1(jp.validThrough); out.dlFrom = "jsonld"; }
      out.addr = addrOf(jp.jobLocation);
      out.from.push("jsonld");
    }
    var nd = doc.getElementById("__NEXT_DATA__");
    if (nd) {
      var J = null, seen = 0, coCand = "";
      try { J = JSON.parse(nd.textContent || "null"); } catch (e) { J = null; }
      (function walk(o, depth) {
        if (!o || typeof o !== "object" || depth > 14 || ++seen > 40000) return;
        if (Array.isArray(o)) { for (var a = 0; a < o.length; a++) walk(o[a], depth + 1); return; }
        var oi = o.openingsInfo;
        if (oi && typeof oi === "object") {
          if (!out.title && oi.title) out.title = s1(oi.title);
          if (!out.deadline && oi.dueDate) { out.deadline = s1(oi.dueDate); out.dlFrom = "page"; }
          if (out.from.indexOf("nextdata") < 0) out.from.push("nextdata");
        }
        var wp = o.workspacePlace;
        if (!out.addr && wp && typeof wp === "object" && wp.place) out.addr = s1(wp.place + (wp.detailPlace ? " " + wp.detailPlace : ""));
        if (o.footer && typeof o.footer === "object" && o.footer.companyName && !coCand) coCand = s1(o.footer.companyName);
        if (!coCand && typeof o.companyName === "string" && s1(o.companyName)) coCand = s1(o.companyName);
        for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k) && o[k] && typeof o[k] === "object") walk(o[k], depth + 1); }
      })(J, 0);
      if (!out.company && coCand) out.company = coCand;
    }
    function coClean(s) {
      return s1(String(s || "").replace(/\s*(채용\s*(사이트|홈페이지|페이지)?|커리어|careers?|recruit(ing|ment)?|jobs?)\s*$/i, "")
        .replace(/^\s*(채용\s*(사이트|홈페이지)?)\s*[|:\-]\s*/, ""));
    }
    var ogt = meta("og:title") || s1(doc.title), site = meta("og:site_name");
    if (ogt && (!out.title || !out.company)) {
      var bm = ogt.match(/^\[([^\]]{1,40})\]\s*(.+)$/), tt = ogt, cc = "";
      var SITEWORD = /채용\s*(사이트|홈페이지)|careers?\b|recruit(ing|ment)?\b/i;
      if (bm) { cc = bm[1]; tt = bm[2]; }
      else {
        var parts = ogt.split(/\s+[|｜]\s+|\s+[-–—]\s+/);
        if (parts.length >= 2) {
          var left = parts.slice(0, -1).join(" - "), right = parts[parts.length - 1];
          if (SITEWORD.test(left) && !SITEWORD.test(right)) { cc = left; tt = right; }
          else if (Array.from(right).length <= 30) { cc = right; tt = left; }
        }
      }
      tt = s1(tt.replace(/\s*\((D-\d+|상시\s*채용|채용\s*시\s*마감|오늘\s*마감|내일\s*마감)\)\s*$/, ""));
      if (!out.title) out.title = tt;
      if (!out.company) out.company = coClean(site) || coClean(cc);
      if (out.from.indexOf("og") < 0) out.from.push("og");
    }
    if (!out.company && site) out.company = coClean(site);
    if (!out.deadline) {
      var body = doc.body, tx = s1(body && (body.innerText || body.textContent)).slice(0, 300000);
      var LB = /(접수\s*기간|모집\s*기간|지원\s*기간|서류\s*접수\s*기간|접수\s*마감|모집\s*마감|마감\s*일시|마감\s*일|채용\s*기간)/g, mm;
      while ((mm = LB.exec(tx))) {
        var seg = tx.slice(mm.index + mm[0].length, mm.index + mm[0].length + 90);
        if (/^\s*[:：]?\s*(상시|채용\s*시\s*마감)/.test(seg)) { out.deadline = "상시"; out.dlFrom = "text"; break; }
        var ds = seg.match(/20\d{2}\s*[.\-\/년]\s*\d{1,2}\s*[.\-\/월]\s*\d{1,2}/g);
        if (ds && ds.length) { out.deadline = ds.length >= 2 ? ds[1] : ds[0]; out.dlFrom = "text"; break; }
      }
    }
    return out;
  }
  var JOB_ICS_KEY = "jkJobIcs";
  function icsUrlOk(u) {
    u = oneLine(u);
    return /^https:\/\/calendar\.google\.com\/calendar\/ical\/[A-Za-z0-9%._@-]+\/private-[0-9a-f]{16,64}\/basic\.ics$/.test(u) ? u : "";
  }
  function icsUnesc(s) { return str(s).replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim(); }
  function icsTime(v, params) {
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?/.exec(str(v));
    if (!m) return null;
    var d0 = validYmd(m[1], m[2], m[3]);
    if (!d0) return null;
    if (!m[4] || /VALUE=DATE(?!-)/.test(str(params))) return { date: d0, time: "" };
    if (m[7]) {
      var k = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + 9 * 3600 * 1000).toISOString();
      return { date: k.slice(0, 10), time: k.slice(11, 16) };
    }
    return { date: d0, time: m[4] + ":" + m[5] };
  }
  function parseIcs(text) {
    var lines = str(text).replace(/\r?\n[ \t]/g, "").split(/\r?\n/), rows = [], cur = null;
    lines.forEach(function (l) {
      if (l === "BEGIN:VEVENT") { cur = {}; return; }
      if (l === "END:VEVENT") { if (cur) rows.push(cur); cur = null; return; }
      if (!cur) return;
      var i = l.indexOf(":");
      if (i < 0) return;
      var head = l.slice(0, i), semi = head.indexOf(";");
      var key = (semi < 0 ? head : head.slice(0, semi)).toUpperCase();
      if (!Object.prototype.hasOwnProperty.call(cur, key)) cur[key] = { v: l.slice(i + 1), p: semi < 0 ? "" : head.slice(semi + 1) };
    });
    var out = [];
    rows.forEach(function (r) {
      if (!r.DTSTART || (r.STATUS && /CANCELLED/i.test(r.STATUS.v)) || r["RECURRENCE-ID"]) return;
      var s = icsTime(r.DTSTART.v, r.DTSTART.p);
      if (!s) return;
      var e = r.DTEND ? icsTime(r.DTEND.v, r.DTEND.p) : null, end = s.date;
      if (e) {
        if (!s.time) end = ymdPlus(e.date, -1);
        else end = (e.time === "00:00" && e.date > s.date) ? ymdPlus(e.date, -1) : e.date;
        if (end < s.date) end = s.date;
      }
      out.push({ uid: r.UID ? oneLine(r.UID.v) : "", title: r.SUMMARY ? oneLine(icsUnesc(r.SUMMARY.v)) : "", start: s.date, end: end, time: s.time,
                 desc: r.DESCRIPTION ? icsUnesc(r.DESCRIPTION.v) : "", loc: r.LOCATION ? oneLine(icsUnesc(r.LOCATION.v)) : "",
                 url: r.URL ? oneLine(r.URL.v) : "" });
    });
    return out;
  }
  function descLink(desc) {
    var s = str(desc), m = s.match(/(?:^|\n)\s*링크\s*:\s*(https?:\/\/[^\s<>"']+)/), u = m ? m[1] : "";
    if (!u) { m = s.match(/https?:\/\/[^\s<>"']+/); u = m ? m[0] : ""; }
    return /^https?:\/\/[^\s]+$/i.test(u) ? u.slice(0, 600) : "";
  }
  function webLink(u) { u = oneLine(u); return /^https?:\/\/[^\s]+$/i.test(u) ? u.slice(0, 600) : ""; }
  function viewItem(o, src) {
    o = o || {};
    var start = isYmd(o.start) ? o.start : "";
    if (!start) return null;
    var end = isYmd(o.end) && o.end >= start ? o.end : start;
    if (ymdDiff(start, end) > 62) end = ymdPlus(start, 62);
    var link = webLink(o.link) || webLink(o.url) || descLink(o.desc), site = link ? siteOfUrl(link) : "";
    return { src: src === "job" ? "job" : "scrap", id: clip(oneLine(o.id || o.uid), 200),
             title: clip(oneLine(o.title).replace(/^📌\s*/, "") || "(제목 없음)", 120), start: start, end: end,
             time: /^\d{2}:\d{2}$/.test(str(o.time)) ? o.time : "", link: link,
             site: (site === "잡코리아" || site === "사람인") ? site : "",
             memo: clip(str(o.desc).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim(), 600),
             loc: clip(oneLine(o.loc), 150) };
  }
  function kstOfIso(t) {
    var n = Date.parse(str(t));
    if (isNaN(n)) return null;
    var k = new Date(n + 9 * 3600 * 1000).toISOString();
    return { date: k.slice(0, 10), time: k.slice(11, 16) };
  }
  function tagView(v, from, kind, more) {
    if (!v) return null;
    v.from = from; v.kind = kind;
    Object.keys(more || {}).forEach(function (k) { v[k] = more[k]; });
    return v;
  }
  function userMemo(desc) {
    return str(desc).replace(/\r/g, "").replace(/^구직 도우미 일정\n?/, "").replace(/(?:^|\n)링크\s*:\s*\S+\s*$/, "").trim();
  }
  function gcalToView(ev) {
    ev = ev || {};
    if (ev.status === "cancelled") return null;
    var s = ev.start || {}, e = ev.end || {}, o = { id: ev.id, title: ev.summary, desc: ev.description, loc: ev.location };
    if (isYmd(s.date)) { o.start = s.date; o.end = isYmd(e.date) ? ymdPlus(e.date, -1) : s.date; }
    else {
      var a = kstOfIso(s.dateTime), b = kstOfIso(e.dateTime);
      if (!a) return null;
      o.start = a.date; o.time = a.time;
      o.end = b ? ((b.time === "00:00" && b.date > a.date) ? ymdPlus(b.date, -1) : b.date) : a.date;
    }
    var d = str(ev.description);
    if (/^구직 도우미 스크랩/.test(d)) {
      var m = oneLine(ev.summary).replace(/^📌\s*/, "").match(/^(?:\[([^\]]*)\]\s*)?(.*)$/) || [], dm = d.match(/(?:^|\n)마감\s*:\s*(상시|\d{4}-\d{2}-\d{2})/);
      return tagView(viewItem(o, "scrap"), "gcal", "post", { co: oneLine(m[1]), pt: oneLine(m[2]), dl: dm ? dm[1] : "" });
    }
    return tagView(viewItem(o, "scrap"), "gcal", "user", { um: clip(userMemo(d), 500) });
  }
  function scrapToView(x) {
    x = x || {};
    var info = { company: x.company, title: x.title, deadline: x.deadline, addr: x.addr, commute: x.commute, rating: x.rating, site: x.site, link: x.link };
    var day = eventDay(info, x.calAt || x.addedAt);
    return tagView(viewItem({ id: x.key, title: eventTitle(info), start: day, end: day, link: x.link, desc: eventDetails(info), loc: x.addr }, "scrap"),
      "local", "post", { co: oneLine(x.company), pt: oneLine(x.title), dl: x.deadline === "상시" || isYmd(x.deadline) ? x.deadline : "" });
  }
  function userToView(x) {
    x = x || {};
    var u = userEventInfo({ title: x.title, date: x.day, link: x.link, memo: x.memo });
    if (u.err) return null;
    return tagView(viewItem({ id: x.key, title: u.title, start: u.day, end: u.day, link: u.link, desc: u.details }, "scrap"), "local", "user", { um: clip(str(x.memo), 500) });
  }
  function userEventInfo(raw) {
    raw = raw || {};
    var title = clip(oneLine(raw.title), TITLE_MAX), day = isYmd(raw.date) ? raw.date : "";
    var lk = oneLine(raw.link), link = lk ? linkKey(lk) : "", memo = clip(str(raw.memo).replace(/\r/g, "").trim(), 500);
    if (!title) return { err: "제목을 넣어 주세요" };
    if (!day) return { err: "날짜가 이상해요" };
    if (lk && !link) return { err: "링크는 https:// 로 시작하는 주소만 넣을 수 있어요" };
    var L = ["구직 도우미 일정"];
    if (memo) L.push(memo);
    if (link) L.push("링크: " + link);
    return { title: title, day: day, link: link, details: L.join("\n") };
  }
  function userGcalEvent(u) {
    return { summary: u.title, description: u.details, start: { date: u.day }, end: { date: ymdPlus(u.day, 1) }, transparency: "transparent", status: "confirmed" };
  }
  function userCalUrl(u) {
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(u.title) +
      "&dates=" + u.day.replace(/-/g, "") + "/" + ymdPlus(u.day, 1).replace(/-/g, "") +
      "&details=" + encodeURIComponent(u.details) + "&ctz=Asia/Seoul";
  }
  function monthCells(y, m) {
    var first = new Date(Date.UTC(y, m - 1, 1)), dow = first.getUTCDay(), out = [];
    var days = new Date(Date.UTC(y, m, 0)).getUTCDate(), weeks = Math.ceil((dow + days) / 7);
    for (var i = 0; i < weeks * 7; i++) out.push(new Date(Date.UTC(y, m - 1, 1 - dow + i)).toISOString().slice(0, 10));
    return out;
  }
  function viewDedupe(list) {
    var seen = {}, out = [];
    (list || []).forEach(function (v) {
      if (!v) return;
      var k = v.src + "|" + (v.link ? v.link : v.title + "|" + v.start);
      if (seen[k]) return;
      seen[k] = 1; out.push(v);
    });
    return out;
  }
  return {
    JOB_ICS_KEY: JOB_ICS_KEY, icsUrlOk: icsUrlOk, parseIcs: parseIcs, descLink: descLink, viewItem: viewItem, gcalToView: gcalToView,
    scrapToView: scrapToView, userToView: userToView, userMemo: userMemo, USER_KEY: USER_KEY, USER_MAX: USER_MAX, DEL_UNDO_KEY: DEL_UNDO_KEY,
    userEventInfo: userEventInfo, userGcalEvent: userGcalEvent, userCalUrl: userCalUrl, monthCells: monthCells,
    viewDedupe: viewDedupe, ymdDiff: ymdDiff,
    TITLE_MAX: TITLE_MAX, SITES: SITES, FAR_DAYS: FAR_DAYS, SCRAP_KEY: SCRAP_KEY, SCRAP_MAX: SCRAP_MAX, UNDO_KEY: UNDO_KEY,
    GCAL_CLIENT_ID: GCAL_CLIENT_ID, GCAL_SCOPE: GCAL_SCOPE, GCAL_API: GCAL_API, GCAL_CAL_NAME: GCAL_CAL_NAME,
    GCAL_CAL_KEY: GCAL_CAL_KEY, GCAL_ON_KEY: GCAL_ON_KEY, GCAL_NEED_KEY: GCAL_NEED_KEY, GCAL_TOK_KEY: GCAL_TOK_KEY,
    oneLine: oneLine, clip: clip, kstToday: kstToday, ymdPlus: ymdPlus, normDeadline: normDeadline, linkKey: linkKey,
    siteOf: siteOf, siteOfUrl: siteOfUrl, clean: clean, eventTitle: eventTitle, eventDetails: eventDetails, eventDay: eventDay,
    calUrl: calUrl, newKey: newKey, gcalClientOk: gcalClientOk, gcalReady: gcalReady, gcalAuthUrl: gcalAuthUrl,
    gcalParseRedirect: gcalParseRedirect, gcalEvent: gcalEvent, gcalCalBody: gcalCalBody, gcalErrText: gcalErrText,
    scrapKey: scrapKey, mergeScrap: mergeScrap, dday: dday, sortScraps: sortScraps, readPage: readPage
  };
})();
