try {
  document.title = chrome.runtime.getManifest().name || "CrossTrack";
} catch (_) {}

const BASE_URL = "";

function traceUrl(source, num) {
  if (!source || !num) return null;
  return "trace.html?src=" + encodeURIComponent(source) + "&num=" + encodeURIComponent(num);
}

function openTraceTab(source, num) {
  const url = traceUrl(source, num);
  if (url) chrome.tabs.create({
    url: url,
    active: false
  });
}

function makeTraceLineLinkable(line, source, num, onOpen) {
  const lab = line.firstElementChild;
  const origLabelColor = lab ? lab.style.color : "";
  line.style.cursor = "pointer";
  line.style.borderRadius = "3px";
  line.title = source + " 조회 페이지 열기 (새 탭, 백그라운드)";
  line.addEventListener("mouseenter", (() => {
    line.style.background = "#ebf8ff";
    line.style.color = "#2196F3";
    if (lab) lab.style.color = "#2196F3";
  }));
  line.addEventListener("mouseleave", (() => {
    line.style.background = "";
    line.style.color = "";
    if (lab) lab.style.color = origLabelColor;
  }));
  line.addEventListener("click", (e => {
    e.stopPropagation();
    openTraceTab(source, num);
    if (onOpen) onOpen(source);
  }));
}

function fmtDate(s) {
  return s ? s.split(/\s+/)[0] : "";
}

let toastTimer = null;

function showCopyToast(text) {
  const el = document.getElementById("copyToast");
  if (!el) return;
  el.textContent = text || "✓ 복사됨";
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout((() => el.classList.remove("show")), 1500);
}

async function checkOne(num) {
  const url = BASE_URL;
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buf);
    const doc = (new DOMParser).parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");
    let et = null, si = -1, di = -1;
    for (const t of tables) {
      const trs = Array.from(t.querySelectorAll("tr"));
      if (trs.length === 0) continue;
      const cells = Array.from(trs[0].querySelectorAll("th, td"));
      const idx = cells.findIndex((c => c.textContent.trim().includes("처리현황")));
      if (idx >= 0) {
        et = t;
        si = idx;
        di = cells.findIndex((c => {
          const x = c.textContent.trim();
          return x.includes("일시") || x.includes("시각") || x.includes("일자") || x.includes("시간");
        }));
        if (di < 0 && si > 0) di = 0;
        break;
      }
    }
    if (!et) return {
      num: num,
      status: "(테이블 없음)",
      date: "",
      deliveryDate: "",
      delivered: false,
      returned: false,
      ok: false
    };
    const rows = Array.from(et.querySelectorAll("tr")).slice(1).map((r => {
      const c = Array.from(r.querySelectorAll("td"));
      return {
        date: di >= 0 && c[di] ? c[di].textContent.trim().replace(/\s+/g, " ") : "",
        status: (c[si] ? c[si].textContent : "").trim().replace(/\s+/g, " ")
      };
    })).filter((r => r.status));
    let deliveryDate = "";
    for (const r of rows) {
      if (r.status.includes("배달완료")) deliveryDate = r.date;
    }
    const latest = rows[rows.length - 1] || {
      date: "",
      status: "(없음)"
    };
    return {
      num: num,
      status: latest.status,
      date: latest.date,
      deliveryDate: deliveryDate,
      delivered: rows.some((r => r.status.includes("배달완료"))),
      returned: rows.some((r => r.status.includes("반송"))),
      ok: true
    };
  } catch (e) {
    return {
      num: num,
      status: "오류:" + e.message,
      date: "",
      deliveryDate: "",
      delivered: false,
      returned: false,
      ok: false
    };
  }
}

const selectedBulkNums = new Set;

let lastClickedBulkNum = null;

function refreshSelectionUI() {
  document.querySelectorAll("#bulkOut .watch-item").forEach((el => {
    const num = el.dataset.num;
    if (selectedBulkNums.has(num)) {
      el.style.outline = "2px solid #2196F3";
      el.style.outlineOffset = "-1px";
      el.style.background = "#ebf8ff";
    } else {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.background = "";
    }
  }));
}

function handleCardSelect(num, e) {
  if (e.shiftKey && lastClickedBulkNum) {
    const visibleNums = Array.from(document.querySelectorAll("#bulkOut .watch-item")).map((el => el.dataset.num)).filter(Boolean);
    const i1 = visibleNums.indexOf(lastClickedBulkNum);
    const i2 = visibleNums.indexOf(num);
    if (i1 >= 0 && i2 >= 0) {
      const [a, b] = i1 < i2 ? [ i1, i2 ] : [ i2, i1 ];
      selectedBulkNums.clear();
      for (let i = a; i <= b; i++) selectedBulkNums.add(visibleNums[i]);
    }
  } else if (e.ctrlKey || e.metaKey) {
    if (selectedBulkNums.has(num)) selectedBulkNums.delete(num); else selectedBulkNums.add(num);
    lastClickedBulkNum = num;
  } else {
    if (selectedBulkNums.size === 1 && selectedBulkNums.has(num)) {
      selectedBulkNums.clear();
      lastClickedBulkNum = null;
    } else {
      selectedBulkNums.clear();
      selectedBulkNums.add(num);
      lastClickedBulkNum = num;
    }
  }
  refreshSelectionUI();
}

const selectedWatchNums = new Set;

let lastClickedWatchNum = null;

function refreshWatchSelectionUI() {
  document.querySelectorAll("#watchList .watch-item").forEach((el => {
    const num = el.dataset.num;
    if (selectedWatchNums.has(num)) {
      el.style.outline = "2px solid #2196F3";
      el.style.outlineOffset = "-1px";
      el.style.background = "#ebf8ff";
    } else {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.background = "";
    }
  }));
}

function handleWatchCardSelect(num, e) {
  if (e.shiftKey && lastClickedWatchNum) {
    const visibleNums = Array.from(document.querySelectorAll("#watchList .watch-item")).map((el => el.dataset.num)).filter(Boolean);
    const i1 = visibleNums.indexOf(lastClickedWatchNum);
    const i2 = visibleNums.indexOf(num);
    if (i1 >= 0 && i2 >= 0) {
      const [a, b] = i1 < i2 ? [ i1, i2 ] : [ i2, i1 ];
      selectedWatchNums.clear();
      for (let i = a; i <= b; i++) selectedWatchNums.add(visibleNums[i]);
    }
  } else if (e.ctrlKey || e.metaKey) {
    if (selectedWatchNums.has(num)) selectedWatchNums.delete(num); else selectedWatchNums.add(num);
    lastClickedWatchNum = num;
  } else {
    if (selectedWatchNums.size === 1 && selectedWatchNums.has(num)) {
      selectedWatchNums.clear();
      lastClickedWatchNum = null;
    } else {
      selectedWatchNums.clear();
      selectedWatchNums.add(num);
      lastClickedWatchNum = num;
    }
  }
  refreshWatchSelectionUI();
}

function makeWorkflowBadge(type) {
  if (!type) return null;
  const t = String(type).toUpperCase();
  let bg = "#EEEDFE", fg = "#3C3489", bd = "#CECBF6";
  if (t === "NOT" || t === "NQ" || t === "NR") {
    bg = "#F1EFE8";
    fg = "#5F5E5A";
    bd = "#D3D1C7";
  } else if (/Q$/.test(t)) {
    bg = "#E6F1FB";
    fg = "#0C447C";
    bd = "#B5D4F4";
  } else if (/R$/.test(t)) {
    bg = "#E1F5EE";
    fg = "#085041";
    bd = "#9FE1CB";
  }
  const b = document.createElement("span");
  b.style.cssText = `display:inline-block;background:${bg};color:${fg};border:1px solid ${bd};font-size:10px;font-weight:bold;padding:0 5px;border-radius:3px;font-family:sans-serif;letter-spacing:0.3px;user-select:none;flex-shrink:0;line-height:1.5;vertical-align:middle`;
  b.textContent = type;
  b.title = "행방조사 워크플로우 — 가장 최근 단계";
  return b;
}

function mkItem(r, showStat, hideDate, onDelete) {
  const rw = document.createElement("div");
  rw.className = "watch-item";
  rw.dataset.num = r.num;
  if (selectedBulkNums.has(r.num)) {
    rw.style.outline = "2px solid #2196F3";
    rw.style.outlineOffset = "-1px";
    rw.style.background = "#ebf8ff";
  }
  rw.style.cursor = "pointer";
  rw.addEventListener("click", (e => {
    handleCardSelect(r.num, e);
  }));
  const top = document.createElement("div");
  top.className = "watch-row";
  const leftGroup = document.createElement("div");
  leftGroup.style.cssText = "display:flex;align-items:center;gap:5px;flex:1;min-width:0";
  const num = document.createElement("span");
  num.className = "watch-num";
  num.textContent = r.num;
  num.title = "클릭하여 복사";
  num.addEventListener("click", (e => {
    e.stopPropagation();
    function fb() {
      num.style.background = "#48bb78";
      num.style.color = "#fff";
      setTimeout((() => {
        num.style.background = "#edf2f7";
        num.style.color = "#2d3748";
      }), 400);
      showCopyToast("✓ " + r.num + " 복사됨");
    }
    navigator.clipboard.writeText(r.num).then(fb).catch((() => {
      const ta = document.createElement("textarea");
      ta.value = r.num;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch (_) {}
      document.body.removeChild(ta);
      fb();
    }));
  }));
  leftGroup.appendChild(num);
  const dest = r.sources && r.sources.epost && r.sources.epost.destinationCountry;
  if (dest) {
    const dn = document.createElement("span");
    dn.style.cssText = "background:#bee3f8;color:#2c5282;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:3px;font-family:sans-serif;letter-spacing:0.5px;user-select:none;flex-shrink:0";
    dn.textContent = dest;
    dn.title = "도착국 (ePOST 기준)";
    leftGroup.appendChild(dn);
  }
  top.appendChild(leftGroup);
  if (onDelete) {
    const right = document.createElement("div");
    right.className = "watch-right";
    const del = document.createElement("button");
    del.className = "watch-del";
    del.textContent = "×";
    del.title = "이 결과 카드 삭제 (입력칸에서도 빠져서 새로고침 시 제외됨)";
    del.addEventListener("click", (e => {
      e.stopPropagation();
      onDelete(r);
    }));
    right.appendChild(del);
    top.appendChild(right);
  }
  rw.appendChild(top);
  if (r.sources) {
    const sub = document.createElement("div");
    sub.style.cssText = "padding-left:2px;font-size:12px;color:#4a5568;display:flex;flex-direction:column;gap:2px;margin-top:5px;font-weight:normal";
    const SUB = [ {
      k: "epost",
      l: "ePOST"
    }, {
      k: "gcss",
      l: "GCSS"
    }, {
      k: "icare",
      l: "iCare"
    } ];
    let latestKey = null, latestTs = 0;
    for (const sdef of SUB) {
      const s = r.sources[sdef.k];
      if (s && s.ok === true && s.lastTraceTimestamp && s.lastTraceTimestamp > latestTs) {
        latestTs = s.lastTraceTimestamp;
        latestKey = sdef.k;
      }
    }
    for (const sdef of SUB) {
      const s = r.sources[sdef.k];
      const line = document.createElement("div");
      line.style.cssText = "display:flex;gap:5px;align-items:baseline";
      if (sdef.k === latestKey) line.style.fontWeight = "600";
      const traceWrap = document.createElement("div");
      traceWrap.style.cssText = "display:inline-flex;gap:5px;align-items:baseline;min-width:0;max-width:100%";
      const lab = document.createElement("span");
      lab.style.cssText = "font-family:monospace;font-weight:600;color:#718096;min-width:48px;flex-shrink:0;font-size:11px";
      lab.textContent = "[" + sdef.l + "]";
      traceWrap.appendChild(lab);
      if (s && s.ok === true && (sdef.k === "gcss" || sdef.k === "icare") && s.workflowType) {
        const wb = makeWorkflowBadge(s.workflowType);
        if (wb) traceWrap.appendChild(wb);
      }
      const t = document.createElement("span");
      if (!s || s.skipped || s.ok === false) {
        t.textContent = "—";
        t.style.color = "#a0aec0";
      } else if (s.ok === true) {
        const traceSpan = document.createElement("span");
        traceSpan.textContent = s.lastTraceText || "";
        t.appendChild(traceSpan);
        if (s.lastTraceTime) {
          const dateSpan = document.createElement("span");
          dateSpan.style.whiteSpace = "nowrap";
          dateSpan.textContent = " · " + fmtTraceTime(s.lastTraceTime);
          t.appendChild(dateSpan);
        }
      } else {
        t.textContent = "—";
        t.style.color = "#a0aec0";
      }
      traceWrap.appendChild(t);
      line.appendChild(traceWrap);
      if (!(s && s.skipped)) {
        makeTraceLineLinkable(traceWrap, sdef.k, r.num);
      }
      sub.appendChild(line);
    }
    rw.appendChild(sub);
  }
  return rw;
}

function flashFoundCard(card) {
  if (!card) return;
  if (!document.getElementById("ct-flash-style")) {
    const st = document.createElement("style");
    st.id = "ct-flash-style";
    st.textContent = "@keyframes ctCardFlash{" + "0%{background-color:rgba(244,67,54,0)}" + "18%{background-color:rgba(244,67,54,0.2)}" + "100%{background-color:rgba(244,67,54,0)}}" + ".ct-card-flash{animation:ctCardFlash 1.1s ease-out 1}";
    document.head.appendChild(st);
  }
  card.classList.remove("ct-card-flash");
  void card.offsetWidth;
  card.classList.add("ct-card-flash");
  clearTimeout(card._flashTimer);
  card._flashTimer = setTimeout((() => card.classList.remove("ct-card-flash")), 1200);
}

