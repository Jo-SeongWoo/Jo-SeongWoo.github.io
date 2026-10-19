/* 포트폴리오 «구직 도우미» 체험판 📅 달력 받침 (2026-10-19) — 확장 calview.js 를 그대로 쓰고, 확장에게 묻던 것만 여기서 답한다
 * · 📌 스크랩 공고 = 포트폴리오가 띄운 실제 공고 두 개(녹화한 «캘린더에 담기» 값 — 회사·제목·마감·링크 · rec_cal.js) + 예시 공고 + 이 창에서 직접 넣은 일정(localStorage)
 * · 📅 취업캘린더 = «(예시)» 일정 몇 개 — 사용자의 실제 지원 일정(회사 이름)은 공개 사이트에 싣지 않는다 · 확장처럼 읽기만
 * · 일정 추가 · 오른쪽 클릭 고치기 · 지우기(되돌리기) = 이 브라우저(localStorage)에만 · 구글로는 아무것도 안 보낸다 (확장 v1.74 와 같은 동작)
 * · chrome.tabs.create → 새 탭 · 설정(⚙) → 부모에게 안내만
 * ⚠ 백틱 금지. */
(function () {
  "use strict";
  var KEY = "gjCalDemoAdds", POST_KEY = "gjCalDemoPosts", HIDE_KEY = "gjCalDemoHide";
  //   ADDS = 직접 넣은 일정 [{id, title, day, link, memo}] · POSTS = 고친 공고 {key: 정리한 값} · HIDE = 지운 공고 key 목록
  var C = window.__gjCal || { posts: [] };
  function today() { return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); }
  function plus(ymd, n) { var p = ymd.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10); }
  function rd(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function adds() {                                    // 옛 모양({details})도 읽는다 — 메모만 떼어 낸다
    return (rd(KEY, []) || []).map(function (a) { return a && a.details != null && a.memo == null ? { id: a.id, title: a.title, day: a.day, link: a.link, memo: JKCal.userMemo(a.details) } : a; }).filter(Boolean);
  }
  function toParent(m) { try { window.parent.postMessage(Object.assign({ gjDemo: 1 }, m), "*"); } catch (e) { } }
  var T = today();
  /* 예시 일정 — 실제 지원 일정 아님(오늘 기준으로 앞뒤에 고르게 · 2026-10-19 사용자 «시연창 달력에도 스케줄 몇개 넣어놓자»)
     · 📅 취업캘린더 자리 = 발표·검사·면접 · 📌 스크랩 자리 = 예시 공고(링크 = 그 사이트의 직무 검색 결과 → 잡코리아·사람인 로고가 붙는다) */
  var JK_SEARCH = "https://www.jobkorea.co.kr/Search/?stext=", SR_SEARCH = "https://www.saramin.co.kr/zf_user/search?searchword=";
  var SAMPLE = [
    { uid: "ex1", title: "(예시) △△전자 서류 발표", start: plus(T, -6), end: plus(T, -6), time: "", desc: "합격 — 인적성 검사 안내 메일 확인" },
    { uid: "ex2", title: "(예시) ○○물산 서류 발표", start: plus(T, 3), end: plus(T, 3), time: "", desc: "결과는 채용 사이트에서 확인" },
    { uid: "ex3", title: "(예시) △△전자 인적성 검사", start: plus(T, 6), end: plus(T, 6), time: "10:00", desc: "온라인 · 90분" },
    { uid: "ex4", title: "(예시) ○○물산 1차 면접", start: plus(T, 11), end: plus(T, 11), time: "14:00", desc: "준비물: 신분증 · 포트폴리오 출력본" },
    { uid: "ex5", title: "(예시) □□유통 최종 발표", start: plus(T, 17), end: plus(T, 17), time: "", desc: "" }
  ];
  var SAMPLE_SCRAP = [
    { company: "(예시) △△전자", title: "HR 담당 신입", deadline: plus(T, -2), link: JK_SEARCH + encodeURIComponent("HR 담당") },
    { company: "(예시) ○○물산", title: "경영지원 신입", deadline: plus(T, 5), link: JK_SEARCH + encodeURIComponent("경영지원") },
    { company: "(예시) □□유통", title: "인사총무", deadline: plus(T, 9), link: SR_SEARCH + encodeURIComponent("인사총무") },
    { company: "(예시) ◇◇로지스", title: "물류 운영 관리", deadline: plus(T, 14), link: SR_SEARCH + encodeURIComponent("물류 운영 관리") }
  ];
  /* 공고(📌) — 녹화한 실제 공고 + 예시 공고, 고친 값이 있으면 그 값 · 지운 것은 빼고 */
  function posts() {
    var now = Date.now(), ed = rd(POST_KEY, {}) || {}, hide = rd(HIDE_KEY, []) || [], out = [];
    (C.posts || []).concat(SAMPLE_SCRAP).forEach(function (p) {
      var info = JKCal.clean(p, now);                   // 녹화한 마감 글자(«2026.11.11 23:59»·«상시») → 날짜로 정리(확장 담기와 같은 규칙)
      var key = JKCal.scrapKey(info);
      if (hide.indexOf(key) >= 0) return;
      out.push(Object.assign({ key: key, addedAt: now }, info, ed[key] || {}));
    });
    return out;
  }
  function items(from, to) {
    var out = [];
    posts().forEach(function (x) { var v = JKCal.scrapToView(x); if (v) out.push(v); });
    adds().forEach(function (a) { var v = JKCal.userToView({ key: a.id, title: a.title, day: a.day, link: a.link, memo: a.memo }); if (v) out.push(v); });
    SAMPLE.forEach(function (e) { var v = JKCal.viewItem(e, "job"); if (v) out.push(v); });
    return out.filter(function (v) { return v.end >= from && v.start <= to; });
  }
  var undo = null;                                     // 마지막으로 지운 것(이 창에서만 · 되돌리기)
  function del(it) {
    if (!it || it.src === "job") return { ok: false, err: "취업캘린더 일정은 읽기만 해요 — 구글 캘린더에서 지워 주세요" };
    if (it.kind === "user") {
      var a = adds(), i = -1;
      a.forEach(function (x, j) { if (x.id === it.id) i = j; });
      if (i < 0) return { ok: false, err: "그 일정을 찾지 못했어요" };
      undo = { user: a[i] };
      a.splice(i, 1); wr(KEY, a);
      return { ok: true };
    }
    var hide = rd(HIDE_KEY, []) || [];
    if (hide.indexOf(it.id) < 0) hide.push(it.id);
    undo = { post: it.id };
    wr(HIDE_KEY, hide);
    return { ok: true };
  }
  function undel() {
    if (!undo) return { ok: false, err: "되돌릴 것이 없어요" };
    if (undo.user) { var a = adds(); a.unshift(undo.user); wr(KEY, a); }
    if (undo.post) wr(HIDE_KEY, (rd(HIDE_KEY, []) || []).filter(function (k) { return k !== undo.post; }));
    undo = null;
    return { ok: true };
  }
  function edit(it, v) {
    v = v || {};
    if (!it || it.src === "job") return { ok: false, err: "취업캘린더 일정은 읽기만 해요 — 구글 캘린더에서 고쳐 주세요" };
    if (it.kind === "user") {
      var u = JKCal.userEventInfo(v);
      if (u.err) return { ok: false, err: u.err };
      var a = adds(), hit = false;
      a.forEach(function (x) { if (x.id === it.id) { x.title = u.title; x.day = u.day; x.link = u.link; x.memo = JKCal.clip(String(v.memo || "").trim(), 500); hit = true; } });
      if (!hit) return { ok: false, err: "그 일정을 찾지 못했어요" };
      wr(KEY, a);
      return { ok: true };
    }
    var info = JKCal.clean({ company: v.company, title: v.title, deadline: v.deadline, dlFrom: "user", link: it.link }, Date.now());
    if (!info.company || !info.title) return { ok: false, err: "회사와 공고 제목을 넣어 주세요" };
    if (v.deadline && v.deadline !== "상시" && !info.deadline) return { ok: false, err: "마감일이 이상해요" };
    var ed = rd(POST_KEY, {}) || {};
    ed[it.id] = { company: info.company, title: info.title, deadline: info.deadline };
    if (!info.deadline) ed[it.id].calAt = Date.parse((it.start || T) + "T12:00:00+09:00");   // 마감을 비우면 지금 날짜 칸 그대로
    wr(POST_KEY, ed);
    return { ok: true };
  }
  window.chrome = {
    runtime: {
      id: "gujikdemo", lastError: null,
      sendMessage: function (msg, cb) {
        var r = { ok: false, err: "체험판" }, t = msg && msg.type;
        if (t === "calView") {
          r = { ok: true, ready: true, on: true, need: false, icsSet: true, scrapErr: "", icsErr: "", items: items(String(msg.from), String(msg.to)) };
        } else if (t === "calViewAdd") {
          var u = JKCal.userEventInfo(msg.ev || {});
          if (u.err) r = { ok: false, err: u.err };
          else {
            var list = adds();
            list.push({ id: "add" + Date.now(), title: u.title, day: u.day, link: u.link, memo: JKCal.clip(String((msg.ev || {}).memo || "").trim(), 500) });
            wr(KEY, list.slice(-50));
            r = { ok: true, mode: "gcal" };
          }
        } else if (t === "calViewDel") r = del(msg.it);
        else if (t === "calViewEdit") r = edit(msg.it, msg.v);
        else if (t === "calViewUndo") r = undel();
        setTimeout(function () { if (cb) cb(r); }, 120);
      },
      openOptionsPage: function () { toParent({ t: "note", text: "체험판에서는 설정을 열 수 없어요 — 확장에서는 여기서 구글 계정 연결 · 취업캘린더 주소를 넣어요" }); }
    },
    tabs: { create: function (o) { try { window.open(o.url, "_blank", "noopener"); } catch (e) { } } },
    storage: { local: {
      get: function (k, cb) { var o = {}; try { (Array.isArray(k) ? k : [k]).forEach(function (x) { var v = localStorage.getItem("gjcv:" + x); if (v != null) o[x] = JSON.parse(v); }); } catch (e) { } setTimeout(function () { cb(o); }, 0); },
      set: function (o, cb) { try { Object.keys(o).forEach(function (x) { localStorage.setItem("gjcv:" + x, JSON.stringify(o[x])); }); } catch (e) { } if (cb) setTimeout(cb, 0); }
    } }
  };
})();
