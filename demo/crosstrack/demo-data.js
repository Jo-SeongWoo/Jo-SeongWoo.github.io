(function() {
  "use strict";
  const HOUR = 3600 * 1e3;
  const NOW = Date.now() - 10 * 60 * 1e3;
  function mulberry32(a) {
    return function() {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  let rnd = mulberry32(20261016);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const rf = (a, b) => a + rnd() * (b - a);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const chance = p => rnd() < p;
  function wpick(obj) {
    const keys = Object.keys(obj);
    let tot = 0;
    for (const k of keys) tot += obj[k];
    let x = rnd() * tot;
    for (const k of keys) {
      x -= obj[k];
      if (x < 0) return k;
    }
    return keys[keys.length - 1];
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [ arr[j], arr[i] ];
    }
    return arr;
  }
  const p2 = n => String(n).padStart(2, "0");
  const D = t => new Date(t);
  const fmtEpost = t => {
    const d = D(t);
    return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  };
  const fmtIso = t => {
    const d = D(t);
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  };
  const fmtDay = t => {
    const d = D(t);
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  };
  const fmtHm = t => {
    const d = D(t);
    return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  };
  const DOW = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];
  const S10W = [ 8, 6, 4, 2, 3, 5, 9, 7 ];
  function s10check(serial) {
    let s = 0;
    for (let i = 0; i < 8; i++) s += +serial[i] * S10W[i];
    let c = 11 - s % 11;
    if (c === 10) c = 0; else if (c === 11) c = 5;
    return c;
  }
  const usedNums = new Set;
  function fakeNum(prefix) {
    for (;;) {
      const serial = String(ri(1e7, 99999999));
      const wrong = (s10check(serial) + ri(1, 9)) % 10;
      const num = prefix + serial + wrong + "KR";
      if (!usedNums.has(num)) {
        usedNums.add(num);
        return num;
      }
    }
  }
  const COUNTRY = {
    US: {
      ko: "미국",
      impc: [ "USJFKA", "USLAXA", "USORDA", "USSFOA" ],
      w: 20
    },
    JP: {
      ko: "일본",
      impc: [ "JPTYOA", "JPOSAA" ],
      w: 12
    },
    CN: {
      ko: "중국",
      impc: [ "CNPEKA", "CNSHAA", "CNCANA" ],
      w: 9
    },
    VN: {
      ko: "베트남",
      impc: [ "VNSGNA", "VNHANA" ],
      w: 5
    },
    AU: {
      ko: "오스트레일리아(호주)",
      impc: [ "AUSYDA", "AUMELA" ],
      w: 6
    },
    GB: {
      ko: "영국",
      impc: [ "GBLONA" ],
      w: 5
    },
    FR: {
      ko: "프랑스",
      impc: [ "FRCDGA" ],
      w: 5
    },
    DE: {
      ko: "독일",
      impc: [ "DEFRAA" ],
      w: 5
    },
    ES: {
      ko: "스페인(에스파니아)",
      impc: [ "ESMADA" ],
      w: 4
    },
    CA: {
      ko: "캐나다",
      impc: [ "CAYYZA", "CAYVRA" ],
      w: 4
    },
    HK: {
      ko: "홍콩(중국)",
      impc: [ "HKHKGA" ],
      w: 3
    },
    TW: {
      ko: "타이완(대만)",
      impc: [ "TWTPEA" ],
      w: 3
    },
    SG: {
      ko: "싱가포르",
      impc: [ "SGSINA" ],
      w: 3
    },
    TH: {
      ko: "타이(태국)",
      impc: [ "THBKKA" ],
      w: 3
    },
    SA: {
      ko: "사우디아라비아",
      impc: [ "SARUHA", "SAJEDA" ],
      w: 3
    },
    NZ: {
      ko: "뉴질랜드",
      impc: [ "NZAKLA" ],
      w: 3
    },
    MY: {
      ko: "말레이시아",
      impc: [ "MYKULA" ],
      w: 2
    },
    PH: {
      ko: "필리핀",
      impc: [ "PHMNLA" ],
      w: 2
    },
    NL: {
      ko: "네덜란드(네델란드)",
      impc: [ "NLAMSA" ],
      w: 2
    },
    BR: {
      ko: "브라질",
      impc: [ "BRSAOA" ],
      w: 1
    }
  };
  const COUNTRY_W = {};
  for (const k in COUNTRY) COUNTRY_W[k] = COUNTRY[k].w;
  const KR_OFFICES = [ "서울중앙우체국", "서울강남우체국", "서울송파우체국", "부산우체국", "인천우체국", "대구우체국", "광주우체국", "대전우체국", "수원우체국", "고양일산우체국", "성남분당우체국", "용인우체국" ];
  const KR_IMPC = {
    E: "KRSELA",
    C: "KRSELA",
    R: "KRSELB",
    L: "KRSELB"
  };
  const SUBCLASS = {
    E: "EM",
    C: "CN",
    R: "UN",
    L: "UN"
  };
  const PRODUCT = {
    E: "EMS",
    C: "PARCEL",
    R: "REGISTERED_LETTER",
    L: "SMALL_PACKET"
  };
  const YEAR1 = String(D(NOW).getFullYear()).slice(-1);
  function receptacle(orig, dest, sub) {
    return orig + dest + "A" + sub + YEAR1 + String(ri(1, 9999)).padStart(4, "0") + String(ri(1, 120)).padStart(3, "0") + pick([ "0", "1" ]) + "9" + String(ri(3, 250)).padStart(4, "0");
  }
  const GCSS_CODE = {
    EMA: "EVENT_EMA",
    EMB: "EVENT_EMB",
    PD: "PREDES",
    EMC: "EVENT_EMC",
    RD: "RESDES",
    EMD: "EVENT_EMD",
    EDB: "EVENT_EDB",
    EME: "EVENT_EME",
    EDC: "EVENT_EDC",
    EMF: "EVENT_EMF",
    EMG: "EVENT_EMG",
    EDG: "EVENT_EDG",
    EMH: "EVENT_EMH",
    EMI: "EVENT_EMI",
    EDX: "EVENT_EDX",
    R_PD: "PREDES",
    R_EMC: "EVENT_EMC",
    R_RD: "RESDES",
    R_EMD: "EVENT_EMD",
    R_EMI: "EVENT_EMI"
  };
  const GCSS_DESC = {
    EMA: "Posting/collection",
    EMB: "Arrival at origin hub",
    EMC: "Departure from origin (ICN)",
    EMD: "Arrival at destination",
    EDB: "Presented to Customs",
    EME: "Handed over to Customs",
    EDC: "Released from Customs",
    EMF: "Departure from inward hub",
    EMG: "Arrival at delivery office",
    EDG: "Out for delivery",
    EMH: "Delivery attempt failed",
    EMI: "Final delivery",
    EDX: "Item returned to sender",
    R_EMC: "Return dispatch",
    R_EMD: "Arrival at origin (return)",
    R_EMI: "Final delivery"
  };
  const ICARE_CODE = {
    EMA: "EMA",
    EMB: "EMB",
    EMC: "EMC",
    EMD: "EMD",
    EDB: "EDB",
    EME: "EME",
    EDC: "EDC",
    EMF: "EMF",
    EMG: "EMG",
    EDG: "EDG",
    EMH: "EMH",
    EMI: "EMI",
    EDX: "EDX",
    R_EMC: "EMC",
    R_EMD: "EMD",
    R_EMI: "EMI"
  };
  const ICARE_DESC = {
    EMA: "Item accepted",
    EMB: "Arrived at outward office",
    EMC: "Departed origin country",
    EMD: "Arrived at destination",
    EDB: "Held by customs",
    EME: "Handed over to customs",
    EDC: "Released from customs",
    EMF: "Departed inward office",
    EMG: "Arrived at delivery office",
    EDG: "Out for delivery",
    EMH: "Delivery attempted",
    EMI: "Delivered",
    EDX: "Return to sender",
    R_EMC: "Return dispatch",
    R_EMD: "Arrived at origin (return)",
    R_EMI: "Delivered to sender"
  };
  const FAIL_REASON = [ "Absent", "Bad address", "Closed", "Absent" ];
  const RETURN_REASON = [ "Unclaimed", "Refused", "Bad address", "Unclaimed" ];
  const CUSTOMS_REASON = [ "Duty unpaid", "Docs required", "Duty unpaid" ];
  const EPOST_FAIL = {
    Absent: "미배달(수취인 부재)",
    "Bad address": "미배달(주소 불명)",
    Closed: "미배달(영업장 휴무)"
  };
  const EPOST_RETURN = {
    Unclaimed: "미배달(보관기간 경과)",
    Refused: "미배달(수취거절)",
    "Bad address": "미배달(주소 불명)"
  };
  function fullPath(o) {
    const P = [];
    let t = 0;
    const step = (k, lo, hi) => {
      t += rf(lo, hi);
      P.push({
        k: k,
        t: t
      });
    };
    P.push({
      k: "EMA",
      t: 0
    });
    step("EMB", 3, 9);
    step("PD", 3, 8);
    step("EMC", 1, 6);
    step("RD", 18, 60);
    step("EMD", 1, 10);
    if (o.customs) {
      if (o.customsBoth) {
        step("EDB", 2, 20);
        step("EME", 6, 30);
      } else step(o.eme ? "EME" : "EDB", 2, 20);
      if (o.customsRefused) {
        step("EDX", 48, 168);
      } else step("EDC", 10, 96);
    }
    if (!o.customsRefused) {
      step("EMF", 2, 10);
      step("EMG", 4, 20);
      step("EDG", 2, 10);
      for (let i = 0; i < o.attempts; i++) {
        step("EMH", 2, 8);
        if (i < o.attempts - 1) step("EDG", 20, 30);
      }
      if (o.ret) step("EDX", 48, 168); else step("EMI", o.attempts ? 18 : 1, o.attempts ? 48 : 8);
    }
    if (o.ret) {
      step("R_PD", 24, 72);
      step("R_EMC", 1, 6);
      step("R_RD", 36, 72);
      step("R_EMD", 1, 8);
      step("R_EMI", 12, 48);
    }
    return P;
  }
  function cutAt(P, key, extraAfter) {
    let idx = -1;
    for (let i = 0; i < P.length; i++) if (P[i].k === key) idx = i;
    if (idx < 0) throw new Error("경로에 없는 단계: " + key);
    return P.slice(0, Math.min(P.length, idx + 1 + (extraAfter || 0)));
  }
  const RECENCY = {
    other: [ 2, 40 ],
    rd: [ 4, 60 ],
    emd: [ 3, 72 ],
    edbeme: [ 6, 200 ],
    edc: [ 3, 72 ],
    emh: [ 3, 96 ],
    emi: [ 2, 300 ],
    edx: [ 6, 150 ],
    returning: [ 6, 120 ],
    returnArrived: [ 6, 96 ],
    returnDelivered: [ 6, 200 ]
  };
  const NOW_STEP_KR = /^(EMA|EMB|PD|EMC|R_RD|R_EMD|R_EMI)$/;
  function epMap(it) {
    return {
      EMA: [ "접수", it.office ],
      EMB: [ "발송준비", "국제우편물류센터" ],
      EMC: [ "운송사 인계", "국제우편물류센터" ],
      EMD: [ "상대국 도착", it.ko ],
      EDB: [ "통관검사대기", it.ko ],
      EME: [ "통관검사대기", it.ko ],
      EMG: [ "배달준비", it.ko ],
      EMH: [ EPOST_FAIL[it.failReason] || "미배달", it.ko ],
      EMI: [ "배달완료", it.ko ],
      EDX: [ EPOST_RETURN[it.retReason] || "미배달", it.ko ],
      R_EMD: [ "반송 도착", "국제우편물류센터" ],
      R_EMI: [ "배달완료", it.office ]
    };
  }
  function gcssEvent(it, s) {
    const ev = {
      eventType: GCSS_CODE[s.k],
      displayDateTime: fmtIso(s.at),
      r: s.r,
      at: s.at
    };
    ev.location = NOW_STEP_KR.test(s.k) ? it.origImpc : it.destImpc;
    if (s.k === "PD" || s.k === "RD") ev.receptacleIdentifier = it.outRec; else if (s.k === "R_PD" || s.k === "R_RD") ev.receptacleIdentifier = it.retRec; else ev.detailsDescription = GCSS_DESC[s.k];
    if (s.k === "EMH") ev.deliveryFailureReason = it.failReason;
    if (s.k === "EDX") ev.deliveryFailureReason = it.retReason;
    if ((s.k === "EDB" || s.k === "EME") && it.custReason) ev.importCustomsRetentionReason = it.custReason;
    return ev;
  }
  function icareRow(it, s, at) {
    return {
      at: at,
      r: s.r,
      code: ICARE_CODE[s.k],
      label: ICARE_DESC[s.k] || ICARE_CODE[s.k],
      details: ICARE_DESC[s.k] || "",
      location: /^(EMA|EMB|EMC|R_EMD|R_EMI)$/.test(s.k) ? it.origImpc : it.destImpc
    };
  }
  function epostRow(it, s, at, r) {
    const m = epMap(it)[s.k];
    return {
      at: at,
      r: r,
      date: fmtEpost(at),
      status: m[0],
      office: m[1],
      detail: s.k === "EMA" ? "도착국가 : " + it.ko + "(" + it.dest + ")" : ""
    };
  }
  function buildItem(spec) {
    const prefix = spec.prefix || "EE";
    const kind = "ERLC".indexOf(prefix[0]) >= 0 ? prefix[0] : "R";
    const dest = spec.dest || wpick(COUNTRY_W);
    const C = COUNTRY[dest];
    const destImpc = pick(C.impc);
    const origImpc = KR_IMPC[kind];
    const num = spec.num || fakeNum(prefix);
    const o = {
      customs: false,
      eme: chance(.3),
      attempts: 0,
      ret: false,
      customsRefused: false
    };
    const b = spec.bucket;
    let cutKey, extra = 0;
    if (b === "other") {
      o.customs = chance(.5);
      cutKey = spec.otherCut || pick([ "EMB", "PD", "EMC", "EMC" ]);
      if (spec.gcssMissing) cutKey = "EMA";
    } else if (b === "rd") {
      cutKey = "RD";
    } else if (b === "emd") {
      cutKey = "EMD";
    } else if (b === "edbeme") {
      o.customs = true;
      cutKey = o.eme ? "EME" : "EDB";
    } else if (b === "edc") {
      o.customs = true;
      cutKey = "EDC";
      extra = pick([ 0, 0, 1, 2 ]);
    } else if (b === "emh") {
      o.customs = chance(.6);
      o.attempts = chance(.3) ? 2 : 1;
      cutKey = "EMH";
    } else if (b === "emi") {
      o.customs = chance(.6);
      o.attempts = chance(.2) ? 1 : 0;
      cutKey = "EMI";
    } else if (b === "edx" || b === "returning" || b === "returnArrived" || b === "returnDelivered") {
      o.ret = true;
      o.customs = chance(.5);
      o.customsRefused = o.customs && chance(.35);
      o.attempts = o.customsRefused ? 0 : chance(.4) ? 2 : 1;
      cutKey = {
        edx: "EDX",
        returning: pick([ "R_PD", "R_EMC" ]),
        returnArrived: "R_EMD",
        returnDelivered: "R_EMI"
      }[b];
    } else throw new Error("알 수 없는 분류: " + b);
    if (spec.cutKey) cutKey = spec.cutKey;
    if (spec.extra != null) extra = spec.extra;
    if (spec.attempts != null) o.attempts = spec.attempts;
    if (spec.customs != null) {
      o.customs = spec.customs;
      if (!o.customs) o.customsRefused = false;
    }
    if (spec.customsBoth) {
      o.customs = true;
      o.customsBoth = true;
    }
    if (cutKey === "EDB" || spec.cut1 === "EDB") o.eme = false; else if (cutKey === "EME") o.eme = true;
    const full = fullPath(o);
    const path = cutAt(full, cutKey, extra);
    let r2From = Infinity;
    if (spec.cut1) {
      for (let i = 0; i < path.length; i++) if (path[i].k === spec.cut1) r2From = i + 1;
      if (r2From === Infinity) throw new Error("cut1 단계가 경로에 없음: " + spec.cut1);
    }
    const rec = spec.recency || RECENCY[b];
    const last = path[path.length - 1].t;
    const base = NOW - rf(rec[0], rec[1]) * HOUR - last * HOUR;
    path.forEach(((s, i) => {
      s.at = base + s.t * HOUR;
      s.r = i >= r2From ? 2 : 1;
    }));
    if (spec.cut1) {
      const firstR2 = path.find((s => s.r === 2));
      if (firstR2) {
        const shift = NOW - rf(1, 5) * HOUR - path[path.length - 1].at;
        if (shift > 0) path.forEach((s => {
          if (s.r === 2) s.at += shift;
        }));
      }
    }
    const it = {
      num: num,
      prefix: prefix,
      kind: kind,
      dest: dest,
      ko: C.ko,
      destImpc: destImpc,
      origImpc: origImpc,
      bucket: b,
      full: full,
      pos: path.length - 1,
      round: 1,
      outRec: receptacle(origImpc, destImpc, SUBCLASS[kind]),
      retRec: receptacle(destImpc, origImpc, SUBCLASS[kind]),
      failReason: pick(FAIL_REASON),
      retReason: pick(RETURN_REASON),
      custReason: "",
      office: "",
      gcssMissing: !!spec.gcssMissing,
      gcss: [],
      icare: [],
      epost: [],
      gWfType: null
    };
    it.custReason = chance(.5) ? pick(CUSTOMS_REASON) : "";
    it.office = pick(KR_OFFICES);
    if (!it.gcssMissing) {
      it.gcss.push({
        eventType: "ITMATT",
        displayDateTime: fmtIso(path[0].at),
        location: origImpc,
        r: 1,
        at: path[0].at
      });
      for (const s of path) it.gcss.push(gcssEvent(it, s));
    }
    if (kind === "E" && !it.gcssMissing) {
      let rows = path.filter((s => ICARE_CODE[s.k]));
      const lagOk = !(b === "emi" || b === "returnDelivered") && !spec.cut1;
      if (lagOk && rows.length > 2 && chance(.25)) rows = rows.slice(0, -1);
      for (const s of rows) {
        const at = s.at + rf(.2, 2.5) * HOUR;
        if (at > NOW) continue;
        it.icare.push(icareRow(it, s, at));
      }
    }
    const EP = epMap(it);
    let epRows = path.filter((s => EP[s.k]));
    const epLagOk = !(b === "emi" || b === "returnArrived" || b === "returnDelivered") && !spec.cut1 && !spec.epostR2;
    if (epLagOk && epRows.length > 2 && chance(.35)) epRows = epRows.slice(0, -1);
    for (const s of epRows) {
      const at = s.at + rf(.1, 1.5) * HOUR;
      if (at > NOW) continue;
      const r = spec.epostR2 && spec.epostR2.includes(s.k) ? 2 : s.r;
      it.epost.push(epostRow(it, s, at, r));
    }
    const lastAt = path[path.length - 1].at;
    const wfTimes = [];
    let wt = lastAt - rf(2, 30) * HOUR;
    for (let i = 0; i < 4; i++) {
      wfTimes.push(Math.min(wt, NOW - (4 - i) * HOUR));
      wt += rf(8, 30) * HOUR;
    }
    const wf = spec.wf || {};
    if (wf.g && !it.gcssMissing) {
      ri(10, 99);
      if (wf.g.notif) it.gWfType = wf.g.notif === "qr" ? "NR" : "NQ"; else {
        const seq = wf.g.seq || [ "L1Q" ];
        it.gWfType = seq.includes("SUM") ? "SUM" : seq.includes("L1R") ? "L1R" : seq[0];
      }
    }
    if (wf.i && kind === "E" && !it.gcssMissing) {
      wf.i.forEach(((label, i) => {
        const at = wfTimes[i] + rf(.5, 3) * HOUR;
        it.icare.push({
          at: at,
          r: 1,
          code: "WF",
          label: label,
          details: "",
          location: destImpc
        });
      }));
    }
    return it;
  }
  const BULK_PLAN = {
    rd: 24,
    emd: 64,
    edbeme: 58,
    edc: 30,
    emh: 42,
    emi: 198,
    edx: 22,
    returning: 20,
    returnArrived: 16,
    returnDelivered: 10,
    other: 16
  };
  const WF_PLAN = {
    edbeme: [ [ 10, {
      g: {
        seq: [ "L1Q" ]
      }
    } ], [ 5, {
      g: {
        seq: [ "L1Q", "L1R" ]
      },
      i: [ "L1 REQ", "L1 REP" ]
    } ], [ 3, {
      g: {
        seq: [ "L1Q", "L1R", "SUM" ]
      }
    } ], [ 3, {
      i: [ "L1 REQ" ]
    } ], [ 4, {
      g: {
        notif: "q"
      }
    } ] ],
    emh: [ [ 5, {
      g: {
        seq: [ "L1Q" ]
      }
    } ], [ 3, {
      g: {
        seq: [ "L1Q", "L1R" ]
      }
    } ], [ 2, {
      i: [ "Notification" ]
    } ] ],
    edx: [ [ 4, {
      g: {
        seq: [ "L1Q" ]
      }
    } ], [ 3, {
      g: {
        seq: [ "L1Q", "L1R" ]
      },
      i: [ "L1 REQ", "L1 REP" ]
    } ] ],
    returning: [ [ 4, {
      g: {
        seq: [ "L1Q", "L1R" ]
      }
    } ], [ 2, {
      g: {
        seq: [ "L1Q", "L1R", "SUM" ]
      }
    } ] ],
    returnArrived: [ [ 2, {
      g: {
        seq: [ "L1Q", "L1R" ],
        closed: true
      }
    } ] ],
    returnDelivered: [ [ 1, {
      g: {
        seq: [ "L1Q", "L1R" ],
        closed: true
      }
    } ] ],
    rd: [ [ 2, {
      g: {
        notif: "qr"
      }
    } ], [ 1, {
      g: {
        seq: [ "L1Q" ]
      }
    } ] ],
    emd: [ [ 3, {
      g: {
        notif: "q"
      }
    } ], [ 2, {
      g: {
        seq: [ "L1Q" ]
      }
    } ], [ 1, {
      i: [ "Notification" ]
    } ] ],
    edc: [ [ 2, {
      g: {
        seq: [ "L1Q", "L1R" ],
        closed: true
      }
    } ] ],
    emi: [ [ 6, {
      g: {
        seq: [ "L1Q", "L1R" ],
        closed: true
      }
    } ], [ 2, {
      g: {
        seq: [ "L1Q", "L1R", "SUM" ],
        closed: true
      }
    } ], [ 4, {
      g: {
        notif: "qr"
      }
    } ], [ 2, {
      i: [ "Notification" ]
    } ] ],
    other: [ [ 2, {
      g: {
        seq: [ "L1Q" ]
      }
    } ] ]
  };
  const bulkItems = [];
  for (const b of Object.keys(BULK_PLAN)) {
    const n = BULK_PLAN[b];
    const wfs = [];
    (WF_PLAN[b] || []).forEach((([cnt, wf]) => {
      for (let i = 0; i < cnt; i++) wfs.push(wf);
    }));
    for (let i = 0; i < n; i++) {
      const spec = {
        bucket: b,
        prefix: wpick({
          EE: 64,
          EG: 11,
          EB: 10,
          RR: 6,
          LX: 5,
          CP: 4
        })
      };
      if (b === "other" && i >= n - 4) {
        spec.gcssMissing = true;
        spec.recency = [ 1, 10 ];
      }
      if (i < wfs.length && !spec.gcssMissing) {
        spec.wf = wfs[i];
        if (wfs[i].i && !wfs[i].g) spec.prefix = pick([ "EE", "EG", "EB" ]);
      }
      bulkItems.push(buildItem(spec));
    }
  }
  shuffle(bulkItems);
  const WATCH_TABS = [ "사우디 EMD대기", "미국 통관지연", "일본 반송확인", "중국 EMI대기", "베트남 배달완료", "영국 EDC대기" ];
  const WATCH_SPEC = [ {
    tab: 0,
    memo: "리야드행 — 교환국 도착 대기",
    spec: {
      bucket: "other",
      dest: "SA",
      prefix: "EE",
      cutKey: "EMC",
      cut1: "PD",
      customs: false,
      wf: {
        g: {
          notif: "q"
        }
      }
    }
  }, {
    tab: 0,
    memo: "제다행 항공편 확인",
    spec: {
      bucket: "rd",
      dest: "SA",
      prefix: "EE"
    }
  }, {
    tab: 0,
    memo: "",
    spec: {
      bucket: "other",
      dest: "SA",
      prefix: "EG",
      cutKey: "EMC",
      customs: false
    }
  }, {
    tab: 1,
    memo: "관세 납부 안내 대기",
    spec: {
      bucket: "edbeme",
      dest: "US",
      prefix: "EE",
      cutKey: "EME",
      cut1: "EDB",
      customsBoth: true,
      wf: {
        g: {
          seq: [ "L1Q" ]
        }
      }
    }
  }, {
    tab: 1,
    memo: "세관 서류 보완 요청",
    spec: {
      bucket: "edbeme",
      dest: "US",
      prefix: "EE",
      wf: {
        g: {
          seq: [ "L1Q", "L1R" ]
        }
      }
    }
  }, {
    tab: 1,
    memo: "LA 세관 계류",
    spec: {
      bucket: "edbeme",
      dest: "US",
      prefix: "EB",
      wf: {
        i: [ "L1 REQ" ]
      }
    }
  }, {
    tab: 2,
    memo: "수취거절 — 반송 확인",
    spec: {
      bucket: "returning",
      dest: "JP",
      prefix: "EE",
      cutKey: "R_EMC",
      cut1: "EDX",
      wf: {
        g: {
          seq: [ "L1Q", "L1R" ]
        }
      }
    }
  }, {
    tab: 2,
    memo: "보관기간 경과 반송",
    spec: {
      bucket: "returnArrived",
      dest: "JP",
      prefix: "EE"
    }
  }, {
    tab: 2,
    memo: "반송 배달 완료 확인",
    spec: {
      bucket: "returnDelivered",
      dest: "JP",
      prefix: "RR"
    }
  }, {
    tab: 3,
    memo: "상하이 배달 예정",
    spec: {
      bucket: "emh",
      dest: "CN",
      prefix: "EE",
      customs: true,
      attempts: 1,
      cut1: "EDC"
    }
  }, {
    tab: 3,
    memo: "",
    spec: {
      bucket: "edc",
      dest: "CN",
      prefix: "EE",
      extra: 1
    }
  }, {
    tab: 4,
    memo: "호찌민 배달완료",
    spec: {
      bucket: "emi",
      dest: "VN",
      prefix: "EE"
    }
  }, {
    tab: 4,
    memo: "",
    spec: {
      bucket: "emi",
      dest: "VN",
      prefix: "EG"
    }
  }, {
    tab: 5,
    memo: "런던 세관 검사 중",
    spec: {
      bucket: "edbeme",
      dest: "GB",
      prefix: "EE",
      cutKey: "EDB",
      epostR2: [ "EDB" ]
    }
  }, {
    tab: 5,
    memo: "통관 후 배달 예정",
    spec: {
      bucket: "edbeme",
      dest: "GB",
      prefix: "EE",
      cutKey: "EDB",
      wf: {
        g: {
          seq: [ "L1Q" ]
        }
      }
    }
  } ];
  const watchItems = WATCH_SPEC.map((w => Object.assign(buildItem(w.spec), {
    tab: WATCH_TABS[w.tab],
    memo: w.memo
  })));
  watchItems.forEach((it => {
    it.epost.forEach((row => {
      if (row.r === 2) {
        const at = Math.max(row.at, NOW - rf(1, 4) * HOUR);
        row.at = Math.min(at, NOW - 5 * 60 * 1e3);
        row.date = fmtEpost(row.at);
      }
    }));
  }));
  const ITEMS = new Map;
  bulkItems.concat(watchItems).forEach((it => ITEMS.set(it.num, it)));
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  const S10_RE = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
  const NEW_W = {
    emi: 40,
    emd: 12,
    edbeme: 12,
    rd: 6,
    edc: 6,
    emh: 8,
    other: 6,
    edx: 3,
    returning: 3,
    returnArrived: 2,
    returnDelivered: 2
  };
  function itemFor(num) {
    num = String(num || "").toUpperCase();
    let it = ITEMS.get(num);
    if (it) return it;
    if (!S10_RE.test(num)) return null;
    const saved = rnd;
    rnd = mulberry32(hashStr(num));
    try {
      const spec = {
        bucket: wpick(NEW_W),
        prefix: num.slice(0, 2),
        num: num
      };
      if (chance(.12)) spec.wf = {
        g: {
          seq: [ "L1Q" ]
        }
      };
      it = buildItem(spec);
    } finally {
      rnd = saved;
    }
    ITEMS.set(num, it);
    return it;
  }
  const SHOWN_KEYS = new Set([ "EMA", "EMB", "EMC", "RD", "EMD", "EDB", "EME", "EDC", "EMG", "EMH", "EMI", "EDX", "R_PD", "R_EMC", "R_EMD", "R_EMI" ]);
  const hidden = it => [ it.gcss, it.icare, it.epost ].some((a => a.some((x => (x.r || 1) > it.round))));
  function canAdvance(it) {
    return !!it && (hidden(it) || it.pos < it.full.length - 1);
  }
  function advance(it) {
    if (!it) return false;
    if (hidden(it)) {
      it.round++;
      return true;
    }
    const prng = mulberry32(hashStr(it.num) + it.pos * 7919 + it.round);
    let moved = false;
    while (it.pos < it.full.length - 1) {
      it.pos++;
      const s = it.full[it.pos];
      const prevAt = it.full[it.pos - 1].at;
      const now = Date.now();
      let at = Math.max(prevAt + 10 * 6e4, now - (.2 + prng() * 1.3) * HOUR);
      at = Math.min(at, now - 6e4);
      if (at <= prevAt) at = prevAt + 6e4;
      s.at = at;
      s.r = it.round + 1;
      if (it.gcssMissing) {
        it.gcssMissing = false;
        it.gcss.push({
          eventType: "ITMATT",
          displayDateTime: fmtIso(it.full[0].at),
          location: it.origImpc,
          r: s.r,
          at: it.full[0].at
        });
        for (let i = 0; i < it.pos; i++) {
          const p = Object.assign({}, it.full[i], {
            r: s.r
          });
          it.gcss.push(gcssEvent(it, p));
          if (it.kind === "E" && ICARE_CODE[p.k]) it.icare.push(icareRow(it, p, p.at + .3 * HOUR));
        }
      }
      it.gcss.push(gcssEvent(it, s));
      if (it.kind === "E" && ICARE_CODE[s.k]) it.icare.push(icareRow(it, s, Math.min(now - 3e4, at + .3 * HOUR)));
      if (epMap(it)[s.k]) it.epost.push(epostRow(it, s, Math.min(now - 3e4, at + .1 * HOUR), s.r));
      moved = true;
      if (SHOWN_KEYS.has(s.k)) break;
    }
    if (moved) it.round++;
    return moved;
  }
  function parseTimeToMs(s) {
    if (!s) return 0;
    const m = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (!m) return 0;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
  }
  const MAIN_TYPES = new Set([ "RD", "EMD", "EDB", "EME", "EDC", "EMH", "EMI", "EDX" ]);
  const vis = it => x => (x.r || 1) <= it.round;
  function epostResult(it) {
    const rows = it.epost.filter(vis(it)).sort(((a, b) => a.at - b.at));
    if (!rows.length) return {
      ok: false,
      error: "epost 종적 없음"
    };
    let destinationCountry = "";
    for (const r of rows) {
      const m = (r.detail || "").match(/도착국가.*?\(([A-Z]{2,3})\)/);
      if (m) {
        destinationCountry = m[1];
        break;
      }
    }
    const last = rows[rows.length - 1];
    const delivered = rows.some((r => r.status.includes("배달완료")));
    const returned = rows.some((r => r.status.includes("반송")));
    let deliveryDate = "";
    for (const r of rows) if (r.status.includes("배달완료")) deliveryDate = r.date;
    let category, label;
    if (delivered && returned) {
      category = "returnedDelivered";
      label = "반송배달";
    } else if (returned) {
      category = "returned";
      label = "반송";
    } else if (delivered) {
      category = "delivered";
      label = "정상배달";
    } else if (last.status.includes("미배달")) {
      category = "undelivered";
      label = "미배달";
    } else if (last.status.includes("통관")) {
      category = "customs";
      label = "세관계류";
    } else {
      category = "transit";
      label = last.status;
    }
    return {
      ok: true,
      lastTraceText: last.status,
      lastTraceTime: last.date,
      lastTraceTimestamp: parseTimeToMs(last.date),
      lastTraceSig: last.date + "|" + last.status,
      statusCategory: category,
      statusLabel: label,
      delivered: delivered,
      returned: returned,
      deliveryDate: deliveryDate,
      destinationCountry: destinationCountry
    };
  }
  function shortCode(et) {
    if (!et) return "";
    if (et.indexOf("EVENT_") === 0) return et.slice(6);
    return {
      PRECON: "PC",
      PREDES: "PD",
      RESCON: "RC",
      RESDES: "RD",
      CARDIT: "CD"
    }[et] || et;
  }
  function gcssDetail(ev) {
    const parts = [];
    if (ev.receptacleIdentifier) parts.push(ev.receptacleIdentifier);
    if (ev.detailsDescription) {
      const reason = ev.importCustomsRetentionReason || ev.deliveryFailureReason || "";
      parts.push(reason ? "(" + reason + ") " + ev.detailsDescription : ev.detailsDescription);
    }
    return parts.join(" · ");
  }
  function gcssResult(it) {
    if (it.gcssMissing) return {
      ok: false,
      error: "GCSS 종적 없음"
    };
    const events = it.gcss.filter(vis(it)).filter((e => e.eventType && e.eventType !== "ITMATT"));
    if (!events.length) return {
      ok: false,
      error: "GCSS 종적 없음"
    };
    const sorted = events.slice().sort(((a, b) => parseTimeToMs(a.displayDateTime) - parseTimeToMs(b.displayDateTime)));
    const main = sorted.filter((e => MAIN_TYPES.has(shortCode(e.eventType))));
    let last = (main.length ? main : sorted)[(main.length ? main : sorted).length - 1];
    if (shortCode(last.eventType) === "EDX" && sorted[sorted.length - 1] !== last) last = sorted[sorted.length - 1];
    const lastTime = last.displayDateTime || "";
    const code = shortCode(last.eventType);
    const detail = gcssDetail(last);
    let lastText = detail ? code + " · " + detail : code;
    let lastTimeFinal = lastTime;
    let sig = lastTime + "|" + code;
    const delivered = sorted.some((e => e.eventType === "EVENT_EMI"));
    let finalDetail = detail;
    if (delivered) {
      const emi = sorted.filter((e => e.eventType === "EVENT_EMI")).pop();
      const emiDetail = gcssDetail(emi);
      lastText = emiDetail ? "EMI · " + emiDetail : "EMI";
      lastTimeFinal = emi.displayDateTime || "";
      sig = lastTimeFinal + "|EMI";
      finalDetail = emiDetail;
    }
    return {
      ok: true,
      lastTraceText: lastText,
      lastTraceTime: lastTimeFinal,
      lastTraceTimestamp: parseTimeToMs(lastTimeFinal),
      lastTraceSig: sig,
      workflowType: it.gWfType || null,
      detail: finalDetail,
      allDetails: sorted.map(gcssDetail).filter(Boolean),
      statusCategory: delivered ? "delivered" : "transit",
      statusLabel: delivered ? "정상배달" : code,
      delivered: delivered,
      returned: false,
      events: sorted.map((e => ({
        eventType: shortCode(e.eventType),
        time: e.displayDateTime || ""
      })))
    };
  }
  function icareWfType(label) {
    const t = String(label || "").toUpperCase();
    let m = t.match(/L\s*(\d+)\s*REQ/);
    if (m) return "L" + m[1] + "Q";
    m = t.match(/L\s*(\d+)\s*REP/);
    if (m) return "L" + m[1] + "R";
    if (/\bMSG\b|MESSAGE/.test(t)) return "Msg";
    if (/CLOSE/.test(t)) return "CLOSURE";
    if (/NOTIF/.test(t)) return "NOT";
    return null;
  }
  function icareResult(it, num) {
    if (/^[RLC]/i.test(num)) return {
      ok: false,
      skipped: true,
      error: "미지원 (R/L/C 접두)"
    };
    if (!it) return {
      ok: false,
      error: "iCare 종적 없음"
    };
    const evs = it.icare.filter(vis(it)).map((x => ({
      label: x.label,
      eventType: x.code,
      time: fmtDay(x.at) + " " + fmtHm(x.at),
      details: x.details || ""
    })));
    if (!evs.length) return {
      ok: false,
      error: "iCare 종적 없음"
    };
    evs.sort(((a, b) => parseTimeToMs(a.time) - parseTimeToMs(b.time)));
    const wfRows = evs.filter((e => /^WF/i.test(e.eventType)));
    let workflowType = null, hasNot = false;
    for (let i = wfRows.length - 1; i >= 0; i--) {
      const wt = icareWfType(wfRows[i].label);
      if (wt === "NOT") {
        hasNot = true;
        continue;
      }
      if (wt && wt !== "CLOSURE") {
        workflowType = wt;
        break;
      }
    }
    if (!workflowType && hasNot) workflowType = "NOT";
    const filtered = evs.filter((e => !/^(WF|NOT)/i.test(e.eventType)));
    if (!filtered.length) return {
      ok: false,
      error: "iCare 종적 없음 (WF/NOT만 존재)"
    };
    const main = filtered.filter((e => MAIN_TYPES.has(e.eventType.toUpperCase())));
    let last = (main.length ? main : filtered).slice(-1)[0];
    if (last.eventType.toUpperCase() === "EDX" && filtered[filtered.length - 1] !== last) last = filtered[filtered.length - 1];
    const code = last.eventType;
    let lastText = last.details ? code + " · " + last.details : code;
    let lastTime = last.time, sig = last.time + "|" + code, lastDetail = last.details;
    const delivered = filtered.some((e => e.eventType === "EMI"));
    if (delivered) {
      const emi = filtered.filter((e => e.eventType === "EMI")).pop();
      lastText = emi.details ? "EMI · " + emi.details : "EMI";
      lastTime = emi.time;
      sig = emi.time + "|EMI";
      lastDetail = emi.details;
    }
    return {
      ok: true,
      lastTraceText: lastText,
      lastTraceTime: lastTime,
      lastTraceTimestamp: parseTimeToMs(lastTime),
      lastTraceSig: sig,
      workflowType: workflowType,
      detail: lastDetail,
      allDetails: filtered.map((e => e.details)).filter(Boolean),
      statusCategory: delivered ? "delivered" : "transit",
      statusLabel: delivered ? "정상배달" : code,
      delivered: delivered,
      returned: false
    };
  }
  function query(num) {
    num = String(num || "").toUpperCase();
    const it = itemFor(num);
    if (!it) return {
      epost: {
        ok: false,
        error: "epost 종적 없음"
      },
      gcss: {
        ok: false,
        error: "GCSS 종적 없음"
      },
      icare: icareResult(null, num)
    };
    return {
      epost: epostResult(it),
      gcss: gcssResult(it),
      icare: icareResult(it, num)
    };
  }
  function traceRows(num, src) {
    num = String(num || "").toUpperCase();
    const it = itemFor(num);
    if (!it) return [];
    const v = vis(it);
    if (src === "epost") {
      return it.epost.filter(v).sort(((a, b) => a.at - b.at)).map((r => ({
        time: r.date,
        code: "",
        status: r.status,
        loc: r.office,
        detail: r.detail
      })));
    }
    if (src === "gcss") {
      if (it.gcssMissing) return [];
      return it.gcss.filter(v).filter((e => e.eventType !== "ITMATT")).sort(((a, b) => a.at - b.at)).map((e => ({
        time: e.displayDateTime.replace("T", " ").slice(0, 16),
        code: shortCode(e.eventType),
        status: e.detailsDescription || "",
        loc: e.location || "",
        detail: e.receptacleIdentifier || (e.importCustomsRetentionReason || e.deliveryFailureReason || "")
      })));
    }
    if (/^[RLC]/i.test(num)) return [];
    return it.icare.filter(v).sort(((a, b) => a.at - b.at)).map((x => ({
      time: fmtDay(x.at) + " " + fmtHm(x.at),
      code: x.code,
      status: x.label,
      loc: x.location || "",
      detail: x.code === "WF" ? "" : x.details || ""
    })));
  }
  function sampleNums() {
    const p = mulberry32(4242);
    const out = [];
    for (const pre of [ "EE", "EG", "EB", "EE", "RR", "CP", "LX" ]) {
      for (;;) {
        const serial = String(1e7 + Math.floor(p() * 89999999));
        const wrong = (s10check(serial) + 1 + Math.floor(p() * 9)) % 10;
        const n = pre + serial + wrong + "KR";
        if (!ITEMS.has(n) && !out.includes(n)) {
          out.push(n);
          break;
        }
      }
    }
    out.push("EE1234567KR");
    return out;
  }
  const EMS_COND = {
    list: [ {
      code: "US",
      name: "미국"
    }, {
      code: "NZ",
      name: "뉴질랜드"
    } ],
    cond: {
      US: {
        ok: true,
        days: "4",
        fields: {
          "요금적용지역": "US 지역",
          "취급지역": "주요안내사항 참조",
          "도착통지": "취급",
          "최대규격": "길이<=1.5m , 길이+둘레<=2.75m",
          "제한중량(g)": "30,000",
          "배달횟수": "1",
          "배달소요일수(서류)": "4",
          "배달불능시 보관기간": "15",
          "배달불가요일": "일,공",
          "세관신고서 작성기준": "모두첨부",
          "기타서류작성": "",
          "자료 기준": "2026-10-16 ePOST 공개 페이지에서 옮겨 둔 고정 자료(지금과 다를 수 있음)"
        },
        order: [ "요금적용지역", "취급지역", "도착통지", "최대규격", "제한중량(g)", "배달횟수", "배달소요일수(서류)", "배달불능시 보관기간", "배달불가요일", "세관신고서 작성기준", "기타서류작성", "자료 기준" ],
        notices: [ {
          label: "접수 시 주의사항",
          content: "ㅇ유학서류, 선적서류(선하증권/Shipping document 등) EMS 접수 금지*시한성/재발급 불가 우편물은 반드시 EMS 프리미엄으로 접수 문의 - 지연, 분실 시 간접피해 보상 불가 - 시행 : '21. 2. 23\n\nㅇ김치 접수 가능\n  - 용기는 금속 재질의 포장 용기(캔)로 한정, 내용물은 전체 용량의 70% 이하 유지 <우정사업본부 국제사업과, 2024. 10. 22.>\n- 통관 유의사항 : 고객은 발송하는 국가의 통관 사항을 확인하여 접수를 해야하며, 통관 계류 및 배송지연 등으로 인한 음식물의 부패 및 폐기 등은 손해배상이 불가\n\nㅇ사서함 (PO BOX) 취급\nㅇ주소변경 및 반환청구 불가\n\nㅇ금지 및 제한품목 발송 시 세관에서 통지없이 폐기 및 압수, 및 반송 가능 (폐기 승인 후 접수), 손해배상 불가\n\nㅇ 우편번호, 아파트 호수, STE# 미기재, 오기재 시 배달 지연되거나 사전통보 없이 반송될 수 있음(반송 시 1개월 이상 소요), 주소 부정확 및 불충분으로 반송된 사실이 확인되었을 경우 손해배상 불가\n\nㅇ 시한성 서류(개인정보/보안/공증 관련 등)는 (주소지가 학교, 아파트, 기숙사, 관공서인 경우 메일룸이나 오피스에서 대리수령-대리수령인과 수취인의 관계 증명 불가)\n\nㅇ세금 신고 관련으로 발송하는 서\n류(주소지: IRS/TAX Board/Department of Avenue 등)의 경우 배달완료 스캔이 등록되지 않을 수 있으며, 행방조사로 배달결과를 확인할 수 없으므로 EMS 프리미엄 발송 권고, 배달증명 불가, 손해배상 불가\n\nㅇ 세관계류 시 수취인 주소지로 통지서 발송이 45일까지 소요될 수 있으며, 수취인이 직접 세관과 확인해야 함, 세관에 의한 우편물 반송,압수,폐기에 대한 상세 사유는 행방조사로 확인 및 배상 불가\n\nㅇ다육식물 발송 시 세관 계류 및 전송 지연이 발송할 수 있으며, 고사·변질 등 생물 특성에 따른 손상은 우편물 손해배상 대상에서 제외, 세관에 의한 반송 시 손해배상 불가\n\nㅇ APO/FPO(군사우편물)행 우편물의 경우 배달결과를 확인할 수 없어 행방조사 청구 불가\n\no 아마존행(FBA, Amazon Return 등) 우편물의 경우 현지 창고의 EMS 수취 가능여부 확인 후 발송권고, 현지 창고에서 우체국 물품 수취거절로 인한 반송 확인 시 손해배상 불가"
        }, {
          label: "금지·제한품목",
          content: "ㅇ금지품목 : 음식물, 육가공품(햄, 레토르트 식품), 라면(스프 포함) 등, 담배 및 담배상품(종류불문), 위험한 물건, 복권 및 복권관련 광고, 종자류, 건초, 식용유(참기름, 올리브유 등), 모조품 등\nㅇ제한품목 : 비알콜음료, 혈액(Airfreight mode), 화장품\n-의약품(양약, 한약 등)/건강보조제(영양제, 비타민, 오메가3 등)/건강식품(홍삼, 인삼등)"
        }, {
          label: "배달특이사항",
          content: "ㅇ사서함 (PO BOX) 취급\nㅇ주소변경 및 반환청구 불가\n ※ 최초 배달시도일 포함 15일까지 우체국에서 보관, 배달시도된 우편물의 경우 수취인의 수취노력이 필요하며, 도착통지서 번호가 확인되며 보관기간 경과로 반송된 우편물은 손해배상 불가\n\no배달시도 1회(배달 전 문자, 전화 없음), 수취인 요청시 1회 재배달 가능,  서명없이 문앞 배달 요청 불가\n  ※ 재배달 요청 : https://tools.usps.com/redelivery.htm\n\nㅇ배달현황 : 수취인 주소지가 아파트,학교,회사,기관 등일 경우 아파트 사무실, 관리실, 메일룸, 우편수발부서에서 대리수령 가능. 지역별 배달 규정에 따라  메일박스로 배달하는 경우도 있음\n  ※ 아마존, 이베이, 배송대행지, 기관 등 일괄수령지로 보내는 우편물의 최종 수취여부는 발송인이 직접 수취처에 확인 필요\n\no수취인 이름이 주소지 우편함/문패에 동일하게 기재되지 않을시 배달불가, 수취인 불명으로 반송 시 손해배상 불가\n\nㅇ세금 신고 관련으로 발송하는 서류(주소지: IRS/TAX Board/Department of Avenue 등)의 경우 배달완료 스캔이 등록되지 않을 수 있으며, 행방조사로 배달결과를 확인할 수 없으므로 EMS 프리미엄 발송 권고, 배달증명 불가, 손해배상 불가\n\n\nㅇAPO/FPO(군사우편물)행 우편물의 경우 배달결과를 확인할 수 없어 행방조사 청구 불가\n\no아마존행(FBA, Amazon Return 등) 우편물의 경우 현지 창고의 EMS 수취 가능여부 확인 후 발송권고, 현지 창고에서 우체국 물품 수취거절로 인한 반송 확인 시 손해배상 불가"
        }, {
          label: "세관·통관사항",
          content: "ㅇ면세한도 : 100USD\nㅇ통관허용한도 : 2,500$까지\nㅇ납부한 관세 및 수수료는 발송 후 반환되지 않음\n\nㅇ식물류(다육식물 포함)의 경우 미국 세관(CBP), 농무부(USDA)의 검역 규정에 따라 처리되며, 검역 통과가 불가능하다고 판단되면 통보 없이 현지에서 폐기 처분 될 수 있음. 폐기사유 확인 및 손해배상 불가\n\n고사·변질 등 생물 특성에 따른 손상, 세관 통관 지연 및 반송에 대한 손해배상 지급 불가\n\n발송 전 손해배상 면책 동의 후 발송 필수\n\n\nㅇ금지 및 제한품목 발송 시 세관에서 통지없이 폐기 및 압수, 및 반송 가능 (폐기 승인 후 접수), 손해배상 불가\n\nㅇ 세관계류 시 수취인 주소지로 통지서 발송이 45일까지 소요될 수 있으며, 수취인이 직접 세관과 확인해야 함, 세관에 의한 우편물 반송,압수,폐기에 대한 상세 사유는 행방조사로 확인 및 배상 불가"
        } ]
      },
      NZ: {
        ok: true,
        days: "5",
        fields: {
          "요금적용지역": "NZ 지역",
          "취급지역": "일부지역",
          "도착통지": "취급",
          "최대규격": "길이<= 1.05m , 길이+둘레<= 2m",
          "제한중량(g)": "30,000",
          "배달횟수": "2",
          "배달소요일수(서류)": "5",
          "배달불능시 보관기간": "2",
          "배달불가요일": "일,공",
          "세관신고서 작성기준": "모두첨부",
          "기타서류작성": "",
          "자료 기준": "2026-10-16 ePOST 공개 페이지에서 옮겨 둔 고정 자료(지금과 다를 수 있음)"
        },
        order: [ "요금적용지역", "취급지역", "도착통지", "최대규격", "제한중량(g)", "배달횟수", "배달소요일수(서류)", "배달불능시 보관기간", "배달불가요일", "세관신고서 작성기준", "기타서류작성", "자료 기준" ],
        notices: [ {
          label: "접수 시 주의사항",
          content: "ㅇ유학서류, 선적서류(선하증권/Shipping document 등) EMS 접수 금지*시한성/재발급 불가 우편물은 반드시 EMS 프리미엄으로 접수 문의 - 지연, 분실 시 간접피해 보상 불가 - 시행 : '21. 2. 23\nㅇ김치 접수 가능\n  - 용기는 금속 재질의 포장 용기(캔)로 한정, 내용물은 전체 용량의 70% 이하 유지 <우정사업본부 국제사업과, 2024. 10. 22.>\n- 통관 유의사항 : 고객은 발송하는 국가의 통관 사항을 확인하여 접수를 해야하며, 통관 계류 및 배송지연 등으로 인한 음식물의 부패 및 폐기 등은 손해배상이 불가\n\nㅇ사서함 (PO BOX) 취급\nㅇ주소변경 가능(협조사항), 반환청구 불가\n\nㅇ취급지역: Ross Dependency를 제외한 전지역, cook islands 의 경우 Rarotonga에 한함\nㅇ국가약호 오입력 주의 : NU(뉴질란드니베섬), CK(뉴질란드 쿡제도), TK(뉴질란드 토켈라우제도) (국가명은 같지만 섬 또는 제도(군도)여서 도착국약호가 다른 지역)/ NL(네덜란드)"
        }, {
          label: "금지·제한품목",
          content: "ㅇ금지품목 : 흡연·약물 기구 (대마초·메탐페타민용 파이프, 전자담배(Vaporisers) 등), 특정 무기류-플릭 나이프(flick knives), 버터플라이 나이프, 소드스틱(swordsticks), 너클더스터(knuckle dusters), 고출력 소형 자석( “buckyballs”), 범죄 목적 물품\n\nㅇ수류탄류의 반입을 철저히 금지(뇌관 제외된 장식품, 장난감, 모형류도 반입 금지)\n\nㅇ제한품목 :담배, 음식물(농업·수산 관리청까지 통보, 조사),의약품(양약, 한약 등)/건강보조제(영양제, 비타민, 오메가3 등)/건강식품(홍삼, 인삼등), 국제협약(CITES) 보호종, 식충식물(carnivorous plants), 총기 및 탄약, 휴대용 고출력 레이저 포인터, 러시아산 금(gold of Russian origin), 러시아산 석유·가스·석탄, 러시아산 사치품(luxury goods)"
        }, {
          label: "배달특이사항",
          content: "ㅇ 배달시도 1회, 재배달은 수취인 요청시"
        }, {
          label: "세관·통관사항",
          content: "ㅇ면세한도: 1000NZD (487SDR)\n\nㅇ수취인이 개인일 경우 비자와 여권의 모든 페이지 제출 필요, 신상품, 담배와 주류가 포함된 물품은 모두 과세대상\no 사기 우편물에 대한 폐기(압수)등 조치"
        } ]
      }
    }
  };
  const clone = v => JSON.parse(JSON.stringify(v));
  window.__ctDemo = {
    bulkNums: bulkItems.map((it => it.num)),
    watchTabs: [ "기타" ].concat(WATCH_TABS),
    watchSeed: watchItems.map(((it, i) => ({
      num: it.num,
      addedAt: NOW - (20 - i) * 6 * HOUR,
      memo: it.memo,
      tags: [ it.tab ]
    }))),
    watchReveal: watchItems.filter((it => hidden(it))).map((it => it.num)),
    ems: EMS_COND,
    query: query,
    advance: num => advance(itemFor(num)),
    canAdvance: num => canAdvance(itemFor(num)),
    traceRows: traceRows,
    sampleNums: sampleNums,
    hash: hashStr,
    snapshot(nums) {
      const o = {};
      nums.forEach((n => {
        const it = ITEMS.get(n);
        if (it) o[n] = clone(it);
      }));
      return o;
    },
    restore(snap) {
      Object.keys(snap).forEach((n => ITEMS.set(n, clone(snap[n]))));
    }
  };
})();