function renderResults(out, results, elapsed, opts) {
  let preservedTab = opts && opts.initialTab || null;
  if (!preservedTab) {
    const activeTabEl = out.querySelector("[data-tab]");
    if (activeTabEl) {
      const all = out.querySelectorAll("[data-tab]");
      for (const el of all) {
        if (el.style.background === "rgb(33, 150, 243)") {
          preservedTab = el.getAttribute("data-tab");
          break;
        }
      }
    }
  }
  out.innerHTML = "";
  document.querySelectorAll(".crosstrack-country-filter-popup").forEach((el => el.remove()));
  selectedBulkNums.clear();
  lastClickedBulkNum = null;
  function onDelete(r) {
    if (!r) return;
    const idx = results.findIndex((x => x && x.num === r.num));
    if (idx >= 0) results.splice(idx, 1);
    if (typeof lastBulkResults !== "undefined" && lastBulkResults && lastBulkResults !== results) {
      const lidx = lastBulkResults.findIndex((x => x && x.num === r.num));
      if (lidx >= 0) lastBulkResults.splice(lidx, 1);
    }
    removeBulkNums(r.num);
    let curTab = "all";
    const all = out.querySelectorAll("[data-tab]");
    for (const el of all) {
      if (el.style.background === "rgb(33, 150, 243)") {
        curTab = el.getAttribute("data-tab");
        break;
      }
    }
    renderResults(out, results, elapsed, {
      initialTab: curTab
    });
    saveBulkSession();
  }
  function hasKrInDetails(r) {
    if (!r || !r.sources) return false;
    const dest = r.sources.epost && r.sources.epost.destinationCountry || r.destinationCountry || "";
    if (dest === "KR") return false;
    const allD = [];
    const g = r.sources.gcss, i = r.sources.icare;
    if (g) {
      if (g.allDetails && g.allDetails.length) allD.push(...g.allDetails); else if (g.detail) allD.push(g.detail);
    }
    if (i) {
      if (i.allDetails && i.allDetails.length) allD.push(...i.allDetails); else if (i.detail) allD.push(i.detail);
    }
    return allD.some((d => d.slice(4).toUpperCase().includes("KR")));
  }
  function classifyByGcss(r) {
    if (!r || !r.ok) return "other";
    if (r.delivered && r.returned) return "returnDelivered";
    if (r.returned) return "returnArrived";
    if (!r.returned && hasKrInDetails(r)) return "returning";
    const events = r.sources && r.sources.gcss && r.sources.gcss.events || [];
    const MAIN_TYPES = new Set([ "RD", "EMD", "EDB", "EME", "EDC", "EMH", "EMI", "EDX" ]);
    const mainEvs = events.filter((e => MAIN_TYPES.has(e.eventType)));
    if (mainEvs.length === 0) return "other";
    const latestCode = mainEvs[mainEvs.length - 1].eventType;
    if (latestCode === "EDX") return "edx";
    if (latestCode === "EMI") return "emi";
    if (latestCode === "EMH") return "emh";
    if (latestCode === "EDC") return "edc";
    if (latestCode === "EDB" || latestCode === "EME") return "edbeme";
    if (latestCode === "EMD") return "emd";
    if (latestCode === "RD") return "rd";
    return "other";
  }
  const buckets = {
    rd: [],
    emd: [],
    edbeme: [],
    edc: [],
    emh: [],
    emi: [],
    edx: [],
    returning: [],
    returnArrived: [],
    returnDelivered: [],
    other: []
  };
  results.forEach((r => {
    if (!r) return;
    const cat = classifyByGcss(r);
    buckets[cat].push(r);
  }));
  buckets.returnDelivered.forEach((r => {
    r.returnSubLabel = "반송배달";
  }));
  buckets.returnArrived.forEach((r => {
    r.returnSubLabel = "반송도착";
  }));
  buckets.returning.forEach((r => {
    r.returnSubLabel = "반송진행";
  }));
  const tp = results.filter((r => r)).length;
  const tabBar = document.createElement("div");
  tabBar.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px;border-bottom:2px solid #2196F3;position:sticky;top:0;background:#fff;z-index:10;padding:10px 0 0;flex-shrink:0";
  const panelArea = document.createElement("div");
  panelArea.style.cssText = "overflow:hidden";
  const tabList = [];
  function addTab(name, label, panel) {
    const tab = document.createElement("span");
    tab.style.cssText = "flex:1;min-width:0;text-align:center;padding:5px 8px;background:#edf2f7;cursor:pointer;border-radius:4px 4px 0 0;font-size:11px;font-weight:bold;color:#4a5568;border:1px solid #cbd5e0;border-bottom:0;font-family:sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    tab.textContent = label;
    tab.setAttribute("data-tab", name);
    tab.title = label;
    tabBar.appendChild(tab);
    panel.style.display = "none";
    panelArea.appendChild(panel);
    tabList.push({
      name: name,
      tab: tab,
      panel: panel
    });
  }
  function fitHeights() {
    const bulkOut = document.getElementById("bulkOut");
    if (!bulkOut || !bulkOut.contains(out)) return;
    const panel = bulkOut.parentElement;
    if (!panel) return;
    let siblingH = 0;
    for (const ch of panel.children) {
      if (ch !== bulkOut) siblingH += ch.offsetHeight;
    }
    const cs = getComputedStyle(panel);
    const padH = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const targetH = Math.max(0, panel.clientHeight - siblingH - padH);
    bulkOut.style.height = targetH + "px";
    const totalH = bulkOut.clientHeight;
    if (totalH <= 0) return;
    const tabH = tabBar.offsetHeight;
    const remain = Math.max(0, totalH - tabH);
    panelArea.style.height = remain + "px";
    const activePanel = tabList.find((t => t.tab.style.background === "rgb(33, 150, 243)"));
    if (activePanel && activePanel.panel) {
      activePanel.panel.style.height = remain + "px";
      const children = activePanel.panel.children;
      if (children.length >= 2) {
        let topH = 0;
        for (let i = 0; i < children.length - 1; i++) topH += children[i].offsetHeight;
        children[children.length - 1].style.height = remain - topH + "px";
      }
    }
  }
  function activate(name) {
    tabList.forEach((t => {
      if (t.name === name) {
        t.tab.style.background = "#2196F3";
        t.tab.style.color = "#fff";
        t.panel.style.display = "block";
      } else {
        t.tab.style.background = "#edf2f7";
        t.tab.style.color = "#4a5568";
        t.panel.style.display = "none";
      }
    }));
    requestAnimationFrame(fitHeights);
  }
  if (window._crosstrackResizeBound !== true) {
    window._crosstrackResizeBound = true;
  }
  window.addEventListener("resize", fitHeights);
  const bulkHideBtn = document.getElementById("bulkHideToggle");
  if (bulkHideBtn) bulkHideBtn.addEventListener("click", (() => requestAnimationFrame(fitHeights)));
  out._fitHeights = fitHeights;
  tabBar.addEventListener("click", (e => {
    let t = e.target;
    while (t && t !== tabBar) {
      const n = t.getAttribute && t.getAttribute("data-tab");
      if (n) {
        activate(n);
        return;
      }
      t = t.parentElement;
    }
  }));
  const allPanel = document.createElement("div");
  allPanel.style.cssText = "font-size:12px;font-family:monospace;white-space:pre-wrap;line-height:1.5;color:#2d3748;overflow-y:auto";
  let aT = "=".repeat(40) + "\n";
  aT += `GCSS 종적 기반 분류 (총 ${tp}개${elapsed ? ", " + elapsed + "초" : ""})\n`;
  aT += "=".repeat(40) + "\n";
  const sections = [ {
    key: "rd",
    title: "RD (상대국도착)"
  }, {
    key: "emd",
    title: "EMD (교환국도착)"
  }, {
    key: "edbeme",
    title: "세관계류 (EDB·EME)"
  }, {
    key: "edc",
    title: "세관탈출 (EDC)"
  }, {
    key: "emh",
    title: "배달시도 (EMH)"
  }, {
    key: "emi",
    title: "정상배달 (EMI)"
  }, {
    key: "edx",
    title: "EDX (반송결정)"
  }, {
    key: "returning",
    title: "반송진행"
  }, {
    key: "returnArrived",
    title: "반송도착"
  }, {
    key: "returnDelivered",
    title: "반송배달"
  }, {
    key: "other",
    title: "기타"
  } ];
  for (const s of sections) {
    const arr = buckets[s.key];
    aT += `\n■ ${s.title} — ${arr.length}개\n`;
    if (arr.length === 0) aT += "   (없음)\n"; else arr.forEach((r => {
      const dt = fmtDate(r.deliveryDate || r.date);
      aT += `   ${r.num}${dt ? "  [" + dt + "]" : ""}${r.status ? "  (" + r.status + ")" : ""}\n`;
    }));
  }
  allPanel.textContent = aT;
  addTab("all", `전체(${tp})`, allPanel);
  function makeCatContent(items, showStat, hideDate, sortMode, onDelete) {
    const p = document.createElement("div");
    p.style.cssText = "font-size:13px";
    if (items.length === 0) {
      const em = document.createElement("div");
      em.textContent = "(없음)";
      em.style.cssText = "color:#999;padding:6px 4px;font-size:13px";
      p.appendChild(em);
    } else {
      let kwInput;
      if (sortMode === "details") {
        const filterBox = document.createElement("div");
        filterBox.style.cssText = "margin:0 0 8px;display:flex;flex-direction:column;gap:6px";
        const detailsOf = r => {
          const arr = [];
          if (r && r.sources) {
            const g = r.sources.gcss, i = r.sources.icare;
            if (g) {
              if (g.allDetails && g.allDetails.length) arr.push(...g.allDetails); else if (g.detail) arr.push(g.detail);
            }
            if (i) {
              if (i.allDetails && i.allDetails.length) arr.push(...i.allDetails); else if (i.detail) arr.push(i.detail);
            }
          }
          return arr;
        };
        kwInput = document.createElement("input");
        kwInput.type = "text";
        kwInput.placeholder = "Details 검색 (포함된 글자)";
        kwInput.style.cssText = "width:100%;padding:5px 26px 5px 8px;border:1px solid #cbd5e0;border-radius:3px;font-size:12px;font-family:monospace;box-sizing:border-box";
        kwInput.addEventListener("input", (() => {
          updateClearBtn();
          render();
        }));
        const inputWrap = document.createElement("div");
        inputWrap.style.cssText = "position:relative";
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.textContent = "×";
        clearBtn.title = "검색어 지우기";
        clearBtn.style.cssText = "position:absolute;right:4px;top:50%;transform:translateY(-50%);background:transparent;border:0;color:#a0aec0;cursor:pointer;font-size:16px;font-weight:bold;padding:0 5px;line-height:1;display:none";
        clearBtn.onmouseenter = () => {
          clearBtn.style.color = "#2d3748";
        };
        clearBtn.onmouseleave = () => {
          clearBtn.style.color = "#a0aec0";
        };
        clearBtn.onclick = () => {
          kwInput.value = "";
          updateClearBtn();
          render();
          kwInput.focus();
        };
        function updateClearBtn() {
          clearBtn.style.display = kwInput.value ? "block" : "none";
        }
        inputWrap.appendChild(kwInput);
        inputWrap.appendChild(clearBtn);
        filterBox.appendChild(inputWrap);
        const presetBox = document.createElement("div");
        presetBox.style.cssText = "display:flex;flex-wrap:wrap;gap:4px";
        function addPreset(label, kw) {
          const b = document.createElement("button");
          b.textContent = label;
          b.style.cssText = "background:#edf2f7;color:#2d3748;border:1px solid #cbd5e0;padding:3px 9px;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;font-family:sans-serif";
          b.onmouseenter = () => {
            b.style.background = "#e2e8f0";
          };
          b.onmouseleave = () => {
            b.style.background = "#edf2f7";
          };
          b.onclick = () => {
            kwInput.value = kw;
            updateClearBtn();
            render();
          };
          presetBox.appendChild(b);
        }
        addPreset("Item returned to sender", "Item returned to sender");
        filterBox.appendChild(presetBox);
        p.appendChild(filterBox);
        kwInput._detailsOf = detailsOf;
      }
      const sorted = [ ...items ].sort(((a, b) => {
        const tsOf = r => {
          if (!r || !r.sources) return 0;
          if (sortMode === "details") {
            const g = r.sources.gcss && r.sources.gcss.lastTraceTimestamp || 0;
            const i = r.sources.icare && r.sources.icare.lastTraceTimestamp || 0;
            return Math.max(g, i);
          }
          const e = r.sources.epost && r.sources.epost.lastTraceTimestamp || 0;
          const g = r.sources.gcss && r.sources.gcss.lastTraceTimestamp || 0;
          const i = r.sources.icare && r.sources.icare.lastTraceTimestamp || 0;
          return Math.max(e, g, i);
        };
        const aTs = tsOf(a), bTs = tsOf(b);
        if (aTs === 0 && bTs === 0) return 0;
        if (aTs === 0) return 1;
        if (bTs === 0) return -1;
        return bTs - aTs;
      }));
      const listBox = document.createElement("div");
      if (sortMode === "details") listBox.style.cssText = "overflow-y:auto;min-height:0";
      p.appendChild(listBox);
      function render() {
        listBox.innerHTML = "";
        let view = sorted;
        if (sortMode === "details") {
          const kw = (kwInput.value || "").trim().toUpperCase();
          if (kw) {
            view = sorted.filter((r => kwInput._detailsOf(r).some((d => d.toUpperCase().includes(kw)))));
          }
          if (view.length === 0) {
            const em = document.createElement("div");
            em.textContent = "(조건에 맞는 항목 없음)";
            em.style.cssText = "color:#a0aec0;padding:8px 4px;font-size:12px;font-style:italic";
            listBox.appendChild(em);
            return;
          }
        }
        view.forEach((r => listBox.appendChild(mkItem(r, showStat, hideDate, onDelete))));
      }
      render();
    }
    return p;
  }
  function makeCatPanel(items, showStat, hideDate, sortMode, onDelete) {
    const wrapper = document.createElement("div");
    if (sortMode === "details" || items.length === 0) {
      return makeCatContent(items, showStat, hideDate, sortMode, onDelete);
    }
    const subEms = items.filter((r => r && /^E/i.test(r.num)));
    const subReg = items.filter((r => r && /^[RLC]/i.test(r.num)));
    const subBar = document.createElement("div");
    subBar.style.cssText = "display:flex;gap:3px;margin:0 0 6px;flex-wrap:nowrap;flex-shrink:0";
    const copyBtn = document.createElement("button");
    copyBtn.style.cssText = "flex:1;min-width:0;padding:5px 10px;background:#edf2f7;color:#2d3748;border:1px solid #cbd5e0;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;font-family:sans-serif";
    copyBtn.onmouseenter = () => {
      if (!copyBtn.disabled) copyBtn.style.background = "#e2e8f0";
    };
    copyBtn.onmouseleave = () => {
      copyBtn.style.background = "#edf2f7";
    };
    const subContent = document.createElement("div");
    subContent.style.cssText = "flex:1;min-height:0;overflow-y:auto";
    let currentItems = items;
    function updateCopyBtn() {
      const n = currentItems.length;
      copyBtn.textContent = `📋 등기번호 일괄 복사 (${n}개)`;
      copyBtn.title = "GCSS 검색창에 그대로 붙여넣으면 한 번에 조회 가능 (등기번호;등기번호; 형식)";
      copyBtn.disabled = n === 0;
      copyBtn.style.opacity = n === 0 ? "0.5" : "1";
      copyBtn.style.cursor = n === 0 ? "default" : "pointer";
    }
    copyBtn.onclick = () => {
      if (currentItems.length === 0) return;
      const tsOf = r => {
        if (!r || !r.sources) return 0;
        const e = r.sources.epost && r.sources.epost.lastTraceTimestamp || 0;
        const g = r.sources.gcss && r.sources.gcss.lastTraceTimestamp || 0;
        const i = r.sources.icare && r.sources.icare.lastTraceTimestamp || 0;
        return Math.max(e, g, i);
      };
      const ordered = [ ...currentItems ].sort(((a, b) => {
        const aTs = tsOf(a), bTs = tsOf(b);
        if (aTs === 0 && bTs === 0) return 0;
        if (aTs === 0) return 1;
        if (bTs === 0) return -1;
        return bTs - aTs;
      }));
      const text = ordered.map((r => r.num)).join(";") + ";";
      function fb() {
        copyBtn.style.background = "#48bb78";
        copyBtn.style.color = "#fff";
        copyBtn.style.borderColor = "#48bb78";
        setTimeout((() => {
          copyBtn.style.background = "#edf2f7";
          copyBtn.style.color = "#2d3748";
          copyBtn.style.borderColor = "#cbd5e0";
        }), 600);
        showCopyToast(`✓ ${ordered.length}개 등기번호 복사됨`);
      }
      navigator.clipboard.writeText(text).then(fb).catch((() => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (_) {}
        document.body.removeChild(ta);
        fb();
      }));
    };
    let subBase = items;
    let filterCodes = null;
    let filterAllOptions = [];
    function countryOf(r) {
      return r && r.sources && r.sources.epost && r.sources.epost.destinationCountry || "";
    }
    const filterWrap = document.createElement("div");
    filterWrap.style.cssText = "position:relative;flex-shrink:0";
    const filterBtn = document.createElement("button");
    filterBtn.type = "button";
    filterBtn.style.cssText = "height:100%;padding:5px 8px;background:#edf2f7;color:#4a5568;border:1px solid #cbd5e0;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;font-family:sans-serif;white-space:nowrap;user-select:none";
    filterBtn.title = "도착국 약호로 거르기 — 체크하면 그 국가만, 해제하면 그 국가만 제외 (엑셀 필터처럼)";
    filterWrap.appendChild(filterBtn);
    function isFiltering() {
      if (!filterCodes) return false;
      return filterAllOptions.some((o => !filterCodes.has(o.code)));
    }
    function refreshFilterBtn() {
      if (isFiltering()) {
        const onN = filterAllOptions.filter((o => filterCodes.has(o.code))).length;
        filterBtn.textContent = `국가(${onN}) ▾`;
        filterBtn.style.background = "#2196F3";
        filterBtn.style.color = "#fff";
        filterBtn.style.borderColor = "#2196F3";
      } else {
        filterBtn.textContent = "국가 ▾";
        filterBtn.style.background = "#edf2f7";
        filterBtn.style.color = "#4a5568";
        filterBtn.style.borderColor = "#cbd5e0";
      }
    }
    let _cfPopup = null;
    function closeFilterPopup() {
      if (_cfPopup) {
        _cfPopup.remove();
        _cfPopup = null;
      }
      document.removeEventListener("mousedown", _cfOnDown, true);
      document.removeEventListener("keydown", _cfOnKey, true);
      window.removeEventListener("resize", closeFilterPopup);
      subContent.removeEventListener("scroll", closeFilterPopup);
    }
    function _cfOnDown(e) {
      if (_cfPopup && !_cfPopup.contains(e.target) && e.target !== filterBtn) closeFilterPopup();
    }
    function _cfOnKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeFilterPopup();
      }
    }
    function openFilterPopup() {
      closeFilterPopup();
      const pop = document.createElement("div");
      pop.className = "crosstrack-country-filter-popup";
      pop.style.cssText = "position:fixed;z-index:99999;background:#fff;border:1px solid #cbd5e0;border-radius:5px;box-shadow:0 4px 14px rgba(0,0,0,0.18);font-family:sans-serif;font-size:12px;min-width:150px;max-width:210px;overflow:hidden";
      const searchWrap = document.createElement("div");
      searchWrap.style.cssText = "padding:8px;border-bottom:1px solid #e2e8f0";
      const search = document.createElement("input");
      search.type = "text";
      search.placeholder = "약호 검색…";
      search.style.cssText = "width:100%;padding:5px 8px;border:1px solid #cbd5e0;border-radius:3px;font-size:12px;box-sizing:border-box;font-family:monospace";
      searchWrap.appendChild(search);
      pop.appendChild(searchWrap);
      const head = document.createElement("label");
      head.style.cssText = "display:flex;align-items:center;gap:7px;padding:7px 10px;border-bottom:1px solid #e2e8f0;cursor:pointer;font-weight:bold;color:#2d3748;user-select:none";
      const allCb = document.createElement("input");
      allCb.type = "checkbox";
      allCb.style.cssText = "margin:0;cursor:pointer";
      const headTxt = document.createElement("span");
      head.appendChild(allCb);
      head.appendChild(headTxt);
      pop.appendChild(head);
      const listWrap = document.createElement("div");
      listWrap.style.cssText = "max-height:240px;overflow-y:auto;padding:4px 0";
      pop.appendChild(listWrap);
      function shownOptions() {
        const q = (search.value || "").trim().toUpperCase();
        if (!q) return filterAllOptions;
        return filterAllOptions.filter((o => o.code.toUpperCase().includes(q) || o.label && o.label.toUpperCase().includes(q)));
      }
      function renderList() {
        const shown = shownOptions();
        const searching = !!(search.value || "").trim();
        headTxt.textContent = searching ? "(검색 결과 전체)" : "(전체 선택)";
        const onN = shown.filter((o => filterCodes.has(o.code))).length;
        allCb.checked = shown.length > 0 && onN === shown.length;
        allCb.indeterminate = onN > 0 && onN < shown.length;
        allCb.disabled = shown.length === 0;
        listWrap.innerHTML = "";
        if (shown.length === 0) {
          const em = document.createElement("div");
          em.textContent = "(검색 결과 없음)";
          em.style.cssText = "color:#a0aec0;padding:8px 10px;font-style:italic";
          listWrap.appendChild(em);
          return;
        }
        shown.forEach((o => {
          const row = document.createElement("label");
          row.style.cssText = "display:flex;align-items:center;gap:7px;padding:5px 10px;cursor:pointer;color:#2d3748;user-select:none";
          row.onmouseenter = () => {
            row.style.background = "#f7fafc";
          };
          row.onmouseleave = () => {
            row.style.background = "";
          };
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.style.cssText = "margin:0;cursor:pointer";
          cb.checked = filterCodes.has(o.code);
          cb.onchange = () => {
            if (cb.checked) filterCodes.add(o.code); else filterCodes.delete(o.code);
            renderList();
            renderVisible();
          };
          const txt = document.createElement("span");
          txt.style.cssText = "flex:1;display:flex;justify-content:space-between;gap:10px";
          const codeEl = document.createElement("span");
          codeEl.style.fontWeight = "bold";
          codeEl.textContent = o.label;
          const cntEl = document.createElement("span");
          cntEl.style.color = "#a0aec0";
          cntEl.textContent = o.count;
          txt.appendChild(codeEl);
          txt.appendChild(cntEl);
          row.appendChild(cb);
          row.appendChild(txt);
          listWrap.appendChild(row);
        }));
      }
      allCb.onchange = () => {
        const shown = shownOptions();
        if (allCb.checked) shown.forEach((o => filterCodes.add(o.code))); else shown.forEach((o => filterCodes.delete(o.code)));
        renderList();
        renderVisible();
      };
      search.addEventListener("input", renderList);
      renderList();
      document.body.appendChild(pop);
      _cfPopup = pop;
      const rect = filterBtn.getBoundingClientRect();
      let left = rect.right - pop.offsetWidth;
      if (left < 6) left = 6;
      let top = rect.bottom + 4;
      if (top + pop.offsetHeight > window.innerHeight - 6) top = Math.max(6, rect.top - pop.offsetHeight - 4);
      pop.style.left = left + "px";
      pop.style.top = top + "px";
      document.addEventListener("mousedown", _cfOnDown, true);
      document.addEventListener("keydown", _cfOnKey, true);
      window.addEventListener("resize", closeFilterPopup);
      subContent.addEventListener("scroll", closeFilterPopup);
      search.focus();
    }
    filterBtn.onclick = () => {
      if (_cfPopup) closeFilterPopup(); else openFilterPopup();
    };
    function rebuildFilterOptions(base) {
      const counts = {};
      let none = 0;
      base.forEach((r => {
        const c = countryOf(r);
        if (c) counts[c] = (counts[c] || 0) + 1; else none++;
      }));
      filterAllOptions = Object.keys(counts).sort().map((c => ({
        code: c,
        label: c,
        count: counts[c]
      })));
      if (none > 0) filterAllOptions.push({
        code: "",
        label: "(없음)",
        count: none
      });
      filterCodes = new Set(filterAllOptions.map((o => o.code)));
      const meaningful = filterAllOptions.length >= 2;
      filterBtn.style.display = meaningful ? "" : "none";
      refreshFilterBtn();
    }
    function renderVisible() {
      currentItems = filterCodes ? subBase.filter((r => filterCodes.has(countryOf(r)))) : subBase;
      updateCopyBtn();
      subContent.innerHTML = "";
      subContent.appendChild(makeCatContent(currentItems, showStat, hideDate, sortMode, onDelete));
      refreshFilterBtn();
    }
    const copyRow = document.createElement("div");
    copyRow.style.cssText = "display:flex;gap:6px;margin:0 0 8px;flex-shrink:0;align-items:stretch";
    copyRow.appendChild(copyBtn);
    copyRow.appendChild(filterWrap);
    const subTabs = [];
    function activateSub(name) {
      subBase = name === "ems" ? subEms : name === "reg" ? subReg : items;
      closeFilterPopup();
      rebuildFilterOptions(subBase);
      renderVisible();
      subTabs.forEach((t => {
        const active = t.name === name;
        t.el.style.background = active ? "#90cdf4" : "#edf2f7";
        t.el.style.color = active ? "#1a365d" : "#4a5568";
        t.el.style.borderColor = active ? "#2196F3" : "#cbd5e0";
      }));
    }
    function addSubTab(name, label) {
      const t = document.createElement("span");
      t.style.cssText = "flex:1;min-width:0;text-align:center;padding:3px 6px;background:#edf2f7;cursor:pointer;font-size:10px;font-weight:bold;color:#4a5568;border-radius:3px;border:1px solid #cbd5e0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:sans-serif;user-select:none";
      t.textContent = label;
      t.title = label;
      t.onclick = () => activateSub(name);
      subBar.appendChild(t);
      subTabs.push({
        name: name,
        el: t
      });
    }
    addSubTab("all", `전체(${items.length})`);
    addSubTab("ems", `EMS(${subEms.length})`);
    addSubTab("reg", `등기/소포(${subReg.length})`);
    wrapper.appendChild(subBar);
    wrapper.appendChild(copyRow);
    wrapper.appendChild(subContent);
    activateSub("all");
    return wrapper;
  }
  function lineBreak() {
    const lb = document.createElement("div");
    lb.style.cssText = "flex-basis:100%;height:0";
    tabBar.appendChild(lb);
  }
  addTab("rd", `RD(${buckets.rd.length})`, makeCatPanel(buckets.rd, false, false, undefined, onDelete));
  addTab("emd", `EMD(${buckets.emd.length})`, makeCatPanel(buckets.emd, false, false, undefined, onDelete));
  lineBreak();
  addTab("edbeme", `세관계류(${buckets.edbeme.length})`, makeCatPanel(buckets.edbeme, false, false, undefined, onDelete));
  addTab("edc", `세관탈출(${buckets.edc.length})`, makeCatPanel(buckets.edc, false, false, undefined, onDelete));
  addTab("emh", `배달시도(${buckets.emh.length})`, makeCatPanel(buckets.emh, false, false, undefined, onDelete));
  addTab("emi", `정상배달(${buckets.emi.length})`, makeCatPanel(buckets.emi, false, false, undefined, onDelete));
  lineBreak();
  addTab("edx", `EDX(${buckets.edx.length})`, makeCatPanel(buckets.edx, false, false, undefined, onDelete));
  addTab("returning", `반송진행(${buckets.returning.length})`, makeCatPanel(buckets.returning, true, false, undefined, onDelete));
  addTab("returnArrived", `반송도착(${buckets.returnArrived.length})`, makeCatPanel(buckets.returnArrived, true, false, undefined, onDelete));
  addTab("returnDelivered", `반송배달(${buckets.returnDelivered.length})`, makeCatPanel(buckets.returnDelivered, true, false, undefined, onDelete));
  lineBreak();
  addTab("other", `기타(${buckets.other.length})`, makeCatPanel(buckets.other, true, false, undefined, onDelete));
  function noQuery(r) {
    if (!r || !r.sources) return true;
    const g = r.sources.gcss, i = r.sources.icare;
    const gQ = g && g.ok === true && g.workflowType && !/^(NOT|NQ|NR)$/.test(g.workflowType);
    const iQ = i && i.ok === true && i.workflowType && !/^(NOT|NQ|NR)$/.test(i.workflowType);
    return !gQ && !iQ;
  }
  const noQueryList = results.filter((r => r && noQuery(r)));
  addTab("noquery", `쿼리없음(${noQueryList.length})`, makeCatPanel(noQueryList, true, false, undefined, onDelete));
  function hasAnyDetail(src) {
    if (!src) return false;
    if (src.detail) return true;
    if (src.allDetails && src.allDetails.length > 0) return true;
    return false;
  }
  const detailList = results.filter((r => r && r.sources && (hasAnyDetail(r.sources.gcss) || hasAnyDetail(r.sources.icare))));
  addTab("details", `Details검색(${detailList.length})`, makeCatPanel(detailList, true, false, "details", onDelete));
  out.appendChild(tabBar);
  out.appendChild(panelArea);
  const initialTab = preservedTab && tabList.find((t => t.name === preservedTab)) ? preservedTab : "all";
  activate(initialTab);
  out._numToTab = {};
  Object.keys(buckets).forEach((cat => {
    buckets[cat].forEach((r => {
      if (r && r.num) out._numToTab[String(r.num).toUpperCase()] = cat;
    }));
  }));
  out._flashTab = function(name) {
    const t = tabList.find((x => x.name === name));
    if (!t) return;
    const el = t.tab;
    el.style.transition = "background 0.18s ease, color 0.18s ease";
    el.style.background = "#fc8181";
    el.style.color = "#fff";
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout((() => {
      const isActive = t.panel.style.display === "block";
      el.style.background = isActive ? "#2196F3" : "#edf2f7";
      el.style.color = isActive ? "#fff" : "#4a5568";
      setTimeout((() => {
        el.style.transition = "";
      }), 250);
    }), 950);
  };
  out._jumpToNum = function(num) {
    const u = String(num).toUpperCase();
    const cat = out._numToTab[u];
    if (!cat) return false;
    activate(cat);
    out._flashTab(cat);
    const t = tabList.find((x => x.name === cat));
    if (t && t.panel) {
      requestAnimationFrame((() => {
        let card = null;
        t.panel.querySelectorAll("[data-num]").forEach((c => {
          if (String(c.dataset.num).toUpperCase() === u) card = c;
        }));
        if (!card) return;
        card.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
        flashFoundCard(card);
      }));
    }
    return true;
  };
  const _searchRow = document.getElementById("bulkSearchRow");
  if (_searchRow) _searchRow.style.display = "flex";
}

