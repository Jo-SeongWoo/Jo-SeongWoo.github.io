/* 포트폴리오 «구직 도우미» 체험판 사이드바 — 확장 없이 실제 확장 코드(content.js)를 돌리는 받침 (2026-10-19)
 * 사용자 *"포트폴리오 화면에서는 설치없이 모든 기능이 작동했으면 좋겠는데"* · *"실제 자료 그대로가 필요"*
 * · 이 페이지(side_jk.html · side_sr.html) = 실제 공고 화면의 «글자 뼈대»(record_gujik.py 가 녹화) + 이 받침 + 녹화(rec_*.js) + 확장 content.js(주소 읽기만 바꾼 사본)
 * · 확장 코드가 바깥에 묻던 것 넷을 «녹화한 답» 으로 돌려준다:
 *   ① 확장 중계(window.postMessage __jkBridge) ② 공고 사이트 직접 요청(fetch) ③ 숨은 잡플래닛 창의 메시지 ④ 지금 주소(__jkLoc)
 * · 📅 달력 = 부모(포트폴리오)에게 «달력 열기» 를 알린다 — 달력은 부모가 왼쪽 큰 자리에 띄운다(cal-demo.html).
 * · 바깥으로 보내는 요청은 없다(잡플래닛 창은 빈 창으로 바꿔 끼운다).
 * ⚠ 백틱 금지(빌드 주석 제거기와 같은 규칙). */
