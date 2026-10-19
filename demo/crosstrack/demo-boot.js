(function() {
  "use strict";
  const D = window.__ctDemo;
  const HOUR = 3600 * 1e3;
  const sleep = ms => new Promise((r => setTimeout(r, ms)));
  function extractSourceState(r) {
    if (!r) return {
      ok: false,
      error: "no result"
    };
    if (r.skipped) return {
      skipped: true,
      reason: r.error || "미지원"
    };
    if (!r.ok) return {
      ok: false,
      error: r.error || "error"
    };
    return {
      ok: true,
      lastTraceSig: r.lastTraceSig,
      lastTraceText: r.lastTraceText,
      lastTraceTime: r.lastTraceTime,
      lastTraceTimestamp: r.lastTraceTimestamp,
      statusCategory: r.statusCategory,
      statusLabel: r.statusLabel,
      delivered: !!r.delivered,
      returned: !!r.returned,
      destinationCountry: r.destinationCountry || "",
      detail: r.detail || "",
      allDetails: r.allDetails || [],
      workflowType: r.workflowType || null
    };
  }
  let watchCancel = false;
  let refreshCount = 0;
  function pickAdvance(nums, ratio, min) {
    refreshCount++;
    const cand = nums.filter((n => D.canAdvance(n)));
    const scored = cand.map((n => ({
      n: n,
      h: D.hash(n + ":" + refreshCount) % 1e3
    }))).sort(((a, b) => a.h - b.h));
    const take = Math.min(cand.length, Math.max(min, Math.round(cand.length * ratio)));
    return new Set(scored.slice(0, take).map((x => x.n)));
  }
  async function watchRefresh(opts) {
    const o = opts || {};
    const list = (await chrome.storage.local.get([ "watchList" ])).watchList || [];
    const total = list.length;
    let done = 0;
    watchCancel = false;
    const report = d => {
      if (!o.fast) chrome.runtime.sendMessage({
        cmd: "watchRefreshProgress",
        done: d,
        total: total
      }).catch((() => {}));
    };
    report(0);
    if (!total) return {
      ok: true,
      updates: 0,
      errors: 0,
      done: 0,
      total: 0,
      cancelled: false
    };
    const adv = o.advance || new Set;
    const updates = [];
    const sigKey = s => s ? s.split("|").slice(0, 2).join("|") : "";
    let idx = 0;
    async function worker() {
      for (;;) {
        if (watchCancel) return;
        const i = idx++;
        if (i >= list.length) return;
        const item = list[i];
        if (!o.fast) await sleep(60 + D.hash(item.num) % 90);
        if (adv.has(item.num)) D.advance(item.num);
        const result = D.query(item.num);
        const prev = item.sources || {};
        const marks = {};
        for (const k of [ "epost", "gcss", "icare" ]) {
          const r = result[k];
          if (r && r.ok && r.lastTraceSig) {
            const p = prev[k] && prev[k].lastTraceSig || "";
            if (p && sigKey(p) !== sigKey(r.lastTraceSig)) marks[k] = r.lastTraceText;
          }
        }
        const delivered = result.epost.ok && result.epost.delivered || result.gcss.ok && result.gcss.delivered || result.icare.ok && result.icare.delivered;
        const returned = !!(result.epost.ok && result.epost.returned);
        if (Object.keys(marks).length) updates.push({
          num: item.num,
          marks: marks
        });
        item.sources = {
          epost: extractSourceState(result.epost),
          gcss: extractSourceState(result.gcss),
          icare: extractSourceState(result.icare)
        };
        item.lastChecked = Date.now();
        item.finished = !!(delivered || returned);
        if (result.epost.ok) {
          item.lastTraceSig = result.epost.lastTraceSig;
          item.lastTraceText = result.epost.lastTraceText;
          item.lastTraceTime = result.epost.lastTraceTime;
          item.lastTraceTimestamp = result.epost.lastTraceTimestamp;
          if (result.epost.destinationCountry) item.destinationCountry = result.epost.destinationCountry;
        }
        done++;
        report(done);
      }
    }
    await Promise.all([ worker(), worker(), worker() ]);
    const updated = {};
    list.forEach((it => {
      updated[it.num] = it;
    }));
    const current = (await chrome.storage.local.get([ "watchList" ])).watchList || [];
    for (const cur of current) {
      const up = updated[cur.num];
      if (!up || !up.sources) continue;
      [ "sources", "lastChecked", "finished", "lastTraceSig", "lastTraceText", "lastTraceTime", "lastTraceTimestamp", "destinationCountry" ].forEach((k => {
        if (up[k] !== undefined) cur[k] = up[k];
      }));
    }
    const remaining = new Set(current.map((it => it.num)));
    const marks = (await chrome.storage.local.get([ "newTraceMarks" ])).newTraceMarks || {};
    for (const u of updates) {
      if (!remaining.has(u.num)) continue;
      marks[u.num] = Object.assign(typeof marks[u.num] === "object" && marks[u.num] || {}, u.marks);
    }
    Object.keys(marks).forEach((k => {
      if (!remaining.has(k)) delete marks[k];
    }));
    await chrome.storage.local.set({
      watchList: current,
      lastAutoCheck: Date.now(),
      newTraceMarks: marks
    });
    return {
      ok: true,
      updates: updates.length,
      errors: 0,
      done: done,
      total: total,
      cancelled: watchCancel
    };
  }
  let bulkAdvance = null;
  window.addEventListener("click", (function(e) {
    const t = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!t || t.id !== "bulkRefreshBtn" || t.disabled) return;
    let nums = null;
    try {
      nums = lastBulkNums;
    } catch (_) {
      nums = null;
    }
    if (Array.isArray(nums) && nums.length) bulkAdvance = pickAdvance(nums, .1, 1);
  }), true);
  chrome.runtime.onMessage.addListener((function(msg, _sender, respond) {
    const cmd = msg && msg.cmd;
    if (cmd === "fetchAllSources" || cmd === "fetchTrace") {
      const num = String(msg.num || "").toUpperCase();
      setTimeout((() => {
        if (bulkAdvance && bulkAdvance.has(num)) {
          D.advance(num);
          bulkAdvance.delete(num);
        }
        const r = D.query(num);
        respond(cmd === "fetchTrace" ? r.epost : r);
      }), 60 + D.hash(num) % 120);
      return true;
    }
    if (cmd === "runAutoCheckNow") {
      chrome.storage.local.get([ "watchList" ]).then((d => {
        const nums = (d.watchList || []).map((it => it.num));
        return watchRefresh({
          advance: pickAdvance(nums, .3, 2)
        });
      })).then(respond, (e => respond({
        ok: false,
        error: e.message
      })));
      return true;
    }
    if (cmd === "cancelAutoCheck") {
      watchCancel = true;
      respond({
        ok: true
      });
      return;
    }
    // 발송조건은 실제 ePOST 자료(ems-real.js · 매일 동기화) — 없으면 예전 가상 자료(미국·뉴질랜드)
    const EMS = window.__emsReal && window.__emsReal.list && window.__emsReal.list.length ? window.__emsReal : D.ems;
    if (cmd === "emsCountryList") {
      respond({
        ok: true,
        list: EMS.list
      });
      return;
    }
    if (cmd === "emsCondition") {
      respond(EMS.cond[msg.nation] || {
        ok: false,
        error: "이 나라의 발송조건 자료가 없습니다"
      });
      return;
    }
    if (cmd === "refreshBadge" || cmd === "clearBadge") {
      respond({
        ok: true
      });
    }
  }));
  const SRC_LABEL = {
    epost: "ePOST",
    gcss: "GCSS",
    icare: "iCare"
  };
  window.__ctOpenTrace = function(url) {
    const q = new URLSearchParams(String(url || "").split("?")[1] || "");
    const src = q.get("src") || "";
    const num = (q.get("num") || "").toUpperCase();
    const payload = {
      src: SRC_LABEL[src] || src,
      num: num,
      rows: D.traceRows(num, src)
    };
    return window.__ctOpenLocal("trace.html#" + encodeURIComponent(JSON.stringify(payload)));
  };
  let seedBulk = null, seedWatch = null, seedItems = null;
  async function seed() {
    const results = D.bulkNums.map((num => {
      const all = D.query(num);
      const ep = all.epost;
      return {
        num: num,
        ok: !!ep.ok,
        status: ep.ok ? ep.lastTraceText : ep.error || "(오류)",
        date: ep.lastTraceTime || "",
        deliveryDate: ep.deliveryDate || "",
        delivered: !!ep.delivered,
        returned: !!ep.returned,
        sources: all
      };
    }));
    seedBulk = {
      bulkInput: D.bulkNums.join("\n"),
      bulkResults: results,
      bulkElapsed: null,
      bulkConc: "10"
    };
    await chrome.storage.local.set({
      watchTabs: D.watchTabs,
      activeWatchTab: "__all__",
      watchList: D.watchSeed,
      newTraceMarks: {}
    });
    await watchRefresh({
      fast: true
    });
    D.watchReveal.forEach((n => D.advance(n)));
    await watchRefresh({
      fast: true
    });
    seedWatch = await chrome.storage.local.get([ "watchList", "watchTabs", "activeWatchTab", "newTraceMarks" ]);
    seedItems = D.snapshot(D.bulkNums.concat(D.watchSeed.map((w => w.num))));
    await chrome.storage.session.set(seedBulk);
  }
  function waitFor(fn, timeoutMs) {
    return new Promise((resolve => {
      const t0 = Date.now();
      (function tick() {
        let v = null;
        try {
          v = fn();
        } catch (_) {
          v = null;
        }
        if (v) return resolve(v);
        if (Date.now() - t0 > timeoutMs) return resolve(null);
        setTimeout(tick, 30);
      })();
    }));
  }
  function loadPanel() {
    return new Promise(((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "sidepanel.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("sidepanel.js 를 읽지 못했습니다"));
      document.body.appendChild(s);
    }));
  }
  function setLastBulkNums(nums) {
    try {
      lastBulkNums = nums.slice();
    } catch (_) {}
    const rb = document.getElementById("bulkRefreshBtn");
    if (rb) rb.disabled = false;
  }
  async function showEmiTab() {
    const emiTab = await waitFor((() => document.querySelector('#bulkOut [data-tab="emi"]')), 8e3);
    if (emiTab) emiTab.click();
  }
  function fillSample() {
    const top = document.getElementById("bulkTopArea");
    const hide = document.getElementById("bulkHideToggle");
    if (top && hide && top.style.display === "none") hide.click();
    const inp = document.getElementById("bulkInp");
    if (!inp) return;
    inp.value = D.sampleNums().join("\n");
    inp.dispatchEvent(new Event("input", {
      bubbles: true
    }));
    inp.focus();
  }
  async function refillBulk() {
    D.restore(seedItems);
    await chrome.storage.session.set(seedBulk);
    const inp = document.getElementById("bulkInp");
    if (inp) inp.value = seedBulk.bulkInput;
    await restoreBulkSession();
    setLastBulkNums(D.bulkNums);
    await showEmiTab();
  }
  async function refillWatch() {
    D.restore(seedItems);
    await chrome.storage.local.set(JSON.parse(JSON.stringify(seedWatch)));
  }
  function mkBtn(label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "refresh-btn ct-demo-btn";
    b.textContent = label;
    b.addEventListener("click", (e => {
      e.stopPropagation();
      onClick();
    }));
    return b;
  }
  function watchEmpties() {
    const out = document.getElementById("bulkOut");
    const run = document.getElementById("runBtn");
    const checkBulk = () => {
      if (!out || out.children.length || out.textContent.trim() || run && run.disabled) return;
      const box = document.createElement("div");
      box.className = "ct-demo-empty";
      const p = document.createElement("div");
      p.textContent = "조회 결과가 없습니다.";
      box.appendChild(p);
      box.appendChild(mkBtn("예시 번호 넣기", fillSample));
      box.appendChild(mkBtn("예시 자료 다시 채우기", refillBulk));
      out.appendChild(box);
    };
    if (out) new MutationObserver(checkBulk).observe(out, {
      childList: true
    });
    if (run) new MutationObserver(checkBulk).observe(run, {
      attributes: true,
      attributeFilter: [ "disabled" ]
    });
    checkBulk();
    const wl = document.getElementById("watchList");
    const checkWatch = () => {
      if (!wl) return;
      const em = wl.querySelector(".empty-state");
      let cache = [];
      try {
        cache = watchListCache;
      } catch (_) {
        cache = [];
      }
      if (!em || cache && cache.length || em.querySelector(".ct-demo-btn")) return;
      const row = document.createElement("div");
      row.style.marginTop = "10px";
      row.appendChild(mkBtn("예시 자료 다시 채우기", refillWatch));
      em.appendChild(row);
    };
    if (wl) new MutationObserver(checkWatch).observe(wl, {
      childList: true
    });
    const hdr = document.querySelector("#bulkTopArea .section-hdr");
    if (hdr) hdr.insertBefore(mkBtn("예시 번호 넣기", fillSample), hdr.children[1] || null);
  }
  async function arrange() {
    await showEmiTab();
    const bulkTop = document.getElementById("bulkTopArea");
    const bulkHide = document.getElementById("bulkHideToggle");
    if (bulkTop && bulkHide && bulkTop.style.display !== "none") bulkHide.click();
    const watchTop = document.getElementById("watchTopArea");
    const watchHide = document.getElementById("watchHideToggle");
    if (watchTop && watchHide && watchTop.style.display !== "none") watchHide.click();
    setLastBulkNums(D.bulkNums);
    watchEmpties();
    document.documentElement.setAttribute("data-ct-demo", "ready");
  }
  (async function boot() {
    try {
      await seed();
    } catch (e) {
      console.error("[체험판] 가상 데이터 준비 실패:", e);
    }
    try {
      await loadPanel();
      await arrange();
    } catch (e) {
      console.error("[체험판] 화면 준비 실패:", e);
      document.documentElement.setAttribute("data-ct-demo", "error");
    }
  })();
})();