const bulkInp = document.getElementById("bulkInp");

const bulkOut = document.getElementById("bulkOut");

const runBtn = document.getElementById("runBtn");

const concInp = document.getElementById("concInp");

const resetBtn = document.getElementById("resetBtn");

function removeBulkNums(nums) {
  const rm = new Set((Array.isArray(nums) ? nums : [ nums ]).map((n => cleanTrackingInput(n))));
  if (Array.isArray(lastBulkNums)) {
    lastBulkNums = lastBulkNums.filter((n => !rm.has(cleanTrackingInput(n))));
  }
  if (bulkInp) {
    bulkInp.value = bulkInp.value.split(/[\s,;]+/).filter((tok => tok && !rm.has(cleanTrackingInput(tok)))).join("\n");
  }
}

const bulkSearchInp = document.getElementById("bulkSearchInp");

const bulkSearchClear = document.getElementById("bulkSearchClear");

const bulkSearchRow = document.getElementById("bulkSearchRow");

function cleanTrackingInput(s) {
  if (!s) return "";
  return String(s).replace(/[\u200B\u200C\u200D\uFEFF]/g, "").replace(/\s+/g, "").toUpperCase();
}

function flashBulkSearchNotFound() {
  if (!bulkSearchInp) return;
  bulkSearchInp.style.transition = "border-color 0.15s, background 0.15s";
  bulkSearchInp.style.borderColor = "#fc8181";
  bulkSearchInp.style.background = "#fff5f5";
  clearTimeout(bulkSearchInp._nfTimer);
  bulkSearchInp._nfTimer = setTimeout((() => {
    bulkSearchInp.style.borderColor = "#cbd5e0";
    bulkSearchInp.style.background = "";
  }), 900);
}

function updateBulkSearchClear() {
  if (bulkSearchClear) bulkSearchClear.style.display = bulkSearchInp && bulkSearchInp.value ? "block" : "none";
}

function bulkSearchFilter(q) {
  q = cleanTrackingInput(q);
  if (!q) return [];
  const map = bulkOut && bulkOut._numToTab || {};
  return Object.keys(map).filter((k => k.includes(q))).map((k => ({
    num: k,
    tab: map[k]
  })));
}

function hideBulkSearchList() {
  const list = document.getElementById("bulkSearchList");
  if (list) list.style.display = "none";
}

function ddItems(listEl) {
  return listEl ? Array.prototype.slice.call(listEl.children) : [];
}

function ddHighlight(listEl, idx) {
  if (!listEl) return;
  const items = ddItems(listEl);
  if (!items.length) {
    listEl._active = -1;
    return;
  }
  idx = Math.max(0, Math.min(items.length - 1, idx));
  items.forEach(((el, i) => {
    el.style.background = i === idx ? "#90cdf4" : "";
  }));
  listEl._active = idx;
  const el = items[idx];
  const top = el.offsetTop, bottom = top + el.offsetHeight;
  if (top < listEl.scrollTop) listEl.scrollTop = top; else if (bottom > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = bottom - listEl.clientHeight;
}

function ddNav(e, listEl, choose) {
  if (!listEl || listEl.style.display !== "block") return false;
  const items = ddItems(listEl);
  if (!items.length) return false;
  const active = typeof listEl._active === "number" ? listEl._active : -1;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    ddHighlight(listEl, active + 1);
    return true;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    ddHighlight(listEl, active - 1);
    return true;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    const el = items[active < 0 ? 0 : active];
    if (el && el._ddValue != null) choose(el._ddValue);
    return true;
  }
  return false;
}

function renderBulkSearchList(q) {
  const list = document.getElementById("bulkSearchList");
  if (!list) return;
  const matches = bulkSearchFilter(q);
  list.innerHTML = "";
  if (!matches.length) {
    list.style.display = "none";
    return;
  }
  matches.slice(0, 50).forEach(((m, i) => {
    const item = document.createElement("div");
    item.style.cssText = "padding:7px 10px;font-size:12px;font-family:monospace;cursor:pointer;border-bottom:1px solid #f0f0f0;color:#2d3748;display:flex;justify-content:space-between;gap:8px;align-items:center";
    item._ddValue = m.num;
    const nm = document.createElement("span");
    nm.textContent = m.num;
    nm.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    item.appendChild(nm);
    if (m.tab && m.tab !== "all") {
      const tg = document.createElement("span");
      tg.style.cssText = "color:#a0aec0;font-size:10px;font-family:sans-serif;flex-shrink:0";
      tg.textContent = m.tab;
      item.appendChild(tg);
    }
    item.addEventListener("mouseenter", (() => ddHighlight(list, i)));
    item.addEventListener("mousedown", (e => {
      e.preventDefault();
      selectBulkSearch(m.num);
    }));
    list.appendChild(item);
  }));
  list.style.display = "block";
  list._active = -1;
}

function selectBulkSearch(num) {
  if (bulkSearchInp) bulkSearchInp.value = num;
  updateBulkSearchClear();
  hideBulkSearchList();
  const ok = bulkOut && bulkOut._jumpToNum && bulkOut._jumpToNum(num);
  if (!ok) flashBulkSearchNotFound();
}