(function () {
  "use strict";
  var R = window.__gjRec || {};
  var U;
  try { U = new URL(String(R.finalUrl || R.url || "").split("#")[0]); } catch (e) { U = new URL("https://www.jobkorea.co.kr/"); }

  /* ④ 지금 주소 — 확장 코드는 location.* 대신 이걸 읽는다(빌드가 바꿔 끼운다) */
  window.__jkLoc = {
    href: U.href, hostname: U.hostname, host: U.host, pathname: U.pathname, search: U.search, hash: "", origin: U.origin, protocol: U.protocol,
    ancestorOrigins: [],
    reload: function () { location.reload(); },
    assign: function (u) { try { window.open(u, "_blank", "noopener"); } catch (e) { } },
    replace: function (u) { try { window.open(u, "_blank", "noopener"); } catch (e) { } }
  };

  /* 사이드바가 이 창을 꽉 채우게(체험판 창 폭 = 사이드바 폭) · 처음엔 펼친 상태 */
  try {
    localStorage.setItem("jkJpW", String(Math.max(300, window.innerWidth)));
    if (!sessionStorage.getItem("gjInit")) { localStorage.setItem("jkJpCollapsed", "0"); sessionStorage.setItem("gjInit", "1"); }
  } catch (e) { }
  /* 확장은 사이드바를 창 폭의 85%까지만 넓힌다(공고 화면을 가리지 않게) — 체험판 창은 사이드바만 보이는 자리라 꽉 채운다(글씨 배율 zoom 도 반영) */
  function fill() {
    var s = document.getElementById("jkJpSide");
    if (!s) return false;
    var want = Math.round(window.innerWidth / (parseFloat(s.style.zoom) || 1)) + "px";
    if (s.style.width !== want) s.style.width = want;
    return true;
  }
  window.addEventListener("resize", fill);
  (function watch() {
    if (!fill()) { setTimeout(watch, 100); return; }
    new MutationObserver(fill).observe(document.getElementById("jkJpSide"), { attributes: true, attributeFilter: ["style"] });
  })();

  function norm(o) {                                 // 요청을 비교할 열쇠 — id·종류 표시는 빼고
    var c = {};
    Object.keys(o || {}).sort().forEach(function (k) { if (k !== "__jkBridge" && k !== "id" && o[k] !== undefined && o[k] !== null) c[k] = o[k]; });
    return JSON.stringify(c);
  }
  /* 느슨한 열쇠 — 공고 뼈대 글자가 조금 달라도(주소 꼬리 등) 같은 공고 한 건의 녹화이므로 «종류 + 주소 경로(물음표 앞)» 가 같으면 같은 요청으로 본다 */
  function loose(o) {
    var kind = o.kind || "jpFetch", u = String(o.url || "").split("?")[0];
    if (kind === "kvGet" || kind === "kvSet" || kind === "kvDel") return "";
    return kind + "|" + u;
  }
  var BR = {}, BL = {};                              // 열쇠 → [답…] (같은 요청이 여러 번이면 순서대로)
  (R.bridge || []).forEach(function (x) {
    var k = norm(x.req), l = loose(x.req);
    (BR[k] = BR[k] || []).push(x.res);
    if (l) (BL[l] = BL[l] || []).push(x.res);
  });
  function take(q) { return q.length > 1 ? q.shift() : q[0]; }
  var KV = {};                                       // kv* = 이 창의 메모리(녹화에 없는 것)

  function reply(id, res, ms) {
    setTimeout(function () { window.postMessage({ __jkBridge: "res", id: id, res: res }, "*"); }, ms == null ? 120 : ms);
  }
  function routeOf(addr) {
    var r = R.route || {};
    if (addr && r[addr]) return r[addr];
    var ks = Object.keys(r);
    return ks.length ? r[ks[0]] : "";
  }
  function toParent(m) { try { window.parent.postMessage(Object.assign({ gjDemo: 1, site: R.site || "" }, m), "*"); } catch (e) { } }

  /* ① 확장 중계 */
  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (ev.source !== window || !d || d.__jkBridge !== "req") return;
    var kind = d.kind || "jpFetch", id = d.id;
    if (kind === "calView") { toParent({ t: "calView" }); reply(id, { ok: true, state: "toggled" }, 0); return; }
    if (kind === "calCard") { toParent({ t: "note", text: "체험판에서는 담기 카드를 열 수 없어요 — 확장을 설치하면 공고를 구글 캘린더에 바로 담아요" }); reply(id, { ok: true }, 0); return; }
    if (kind === "openTab" && /^https:\/\//.test(d.url || "")) { try { window.open(d.url, "_blank", "noopener"); } catch (e) { } reply(id, { ok: true }, 0); return; }
    if (kind === "openRoute") { var ru = routeOf(d.addr); if (ru) { try { window.open(ru, "_blank", "noopener"); } catch (e) { } } reply(id, { ok: !!ru }, 0); return; }
    if (kind === "openSettings") { toParent({ t: "note", text: "체험판에서는 설정을 열 수 없어요 — 출발 위치는 «서울시청» 으로 정해 두었어요" }); reply(id, { ok: true }, 0); return; }
    var k = norm(d), q = BR[k], l = loose(d), ql = l ? BL[l] : null;
    if (q && q.length) { reply(id, take(q)); return; }
    if (ql && ql.length) { reply(id, take(ql)); return; }
    if (kind === "kvGet") { var o = {}; (d.keys || []).forEach(function (x) { if (x in KV) o[x] = KV[x]; }); reply(id, { ok: true, data: o }); return; }
    if (kind === "kvSet") { Object.keys(d.data || {}).forEach(function (x) { KV[x] = d.data[x]; }); reply(id, { ok: true }); return; }
    if (kind === "kvDel") { (d.keys || []).forEach(function (x) { delete KV[x]; }); reply(id, { ok: true }); return; }
    if (kind === "cmSelect") { reply(id, { ok: true }); return; }
    (window.__gjMiss = window.__gjMiss || []).push(k);
    reply(id, { ok: false, err: "체험판 — 녹화에 없는 요청" });
  });

  /* ② 공고 사이트 직접 요청(확장 코드가 부른 것) — 녹화한 답 */
  var FE = (R.fetches || []).slice(), of = window.fetch;
  window.fetch = function (input, init) {
    var u = typeof input === "string" ? input : (input && input.url) || "", abs = u;
    try { abs = new URL(u, U.href).href; } catch (e) { }
    var m = (init && init.method) || "GET", body = init && typeof init.body === "string" ? init.body : "";
    for (var i = 0; i < FE.length; i++) {
      var f = FE[i];
      if (f.u === abs && f.m === m && (f.b || "") === body) {
        return new Promise(function (res) { setTimeout(function () { res(new Response(f.t, { status: f.st || 200, headers: { "Content-Type": "text/html; charset=utf-8" } })); }, 150); });
      }
    }
    if (/^https?:\/\/([a-z0-9-]+\.)*(jobkorea\.co\.kr|saramin\.co\.kr)\//.test(abs)) return Promise.reject(new TypeError("체험판 — 녹화에 없는 요청"));
    return of.apply(this, arguments);
  };

  /* ③ 숨은 잡플래닛 창 — 빈 창으로 바꿔 끼우고, 그 창이 보냈던 메시지를 녹화 순서·간격(줄여서)대로 다시 보낸다 */
  var desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src"), jpPlayed = false;
  Object.defineProperty(HTMLIFrameElement.prototype, "src", {
    configurable: true, enumerable: desc.enumerable,
    get: function () { return this.getAttribute("data-gj-src") || desc.get.call(this); },
    set: function (v) {
      v = String(v);
      if (/^https:\/\/([a-z0-9-]+\.)*jobplanet\.co\.kr\//.test(v)) {
        this.setAttribute("data-gj-src", v);
        desc.set.call(this, "about:blank");
        if (!jpPlayed && /\/search\/companies\?/.test(v)) {
          jpPlayed = true;
          var base = (R.jp && R.jp.length) ? R.jp[0].at : 0;
          (R.jp || []).forEach(function (x) {
            setTimeout(function () {
              window.dispatchEvent(new MessageEvent("message", { data: x.data, origin: x.origin || "https://www.jobplanet.co.kr" }));
            }, 400 + Math.round((x.at - base) * 0.4));
          });
        }
        return;
      }
      desc.set.call(this, v);
    }
  });

  /* 공고 화면 뼈대는 사이드바 아래에 깔려만 있다(사이드바가 글자를 읽는 곳) — 위를 흰 판으로 덮는다(사이드바·🪐 다시 열기 단추는 그 위) */
  function cover() {
    if (document.getElementById("gjCover")) return;
    var c = document.createElement("div");
    c.id = "gjCover";
    c.style.cssText = "position:fixed;inset:0;z-index:2147482000;background:#f1f5f9;display:flex;align-items:center;justify-content:center;" +
      "font:14px 'Malgun Gothic',sans-serif;color:#64748b;text-align:center;padding:20px";
    c.textContent = "사이드바를 접었어요 — 오른쪽 🪐 를 누르면 다시 열려요";
    document.body.appendChild(c);
  }
  if (document.body) cover(); else document.addEventListener("DOMContentLoaded", cover);
})();