if (bulkSearchInp) {
  bulkSearchInp.addEventListener("paste", (e => {
    e.preventDefault();
    const cd = e.clipboardData || window.clipboardData;
    const text = cd ? cd.getData("text") : "";
    bulkSearchInp.value = cleanTrackingInput(text);
    updateBulkSearchClear();
    renderBulkSearchList(bulkSearchInp.value);
  }));
  bulkSearchInp.addEventListener("input", (() => {
    updateBulkSearchClear();
    renderBulkSearchList(bulkSearchInp.value);
  }));
  bulkSearchInp.addEventListener("focus", (() => {
    if (bulkSearchInp.value) renderBulkSearchList(bulkSearchInp.value);
  }));
  bulkSearchInp.addEventListener("blur", (() => {
    setTimeout(hideBulkSearchList, 150);
  }));
  bulkSearchInp.addEventListener("keydown", (e => {
    const list = document.getElementById("bulkSearchList");
    if (ddNav(e, list, selectBulkSearch)) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const matches = bulkSearchFilter(bulkSearchInp.value);
      if (matches.length) selectBulkSearch(matches[0].num); else flashBulkSearchNotFound();
    } else if (e.key === "Escape") {
      if (list && list.style.display === "block") {
        e.stopPropagation();
        hideBulkSearchList();
      }
    }
  }));
}

if (bulkSearchClear && bulkSearchInp) {
  bulkSearchClear.addEventListener("mousedown", (e => {
    e.preventDefault();
    bulkSearchInp.value = "";
    updateBulkSearchClear();
    hideBulkSearchList();
    bulkSearchInp.focus();
  }));
}

let lastBulkResults = null;

let lastBulkElapsed = null;

function logBulk(msg) {
  bulkOut.appendChild(document.createTextNode(msg + "\n"));
  bulkOut.scrollTop = bulkOut.scrollHeight;
}

async function saveBulkSession() {
  try {
    await chrome.storage.session.set({
      bulkInput: bulkInp.value,
      bulkResults: lastBulkResults,
      bulkElapsed: lastBulkElapsed,
      bulkConc: concInp.value
    });
  } catch (e) {
    console.log("[Bulk] session save error:", e);
  }
}

async function restoreBulkSession() {
  try {
    const d = await chrome.storage.session.get([ "bulkInput", "bulkResults", "bulkElapsed", "bulkConc" ]);
    if (d.bulkInput) bulkInp.value = d.bulkInput;
    if (d.bulkConc) concInp.value = d.bulkConc;
    if (d.bulkResults && Array.isArray(d.bulkResults) && d.bulkResults.length > 0) {
      lastBulkResults = d.bulkResults;
      lastBulkElapsed = d.bulkElapsed;
      renderResults(bulkOut, d.bulkResults, d.bulkElapsed);
    }
  } catch (e) {
    console.log("[Bulk] session restore error:", e);
  }
}

let saveTimer = null;

bulkInp.addEventListener("input", (() => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveBulkSession, 500);
}));

bulkInp.addEventListener("keydown", (e => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    runBtn.click();
  }
}));

concInp.addEventListener("change", saveBulkSession);

document.addEventListener("keydown", (e => {
  const target = e.target;
  const inInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
  const bulkPanel = document.getElementById("bulkPanel");
  const watchPanel = document.getElementById("watchPanel");
  const bulkActive = bulkPanel && !bulkPanel.classList.contains("hidden");
  const watchActive = watchPanel && !watchPanel.classList.contains("hidden");
  if (e.key === "Delete" && !inInput) {
    if (bulkActive && selectedBulkNums.size > 0) {
      e.preventDefault();
      const toDelete = Array.from(selectedBulkNums);
      if (Array.isArray(lastBulkResults)) {
        for (const num of toDelete) {
          const idx = lastBulkResults.findIndex((x => x && x.num === num));
          if (idx >= 0) lastBulkResults.splice(idx, 1);
        }
      }
      removeBulkNums(toDelete);
      let curTab = "all";
      const all = bulkOut.querySelectorAll("[data-tab]");
      for (const el of all) {
        if (el.style.background === "rgb(33, 150, 243)") {
          curTab = el.getAttribute("data-tab");
          break;
        }
      }
      selectedBulkNums.clear();
      lastClickedBulkNum = null;
      renderResults(bulkOut, lastBulkResults, lastBulkElapsed, {
        initialTab: curTab
      });
      saveBulkSession();
      return;
    }
    if (watchActive && selectedWatchNums.size > 0) {
      e.preventDefault();
      handleWatchDelete(Array.from(selectedWatchNums));
      return;
    }
  }
  if (e.key === "Escape") {
    if (!inInput && bulkActive && selectedBulkNums.size > 0) {
      e.preventDefault();
      selectedBulkNums.clear();
      lastClickedBulkNum = null;
      refreshSelectionUI();
      return;
    }
    if (!inInput && watchActive && selectedWatchNums.size > 0) {
      e.preventDefault();
      selectedWatchNums.clear();
      lastClickedWatchNum = null;
      refreshWatchSelectionUI();
      return;
    }
    window.close();
  }
}));

async function handleWatchDelete(nums) {
  if (!nums || nums.length === 0) return;
  const activeTab = await getActiveWatchTab();
  const list = await getWatchList();
  if (activeTab && activeTab !== "__all__") {
    const d = await chrome.storage.local.get([ "newTraceMarks" ]);
    const marks = d.newTraceMarks || {};
    let next = list;
    for (const num of nums) {
      const it = next.find((x => x.num === num));
      if (!it) continue;
      it.tags = (it.tags || []).filter((t => t !== activeTab));
      if (it.tags.length === 0) {
        next = next.filter((x => x.num !== num));
        delete marks[num];
      }
    }
    await setWatchList(next);
    await chrome.storage.local.set({
      newTraceMarks: marks
    });
  } else {
    const next = list.filter((x => !nums.includes(x.num)));
    await setWatchList(next);
    const d = await chrome.storage.local.get([ "newTraceMarks" ]);
    const marks = d.newTraceMarks || {};
    for (const num of nums) delete marks[num];
    await chrome.storage.local.set({
      newTraceMarks: marks
    });
  }
  selectedWatchNums.clear();
  lastClickedWatchNum = null;
  refreshWatchUI();
}

let _dragWatchNums = null;

async function handleWatchDrop(target, copy) {
  const nums = _dragWatchNums;
  if (!nums || nums.length === 0 || !target || target === "__all__") return;
  const active = await getActiveWatchTab();
  if (target === active) return;
  const fromAll = !active || active === "__all__";
  const isCopy = copy || fromAll;
  const sel = new Set(nums);
  const list = await getWatchList();
  let n = 0;
  for (const it of list) {
    if (!sel.has(it.num)) continue;
    if (!Array.isArray(it.tags)) it.tags = [];
    let changed = false;
    if (!isCopy && it.tags.includes(active)) {
      it.tags = it.tags.filter((t => t !== active));
      changed = true;
    }
    if (!it.tags.includes(target)) {
      it.tags.push(target);
      changed = true;
    }
    if (it.tags.length === 0) it.tags = [ DEFAULT_TAB ];
    if (changed) n++;
  }
  await setWatchList(list);
  selectedWatchNums.clear();
  lastClickedWatchNum = null;
  refreshWatchUI();
  const label = target === DEFAULT_TAB ? DEFAULT_TAB_LABEL : target;
  if (n === 0) showCopyToast(`이미 모두 '${label}' 탭에 있어요`); else showCopyToast(isCopy ? `📋 ${n}개를 '${label}' 탭에 복사` : `✅ ${n}개를 '${label}' 탭으로 이동`);
}

let lastBulkNums = null;

let bulkRefreshPending = false;

runBtn.onclick = async () => {
  const wasRefresh = bulkRefreshPending;
  bulkRefreshPending = false;
  const raw = bulkInp.value.trim().toUpperCase().split(/[\s,;]+/).filter(Boolean);
  if (raw.length === 0) {
    alert("등기번호를 입력하세요");
    return;
  }
  const seen = new Set;
  const nums = raw.filter((n => seen.has(n) ? false : (seen.add(n), true)));
  const dupCount = raw.length - nums.length;
  lastBulkNums = nums.slice();
  const topArea = document.getElementById("bulkTopArea");
  const hideBtn = document.getElementById("bulkHideToggle");
  if (topArea && topArea.style.display !== "none") {
    topArea.style.display = "none";
    if (hideBtn) hideBtn.textContent = "▼ 입력·도움말 펼치기";
  }
  const conc = parseInt(concInp.value) || 15;
  runBtn.disabled = true;
  bulkOut.innerHTML = "";
  if (bulkSearchRow) bulkSearchRow.style.display = "none";
  if (bulkSearchInp) bulkSearchInp.value = "";
  const start = Date.now();
  logBulk(`총 ${nums.length}개 조회 시작 (동시 ${conc}개)${dupCount > 0 ? ` — 중복 ${dupCount}개 자동 제거됨` : ""}\n`);
  const results = new Array(nums.length);
  let ni = 0, done = 0;
  async function worker() {
    while (true) {
      const i = ni++;
      if (i >= nums.length) return;
      let all;
      try {
        all = await chrome.runtime.sendMessage({
          cmd: "fetchAllSources",
          num: nums[i]
        });
      } catch (e) {
        all = {
          epost: {
            ok: false,
            error: e.message
          },
          gcss: {
            ok: false,
            error: "실패"
          },
          icare: {
            ok: false,
            error: "실패"
          }
        };
      }
      const ep = all && all.epost || {
        ok: false,
        error: "(오류)"
      };
      const r = {
        num: nums[i],
        ok: !!ep.ok,
        status: ep.ok ? ep.lastTraceText : ep.error || "(오류)",
        date: ep.lastTraceTime || "",
        deliveryDate: ep.deliveryDate || "",
        delivered: !!ep.delivered,
        returned: !!ep.returned,
        sources: all
      };
      results[i] = r;
      done++;
      const isM = r.status && r.status.includes("미배달");
      const dt = r.delivered || isM ? fmtDate(r.delivered ? r.deliveryDate : r.date) : "";
      const dts = dt ? " [" + dt + "]" : "";
      const mark = r.delivered ? "✓ 배달완료" + dts + (r.returned ? " [반송]" : "") : r.ok ? "○ " + r.status + dts : "✗ " + r.status;
      logBulk(`[${done}/${nums.length}] ${r.num} → ${mark}`);
    }
  }
  await Promise.all(Array.from({
    length: Math.min(conc, nums.length)
  }, (() => worker())));
  const elapsed = ((Date.now() - start) / 1e3).toFixed(1);
  lastBulkResults = results;
  lastBulkElapsed = elapsed;
  renderResults(bulkOut, results, elapsed);
  runBtn.disabled = false;
  bulkRefreshBtn.disabled = false;
  bulkOut.scrollTop = 0;
  saveBulkSession();
  showCopyToast(wasRefresh ? "✅ 일괄조회 새로고침 완료" : "✅ 조회 완료");
};

const bulkRefreshBtn = document.getElementById("bulkRefreshBtn");

if (bulkRefreshBtn) {
  bulkRefreshBtn.onclick = () => {
    if (!lastBulkNums || lastBulkNums.length === 0) return;
    bulkInp.value = lastBulkNums.join("\n");
    bulkRefreshPending = true;
    runBtn.click();
  };
}

resetBtn.onclick = () => {
  if (!bulkInp.value && !bulkOut.innerHTML) return;
  if (!confirm("입력과 조회 결과를 모두 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.")) return;
  bulkInp.value = "";
  bulkOut.innerHTML = "";
  if (bulkSearchRow) bulkSearchRow.style.display = "none";
  if (bulkSearchInp) bulkSearchInp.value = "";
  lastBulkResults = null;
  lastBulkElapsed = null;
  lastBulkNums = null;
  runBtn.disabled = false;
  bulkRefreshBtn.disabled = true;
  chrome.storage.session.remove([ "bulkInput", "bulkResults", "bulkElapsed" ]).catch((() => {}));
};

restoreBulkSession();

const bulkPanel = document.getElementById("bulkPanel");

const watchPanel = document.getElementById("watchPanel");

const daysPanel = document.getElementById("daysPanel");

bulkPanel.tabIndex = -1;

watchPanel.tabIndex = -1;

if (daysPanel) daysPanel.tabIndex = -1;

bulkPanel.style.outline = "none";

watchPanel.style.outline = "none";

if (daysPanel) daysPanel.style.outline = "none";

document.querySelectorAll(".main-tab").forEach((t => {
  t.addEventListener("click", (() => {
    document.querySelectorAll(".main-tab").forEach((x => x.classList.remove("active")));
    t.classList.add("active");
    const name = t.getAttribute("data-tab");
    bulkPanel.classList.add("hidden");
    watchPanel.classList.add("hidden");
    if (daysPanel) daysPanel.classList.add("hidden");
    if (name === "bulk") {
      bulkPanel.classList.remove("hidden");
      bulkPanel.focus();
    } else if (name === "days") {
      if (daysPanel) {
        daysPanel.classList.remove("hidden");
        initDaysTab();
        daysPanel.focus();
      }
    } else {
      watchPanel.classList.remove("hidden");
      refreshWatchUI();
      watchPanel.focus();
    }
  }));
}));

setTimeout((() => {
  bulkPanel.focus();
}), 0);

let daysCountryLoaded = false;

let daysCountries = [];

let daysSelectedCode = "";

let daysSelectedName = "";

let daysCondCollapsed = false;

let daysNoticeFont = 13;

chrome.storage.local.get([ "daysNoticeFont" ]).then((d => {
  if (d && typeof d.daysNoticeFont === "number") daysNoticeFont = d.daysNoticeFont;
})).catch((() => {}));

async function initDaysTab() {
  const inp = document.getElementById("daysCountryInput");
  if (!inp || daysCountryLoaded) return;
  inp.disabled = true;
  inp.placeholder = "국가 불러오는 중…";
  try {
    const r = await chrome.runtime.sendMessage({
      cmd: "emsCountryList"
    });
    if (r && r.ok && r.list && r.list.length) {
      daysCountries = r.list;
      for (const c of daysCountries) {
        c.iso = guessDaysIso(c.name) || (/^[A-Za-z]{2}$/.test(c.code) ? c.code.toUpperCase() : "");
      }
      daysCountryLoaded = true;
      inp.disabled = false;
      inp.placeholder = "나라 이름·약호 검색 (예: 미국, SA, PT)";
    } else {
      inp.disabled = false;
      inp.placeholder = "국가 목록 실패 — ePOST 로그인 후 탭 다시 클릭";
    }
  } catch (e) {
    inp.disabled = false;
    inp.placeholder = "불러오기 실패 — 탭 다시 클릭";
  }
}

const DAYS_ISO_PAIRS = [ [ "인도네시아", "ID" ], [ "파푸아뉴기니", "PG" ], [ "적도기니", "GQ" ], [ "기니비사우", "GW" ], [ "소말리아", "SO" ], [ "남수단", "SS" ], [ "콩고민주", "CD" ], [ "도미니카공화국", "DO" ], [ "미국령사모아", "AS" ], [ "북마리아나", "MP" ], [ "홍콩", "HK" ], [ "마카오", "MO" ], [ "대만", "TW" ], [ "타이완", "TW" ], [ "일본", "JP" ], [ "중국", "CN" ], [ "태국", "TH" ], [ "베트남", "VN" ], [ "싱가포르", "SG" ], [ "말레이시아", "MY" ], [ "필리핀", "PH" ], [ "캄보디아", "KH" ], [ "라오스", "LA" ], [ "미얀마", "MM" ], [ "방글라데시", "BD" ], [ "인도", "IN" ], [ "파키스탄", "PK" ], [ "스리랑카", "LK" ], [ "네팔", "NP" ], [ "몽골", "MN" ], [ "브루나이", "BN" ], [ "몰디브", "MV" ], [ "부탄", "BT" ], [ "아프가니스탄", "AF" ], [ "카자흐", "KZ" ], [ "우즈베", "UZ" ], [ "우즈벡", "UZ" ], [ "키르기", "KG" ], [ "타지키", "TJ" ], [ "투르크메", "TM" ], [ "사우디", "SA" ], [ "에미리트", "AE" ], [ "카타르", "QA" ], [ "쿠웨이트", "KW" ], [ "바레인", "BH" ], [ "오만", "OM" ], [ "요르단", "JO" ], [ "이스라엘", "IL" ], [ "레바논", "LB" ], [ "이란", "IR" ], [ "이라크", "IQ" ], [ "예멘", "YE" ], [ "시리아", "SY" ], [ "튀르키예", "TR" ], [ "터키", "TR" ], [ "영국", "GB" ], [ "프랑스", "FR" ], [ "독일", "DE" ], [ "이탈리아", "IT" ], [ "스페인", "ES" ], [ "포르투갈", "PT" ], [ "네덜란드", "NL" ], [ "벨기에", "BE" ], [ "룩셈부르크", "LU" ], [ "스위스", "CH" ], [ "오스트리아", "AT" ], [ "덴마크", "DK" ], [ "스웨덴", "SE" ], [ "노르웨이", "NO" ], [ "핀란드", "FI" ], [ "아이슬란드", "IS" ], [ "아일랜드", "IE" ], [ "폴란드", "PL" ], [ "체코", "CZ" ], [ "슬로바키아", "SK" ], [ "헝가리", "HU" ], [ "루마니아", "RO" ], [ "불가리아", "BG" ], [ "그리스", "GR" ], [ "크로아티아", "HR" ], [ "슬로베니아", "SI" ], [ "세르비아", "RS" ], [ "보스니아", "BA" ], [ "몬테네그로", "ME" ], [ "마케도니아", "MK" ], [ "알바니아", "AL" ], [ "에스토니아", "EE" ], [ "라트비아", "LV" ], [ "리투아니아", "LT" ], [ "벨라루스", "BY" ], [ "우크라이나", "UA" ], [ "러시아", "RU" ], [ "몰도바", "MD" ], [ "몰타", "MT" ], [ "키프로스", "CY" ], [ "조지아", "GE" ], [ "아르메니아", "AM" ], [ "아제르바이잔", "AZ" ], [ "그린란드", "GL" ], [ "미국", "US" ], [ "캐나다", "CA" ], [ "멕시코", "MX" ], [ "브라질", "BR" ], [ "아르헨티나", "AR" ], [ "칠레", "CL" ], [ "페루", "PE" ], [ "콜롬비아", "CO" ], [ "에콰도르", "EC" ], [ "볼리비아", "BO" ], [ "우루과이", "UY" ], [ "파라과이", "PY" ], [ "베네수엘라", "VE" ], [ "파나마", "PA" ], [ "코스타리카", "CR" ], [ "과테말라", "GT" ], [ "온두라스", "HN" ], [ "엘살바도르", "SV" ], [ "니카라과", "NI" ], [ "쿠바", "CU" ], [ "자메이카", "JM" ], [ "트리니다드", "TT" ], [ "바하마", "BS" ], [ "바베이도스", "BB" ], [ "아이티", "HT" ], [ "푸에르토리코", "PR" ], [ "가이아나", "GY" ], [ "수리남", "SR" ], [ "호주", "AU" ], [ "오스트레일리아", "AU" ], [ "뉴질랜드", "NZ" ], [ "피지", "FJ" ], [ "솔로몬", "SB" ], [ "바누아투", "VU" ], [ "사모아", "WS" ], [ "통가", "TO" ], [ "뉴칼레도니아", "NC" ], [ "팔라우", "PW" ], [ "미크로네시아", "FM" ], [ "마셜", "MH" ], [ "괌", "GU" ], [ "사이판", "MP" ], [ "이집트", "EG" ], [ "남아프리카", "ZA" ], [ "남아공", "ZA" ], [ "나이지리아", "NG" ], [ "케냐", "KE" ], [ "에티오피아", "ET" ], [ "가나", "GH" ], [ "모로코", "MA" ], [ "알제리", "DZ" ], [ "튀니지", "TN" ], [ "리비아", "LY" ], [ "수단", "SD" ], [ "우간다", "UG" ], [ "탄자니아", "TZ" ], [ "카메룬", "CM" ], [ "세네갈", "SN" ], [ "코트디부아르", "CI" ], [ "마다가스카르", "MG" ], [ "모리셔스", "MU" ], [ "잠비아", "ZM" ], [ "짐바브웨", "ZW" ], [ "보츠와나", "BW" ], [ "모잠비크", "MZ" ], [ "앙골라", "AO" ], [ "콩고", "CG" ], [ "가봉", "GA" ], [ "베냉", "BJ" ], [ "토고", "TG" ], [ "부르키나파소", "BF" ], [ "말리", "ML" ], [ "니제르", "NE" ], [ "르완다", "RW" ], [ "말라위", "MW" ], [ "나미비아", "NA" ], [ "에스와티니", "SZ" ], [ "스와질란드", "SZ" ], [ "레소토", "LS" ], [ "지부티", "DJ" ], [ "에리트레아", "ER" ], [ "라이베리아", "LR" ], [ "시에라리온", "SL" ], [ "감비아", "GM" ], [ "모리타니", "MR" ], [ "차드", "TD" ], [ "중앙아프리카", "CF" ], [ "기니", "GN" ], [ "카보베르데", "CV" ], [ "세이셸", "SC" ], [ "코모로", "KM" ] ];

function guessDaysIso(name) {
  const n = (name || "").replace(/\s/g, "");
  for (const [k, iso] of DAYS_ISO_PAIRS) {
    if (n.includes(k)) return iso;
  }
  return "";
}

function daysFilter(q) {
  q = (q || "").trim().toLowerCase();
  if (!q) return daysCountries.slice();
  const exact = [], rest = [];
  for (const c of daysCountries) {
    const iso = (c.iso || "").toLowerCase();
    const code = (c.code || "").toLowerCase();
    if (iso === q || code === q) exact.push(c); else if (c.name.toLowerCase().includes(q) || code.includes(q) || iso.includes(q)) rest.push(c);
  }
  return exact.concat(rest);
}

function hideDaysList() {
  const list = document.getElementById("daysCountryList");
  if (list) list.style.display = "none";
}

function updateDaysClear() {
  const inp = document.getElementById("daysCountryInput");
  const cb = document.getElementById("daysCountryClear");
  if (cb) cb.style.display = inp && inp.value ? "block" : "none";
}

function renderDaysCountryList(q) {
  const list = document.getElementById("daysCountryList");
  if (!list) return;
  const matches = daysFilter(q);
  list.innerHTML = "";
  if (!matches.length) {
    list.style.display = "none";
    return;
  }
  matches.forEach(((c, i) => {
    const item = document.createElement("div");
    item.style.cssText = "padding:7px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid #f0f0f0;color:#2d3748;display:flex;justify-content:space-between;gap:8px";
    item._ddValue = c;
    const nm = document.createElement("span");
    nm.textContent = c.name;
    const cd = document.createElement("span");
    cd.style.cssText = "color:#a0aec0;font-size:11px";
    cd.textContent = c.iso || c.code;
    item.appendChild(nm);
    item.appendChild(cd);
    item.addEventListener("mouseenter", (() => ddHighlight(list, i)));
    item.addEventListener("mousedown", (e => {
      e.preventDefault();
      selectDaysCountry(c);
    }));
    list.appendChild(item);
  }));
  list.style.display = "block";
  list._active = -1;
}

function selectDaysCountry(c) {
  daysSelectedCode = c.code;
  daysSelectedName = c.name;
  const inp = document.getElementById("daysCountryInput");
  if (inp) inp.value = c.name;
  updateDaysClear();
  hideDaysList();
  runDaysLookup();
}

function daysMsg(text, color) {
  const out = document.getElementById("daysOut");
  if (!out) return;
  out.style.overflowY = "auto";
  out.innerHTML = "";
  const d = document.createElement("div");
  d.style.cssText = "font-size:12px;padding:10px;line-height:1.5;color:" + (color || "#718096");
  d.textContent = text;
  out.appendChild(d);
}

async function runDaysLookup() {
  const inp = document.getElementById("daysCountryInput");
  const typed = inp ? inp.value.trim() : "";
  let code = daysSelectedCode, name = daysSelectedName;
  if (!code && typed) {
    const exact = daysCountries.find((c => c.name === typed));
    const matches = daysFilter(typed);
    if (exact) {
      code = exact.code;
      name = exact.name;
    } else if (matches.length === 1) {
      code = matches[0].code;
      name = matches[0].name;
    }
  }
  if (!code) {
    daysMsg(typed ? "일치하는 나라가 없어요. 목록에서 골라주세요." : "나라를 검색해서 선택하세요.");
    return;
  }
  daysSelectedCode = code;
  daysSelectedName = name;
  if (inp) inp.value = name;
  updateDaysClear();
  hideDaysList();
  daysMsg("조회 중…");
  try {
    const r = await chrome.runtime.sendMessage({
      cmd: "emsCondition",
      nation: code
    });
    if (!r || !r.ok) {
      daysMsg("조회 실패: " + (r && r.error || "알 수 없음") + " — ePOST 로그인/세션을 확인하세요.", "#c53030");
      return;
    }
    renderDays(name, r);
  } catch (e) {
    daysMsg("오류: " + e.message, "#c53030");
  }
}

function formatNoticeLabel(label) {
  const span = document.createElement("span");
  if (label.indexOf(" ") >= 0) {
    const parts = label.split(/\s+/);
    const head = parts.slice(0, -1).join(" ");
    span.textContent = head + " " + parts[parts.length - 1];
  } else {
    const idx = label.indexOf("·");
    if (idx >= 0) {
      span.appendChild(document.createTextNode(label.slice(0, idx + 1)));
      span.appendChild(document.createElement("wbr"));
      span.appendChild(document.createTextNode(label.slice(idx + 1)));
    } else {
      span.textContent = label;
    }
  }
  return span;
}

function renderDays(countryName, r) {
  const out = document.getElementById("daysOut");
  if (!out) return;
  const notices = r.notices || [];
  out.style.overflowY = notices.length ? "hidden" : "auto";
  out.innerHTML = "";
  const head = document.createElement("div");
  head.style.cssText = "flex-shrink:0;background:#ebf8ff;border:1px solid #bee3f8;border-radius:6px;padding:12px;margin-bottom:10px;text-align:center";
  const cn = document.createElement("div");
  cn.style.cssText = "font-size:13px;font-weight:bold;color:#2c5282;margin-bottom:4px";
  cn.textContent = countryName;
  head.appendChild(cn);
  const big = document.createElement("div");
  big.style.cssText = "color:#2b6cb0";
  if (r.days) {
    const lbl = document.createElement("span");
    lbl.style.fontSize = "13px";
    lbl.textContent = "배달소요일수(서류) ";
    const num = document.createElement("span");
    num.style.cssText = "font-size:26px;font-weight:bold;color:#2196F3;vertical-align:middle";
    num.textContent = r.days;
    const unit = document.createElement("span");
    unit.style.fontSize = "13px";
    unit.textContent = "일";
    big.appendChild(lbl);
    big.appendChild(num);
    big.appendChild(unit);
  } else {
    big.style.fontSize = "13px";
    big.textContent = "배달소요일수 정보 없음";
  }
  head.appendChild(big);
  if (r.days) {
    const cnote = document.createElement("div");
    cnote.style.cssText = "font-size:11px;color:#3a6ea5;margin-top:8px;padding-top:7px;border-top:1px solid #bee3f8;line-height:1.45;text-align:left";
    cnote.textContent = "※ 배달소요일수는 서류 기준입니다. 물품은 통관에 따라 더 걸릴 수 있고, 접수일·공휴일은 포함되지 않습니다. (출처: ePOST 발송조건)";
    head.appendChild(cnote);
  }
  out.appendChild(head);
  const fields = r.fields || {};
  const order = r.order && r.order.length ? r.order : Object.keys(fields);
  const condRows = order.filter((k => (fields[k] || "").trim()));
  if (condRows.length) {
    const hdr = document.createElement("div");
    hdr.style.cssText = "flex-shrink:0;display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;padding:7px 10px;background:#edf2f7;border:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#4a5568";
    hdr.style.borderRadius = daysCondCollapsed ? "4px" : "4px 4px 0 0";
    const arrow = document.createElement("span");
    arrow.textContent = daysCondCollapsed ? "▸" : "▾";
    const title = document.createElement("span");
    title.textContent = "발송조건";
    title.style.flex = "1";
    hdr.appendChild(arrow);
    hdr.appendChild(title);
    const tbl = document.createElement("table");
    tbl.style.cssText = "flex-shrink:0;width:100%;border-collapse:collapse;font-size:13px;margin-top:-1px";
    tbl.style.display = daysCondCollapsed ? "none" : "table";
    for (const k of condRows) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.style.cssText = "text-align:left;padding:6px 8px;background:#f7fafc;border:1px solid #e2e8f0;color:#4a5568;white-space:nowrap;width:42%;vertical-align:top;font-weight:600";
      th.textContent = k;
      const td = document.createElement("td");
      td.style.cssText = "padding:6px 8px;border:1px solid #e2e8f0;color:#2d3748;vertical-align:top";
      td.textContent = fields[k].trim();
      tr.appendChild(th);
      tr.appendChild(td);
      tbl.appendChild(tr);
    }
    hdr.addEventListener("click", (() => {
      daysCondCollapsed = !daysCondCollapsed;
      arrow.textContent = daysCondCollapsed ? "▸" : "▾";
      hdr.style.borderRadius = daysCondCollapsed ? "4px" : "4px 4px 0 0";
      tbl.style.display = daysCondCollapsed ? "none" : "table";
    }));
    out.appendChild(hdr);
    out.appendChild(tbl);
  }
  if (notices.length) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column;margin-top:14px";
    const hRow = document.createElement("div");
    hRow.style.cssText = "flex-shrink:0;display:flex;align-items:center;margin-bottom:6px";
    const h = document.createElement("div");
    h.style.cssText = "font-size:12px;font-weight:bold;color:#2d3748;flex:1";
    h.textContent = "주요안내사항";
    hRow.appendChild(h);
    const box = document.createElement("div");
    box.style.cssText = "flex:1;min-height:0;overflow:auto;border:1px solid #e2e8f0;border-top:none;background:#fdfdfd;padding:10px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:#2d3748";
    box.style.fontSize = daysNoticeFont + "px";
    const fctl = document.createElement("div");
    fctl.style.cssText = "display:flex;align-items:center;gap:3px";
    const flbl = document.createElement("span");
    flbl.style.cssText = "font-size:11px;color:#a0aec0;margin-right:2px";
    flbl.textContent = "글자";
    const mkF = (txt, delta) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = txt;
      b.style.cssText = "width:24px;height:22px;font-size:14px;font-weight:bold;cursor:pointer;border:1px solid #cbd5e0;border-radius:4px;background:#fff;color:#4a5568;line-height:1;padding:0";
      b.addEventListener("click", (() => {
        daysNoticeFont = Math.max(11, Math.min(22, daysNoticeFont + delta));
        box.style.fontSize = daysNoticeFont + "px";
        chrome.storage.local.set({
          daysNoticeFont: daysNoticeFont
        }).catch((() => {}));
      }));
      return b;
    };
    fctl.appendChild(flbl);
    fctl.appendChild(mkF("−", -1));
    fctl.appendChild(mkF("+", 1));
    hRow.appendChild(fctl);
    wrap.appendChild(hRow);
    const bar = document.createElement("div");
    bar.style.cssText = "flex-shrink:0;display:flex;flex-wrap:nowrap";
    const btns = [];
    notices.forEach((n => {
      const b = document.createElement("button");
      b.type = "button";
      b.appendChild(formatNoticeLabel(n.label));
      b.style.cssText = "flex:1;min-width:0;padding:7px 4px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid #e2e8f0;border-bottom:none;background:#f7fafc;color:#4a5568;word-break:keep-all;line-height:1.25;text-align:center;display:flex;align-items:center;justify-content:center";
      b.addEventListener("click", (() => {
        btns.forEach((x => {
          x.style.background = "#f7fafc";
          x.style.color = "#4a5568";
          x.style.borderTop = "1px solid #e2e8f0";
        }));
        b.style.background = "#fff";
        b.style.color = "#2196F3";
        b.style.borderTop = "2px solid #2196F3";
        box.textContent = n.content || "(내용 없음)";
      }));
      btns.push(b);
      bar.appendChild(b);
    }));
    wrap.appendChild(bar);
    wrap.appendChild(box);
    out.appendChild(wrap);
    if (btns.length) btns[0].click();
  }
}

(function() {
  const btn = document.getElementById("daysSearchBtn");
  const inp = document.getElementById("daysCountryInput");
  const clr = document.getElementById("daysCountryClear");
  if (btn) btn.addEventListener("click", runDaysLookup);
  if (clr) clr.addEventListener("mousedown", (e => {
    e.preventDefault();
    if (!inp) return;
    inp.value = "";
    daysSelectedCode = "";
    daysSelectedName = "";
    updateDaysClear();
    renderDaysCountryList("");
    inp.focus();
  }));
  if (inp) {
    inp.addEventListener("input", (() => {
      daysSelectedCode = "";
      daysSelectedName = "";
      updateDaysClear();
      renderDaysCountryList(inp.value);
    }));
    inp.addEventListener("focus", (() => {
      if (daysCountries.length) renderDaysCountryList(inp.value);
    }));
    inp.addEventListener("blur", (() => {
      setTimeout(hideDaysList, 150);
    }));
    inp.addEventListener("keydown", (e => {
      const list = document.getElementById("daysCountryList");
      if (ddNav(e, list, selectDaysCountry)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        const matches = daysFilter(inp.value);
        if (matches.length) selectDaysCountry(matches[0]); else runDaysLookup();
      } else if (e.key === "Escape") {
        if (list && list.style.display === "block") {
          e.stopPropagation();
          hideDaysList();
        }
      }
    }));
  }
})();

async function clearNewMark(num) {
  const d = await chrome.storage.local.get([ "newTraceMarks" ]);
  const marks = d.newTraceMarks || {};
  if (marks[num]) {
    delete marks[num];
    await chrome.storage.local.set({
      newTraceMarks: marks
    });
    await chrome.runtime.sendMessage({
      cmd: "refreshBadge"
    }).catch((() => {}));
  }
}

async function clearNewMarkSource(num, source) {
  const d = await chrome.storage.local.get([ "newTraceMarks" ]);
  const marks = d.newTraceMarks || {};
  const entry = marks[num];
  if (entry && typeof entry === "object" && entry[source]) {
    delete entry[source];
    if (Object.keys(entry).length === 0) delete marks[num];
    await chrome.storage.local.set({
      newTraceMarks: marks
    });
    await chrome.runtime.sendMessage({
      cmd: "refreshBadge"
    }).catch((() => {}));
  }
}

async function clearAllNewMarks() {
  await chrome.storage.local.set({
    newTraceMarks: {}
  });
  await chrome.runtime.sendMessage({
    cmd: "refreshBadge"
  }).catch((() => {}));
  refreshWatchUI();
}

function bindCollapseToggle(togId, collapseId, arrowId) {
  const tog = document.getElementById(togId);
  const col = document.getElementById(collapseId);
  const arr = document.getElementById(arrowId);
  if (!tog || !col) return;
  tog.addEventListener("click", (() => {
    const open = col.classList.toggle("open");
    if (arr) arr.textContent = open ? "▲" : "▼";
  }));
}

function autoUppercase(el) {
  if (!el) return;
  el.addEventListener("input", (() => {
    const start = el.selectionStart, end = el.selectionEnd;
    const up = el.value.toUpperCase();
    if (up !== el.value) {
      el.value = up;
      try {
        el.setSelectionRange(start, end);
      } catch (_) {}
    }
  }));
}

autoUppercase(document.getElementById("bulkInp"));

autoUppercase(document.getElementById("watchAddInp"));

bindCollapseToggle("bulkShortcutToggle", "bulkShortcutCollapse", "bulkShortcutArrow");

bindCollapseToggle("bulkHelpToggle", "bulkHelpCollapse", "bulkHelpArrow");

bindCollapseToggle("watchShortcutToggle", "watchShortcutCollapse", "watchShortcutArrow");

bindCollapseToggle("watchHelpToggle", "watchHelpCollapse", "watchHelpArrow");

[ "bulkShortcutToggle", "bulkHelpToggle" ].forEach((id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", (() => {
    requestAnimationFrame((() => {
      if (bulkOut && bulkOut._fitHeights) bulkOut._fitHeights();
    }));
  }));
}));

function bindHideToggle(btnId, areaId, expandedLabel, collapsedLabel) {
  const btn = document.getElementById(btnId);
  const area = document.getElementById(areaId);
  if (!btn || !area) return;
  btn.onclick = () => {
    const hidden = area.style.display === "none";
    area.style.display = hidden ? "" : "none";
    btn.textContent = hidden ? expandedLabel : collapsedLabel;
  };
}

bindHideToggle("bulkHideToggle", "bulkTopArea", "▲ 입력·도움말 접기", "▼ 입력·도움말 펼치기");

bindHideToggle("watchHideToggle", "watchTopArea", "▲ 입력·도움말 접기", "▼ 입력·도움말 펼치기");

async function getWatchList() {
  const d = await chrome.storage.local.get([ "watchList" ]);
  return d.watchList || [];
}

async function setWatchList(list) {
  await chrome.storage.local.set({
    watchList: list
  });
}

const DEFAULT_TAB = "기타";

const DEFAULT_TAB_LABEL = "기타(탭분류X)";

const LEGACY_DEFAULT_TAB = "기본";

async function getWatchTabs() {
  const d = await chrome.storage.local.get([ "watchTabs" ]);
  let tabs = d.watchTabs || [];
  if (!tabs.includes(DEFAULT_TAB)) {
    tabs = [ DEFAULT_TAB, ...tabs ];
    await chrome.storage.local.set({
      watchTabs: tabs
    });
  }
  return tabs;
}

async function setWatchTabs(tabs) {
  if (!tabs.includes(DEFAULT_TAB)) tabs.unshift(DEFAULT_TAB);
  await chrome.storage.local.set({
    watchTabs: tabs
  });
}

async function getActiveWatchTab() {
  const d = await chrome.storage.local.get([ "activeWatchTab" ]);
  return d.activeWatchTab || "__all__";
}

async function setActiveWatchTab(name) {
  await chrome.storage.local.set({
    activeWatchTab: name
  });
}

async function migrateLegacyWatchItems() {
  const td = await chrome.storage.local.get([ "watchTabs" ]);
  if (Array.isArray(td.watchTabs) && td.watchTabs.includes(LEGACY_DEFAULT_TAB)) {
    const renamed = [];
    for (const t of td.watchTabs) {
      const nt = t === LEGACY_DEFAULT_TAB ? DEFAULT_TAB : t;
      if (!renamed.includes(nt)) renamed.push(nt);
    }
    await chrome.storage.local.set({
      watchTabs: renamed
    });
  }
  const list = await getWatchList();
  let changed = false;
  for (const it of list) {
    if (!Array.isArray(it.tags) || it.tags.length === 0) {
      it.tags = [ DEFAULT_TAB ];
      changed = true;
    } else if (it.tags.includes(LEGACY_DEFAULT_TAB)) {
      const nt = [];
      for (const t of it.tags) {
        const x = t === LEGACY_DEFAULT_TAB ? DEFAULT_TAB : t;
        if (!nt.includes(x)) nt.push(x);
      }
      it.tags = nt;
      changed = true;
    }
  }
  if (changed) await setWatchList(list);
}

async function saveMemo(num, memo) {
  const list = await getWatchList();
  const it = list.find((x => x.num === num));
  if (it) {
    it.memo = memo;
    await setWatchList(list);
  }
}

const MEMO_MAX = 20;

function makeMemoArea(item) {
  const view = document.createElement("div");
  view.className = "watch-memo";
  const setView = txt => {
    if (txt && txt.length) {
      view.textContent = "📝 " + txt;
      view.classList.remove("empty");
    } else {
      view.textContent = "+ 메모 (왜 관심인지 " + MEMO_MAX + "자 이내)";
      view.classList.add("empty");
    }
  };
  setView(item.memo || "");
  view.addEventListener("click", (e => {
    e.stopPropagation();
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "watch-memo-input";
    inp.maxLength = MEMO_MAX;
    inp.value = item.memo || "";
    inp.placeholder = MEMO_MAX + "자 이내 · Enter 저장 · ESC 취소";
    view.replaceWith(inp);
    inp.focus();
    inp.select();
    let done = false;
    const commit = async () => {
      if (done) return;
      done = true;
      const v = inp.value.trim().slice(0, MEMO_MAX);
      item.memo = v;
      await saveMemo(item.num, v);
      setView(v);
      inp.replaceWith(view);
    };
    const cancel = () => {
      if (done) return;
      done = true;
      setView(item.memo || "");
      inp.replaceWith(view);
    };
    inp.addEventListener("keydown", (e2 => {
      if (e2.key === "Enter" && !e2.isComposing) {
        e2.preventDefault();
        e2.stopPropagation();
        commit();
      } else if (e2.key === "Escape") {
        e2.preventDefault();
        e2.stopPropagation();
        cancel();
      }
    }));
    inp.addEventListener("blur", commit);
    inp.addEventListener("click", (e2 => e2.stopPropagation()));
  }));
  return view;
}

function fmtTraceTime(s) {
  if (!s) return "";
  const m = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!m) return s;
  const mm = String(+m[2]).padStart(2, "0");
  const dd = String(+m[3]).padStart(2, "0");
  return `${mm}-${dd}`;
}

const RETURN_BADGE_STYLE = {
  returning: {
    label: "반송진행",
    bg: "#FBEFD3",
    tx: "#8A5712",
    bd: "#F1D79C"
  },
  returnArrived: {
    label: "반송도착",
    bg: "#F6B469",
    tx: "#84460E",
    bd: "#EB9C40"
  },
  returnDelivered: {
    label: "반송배달",
    bg: "#E0573D",
    tx: "#FFFFFF",
    bd: "#C8412A"
  },
  normalDelivered: {
    label: "정상배달",
    bg: "#1FA055",
    tx: "#FFFFFF",
    bd: "#178845"
  }
};

const RETURN_KEYS = new Set([ "returning", "returnArrived", "returnDelivered" ]);

const watchBadgeHidden = new Set;

const WATCH_BADGE_ORDER = [ "returning", "returnArrived", "returnDelivered", "normalDelivered", "none" ];

const WATCH_BADGE_LABEL = {
  returning: "반송진행",
  returnArrived: "반송도착",
  returnDelivered: "반송배달",
  normalDelivered: "정상배달",
  none: "뱃지 없음"
};

function watchBadgeKey(item) {
  return watchStatusKey(item) || "none";
}

let watchTypeSub = "all";

function applyTypeSub(items, sub) {
  if (sub === "ems") return items.filter((it => it && /^E/i.test(it.num)));
  if (sub === "reg") return items.filter((it => it && /^[RLC]/i.test(it.num)));
  return items;
}

function hasKrEnvelope(item) {
  if (!item || !item.sources) return false;
  const dest = item.sources.epost && item.sources.epost.destinationCountry || item.destinationCountry || "";
  if (dest === "KR") return false;
  const allD = [];
  const g = item.sources.gcss, i = item.sources.icare;
  if (g) {
    if (g.allDetails && g.allDetails.length) allD.push(...g.allDetails); else if (g.detail) allD.push(g.detail);
  }
  if (i) {
    if (i.allDetails && i.allDetails.length) allD.push(...i.allDetails); else if (i.detail) allD.push(i.detail);
  }
  return allD.some((d => typeof d === "string" && d.slice(4).toUpperCase().includes("KR")));
}

function watchStatusKey(item) {
  if (!item || !item.sources) return null;
  const ep = item.sources.epost, g = item.sources.gcss, ic = item.sources.icare;
  const delivered = !!(ep && ep.ok && ep.delivered || g && g.ok && g.delivered || ic && ic.ok && ic.delivered);
  const returned = !!(ep && ep.ok && ep.returned);
  if (delivered && returned) return "returnDelivered";
  if (returned) return "returnArrived";
  if (!returned && hasKrEnvelope(item)) return "returning";
  if (delivered) return "normalDelivered";
  return null;
}

function renderWatchItem(item, isNewTrace, newMarkSources, activeTab) {
  const div = document.createElement("div");
  div.className = "watch-item";
  div.dataset.num = item.num;
  if (selectedWatchNums.has(item.num)) {
    div.style.outline = "2px solid #2196F3";
    div.style.outlineOffset = "-1px";
    div.style.background = "#ebf8ff";
  }
  div.style.cursor = "pointer";
  div.addEventListener("click", (e => {
    handleWatchCardSelect(item.num, e);
  }));
  div.draggable = true;
  div.addEventListener("dragstart", (e => {
    const nums = selectedWatchNums.size > 0 && selectedWatchNums.has(item.num) ? Array.from(selectedWatchNums) : [ item.num ];
    _dragWatchNums = nums;
    e.dataTransfer.effectAllowed = "copyMove";
    try {
      e.dataTransfer.setData("text/plain", nums.join(","));
    } catch (_) {}
    if (nums.length > 1) {
      const ghost = document.createElement("div");
      ghost.textContent = `📦 ${nums.length}개`;
      ghost.style.cssText = "position:fixed;top:-100px;left:-100px;padding:6px 12px;background:#2196F3;color:#fff;font-size:12px;font-weight:bold;border-radius:6px";
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 12, 12);
      setTimeout((() => ghost.remove()), 0);
    }
    const set = new Set(nums);
    document.querySelectorAll("#watchList [data-num]").forEach((el => {
      if (set.has(el.dataset.num)) el.style.opacity = "0.45";
    }));
  }));
  div.addEventListener("dragend", (() => {
    _dragWatchNums = null;
    document.querySelectorAll("#watchList [data-num]").forEach((el => {
      el.style.opacity = "";
    }));
  }));
  const top = document.createElement("div");
  top.className = "watch-row";
  const numSpan = document.createElement("span");
  numSpan.className = "watch-num";
  numSpan.textContent = item.num;
  numSpan.title = "클릭하여 복사";
  numSpan.addEventListener("click", (e => {
    e.stopPropagation();
    function fb() {
      numSpan.style.background = "#48bb78";
      numSpan.style.color = "#fff";
      setTimeout((() => {
        numSpan.style.background = "#edf2f7";
        numSpan.style.color = "#2d3748";
      }), 400);
      showCopyToast("✓ " + item.num + " 복사됨");
    }
    navigator.clipboard.writeText(item.num).then(fb).catch((() => {
      const ta = document.createElement("textarea");
      ta.value = item.num;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch (_) {}
      document.body.removeChild(ta);
      fb();
    }));
  }));
  const newBadge = null;
  const right = document.createElement("div");
  right.className = "watch-right";
  const del = document.createElement("button");
  del.className = "watch-del";
  del.textContent = "×";
  if (activeTab && activeTab !== "__all__") {
    del.title = `이 탭(${activeTab})에서 제거 (다른 탭엔 그대로)`;
  } else {
    del.title = "관심목록에서 완전 삭제";
  }
  del.addEventListener("click", (async e => {
    e.stopPropagation();
    const list = await getWatchList();
    if (activeTab && activeTab !== "__all__") {
      const it = list.find((x => x.num === item.num));
      if (it) {
        it.tags = (it.tags || []).filter((t => t !== activeTab));
        let next;
        if (it.tags.length === 0) {
          next = list.filter((x => x.num !== item.num));
          const d = await chrome.storage.local.get([ "newTraceMarks" ]);
          const marks = d.newTraceMarks || {};
          delete marks[item.num];
          await chrome.storage.local.set({
            newTraceMarks: marks
          });
        } else {
          next = list;
        }
        await setWatchList(next);
      }
    } else {
      const filtered = list.filter((x => x.num !== item.num));
      await setWatchList(filtered);
      const d = await chrome.storage.local.get([ "newTraceMarks" ]);
      const marks = d.newTraceMarks || {};
      delete marks[item.num];
      await chrome.storage.local.set({
        newTraceMarks: marks
      });
    }
    refreshWatchUI();
  }));
  right.appendChild(del);
  const stKey = watchStatusKey(item);
  if (stKey && RETURN_BADGE_STYLE[stKey]) {
    const st = RETURN_BADGE_STYLE[stKey];
    const sb = document.createElement("span");
    sb.textContent = st.label;
    sb.style.cssText = "font-size:10px;font-weight:700;padding:2px 7px;border-radius:3px;letter-spacing:0.2px;font-family:sans-serif;white-space:nowrap;flex-shrink:0;background:" + st.bg + ";color:" + st.tx + ";border:1px solid " + st.bd;
    right.insertBefore(sb, del);
  }
  const leftGroup = document.createElement("div");
  leftGroup.style.cssText = "display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0";
  leftGroup.appendChild(numSpan);
  const dest2 = item.sources && item.sources.epost && item.sources.epost.destinationCountry || item.destinationCountry || "";
  if (dest2) {
    const dn = document.createElement("span");
    dn.style.cssText = "background:#bee3f8;color:#2c5282;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:3px;font-family:sans-serif;letter-spacing:0.5px;user-select:none;flex-shrink:0";
    dn.textContent = dest2;
    dn.title = "도착국 (ePOST 기준)";
    leftGroup.appendChild(dn);
  }
  if (newBadge) {
    newBadge.style.marginLeft = "0";
    leftGroup.appendChild(newBadge);
  }
  top.appendChild(leftGroup);
  top.appendChild(right);
  div.appendChild(top);
  div.appendChild(makeMemoArea(item));
  const traceArea = document.createElement("div");
  traceArea.className = "trace-area";
  const sources = item.sources;
  if (!sources) {
    const line = document.createElement("div");
    line.className = "trace-line" + (isNewTrace ? " is-new" : "");
    if (!item.lastTraceText) {
      line.classList.add("pending");
      line.textContent = "아직 조회 전";
    } else {
      const timeStr = fmtTraceTime(item.lastTraceTime);
      line.textContent = (isNewTrace ? "🆕 " : "") + item.lastTraceText + (timeStr ? " · " + timeStr : "");
    }
    traceArea.appendChild(line);
  } else {
    const SOURCES = [ {
      key: "epost",
      label: "ePOST"
    }, {
      key: "gcss",
      label: "GCSS"
    }, {
      key: "icare",
      label: "iCare"
    } ];
    let latestKey = null, latestTs = 0;
    for (const sdef of SOURCES) {
      const s = sources[sdef.key];
      if (s && s.ok === true && s.lastTraceTimestamp && s.lastTraceTimestamp > latestTs) {
        latestTs = s.lastTraceTimestamp;
        latestKey = sdef.key;
      }
    }
    for (const sdef of SOURCES) {
      const s = sources[sdef.key];
      const line = document.createElement("div");
      line.style.cssText = "display:flex;gap:0;align-items:baseline";
      if (sdef.key === latestKey) line.style.fontWeight = "600";
      const traceWrap = document.createElement("div");
      traceWrap.className = "trace-line";
      traceWrap.style.cssText = "display:inline-flex;gap:0;align-items:baseline;flex-wrap:wrap;min-width:0;max-width:100%";
      if (sdef.key === latestKey) traceWrap.style.fontWeight = "600";
      const lab = document.createElement("span");
      lab.className = "src-label";
      lab.textContent = "[" + sdef.label + "]";
      traceWrap.appendChild(lab);
      if (s && s.ok === true && (sdef.key === "gcss" || sdef.key === "icare") && s.workflowType) {
        const wb = makeWorkflowBadge(s.workflowType);
        if (wb) {
          traceWrap.appendChild(document.createTextNode(" "));
          traceWrap.appendChild(wb);
        }
      }
      traceWrap.appendChild(document.createTextNode(" "));
      if (!s) {
        const span = document.createElement("span");
        span.className = "src-pending";
        span.textContent = "아직 조회 전";
        traceWrap.appendChild(span);
      } else if (s.skipped || s.ok === false) {
        const span = document.createElement("span");
        span.className = "src-skip";
        span.textContent = "—";
        traceWrap.appendChild(span);
      } else if (s.ok === true) {
        const traceSpan = document.createElement("span");
        traceSpan.textContent = s.lastTraceText;
        traceWrap.appendChild(traceSpan);
        if (s.lastTraceTime) {
          const dateSpan = document.createElement("span");
          dateSpan.style.whiteSpace = "nowrap";
          dateSpan.textContent = " · " + fmtTraceTime(s.lastTraceTime);
          traceWrap.appendChild(dateSpan);
        }
      } else {
        const span = document.createElement("span");
        span.className = "src-pending";
        span.textContent = "아직 조회 전";
        traceWrap.appendChild(span);
      }
      if (newMarkSources && newMarkSources[sdef.key]) {
        const nb = document.createElement("span");
        nb.className = "trace-new-mark";
        nb.textContent = "N";
        traceWrap.appendChild(nb);
      }
      line.appendChild(traceWrap);
      if (!(s && s.skipped)) {
        makeTraceLineLinkable(traceWrap, sdef.key, item.num, (src => {
          clearNewMarkSource(item.num, src).then((() => refreshWatchUI()));
        }));
      }
      traceArea.appendChild(line);
    }
  }
  div.appendChild(traceArea);
  div.querySelectorAll("input,textarea").forEach((el => {
    el.addEventListener("mousedown", (() => {
      div.draggable = false;
      document.addEventListener("mouseup", (() => {
        div.draggable = true;
      }), {
        once: true
      });
    }));
  }));
  return div;
}

function filterByActiveTab(list, activeTab) {
  if (activeTab === "__all__") return list;
  return list.filter((it => Array.isArray(it.tags) && it.tags.includes(activeTab)));
}

let watchListCache = [];

let _watchNewMarks = {};

let _watchActiveTab = "__all__";

async function refreshWatchUI() {
  await migrateLegacyWatchItems();
  selectedWatchNums.clear();
  lastClickedWatchNum = null;
  const list = await getWatchList();
  watchListCache = list;
  const tabs = await getWatchTabs();
  const activeTab = await getActiveWatchTab();
  _watchActiveTab = activeTab;
  const cnt = list.length;
  document.getElementById("watchCount").textContent = cnt > 0 ? "(" + cnt + ")" : "";
  document.getElementById("watchCountText").textContent = `관심목록 ${cnt}개`;
  const d = await chrome.storage.local.get([ "newTraceMarks" ]);
  _watchNewMarks = d.newTraceMarks || {};
  renderWatchTabBar(tabs, list, _watchNewMarks, activeTab);
  renderTagChooser(tabs);
  renderWatchBadgeFilter();
  rerenderWatchListOnly();
}

function rerenderWatchListOnly() {
  const list = watchListCache || [];
  const activeTab = _watchActiveTab;
  const newMarks = _watchNewMarks || {};
  const filtered = filterByActiveTab(list, activeTab);
  const typeItems = applyTypeSub(filtered, watchTypeSub);
  refreshWatchBadgeBtn(typeItems);
  let visible = watchBadgeHidden.size === 0 ? typeItems : typeItems.filter((it => !watchBadgeHidden.has(watchBadgeKey(it))));
  if (typeItems.length > 0 && visible.length === 0 && watchBadgeHidden.size > 0) {
    const present = watchBadgePresentKeys(typeItems);
    if (present.length < 2) {
      watchBadgeHidden.clear();
      visible = typeItems;
      renderWatchBadgeFilter();
      showCopyToast("🔓 뱃지 필터 자동 해제 — 걸러진 카드가 더는 없어서");
    }
  }
  const tsOf = it => {
    if (!it || !it.sources) return it && it.lastTraceTimestamp || 0;
    const e = it.sources.epost && it.sources.epost.lastTraceTimestamp || 0;
    const g = it.sources.gcss && it.sources.gcss.lastTraceTimestamp || 0;
    const i = it.sources.icare && it.sources.icare.lastTraceTimestamp || 0;
    return Math.max(e, g, i, it.lastTraceTimestamp || 0);
  };
  const _skCache = new Map;
  const skeyOf = it => {
    let v = _skCache.get(it.num);
    if (v === undefined) {
      v = watchStatusKey(it);
      _skCache.set(it.num, v);
    }
    return v;
  };
  const tierOf = (it, isNew) => isNew ? 0 : skeyOf(it) ? 1 : 2;
  const isFresh = it => !it.lastChecked;
  const sorted = [ ...visible ].sort(((a, b) => {
    const af = isFresh(a), bf = isFresh(b);
    if (af !== bf) return af ? -1 : 1;
    if (af && bf) return (b.addedAt || 0) - (a.addedAt || 0);
    const at = tierOf(a, !!newMarks[a.num]);
    const bt = tierOf(b, !!newMarks[b.num]);
    if (at !== bt) return at - bt;
    const aTs = tsOf(a);
    const bTs = tsOf(b);
    if (aTs === 0 && bTs === 0) return 0;
    if (aTs === 0) return 1;
    if (bTs === 0) return -1;
    return bTs - aTs;
  }));
  const container = document.getElementById("watchList");
  if (!container) return;
  container.innerHTML = "";
  if (sorted.length === 0) {
    const em = document.createElement("div");
    em.className = "empty-state";
    em.style.whiteSpace = "pre-line";
    if (filtered.length > 0) {
      em.textContent = `현재 필터에 맞는 우편물이 없습니다.\n(타입·뱃지 필터를 확인하세요)`;
    } else if (activeTab === "__all__") {
      em.textContent = `관심목록이 비어있습니다.\n위에서 등기번호를 추가하세요.`;
    } else {
      em.textContent = `'${activeTab}' 탭이 비어있습니다.\n위 입력창에서 이 탭에 추가하세요.`;
    }
    container.appendChild(em);
  } else {
    sorted.forEach((item => {
      const isNew = !!newMarks[item.num];
      const srcMarks = typeof newMarks[item.num] === "object" && newMarks[item.num] ? newMarks[item.num] : {};
      container.appendChild(renderWatchItem(item, isNew, srcMarks, activeTab));
    }));
  }
}

let _wbfPopup = null;

function watchBadgeCounts(filtered) {
  const counts = {};
  WATCH_BADGE_ORDER.forEach((k => {
    counts[k] = 0;
  }));
  filtered.forEach((it => {
    counts[watchBadgeKey(it)]++;
  }));
  return counts;
}

function watchBadgePresentKeys(filtered) {
  const counts = watchBadgeCounts(filtered);
  return WATCH_BADGE_ORDER.filter((k => counts[k] > 0));
}

function refreshWatchBadgeBtn(filtered) {
  const btn = document.getElementById("watchBadgeFilterBtn");
  if (!btn) return;
  const present = watchBadgePresentKeys(filtered);
  const shownN = present.filter((k => !watchBadgeHidden.has(k))).length;
  const filtering = present.some((k => watchBadgeHidden.has(k)));
  if (filtering) {
    btn.textContent = `뱃지(${shownN}) ▾`;
    btn.style.background = "#2196F3";
    btn.style.color = "#fff";
    btn.style.borderColor = "#2196F3";
  } else {
    btn.textContent = "뱃지 ▾";
    btn.style.background = "#edf2f7";
    btn.style.color = "#4a5568";
    btn.style.borderColor = "#cbd5e0";
  }
}

function renderWatchBadgeFilter() {
  const bar = document.getElementById("watchFilterBar");
  if (!bar) return;
  closeWatchBadgePopup();
  const tabItems = filterByActiveTab(watchListCache || [], _watchActiveTab);
  if (tabItems.length === 0) {
    bar.style.display = "none";
    bar.innerHTML = "";
    return;
  }
  bar.style.display = "flex";
  bar.innerHTML = "";
  const emsN = tabItems.filter((it => /^E/i.test(it.num))).length;
  const regN = tabItems.filter((it => /^[RLC]/i.test(it.num))).length;
  const subBar = document.createElement("div");
  subBar.style.cssText = "display:flex;gap:3px;flex:1;min-width:0";
  const subTabs = [];
  function styleSub() {
    subTabs.forEach((t => {
      const active = t.name === watchTypeSub;
      t.el.style.background = active ? "#90cdf4" : "#edf2f7";
      t.el.style.color = active ? "#1a365d" : "#4a5568";
      t.el.style.borderColor = active ? "#2196F3" : "#cbd5e0";
    }));
  }
  function addSub(name, label) {
    const t = document.createElement("span");
    t.style.cssText = "flex:1;min-width:0;text-align:center;padding:4px 6px;background:#edf2f7;cursor:pointer;font-size:10px;font-weight:bold;color:#4a5568;border-radius:3px;border:1px solid #cbd5e0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:sans-serif;user-select:none";
    t.textContent = label;
    t.title = label;
    t.onclick = () => {
      if (watchTypeSub === name) return;
      watchTypeSub = name;
      closeWatchBadgePopup();
      renderWatchBadgeFilter();
      rerenderWatchListOnly();
    };
    subBar.appendChild(t);
    subTabs.push({
      name: name,
      el: t
    });
  }
  addSub("all", `전체(${tabItems.length})`);
  addSub("ems", `EMS(${emsN})`);
  addSub("reg", `등기/소포(${regN})`);
  styleSub();
  bar.appendChild(subBar);
  const typeItems = applyTypeSub(tabItems, watchTypeSub);
  const present = watchBadgePresentKeys(typeItems);
  if (present.length >= 2) {
    const btn = document.createElement("button");
    btn.id = "watchBadgeFilterBtn";
    btn.type = "button";
    btn.style.cssText = "flex-shrink:0;padding:4px 9px;background:#edf2f7;color:#4a5568;border:1px solid #cbd5e0;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;font-family:sans-serif;white-space:nowrap;user-select:none";
    btn.title = "뱃지로 거르기 — 체크한 뱃지만 보임 (엑셀 필터처럼)";
    btn.onclick = () => {
      if (_wbfPopup) closeWatchBadgePopup(); else openWatchBadgePopup(btn);
    };
    bar.appendChild(btn);
    refreshWatchBadgeBtn(typeItems);
  }
}

function closeWatchBadgePopup() {
  if (_wbfPopup) {
    _wbfPopup.remove();
    _wbfPopup = null;
  }
  document.removeEventListener("mousedown", _wbfOnDown, true);
  document.removeEventListener("keydown", _wbfOnKey, true);
  window.removeEventListener("resize", closeWatchBadgePopup);
  const wl = document.getElementById("watchList");
  if (wl) wl.removeEventListener("scroll", closeWatchBadgePopup);
}

function _wbfOnDown(e) {
  const btn = document.getElementById("watchBadgeFilterBtn");
  if (_wbfPopup && !_wbfPopup.contains(e.target) && e.target !== btn) closeWatchBadgePopup();
}

function _wbfOnKey(e) {
  if (e.key === "Escape") {
    e.stopPropagation();
    closeWatchBadgePopup();
  }
}

function openWatchBadgePopup(btn) {
  closeWatchBadgePopup();
  const tabItems = filterByActiveTab(watchListCache || [], _watchActiveTab);
  const filtered = applyTypeSub(tabItems, watchTypeSub);
  const counts = watchBadgeCounts(filtered);
  const present = WATCH_BADGE_ORDER.filter((k => counts[k] > 0));
  const pop = document.createElement("div");
  pop.style.cssText = "position:fixed;z-index:99999;background:#fff;border:1px solid #cbd5e0;border-radius:5px;box-shadow:0 4px 14px rgba(0,0,0,0.18);font-family:sans-serif;font-size:12px;min-width:170px;max-width:230px;overflow:hidden";
  const head = document.createElement("label");
  head.style.cssText = "display:flex;align-items:center;gap:7px;padding:7px 10px;border-bottom:1px solid #e2e8f0;cursor:pointer;font-weight:bold;color:#2d3748;user-select:none";
  const allCb = document.createElement("input");
  allCb.type = "checkbox";
  allCb.style.cssText = "margin:0;cursor:pointer";
  const headTxt = document.createElement("span");
  headTxt.textContent = "(전체 선택)";
  head.appendChild(allCb);
  head.appendChild(headTxt);
  pop.appendChild(head);
  const listWrap = document.createElement("div");
  listWrap.style.cssText = "max-height:260px;overflow-y:auto;padding:4px 0";
  pop.appendChild(listWrap);
  function syncAll() {
    const onN = present.filter((k => !watchBadgeHidden.has(k))).length;
    allCb.checked = onN === present.length;
    allCb.indeterminate = onN > 0 && onN < present.length;
  }
  function renderRows() {
    listWrap.innerHTML = "";
    present.forEach((k => {
      const row = document.createElement("label");
      row.style.cssText = "display:flex;align-items:center;gap:7px;padding:5px 10px;cursor:pointer;color:#2d3748;user-select:none";
      row.onmouseenter = () => {
        row.style.background = "#f7fafc";
      };
      row.onmouseleave = () => {
        row.style.background = "";
      };
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.style.cssText = "margin:0;cursor:pointer";
      cb.checked = !watchBadgeHidden.has(k);
      cb.onchange = () => {
        if (cb.checked) watchBadgeHidden.delete(k); else watchBadgeHidden.add(k);
        syncAll();
        rerenderWatchListOnly();
      };
      const txt = document.createElement("span");
      txt.style.cssText = "flex:1;display:flex;justify-content:space-between;gap:10px";
      const nameEl = document.createElement("span");
      nameEl.style.fontWeight = "bold";
      nameEl.textContent = WATCH_BADGE_LABEL[k];
      const cntEl = document.createElement("span");
      cntEl.style.color = "#a0aec0";
      cntEl.textContent = counts[k];
      txt.appendChild(nameEl);
      txt.appendChild(cntEl);
      row.appendChild(cb);
      row.appendChild(txt);
      listWrap.appendChild(row);
    }));
  }
  allCb.onchange = () => {
    if (allCb.checked) present.forEach((k => watchBadgeHidden.delete(k))); else present.forEach((k => watchBadgeHidden.add(k)));
    renderRows();
    syncAll();
    rerenderWatchListOnly();
  };
  renderRows();
  syncAll();
  document.body.appendChild(pop);
  _wbfPopup = pop;
  const rect = btn.getBoundingClientRect();
  let left = rect.right - pop.offsetWidth;
  if (left < 6) left = 6;
  let top = rect.bottom + 4;
  if (top + pop.offsetHeight > window.innerHeight - 6) top = Math.max(6, rect.top - pop.offsetHeight - 4);
  pop.style.left = left + "px";
  pop.style.top = top + "px";
  document.addEventListener("mousedown", _wbfOnDown, true);
  document.addEventListener("keydown", _wbfOnKey, true);
  window.addEventListener("resize", closeWatchBadgePopup);
  const wl = document.getElementById("watchList");
  if (wl) wl.addEventListener("scroll", closeWatchBadgePopup);
}

function watchSearchFilter(q) {
  q = (q || "").replace(/\s+/g, "").toUpperCase();
  if (!q) return [];
  return watchListCache.filter((it => (it.num || "").toUpperCase().includes(q)));
}

function hideWatchSearchList() {
  const list = document.getElementById("watchSearchList");
  if (list) list.style.display = "none";
}

function updateWatchSearchClear() {
  const inp = document.getElementById("watchSearchInp");
  const cb = document.getElementById("watchSearchClear");
  if (cb) cb.style.display = inp && inp.value ? "block" : "none";
}

function watchItemTabs(it) {
  const tags = it && Array.isArray(it.tags) ? it.tags.filter(Boolean) : [];
  return tags.length ? tags : [ DEFAULT_TAB ];
}

function renderWatchSearchList(q) {
  const list = document.getElementById("watchSearchList");
  if (!list) return;
  const matches = watchSearchFilter(q);
  list.innerHTML = "";
  if (!matches.length) {
    list.style.display = "none";
    return;
  }
  matches.slice(0, 50).forEach(((it, i) => {
    const item = document.createElement("div");
    item.style.cssText = "padding:7px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid #f0f0f0;color:#2d3748;display:flex;justify-content:space-between;gap:8px;align-items:center";
    item._ddValue = it.num;
    const nm = document.createElement("span");
    nm.textContent = it.num;
    nm.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    item.appendChild(nm);
    const tb = document.createElement("span");
    tb.style.cssText = "color:#2196F3;font-size:11px;flex-shrink:0;font-weight:600";
    tb.textContent = watchItemTabs(it).join(", ");
    item.appendChild(tb);
    item.addEventListener("mouseenter", (() => ddHighlight(list, i)));
    item.addEventListener("mousedown", (e => {
      e.preventDefault();
      selectWatchSearch(it.num);
    }));
    list.appendChild(item);
  }));
  list.style.display = "block";
  list._active = -1;
}

function selectWatchSearch(num) {
  const inp = document.getElementById("watchSearchInp");
  if (inp) inp.value = num;
  updateWatchSearchClear();
  hideWatchSearchList();
  jumpToWatchCard(num);
}

async function jumpToWatchCard(num) {
  const u = String(num).toUpperCase();
  const it = watchListCache.find((x => x && String(x.num).toUpperCase() === u));
  const tab = it ? watchItemTabs(it)[0] : "__all__";
  await setActiveWatchTab(tab);
  await refreshWatchUI();
  const container = document.getElementById("watchList");
  if (!container) return;
  let card = null;
  container.querySelectorAll("[data-num]").forEach((c => {
    if (String(c.dataset.num).toUpperCase() === u) card = c;
  }));
  if (!card) return;
  card.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
  flashFoundCard(card);
}

(function() {
  const inp = document.getElementById("watchSearchInp");
  const clr = document.getElementById("watchSearchClear");
  if (clr) clr.addEventListener("mousedown", (e => {
    e.preventDefault();
    if (!inp) return;
    inp.value = "";
    updateWatchSearchClear();
    hideWatchSearchList();
    inp.focus();
  }));
  if (inp) {
    inp.addEventListener("input", (() => {
      updateWatchSearchClear();
      renderWatchSearchList(inp.value);
    }));
    inp.addEventListener("focus", (() => {
      if (inp.value) renderWatchSearchList(inp.value);
    }));
    inp.addEventListener("blur", (() => {
      setTimeout(hideWatchSearchList, 150);
    }));
    inp.addEventListener("keydown", (e => {
      const list = document.getElementById("watchSearchList");
      if (ddNav(e, list, selectWatchSearch)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        const matches = watchSearchFilter(inp.value);
        if (matches.length) selectWatchSearch(matches[0].num);
      } else if (e.key === "Escape") {
        if (list && list.style.display === "block") {
          e.stopPropagation();
          hideWatchSearchList();
        }
      }
    }));
  }
})();

function renderWatchTabBar(tabs, list, newMarks, activeTab) {
  const bar = document.getElementById("watchTabBar");
  if (!bar) return;
  bar.innerHTML = "";
  function newCountInTab(tabName) {
    let n = 0;
    for (const it of list) {
      const inTab = tabName === "__all__" || Array.isArray(it.tags) && it.tags.includes(tabName);
      if (!inTab) continue;
      const m = newMarks[it.num];
      const hasNew = m && (typeof m === "object" ? Object.keys(m).length > 0 : true);
      if (hasNew) n++;
    }
    return n;
  }
  function tabCountInTab(tabName) {
    if (tabName === "__all__") return list.length;
    return list.filter((it => Array.isArray(it.tags) && it.tags.includes(tabName))).length;
  }
  const row1 = document.createElement("div");
  row1.style.cssText = "display:flex;width:100%;gap:4px";
  const allBtn = mkTabButton("__all__", `전체 (${tabCountInTab("__all__")})`, newCountInTab("__all__"), activeTab === "__all__", false);
  allBtn.style.flex = "1";
  allBtn.style.minWidth = "0";
  const defBtn = mkTabButton(DEFAULT_TAB, `${DEFAULT_TAB_LABEL} (${tabCountInTab(DEFAULT_TAB)})`, newCountInTab(DEFAULT_TAB), activeTab === DEFAULT_TAB, false);
  defBtn.style.flex = "1.5";
  defBtn.style.minWidth = "0";
  row1.appendChild(allBtn);
  row1.appendChild(defBtn);
  bar.appendChild(row1);
  const userTabs = tabs.filter((t => t !== DEFAULT_TAB));
  const items = userTabs.map((t => ({
    kind: "tab",
    name: t
  })));
  items.push({
    kind: "add"
  });
  for (let i = 0; i < items.length; i += 3) {
    const chunk = items.slice(i, i + 3);
    const row = document.createElement("div");
    row.style.cssText = "display:flex;width:100%;gap:4px";
    chunk.forEach((itm => {
      let btn;
      if (itm.kind === "tab") {
        btn = mkTabButton(itm.name, `${itm.name} (${tabCountInTab(itm.name)})`, newCountInTab(itm.name), activeTab === itm.name, true);
      } else {
        btn = mkAddTabButton();
      }
      btn.style.flex = "1";
      btn.style.minWidth = "0";
      row.appendChild(btn);
    }));
    bar.appendChild(row);
  }
}

function mkTabButton(name, label, newCount, active, removable) {
  const wrap = document.createElement("div");
  wrap.style.cssText = `display:flex;align-items:stretch;border:1px solid ${active ? "#2196F3" : "#cbd5e0"};border-radius:4px;overflow:hidden;background:${active ? "#2196F3" : "#edf2f7"};color:${active ? "#fff" : "#4a5568"};font-size:11px;font-weight:bold;cursor:pointer;min-width:0`;
  const label_el = document.createElement("span");
  label_el.style.cssText = "padding:5px 8px;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
  label_el.textContent = label;
  label_el.title = label;
  if (newCount > 0) {
    const nb = document.createElement("span");
    nb.style.cssText = "color:#e53e3e;margin-left:4px;font-weight:bold";
    nb.textContent = `· N`;
    if (active) nb.style.color = "#ffd0d0";
    label_el.appendChild(nb);
  }
  wrap.appendChild(label_el);
  label_el.onclick = async e => {
    e.stopPropagation();
    await setActiveWatchTab(name);
    refreshWatchUI();
  };
  if (name !== "__all__" && !active) {
    const hl = on => {
      wrap.style.outline = on ? "2px solid #2196F3" : "";
      wrap.style.background = on ? "#dbeafe" : "#edf2f7";
    };
    wrap.addEventListener("dragover", (e => {
      if (!_dragWatchNums) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = e.ctrlKey || _watchActiveTab === "__all__" ? "copy" : "move";
      hl(true);
    }));
    wrap.addEventListener("dragleave", (() => hl(false)));
    wrap.addEventListener("drop", (e => {
      if (!_dragWatchNums) return;
      e.preventDefault();
      hl(false);
      handleWatchDrop(name, e.ctrlKey);
    }));
  }
  if (removable) {
    const x = document.createElement("span");
    x.textContent = "×";
    x.style.cssText = `padding:5px 8px;border-left:1px solid ${active ? "#1976d2" : "#cbd5e0"};color:${active ? "#fff" : "#a0aec0"};font-weight:bold;cursor:pointer;font-size:13px`;
    x.title = `'${name}' 탭과 안의 우편물 모두 삭제`;
    x.onclick = async e => {
      e.stopPropagation();
      if (!confirm(`'${name}' 탭과 안의 우편물을 모두 삭제하시겠습니까?\n(다른 탭에도 속한 우편물은 다른 탭에만 남음)`)) return;
      const tabs2 = (await getWatchTabs()).filter((t => t !== name));
      await setWatchTabs(tabs2);
      let list2 = await getWatchList();
      list2 = list2.filter((it => {
        const tags = (it.tags || []).filter((t => t !== name));
        it.tags = tags;
        return tags.length > 0;
      }));
      await setWatchList(list2);
      const at = await getActiveWatchTab();
      if (at === name) await setActiveWatchTab("__all__");
      refreshWatchUI();
    };
    wrap.appendChild(x);
  }
  return wrap;
}

function mkAddTabButton() {
  const b = document.createElement("div");
  b.style.cssText = "padding:5px 8px;border:1px dashed #2196F3;border-radius:4px;background:#f0f9ff;color:#2196F3;font-size:11px;font-weight:bold;cursor:pointer;text-align:center;display:flex;align-items:center;justify-content:center";
  b.textContent = "＋ 새 탭";
  b.title = "새 탭 만들기";
  b.onclick = async () => {
    const name = (prompt("새 탭 이름을 입력하세요 (15자 이내)") || "").trim();
    if (!name) return;
    if (name.length > 15) {
      alert("15자 이내로 입력하세요.");
      return;
    }
    if (name === "__all__") {
      alert("이 이름은 예약돼 있어 사용할 수 없습니다.");
      return;
    }
    const tabs = await getWatchTabs();
    if (tabs.includes(name)) {
      alert("이미 같은 이름의 탭이 있습니다.");
      return;
    }
    tabs.push(name);
    await setWatchTabs(tabs);
    await setActiveWatchTab(name);
    refreshWatchUI();
  };
  return b;
}

async function renderTagChooser(tabs) {
  const wrap = document.getElementById("watchTagChooser");
  if (!wrap) return;
  wrap.innerHTML = "";
  const lab = document.createElement("span");
  lab.style.cssText = "color:#718096;align-self:center";
  lab.textContent = "추가할 탭:";
  wrap.appendChild(lab);
  let defaultCb = null;
  const otherCbs = [];
  for (const t of tabs) {
    const lbl = document.createElement("label");
    lbl.style.cssText = "display:inline-flex;align-items:center;gap:3px;cursor:pointer;padding:2px 6px;background:#edf2f7;border-radius:3px;font-weight:500";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = t;
    cb.dataset.tagCheckbox = "1";
    if (t === DEFAULT_TAB) {
      cb.checked = true;
      defaultCb = cb;
    } else otherCbs.push(cb);
    cb.style.margin = "0";
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(t === DEFAULT_TAB ? DEFAULT_TAB_LABEL : t));
    wrap.appendChild(lbl);
  }
  for (const cb of otherCbs) {
    cb.addEventListener("change", (() => {
      if (cb.checked && defaultCb) defaultCb.checked = false;
    }));
  }
}

document.getElementById("watchAddBtn").onclick = async () => {
  const inp = document.getElementById("watchAddInp");
  const raw = inp.value.trim().toUpperCase();
  if (!raw) return;
  const nums = raw.split(/[\s,;]+/).filter(Boolean);
  if (nums.length === 0) return;
  const chooser = document.getElementById("watchTagChooser");
  let selectedTags = chooser ? Array.from(chooser.querySelectorAll("input[type=checkbox]:checked")).map((c => c.value)) : [];
  if (selectedTags.length === 0) selectedTags = [ DEFAULT_TAB ];
  const list = await getWatchList();
  const existing = new Map(list.map((x => [ x.num, x ])));
  let added = 0, mergedTag = 0;
  for (const n of nums) {
    if (existing.has(n)) {
      const it = existing.get(n);
      if (!Array.isArray(it.tags)) it.tags = [ DEFAULT_TAB ];
      let merged = false;
      for (const t of selectedTags) {
        if (!it.tags.includes(t)) {
          it.tags.push(t);
          merged = true;
        }
      }
      if (merged) mergedTag++;
    } else {
      list.push({
        num: n,
        addedAt: Date.now(),
        memo: "",
        tags: selectedTags.slice()
      });
      existing.set(n, list[list.length - 1]);
      added++;
    }
  }
  await setWatchList(list);
  inp.value = "";
  const res = document.getElementById("addResult");
  const dup = nums.length - added - mergedTag;
  const parts = [];
  if (added > 0) parts.push(`${added}개 추가됨`);
  if (mergedTag > 0) parts.push(`기존 ${mergedTag}개 탭 추가`);
  if (dup > 0) parts.push(`중복 ${dup}개 스킵`);
  res.textContent = parts.join(" / ") || "추가됨";
  setTimeout((() => {
    res.textContent = "";
  }), 3e3);
  refreshWatchUI();
};

document.getElementById("watchAddInp").addEventListener("keydown", (e => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    document.getElementById("watchAddBtn").click();
  }
}));

const clearNewBtn = document.getElementById("clearNewBtn");

if (clearNewBtn) {
  clearNewBtn.onclick = async () => {
    await clearAllNewMarks();
  };
}

const clearAllBtn = document.getElementById("clearAllBtn");

if (clearAllBtn) {
  clearAllBtn.onclick = async () => {
    const list = await getWatchList();
    const tabs = await getWatchTabs();
    const userTabCount = tabs.filter((t => t !== DEFAULT_TAB)).length;
    if (list.length === 0 && userTabCount === 0) {
      alert("관심목록과 사용자 탭이 이미 비어있습니다.");
      return;
    }
    if (!confirm(`관심목록 ${list.length}개 우편물과 사용자 정의 탭 ${userTabCount}개를 모두 삭제하시겠습니까?\n(전체 탭과 기타(탭분류X) 탭은 유지)\n\n이 작업은 되돌릴 수 없습니다.`)) return;
    await setWatchList([]);
    await setWatchTabs([ DEFAULT_TAB ]);
    await setActiveWatchTab("__all__");
    await chrome.storage.local.set({
      newTraceMarks: {}
    });
    await chrome.runtime.sendMessage({
      cmd: "clearBadge"
    }).catch((() => {}));
    refreshWatchUI();
  };
}

const refreshBtn = document.getElementById("refreshBtn");

let watchRefreshing = false;

let watchRefreshCancelling = false;

chrome.runtime.onMessage.addListener((msg => {
  if (msg && msg.cmd === "watchRefreshProgress" && watchRefreshing && !watchRefreshCancelling && refreshBtn) {
    refreshBtn.textContent = `조회 중 ${msg.done}/${msg.total}`;
  }
}));

refreshBtn.onclick = async () => {
  if (watchRefreshing) {
    if (watchRefreshCancelling) return;
    watchRefreshCancelling = true;
    refreshBtn.textContent = "중지 중…";
    chrome.runtime.sendMessage({
      cmd: "cancelAutoCheck"
    }).catch((() => {}));
    return;
  }
  const list = await getWatchList();
  if (list.length === 0) {
    alert("관심목록이 비어있습니다. 등기번호를 먼저 추가하세요.");
    return;
  }
  watchRefreshing = true;
  watchRefreshCancelling = false;
  refreshBtn.title = "다시 누르면 조회 중지";
  refreshBtn.style.background = "#fffaf0";
  refreshBtn.style.color = "#b7791f";
  refreshBtn.style.borderColor = "#f6ad55";
  refreshBtn.textContent = `조회 중 0/${list.length}`;
  try {
    const r = await chrome.runtime.sendMessage({
      cmd: "runAutoCheckNow"
    });
    if (!r || !r.ok) {
      alert("조회 실패: " + (r ? JSON.stringify(r) : "응답 없음"));
    } else if (r.cancelled) {
      showCopyToast(`⏹ 조회 중지됨 (${r.done || 0}/${r.total || 0} 완료)`);
    } else {
      showCopyToast("✅ 관심목록 새로고침 완료");
    }
  } catch (e) {
    alert("조회 중 오류: " + e.message);
  }
  watchRefreshing = false;
  watchRefreshCancelling = false;
  refreshBtn.title = "";
  refreshBtn.style.background = "";
  refreshBtn.style.color = "";
  refreshBtn.style.borderColor = "";
  refreshBtn.textContent = "🔄 새로고침";
  await refreshWatchUI();
};

chrome.storage.onChanged.addListener(((changes, area) => {
  if (area === "local" && (changes.watchList || changes.newTraceMarks)) {
    refreshWatchUI();
  }
}));

refreshWatchUI();

chrome.runtime.sendMessage({
  cmd: "refreshBadge"
}).catch((() => {}));
