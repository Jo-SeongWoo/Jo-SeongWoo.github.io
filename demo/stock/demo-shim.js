/* 나만의 MTS — 체험판 가짜 서버 (demo-shim.js)
   화면(index.html)보다 먼저 실려, 화면이 부르는 /api/... 요청을 전부 이 파일 안에서 답한다.
   실제 서버·증권사로는 아무 요청도 나가지 않는다. 종목·가격·금액은 전부 가상이다.
   · 보는 요청(GET)          → 가상 상태에서 만든 응답
   · 바꾸는 요청(POST·PUT·DELETE) → 가상 상태를 바꾼다(주문·매도·설정 모두 · 새로고침하면 처음 상태)
   · 사용 기록·판 확인        → 조용히 빈 응답
   기록: window.__demoLog = {served, writes, silent, unknown, external} */
(function () {
  'use strict';
  var LOG = window.__demoLog = { served: [], writes: [], silent: [], unknown: [], external: [] };

  /* ───────── 날짜 ───────── */
  var NOW = new Date();
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  var HOLI = { '01-01': '신정', '03-01': '삼일절', '05-05': '어린이날', '06-06': '현충일', '08-15': '광복절',
    '10-03': '개천절', '10-09': '한글날', '12-25': '성탄절', '12-31': '연말 휴장일' };
  function holName(d) { return HOLI[pad(d.getMonth() + 1) + '-' + pad(d.getDate())] || ''; }
  function isTrade(d) { var w = d.getDay(); return w !== 0 && w !== 6 && !holName(d); }
  function prevTrade(d) { var x = addDays(d, -1); while (!isTrade(x)) x = addDays(x, -1); return x; }
  function nextTrade(d) { var x = addDays(d, 1); while (!isTrade(x)) x = addDays(x, 1); return x; }
  var TODAY = dayOnly(NOW);
  var NOW_MIN = NOW.getHours() * 60 + NOW.getMinutes();
  /* 자료의 날 = 마지막으로 «끝난» 장날 — 오늘이 장날이고 15:40 이 지났으면 오늘, 아니면 직전 장날.
     (언제 열어 봐도 장 마감 뒤 하루치가 다 찬 화면이 되게) */
  var SESS = (isTrade(TODAY) && NOW_MIN >= 15 * 60 + 40) ? TODAY : prevTrade(TODAY);
  var SESS_IS_TODAY = SESS.getTime() === TODAY.getTime();
  var LIMIT_MIN = SESS_IS_TODAY ? NOW_MIN : 24 * 60;      /* 오늘 일은 지금 시각까지만 */
  var OPEN_RUN = (isTrade(TODAY) && NOW_MIN < 8 * 60 + 55) ? TODAY : nextTrade(TODAY);
  function hm2min(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function tsAt(d, s) { var p = String(s).split(':');
    return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), +p[0], +p[1], +(p[2] || 0)).getTime() / 1000); }
  function md(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
  function wdK(d) { return '일월화수목금토'.charAt(d.getDay()); }
  var DAYLAB = SESS_IS_TODAY ? '당일' : md(SESS);

  /* ───────── 숫자 ───────── */
  function tick(p) { return p < 2000 ? 1 : p < 5000 ? 5 : p < 20000 ? 10 : p < 50000 ? 50 : p < 200000 ? 100 : p < 500000 ? 500 : 1000; }
  function rt(p) { var t = tick(p); return Math.round(p / t) * t; }
  function rtUp(p) { var t = tick(p); return Math.ceil(p / t) * t; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function won(n) { return Math.round(n).toLocaleString('en-US') + '원'; }
  function comma(n) { return Math.round(n).toLocaleString('en-US'); }
  function pctS(x) { return (x > 0 ? '+' : (x < 0 ? '-' : '')) + Math.abs(x).toFixed(1) + '%'; }

  /* ───────── 가상 종목 (이름·코드 모두 가상 — 실제 상장사와 겹치지 않게 확인) ───────── */
  var S = {};
  [
    ['991010', '다솜전자', 31200, 2.47, ['반도체', 'HBM', '로봇', '자율주행', '업종·반도체와반도체장비']],
    ['991020', '새솔반도체', 68900, -1.15, ['반도체', 'HBM', '업종·반도체와반도체장비']],
    ['991030', '미르소재', 24800, 0.81, ['반도체', '2차전지', 'ESS', '업종·화학']],
    ['991040', '가람에너지', 19460, 4.36, ['원자력', '전력설비', 'ESS', '업종·전기장비']],
    ['991050', '해솔전기', 8140, 3.17, ['전력설비', '전선', '업종·전기장비']],
    ['991060', '다온로보틱스', 52300, 5.02, ['로봇', '업종·기계']],
    ['991070', '윤슬바이오', 11650, -2.43, ['신약개발', '업종·제약']],
    ['991080', '단비전선', 9540, 1.92, ['전력설비', '전선', 'ESS', '업종·전기장비']],
    ['991110', '여울배터리', 56900, -0.88, ['2차전지', 'ESS', '전력설비', '업종·전기장비']],
    ['991120', '이음케미칼', 15320, -1.64, ['2차전지', 'ESS', '업종·화학']],
    ['991130', '도담모빌리티', 21750, 1.21, ['자율주행', '로봇', '업종·자동차부품']],
    ['991140', '보람정밀', 6480, 2.05, ['로봇', '자율주행', '2차전지', '업종·기계']],
    ['991150', '하늬제약', 32100, -0.47, ['신약개발', '업종·제약']],
    ['991160', '수리중공업', 27450, 3.88, ['원자력', '전력설비', '조선', '업종·전기장비']],
    ['991170', '마루디스플레이', 4215, 0.35, ['OLED', '업종·디스플레이장비및부품']],
    ['991180', '별빛엔터', 13450, -3.12, ['엔터', '업종·방송과엔터테인먼트']],
    ['991190', '온새미테크', 18230, 6.71, ['로봇', '업종·기계']],
    ['991210', '늘봄푸드', 7350, 0.18, ['음식료', '업종·식품']],
    ['991220', '한결건설', 12880, 5.94, ['원자력', '업종·건설']],
    ['991230', '아라테크', 44650, 1.33, ['반도체', 'HBM', '업종·반도체와반도체장비']],
    ['991240', '솔빛머티리얼', 38900, -2.21, ['2차전지', '업종·화학']],
    ['991250', '새빛로직스', 9870, 0.76, ['자율주행', 'AI', '업종·소프트웨어']],
    ['991260', '초롱인터넷', 23400, -0.92, ['AI', '업종·소프트웨어']],
    ['993001', '고운바이오', 8760, -1.37, ['신약개발', '업종·제약']],
    ['993002', '나린테크', 15420, 0.64, ['반도체', '업종·반도체와반도체장비']],
    ['993003', '다래정밀', 11230, 1.48, ['업종·기계']],
    ['993004', '단솔에너지', 6870, 2.96, ['ESS']],
    ['993005', '마중전기', 14350, 3.41, ['전력설비', '전선', '업종·전기장비']],
    ['993006', '미리내소재', 27650, -0.73, ['업종·화학']],
    ['993007', '빛누리전자', 5320, 0.29, ['반도체', 'OLED', '업종·반도체와반도체장비']],
    ['993008', '소담기계', 9180, 2.62, ['로봇', '조선', '업종·기계']],
    ['993009', '수피아로보', 16890, 7.85, ['로봇']],
    ['993010', '시나브로시스템', 4870, 1.06, ['AI', '업종·소프트웨어']],
    ['993011', '아름드리건설', 8420, 4.12, ['원자력', '업종·건설']],
    ['993012', '여우비소재', 33150, -1.95, ['2차전지']],
    ['993013', '오롯반도체', 61200, 2.18, ['반도체', 'HBM', '업종·반도체와반도체장비']],
    ['993014', '은가람중공업', 41850, 5.47, ['원자력', '조선']],
    ['993015', '이든배터리', 22300, -0.56, ['2차전지', '업종·전기장비']],
    ['993016', '자올모터스', 13760, 0.94, ['자율주행', '업종·자동차부품']],
    ['993017', '잔별에너지', 3655, 3.73, ['ESS']],
    ['993018', '한아름식품', 19970, -0.21, ['음식료', '업종·식품']],
    ['993019', '해든솔루션', 7640, 2.33, ['AI', '업종·소프트웨어']],
    ['993020', '꽃잠엔터', 24550, -1.84, ['엔터', '업종·방송과엔터테인먼트']],
    ['993021', '너울조선', 35800, 1.57, ['조선']],
    ['993022', '늘품에너지', 12410, 4.68, ['ESS', '전력설비']],
    ['993023', '다님모빌리티', 8930, 1.89, ['자율주행', '업종·자동차부품']],
    ['993024', '도란전자', 2645, -0.38, ['반도체', 'OLED', 'HBM']],
    ['993025', '물비늘소재', 47300, -2.67, ['2차전지']],
    ['993026', '반디테크', 10870, 3.09, ['로봇']],
    ['993027', '산들전기', 18640, 2.74, ['전력설비', '업종·전기장비']],
    ['993028', '새암반도체', 29950, 0.87, ['반도체', 'HBM', '업종·반도체와반도체장비']],
    ['993029', '슬기로보틱스', 26700, 4.21, ['로봇']],
    ['993030', '온다전력', 15060, 3.36, ['원자력', '전력설비', '업종·전기장비']],
    ['993031', '윤빛케미칼', 9450, -1.12, ['2차전지', '업종·화학']],
    ['993032', '지음테크', 6215, 0.52, ['자율주행', 'AI']]
  ].forEach(function (r) { S[r[0]] = { code: r[0], name: r[1], cur: rt(r[2]), chg: r[3], th: r[4] }; });
  function nm(c) { return (S[c] || {}).name || c; }
  function labKey(l) { return l.indexOf('업종·') === 0 ? 'upjong|' + l.slice(3) : 'theme|' + l; }
  function labDim(l) { return l.indexOf('업종·') === 0 ? 'upjong' : 'theme'; }
  function labName(l) { return l.indexOf('업종·') === 0 ? l.slice(3) : l; }
  /* 묶음 — 그 종목들 중 min 개 이상이 같이 든 테마·업종 */
  function groupsOf(codes, min) {
    var by = {}, order = [];
    codes.forEach(function (c) {
      (S[c].th || []).forEach(function (l) { if (!by[l]) { by[l] = []; order.push(l); } if (by[l].indexOf(c) < 0) by[l].push(c); });
    });
    return order.filter(function (l) { return by[l].length >= min; })
      .map(function (l) { return { key: labKey(l), dim: labDim(l), name: labName(l), label: l, codes: by[l].slice() }; });
  }

  /* ───────── 차트 봉 (종목마다 고정된 난수 — 열 때마다 같은 모양) ───────── */
  function seedOf(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(R) { var u = R() || 1e-9, v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var NBARS = 320, DATES = (function () { var a = [], d = SESS; while (a.length < NBARS) { a.unshift(d); d = prevTrade(d); } return a; })();
  var BARS = {};
  function genBars(code, cur, chg, opt) {
    opt = opt || {};
    var R = rng(seedOf(code + '|bars')), n = NBARS, isIdx = !!opt.idx;
    var dec = isIdx ? function (x) { return r2(x); } : rt;
    var drift = opt.drift != null ? opt.drift : (0.0006 + R() * 0.0012), vol = opt.vol || (0.017 + R() * 0.01);
    var c = new Array(n);
    c[n - 1] = cur; c[n - 2] = cur / (1 + chg / 100);
    for (var i = n - 3; i >= 0; i--) c[i] = c[i + 1] / Math.exp(drift + vol * gauss(R) * 0.9);
    var base = isIdx ? 4.5e8 : Math.max(20000, 2.2e9 / cur), out = [];
    for (var j = 0; j < n; j++) {
      var cl = dec(c[j]), pc = j ? c[j - 1] : c[j] * (1 - 0.004);
      var op = dec(j === n - 1 ? pc * (1 + (chg >= 0 ? 0.004 : -0.002)) : pc * (1 + gauss(R) * 0.007));
      var hi = dec(Math.max(op, cl) * (1 + Math.abs(gauss(R)) * (isIdx ? 0.004 : 0.011)));
      var lo = dec(Math.min(op, cl) * (1 - Math.abs(gauss(R)) * (isIdx ? 0.004 : 0.011)));
      if (hi < Math.max(op, cl)) hi = Math.max(op, cl);
      if (lo > Math.min(op, cl)) lo = Math.min(op, cl);
      var vv = base * Math.exp(gauss(R) * 0.42);
      var bodyUp = cl / op - 1;
      if (!isIdx && bodyUp > 0.035) vv *= 2.6 + R() * 1.6;          /* 큰 양봉엔 거래량이 붙는다(매집봉 ▽ 재료) */
      out.push({ date: ymd(DATES[j]), o: op, h: hi, l: lo, c: cl, v: Math.round(vv) });
    }
    out[n - 1].c = isIdx ? r2(cur) : cur;
    if (out[n - 1].h < out[n - 1].c) out[n - 1].h = out[n - 1].c;
    if (out[n - 1].l > out[n - 1].c) out[n - 1].l = out[n - 1].c;
    return out;
  }
  function accumLine(bars, win, mult) {
    var a = [], s = 0;
    for (var i = 0; i < bars.length; i++) {
      a.push(i >= win ? Math.round(s / win * mult) : null);
      s += bars[i].v; if (i >= win) s -= bars[i - win].v;
    }
    return a;
  }
  function weekly(bars) {
    var out = [], cur = null, key = '';
    bars.forEach(function (b) {
      var d = new Date(+b.date.slice(0, 4), +b.date.slice(4, 6) - 1, +b.date.slice(6, 8));
      var mon = addDays(d, -((d.getDay() + 6) % 7)), k = ymd(mon);
      if (k !== key) { if (cur) out.push(cur); key = k; cur = { date: b.date, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }; }
      else { cur.date = b.date; cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.v += b.v; }
    });
    if (cur) out.push(cur);
    return out;
  }
  function barsOf(code) {
    if (BARS[code]) return BARS[code];
    var s = S[code];
    BARS[code] = s ? genBars(code, s.cur, s.chg) : [];
    return BARS[code];
  }

  /* ═════════ 가상 서버 상태 — 바꾸는 요청은 전부 여기만 바꾼다(새로고침하면 처음으로) ═════════ */
  var ST = {
    cash: 23480000, switchOn: true, stopped: false, pcOffAt: 0, vib: true, keepH: 72, clearedAt: 0, seq: 100,
    be: { enabled: true, pct: 5, ticks: 3 },
    ma: { enabled: true, l21: { pct: 8, qty: 50 }, l50: { pct: 15, qty: 100 } },
    bvc: { enabled: true, ratio: 70, sell: 50 }, dd: { mult: 2 },
    fix: { text: '- [잔고] 정렬 단추에 «보유 기간» 순서도 있으면 좋겠음\n- [시장 개요] TOP10 에서 업종만 따로 보는 칩\n- 차트 주봉에서 매수선 금액 글자가 가끔 두 줄로 겹침\n- 알림 «전문 펼치기» 를 누르면 그 자리에서 스크롤이 튐',
      enabled: true, rev: 7, updated_at: iso(prevTrade(TODAY)) + 'T21:40:12', images: [] },
    sched: { time: '01:30', armed: false, run_at: null },
    majorLabels: ['원자력', '전력설비', 'HBM', '업종·반도체와반도체장비', '신약개발', '2차전지'],
    majorCodes: ['991010', '991040', '991020', '991160', '991230', '991220', '991170', '991260', '991250'],
    holds: [
      ['991010', 120, 28450, '반도체'], ['991020', 60, 71200, 'HBM'], ['991030', 150, 23550, '2차전지'],
      ['991040', 270, 18970, '원자력'], ['991050', 400, 7880, '전력설비'], ['991060', 45, 46800, '로봇'],
      ['991070', 200, 12350, '신약개발'], ['991080', 170, 9560, '업종·전기장비']
    ].map(function (r) { return { code: r[0], qty: r[1], avg: r[2], route: r[3] }; }),
    rules: [
      ['h1', '991010', 'down', 27100, 100, ''], ['h2', '991010', 'up', 34500, 50, ''],
      ['h3', '991020', 'down', 66500, 100, ''], ['h4', '991030', 'down', 23600, 100, 'breakeven'],
      ['h5', '991040', 'down', 19000, 100, 'breakeven'], ['h6', '991040', 'up', 22400, 50, ''],
      ['h7', '991050', 'down', 7450, 100, ''], ['h8', '991060', 'down', 49300, 100, 'trail21'],
      ['h9', '991060', 'up', 57500, 50, ''], ['h10', '991070', 'down', 11500, 100, '']
    ].map(function (r) { return { rule_id: r[0], code: r[1], direction: r[2], target_price: r[3], qty_pct: r[4], origin: r[5] }; }),
    balRules: [{ rule_id: 'b1', direction: 'down', base_pct: -5, qty_pct: 100 }, { rule_id: 'b2', direction: 'up', base_pct: 20, qty_pct: 50 }],
    sellOpen: [{ req_id: 'so1', code: '991070', pct: 30, amount: null }],
    trades: [
      ['09:03:41', '991050', '매수', 120, 7990, null], ['09:47:15', '991180', '매도', 150, 13450, -106420],
      ['10:12:08', '991040', '매수', 60, 19120, null], ['11:26:52', '991060', '매도', 40, 52800, 232960],
      ['13:58:30', '991080', '매수', 50, 9520, null], ['14:21:05', '991070', '매도', 100, 11700, -67259]
    ].filter(function (r) { return hm2min(r[0]) <= LIMIT_MIN; }),
    extraAlerts: [], reqs: {}, batches: {}
  };
  function nid(p) { return p + (++ST.seq); }
  function nowHMS() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function nowS() { return Math.floor(Date.now() / 1000); }
  function holdOf(c) { return ST.holds.filter(function (h) { return h.code === c && h.qty > 0; })[0] || null; }

  /* ───────── 보유(파생) ───────── */
  function holdRows() {
    return ST.holds.filter(function (h) { return h.qty > 0; }).map(function (h) {
      var s = S[h.code], buy = h.avg * h.qty, ev = s.cur * h.qty, pl = Math.round(ev - buy - ev * 0.0023);
      return { code: h.code, name: s.name, qty: h.qty, avg: h.avg, buy: buy, ev: ev, pl: pl, rate: r2(pl / buy * 100), route: h.route };
    });
  }
  function HC() { return holdRows().map(function (h) { return h.code; }); }
  function HG() { return groupsOf(HC(), 3); }
  function totals() { var t = { buy: 0, ev: 0, pl: 0 }; holdRows().forEach(function (h) { t.buy += h.buy; t.ev += h.ev; t.pl += h.pl; }); t.net = ST.cash + t.ev; return t; }

  /* ───────── 대기 매수 주문 — 주문가는 그 종목 봉의 최근 고점 ───────── */
  var TRIG = {};
  function triggerFor(code) {
    if (TRIG[code]) return TRIG[code];
    var b = barsOf(code), n = b.length, cur = S[code].cur, k = -1, H = 0;
    for (var i = n - 40; i < n - 3; i++) if (b[i].h > H) { H = b[i].h; k = i; }
    var t = rtUp(H), gap = t / cur - 1;
    if (gap < 0.012 || gap > 0.085) { t = rtUp(cur * (1.03 + (seedOf(code) % 20) / 1000)); b[k].h = t; }
    for (var j = k + 1; j < n; j++) {
      var lim = t - tick(t);
      if (b[j].h > lim) b[j].h = lim;
      if (b[j].o > b[j].h) b[j].o = b[j].h;
      if (b[j].c > b[j].h) b[j].c = b[j].h;
      if (b[j].l > Math.min(b[j].o, b[j].c)) b[j].l = Math.min(b[j].o, b[j].c);
    }
    TRIG[code] = { t: t, anchor: b[k].date };
    return TRIG[code];
  }
  function capOf(t, unit, v, own) {
    if (unit === 'ticks') return { mode: 'ticks', pct: 0, ticks: v, cap: v > 0 ? t + tick(t) * v : 0, own: own, limited: false };
    return { mode: 'pct', pct: v, ticks: 0, cap: v > 0 ? rt(t * (1 + v / 100)) : 0, own: own, limited: false };
  }
  function setAmt(o, amt) { o.quantity = Math.max(1, Math.floor(amt / o.trigger_price)); o.total_amount = o.quantity * o.trigger_price; o.base_amount = amt; }
  ST.orders = [
    [3101, '991010', 2000000, 'cash', '[테마] HBM', 1], [3102, '991080', 1500000, 'cash', '[테마] 전력설비', 1],
    [3103, '991110', 2000000, 'cash', '[테마] ESS', 1.5], [3104, '991120', 2000000, 'cash', '[테마] 2차전지', 1],
    [3105, '991130', 3000000, 'credit', '[테마] 자율주행', 1], [3106, '991140', 1000000, 'cash', '[테마] 로봇', null],
    [3107, '991150', 2000000, 'cash', '[업종] 제약', 1], [3108, '991150', 1000000, 'cash', '[업종] 제약', 1],
    [3109, '991160', 2000000, 'cash', '[테마] 원자력', 2]
  ].map(function (r, idx) {
    var code = r[1], tg = triggerFor(code), t = tg.t, anchor = tg.anchor;
    if (idx === 7) { t = rtUp(tg.t * 1.045); anchor = null; }
    var o = { order_id: r[0], code: code, name: nm(code), trigger_price: t, order_price: t, payment_type: r[3], status: 'registered',
      src_label: r[4], src_meta: anchor ? JSON.stringify({ anchor: anchor, anchor_px: t }) : null,
      cap: capOf(t, 'pct', r[5] == null ? 1 : r[5], r[5] != null) };
    setAmt(o, r[2]);
    return o;
  });
  function PC() { var a = []; ST.orders.forEach(function (o) { if (a.indexOf(o.code) < 0) a.push(o.code); }); return a; }
  function routeLbl(src) { var m = String(src || '').match(/^\s*\[(테마|업종)\]\s*(.+?)\s*$/); return m ? (m[1] === '업종' ? '업종·' + m[2] : m[2]) : String(src || ''); }

  /* ───────── 매도 조건(파생 이름표) ───────── */
  function ruleKind(r) {
    var h = holdOf(r.code), avg = h ? h.avg : 0;
    if (r.origin === 'trail21') return '아래로익절 · 21일선';
    if (r.direction === 'up') return '위로익절';
    if (avg && r.target_price < avg) return '손절';
    if (r.origin === 'breakeven') return '본절';
    return avg ? '아래로익절' : '매도';
  }
  function ruleView(r) {
    var h = holdOf(r.code), avg = h ? h.avg : 0, pc = avg ? (r.target_price / avg - 1) * 100 : 0, kt = ruleKind(r);
    return { rule_id: r.rule_id, code: r.code, name: nm(r.code), kind: 'holding', direction: r.direction, target_price: r.target_price,
      qty_pct: r.qty_pct, kt: kt, pc: pc, label: nm(r.code) + ' ' + comma(r.target_price) + (avg ? ' (' + pctS(pc) + ')' : '') + ' ' + kt + r.qty_pct + '%' };
  }
  function rules() { return ST.rules.filter(function (r) { return holdOf(r.code); }).map(ruleView); }
  function balView(b) {
    var kt = b.direction === 'down' ? '손절' : '위로익절';
    return { rule_id: b.rule_id, kind: 'balance', direction: b.direction, base_pct: b.base_pct, qty_pct: b.qty_pct, kt: kt,
      label: '잔고편입 ' + b.base_pct + '% ' + kt + b.qty_pct + '%' };
  }

  /* ───────── 아래로 닿으면 기대손익 ───────── */
  function riskItem(h) {
    var downs = ST.rules.filter(function (r) { return r.code === h.code && r.direction === 'down'; })
      .sort(function (a, b) { return b.target_price - a.target_price; });
    var left = h.qty, pl = 0;
    downs.forEach(function (r) {
      if (left <= 0) return;
      var q = Math.min(left, Math.max(1, Math.round(h.qty * r.qty_pct / 100)));
      pl += (r.target_price - h.avg) * q - r.target_price * q * 0.0023; left -= q;
    });
    var cov = h.qty - left; pl = Math.round(pl);
    return { name: h.name, covered_qty: cov, uncovered_qty: left, stop_pl_net_krw: cov ? pl : 0, stop_pl_net_pct: cov ? r2(pl / h.buy * 100) : null, bet: h.buy };
  }
  function riskSum(items, codes) {
    var s = { n: codes.length, n_none: 0, bet: 0, stop_pl_net_krw: 0 };
    codes.forEach(function (c) { var it = items[c]; s.bet += it.bet; if (!it.covered_qty) s.n_none++; s.stop_pl_net_krw += it.stop_pl_net_krw; });
    s.stop_pl_net_pct = s.bet ? r2(s.stop_pl_net_krw / s.bet * 100) : null;
    return s;
  }

  /* ───────── 매도 실행(가상 체결) ───────── */
  function addAlert(grp, label, ch, name, text) {
    var o = { ts: nowS(), fn: 'send_' + grp, ch: ch, ch_label: ({ trade: '매매', error: '에러', theme: '관심테마', order: '알림' })[ch] || '',
      ok: true, grp: grp, grp_label: GL[grp], fn_label: label, a: { text: text } };
    if (name) o.a.name = name;
    ST.extraAlerts.push(o);
  }
  function sellHolding(code, qty, why) {
    var h = holdOf(code);
    if (!h) return null;
    qty = Math.max(1, Math.min(h.qty, Math.round(qty)));
    var px = S[code].cur, amt = px * qty, fee = Math.round(amt * 0.0021), pnl = Math.round((px - h.avg) * qty - fee);
    h.qty -= qty; ST.cash += amt - fee;
    if (h.qty <= 0) ST.rules = ST.rules.filter(function (r) { return r.code !== code; });
    ST.trades.push([nowHMS(), code, '매도', qty, px, pnl]);
    var nmx = nm(code), pr = r2(pnl / (h.avg * qty) * 100);
    addAlert('trade', '📤 매도 발사', 'trade', nmx, '📤 ' + nmx + ' 매도 발사 · ' + comma(px) + '원 · ' + qty + '주 시장가' + (why ? ' (' + why + ')' : ''));
    addAlert('trade', '✅ 매도 체결', 'trade', nmx, '✅ ' + nmx + ' 매도 체결 ' + qty + '/' + qty + '주\n손익 ' + (pnl >= 0 ? '+' : '−') + comma(Math.abs(pnl)) + '원 (' + (pr >= 0 ? '+' : '−') + Math.abs(pr).toFixed(2) + '%)');
    return { qty: qty, px: px, pnl: pnl };
  }
  function pctQty(q, pct) { return pct >= 100 ? q : Math.max(1, Math.min(q, Math.round(q * pct / 100))); }

  /* ───────── 응답 만들기 ───────── */
  function balanceResp() {
    var t = totals();
    return { holdings: holdRows().map(function (h) {
      return { '종목코드': h.code, '종목명': h.name, '보유수량': h.qty, '매입단가': h.avg, '매입금액': h.buy,
        '현재가': S[h.code].cur, '평가금액': h.ev, '평가손익': h.pl, '평가손익률': h.rate }; }),
      count: holdRows().length, total_buy: t.buy, total_eval: t.ev, total_pl: t.pl, deposit: ST.cash };
  }
  function themeTags() {
    var tags = {}, hg = HG();
    holdRows().forEach(function (h) {
      tags[h.code] = { route: [h.route], shared: hg.filter(function (g) { return g.codes.indexOf(h.code) >= 0 && g.label !== h.route; }).map(function (g) { return g.label; }) };
    });
    ST.orders.forEach(function (o) { if (!tags[o.code]) tags[o.code] = { route: [routeLbl(o.src_label)], shared: [] }; });
    return { ok: true, tags: tags, errors: [] };
  }
  var BIO_KEYS = ['theme|신약개발', 'upjong|제약'];
  function bioResp() {
    var items = {}, hA = 0, hN = 0, wA = 0, wN = 0, NET = totals().net;
    holdRows().forEach(function (h) { if (S[h.code].th.indexOf('신약개발') >= 0) { items[h.code] = { name: h.name, hold: h.ev, wait: 0, hold_pct: r2(h.ev / NET * 100) }; hA += h.ev; hN++; } });
    ST.orders.forEach(function (o) {
      if (S[o.code].th.indexOf('신약개발') < 0) return;
      var it = items[o.code] || (items[o.code] = { name: o.name, hold: 0, wait: 0 });
      it.wait += o.total_amount; it.wait_pct = r2(it.wait / NET * 100); wA += o.total_amount; wN++;
    });
    return { ok: true, net: NET, hold: { amount: hA, pct: r2(hA / NET * 100), n: hN }, wait: { amount: wA, pct: r2(wA / NET * 100), n: wN }, items: items, groups: BIO_KEYS, errors: [] };
  }
  function dayChg(pending) {
    var items = {}, codes = HC();
    if (pending) PC().forEach(function (c) { if (codes.indexOf(c) < 0) codes.push(c); });
    codes.forEach(function (c) { items[c] = { chg: S[c].chg, label: DAYLAB, src: SESS_IS_TODAY ? 'live' : 'final' }; });
    return { ok: true, items: items };
  }
  function riskResp() {
    var items = {}; holdRows().forEach(function (h) { items[h.code] = riskItem(h); });
    return { ok: true, items: items, totals: riskSum(items, HC()), errors: [],
      groups: HG().map(function (g) { var s = riskSum(items, g.codes); s.key = g.key; s.label = g.label; s.codes = g.codes; return s; }) };
  }
  function realizedResp() {
    var net = 0, sellAmt = 0, buyAmt = 0, ns = 0;
    ST.trades.forEach(function (t) { if (t[2] === '매도') { net += t[5]; sellAmt += t[3] * t[4]; ns++; } else buyAmt += t[3] * t[4]; });
    var tax = Math.round(sellAmt * 0.0018), cm = Math.round((sellAmt + buyAmt) * 0.00015);
    return { ok: true, today: SESS_IS_TODAY, day: iso(SESS), sold: ns > 0, net: net, gross: net + tax + cm, cmsn: cm, tax: tax };
  }
  function ordersLive() {
    var prices = {}, pc = PC(); pc.forEach(function (c) { prices[c] = S[c].cur; });
    var stops = [
      { code: '991070', name: nm('991070'), label: '손절', pl_rate: -5.27, state: '체결완료', at: '14:21', rule_id: 'h10' },
      { code: '991180', name: nm('991180'), label: '손절', pl_rate: -5.01, state: '체결완료', at: '09:47', rule_id: 'h99' }
    ].filter(function (x) { return hm2min(x.at) <= LIMIT_MIN; });
    var pt = [{ code: '991190', name: nm('991190'), amount: 1500000, route: '테마 · 로봇', at: '10:37' }].filter(function (x) { return hm2min(x.at) <= LIMIT_MIN; });
    return { ok: true, prices: prices,
      groups: groupsOf(pc, 3).map(function (g) {
        return { key: g.key, dim: g.dim, name: g.name, label: g.label, codes: g.codes, n: ST.orders.filter(function (o) { return g.codes.indexOf(o.code) >= 0; }).length };
      }),
      passed: { n: 0, text: '', items: [] }, passed_today: pt,
      unfilled: { n: 0, text: '✅ 체결 대기 중인 주문 없음\n오늘 발사분은 전부 체결완료(또는 발사 없음).' },
      stops: { day: iso(SESS), n: stops.length, items: stops },
      distday: { on: ST.dd.mult > 0, mode: 'final', day: iso(SESS), n: 0, items: [], unknown: [], mult: ST.dd.mult, at: '15:30' } };
  }
  function editTargets() {
    return { holding: rules().map(function (r) { return { rule_id: r.rule_id, code: r.code, name: r.name, label: r.label, kind: 'holding', direction: r.direction }; }),
      balance: ST.balRules.map(function (b) { var v = balView(b); return { rule_id: v.rule_id, label: v.label, kind: 'balance', direction: v.direction }; }),
      breakeven: { enabled: ST.be.enabled, pct: ST.be.pct, ticks: ST.be.ticks } };
  }
  function beOf(h) { return rtUp(h.avg + tick(h.avg) * ST.be.ticks); }
  function beCands() {
    return { ok: true, ticks: ST.be.ticks, items: holdRows().map(function (h) {
      var cur = S[h.code].cur, be = beOf(h), pl = r2((cur / h.avg - 1) * 100);
      var hasBE = ST.rules.some(function (r) { return r.code === h.code && r.direction === 'down' && r.target_price >= be; });
      var ok = pl >= ST.be.pct && !hasBE;
      return { code: h.code, name: h.name, eligible: ok, breakeven: be, avg: h.avg, cur: cur, pl_rate: pl,
        reason: ok ? '' : (hasBE ? '이미 손절이 본전 이상입니다' : (pl < 0 ? '손실 중이라 올릴 수 없습니다' : '이익이 ' + ST.be.pct + '%에 못 미칩니다')) };
    }) };
  }
  function ordersText() {
    var L = ['📋 전체 주문', '', '🛒 예약 매수 대기 ' + ST.orders.length + '건'];
    PC().forEach(function (c) {
      var os = ST.orders.filter(function (o) { return o.code === c; });
      L.push(nm(c) + ' (' + c + ')' + (os.length > 1 ? ' · ' + os.length + '건' : ''));
      os.forEach(function (o) { L.push('  [' + (o.payment_type === 'credit' ? '신용' : '현금') + '] 트리거 ' + won(o.trigger_price) + ' / ' + o.quantity + '주 / ' + won(o.total_amount)); });
    });
    var rs = rules();
    L.push('', '📤 보유종목 조건 매도 ' + rs.length + '건');
    var seen = {};
    rs.forEach(function (r) {
      if (seen[r.code]) return; seen[r.code] = 1;
      var g = rs.filter(function (x) { return x.code === r.code; });
      L.push(r.name + ' (' + r.code + ')' + (g.length > 1 ? ' · ' + g.length + '건' : ''));
      g.forEach(function (x) { L.push('  · ' + x.kt + ' ' + won(x.target_price) + ' (' + (x.pc >= 0 ? '+' : '') + x.pc.toFixed(1) + '%) / ' + x.qty_pct + '%'); });
    });
    L.push('', '⚙ 기본 매도 규칙 — 새로 산 종목에 거는 매도 ' + ST.balRules.length + '건');
    if (ST.balRules.length) L.push('신규편입 공통 · ' + ST.balRules.length + '건');
    ST.balRules.forEach(function (b) { var v = balView(b); L.push('  · ' + v.kt + ' 매입가 ' + (b.base_pct > 0 ? '+' : '') + b.base_pct + '% / ' + b.qty_pct + '%'); });
    return L.join('\n');
  }
  function todayResp() {
    var sorted = ST.trades.slice().sort(function (a, b) { return a[0] < b[0] ? 1 : (a[0] > b[0] ? -1 : 0); });
    var rows = sorted.map(function (t, i) {
      var r = { t: t[0].replace(/:/g, ''), code: t[1], name: nm(t[1]), side: t[2], qty: t[3], price: t[4], amount: t[3] * t[4],
        ord_no: String(7100 + i), pnl: null, pnl_stock: null, n_sells: 1, pnl_est: false, pnl_why: '' };
      if (t[2] === '매도') r.pnl = t[5];
      return r;
    });
    var s = { buy: 0, sell: 0, n_buy: 0, n_sell: 0 }, amt = 0;
    ST.trades.forEach(function (t) { if (t[2] === '매수') { s.buy += t[3] * t[4]; s.n_buy++; } else { s.sell += t[3] * t[4]; s.n_sell++; amt += t[5]; } });
    var rz = realizedResp();
    return { ok: true, day: iso(SESS), at: nowHMS(), rows: rows, sums: s, realized: { ok: true, net: rz.net, sold: rz.sold, cmsn: rz.cmsn },
      pnl_sum: s.n_sell ? { amount: amt, diff: amt - rz.net, est: false } : null };
  }
  /* 시장 개요 */
  var ALL_LABELS = (function () { var a = []; Object.keys(S).forEach(function (c) { S[c].th.forEach(function (l) { if (a.indexOf(l) < 0) a.push(l); }); }); return a; })();
  function membersOf(label) { return Object.keys(S).filter(function (c) { return S[c].th.indexOf(label) >= 0; }); }
  function groupRow(label) {
    var ms = membersOf(label), s = 0; ms.forEach(function (c) { s += S[c].chg; });
    return { dim: labDim(label), name: labName(label), label: label, n: ms.length, chg: ms.length ? r2(s / ms.length) : null, major: ST.majorLabels.indexOf(label) >= 0, src: 'final' };
  }
  var IDX = { kospi: { code: 'KS11', name: 'KOSPI', value: 2915.42, chg: 0.86, judge: 'FTD', day: 7 },
    kosdaq: { code: 'KQ11', name: 'KOSDAQ', value: 871.36, chg: 0.06, judge: 'Neutral(중간이하 마감)', day: 3 } };
  function overview() {
    var rows = ALL_LABELS.filter(function (l) { return membersOf(l).length >= 3; }).map(groupRow).sort(function (a, b) { return (b.chg - a.chg) || a.name.localeCompare(b.name); });
    var top = rows.slice(0, 10).map(function (r, i) { r.rank = i + 1; return r; });
    return { ok: true, at: '15:40:12',
      index: { mode: 'final', ref: ymd(SESS), asof: '', errors: [], items: ['kospi', 'kosdaq'].map(function (k) { var x = IDX[k];
        return { key: k, name: x.name, value: x.value, prev: r2(x.value / (1 + x.chg / 100)), chg_pct: x.chg, judge: x.judge, day: x.day, date: iso(SESS), more: [] }; }) },
      groups: { live: 0, live_missing: null, asof: '', top: top, major: ST.majorLabels.map(groupRow), missing: [] }, errors: [] };
  }
  function marketGroup(dim, name) {
    var label = dim === 'upjong' ? '업종·' + name : name, g = groupRow(label);
    var st = membersOf(label).map(function (c) {
      var pn = ST.orders.filter(function (o) { return o.code === c; }).length;
      return { code: c, name: nm(c), chg: S[c].chg, chg_src: 'final', held: !!holdOf(c), pending_n: pn, major: ST.majorCodes.indexOf(c) >= 0 };
    }).sort(function (a, b) { return b.chg - a.chg; });
    return { ok: true, dim: dim, name: name, chg: g.chg, major: g.major, src: 'final', chg_live: 0, at: '15:40', stocks: st, errors: [] };
  }
  /* 2026-10-16 원본 앱에 새로 생긴 두 주소(동기화로 체험판이 새 원본을 받으며 «체험판에 없는 자료» 로 나오던 것):
     «테마·업종 찾기» = 전체 테마·업종 줄 · «이 종목의 테마·업종 보기» = 한 종목이 든 테마·업종 줄. 줄 모양은 개요와 같은 groupRow. */
  function marketGroupsAll() {
    var rows = ALL_LABELS.map(groupRow).sort(function (a, b) { return ((b.chg || 0) - (a.chg || 0)) || a.name.localeCompare(b.name); });
    return { ok: true, at: '15:40:12', rows: rows, live: 0, total: rows.length, asof: '', live_missing: null, errors: [] };
  }
  function stockGroups(code) {
    code = String(code || '').trim().toUpperCase().replace(/^A/, '');
    if (!S[code]) return { ok: false, error: '이 종목의 테마·업종을 못 읽었습니다(체험판에 없는 종목)' };
    var rows = S[code].th.map(groupRow).sort(function (a, b) { return ((b.chg || 0) - (a.chg || 0)) || a.name.localeCompare(b.name); });
    return { ok: true, at: '15:40:12', code: code, name: nm(code), rows: rows, total: rows.length, live_missing: null, errors: [] };
  }
  function majorResp() {
    var gs = groupsOf(ST.majorCodes, 3);
    return { ok: true, chg_live: 0, at: '', errors: [], groups: gs.map(function (g) { return { key: g.key, label: g.label, codes: g.codes }; }),
      items: ST.majorCodes.map(function (c) {
        var pn = ST.orders.filter(function (o) { return o.code === c; }).length;
        return { code: c, name: nm(c), chg: S[c].chg, chg_src: 'final', held: !!holdOf(c), pending: pn > 0, pending_n: pn,
          groups: gs.filter(function (g) { return g.codes.indexOf(c) >= 0; }).map(function (g) { return g.label; }) };
      }) };
  }
  function holidaysResp() {
    var months = [], up = [];
    for (var k = 0; k < 3; k++) {
      var first = new Date(TODAY.getFullYear(), TODAY.getMonth() + k, 1), days = [];
      for (var d = first; d.getMonth() === first.getMonth(); d = addDays(d, 1)) {
        var w = d.getDay(), hn = holName(d), kind = (w === 0 || w === 6) ? 'wkend' : (hn ? 'hol' : 'trade');
        days.push({ d: iso(d), day: d.getDate(), wd: w, kind: kind, name: hn, today: d.getTime() === TODAY.getTime(), past: d < TODAY });
        if (kind === 'hol' && d >= TODAY) up.push({ d: iso(d), md: (d.getMonth() + 1) + '/' + d.getDate() + '(' + wdK(d) + ')', name: hn });
      }
      months.push({ y: first.getFullYear(), m: first.getMonth() + 1, days: days });
    }
    return { ok: true, months: months, upcoming: up };
  }
  /* 알림 */
  var GROUPS_DEF = [
    ['trade', '💹 매매·주문', '한 주문의 처음부터 끝까지 — 발사·체결·직접 매매 · 거부·미체결 취소·갭 건너뜀·본전 상향', ['🚀 매수 발사', '📤 매도 발사', '✅ 체결', '🛡 본전 상향', '⚠️ 갭 건너뜀']],
    ['credit', '💳 신용', '신용으로 살 수 있는 종목이 바뀌었을 때 · 신용→현금 자동전환', ['💳 신용 변동', '💵 자동 현금전환']],
    ['error', '🔴 이상', '놓치면 안 되는 것 — 워커가 죽거나 이상이 생겼을 때', ['🔴 워커 오류', '🔴 이상']],
    ['data', '🔄 데이터 업데이트', '매일 데이터 업데이트 — 시작 · 진행 · 끝', ['📊 시작', '🏁 전부 끝']],
    ['system', '🖥 시스템', '켜짐·꺼짐·점검 같은 운영 소식', ['▶ 기동', '⏹ 종료', '🔔 운영 알림']],
    ['theme', '★ 테마', '주요테마·업종 소식', ['★ 주요테마·업종']],
    ['etc', '기타', '모의·시험 발송·기호 안내', ['🧪 시험 발송']]
  ];
  var GL = {}; GROUPS_DEF.forEach(function (g) { GL[g[0]] = g[1]; });
  var KEEP_OPT = [[24, '24시간'], [72, '72시간'], [168, '7일'], [0, '지우지 않음']];
  function baseAlerts() {
    var d0 = SESS, d1 = prevTrade(d0), d2 = prevTrade(d1), d3 = prevTrade(d2), d5 = prevTrade(prevTrade(d3));
    return [
      [d0, '09:00:02', 'system', '▶ 기동', 'order', null, '▶ 주문 프로그램 시작 — 대기 매수 9건 · 매도 조건 10건 · [매수] 켬'],
      [d0, '09:03:41', 'trade', '🚀 매수 발사', 'trade', '해솔전기', '🚀 해솔전기 매수 발사\n트리거 7,990원 · 120주 · 한도 +1.00%'],
      [d0, '09:03:44', 'trade', '✅ 체결', 'trade', '해솔전기', '✅ 해솔전기 매수 체결 120/120주 · 평균 7,990원'],
      [d0, '09:47:15', 'trade', '📤 손절 발사', 'trade', '별빛엔터', '📤 별빛엔터 손절 발사 · 13,450원 · 150주 시장가'],
      [d0, '09:47:18', 'trade', '✅ 손절 체결', 'trade', '별빛엔터', '✅ 별빛엔터 손절 체결 150/150주\n손익 −106,420원 (−5.01%)'],
      [d0, '10:12:08', 'trade', '🚀 매수 발사', 'trade', '가람에너지', '🚀 가람에너지 매수 발사\n트리거 19,120원 · 60주 · 한도 +1.00%'],
      [d0, '10:12:10', 'trade', '✅ 체결', 'trade', '가람에너지', '✅ 가람에너지 매수 체결 60/60주 · 평균 19,120원'],
      [d0, '10:37:20', 'system', '🔔 운영 알림', 'theme', null, '🗑 온새미테크 대기 매수(150만원)가 트리거를 지나쳐 자동삭제했습니다\n경로: 테마 · 로봇'],
      [d0, '11:26:52', 'trade', '📤 위로익절 발사', 'trade', '다온로보틱스', '📤 다온로보틱스 위로익절 발사 · 52,800원 · 40주 시장가'],
      [d0, '11:26:55', 'trade', '✅ 위로익절 체결', 'trade', '다온로보틱스', '✅ 다온로보틱스 위로익절 체결 40/40주\n손익 +232,960원 (+12.44%)'],
      [d0, '13:58:30', 'trade', '🚀 매수 발사', 'trade', '단비전선', '🚀 단비전선 매수 발사\n트리거 9,520원 · 50주 · 한도 +1.00%'],
      [d0, '13:58:31', 'trade', '✅ 체결', 'trade', '단비전선', '✅ 단비전선 매수 체결 50/50주 · 평균 9,520원'],
      [d0, '14:21:05', 'trade', '📤 손절 발사', 'trade', '윤슬바이오', '📤 윤슬바이오 손절 발사 · 11,700원 · 100주 시장가'],
      [d0, '14:21:08', 'trade', '✅ 손절 체결', 'trade', '윤슬바이오', '✅ 윤슬바이오 손절 체결 100/100주\n손익 −67,259원 (−5.27%)'],
      [d0, '15:31:00', 'data', '📊 시작', 'order', null, '📊 매일 데이터 업데이트를 시작합니다 (보통 25분)'],
      [d0, '15:56:40', 'data', '🏁 전부 끝', 'order', null, '🏁 데이터 업데이트 끝 — 25분 40초 · 결손 0종목'],
      [d1, '08:31:12', 'credit', '💵 자동 현금전환', 'order', null, '💵 신용 불가로 바뀐 1종목을 현금 주문으로 바꿨습니다\n도담모빌리티 — 신용 → 현금'],
      [d1, '09:00:03', 'system', '▶ 기동', 'order', null, '▶ 주문 프로그램 시작 — 대기 매수 8건 · 매도 조건 10건 · [매수] 켬'],
      [d1, '10:05:44', 'trade', '🛡 본전 상향', 'trade', '가람에너지', '🛡 가람에너지 본전 상향 — 손절 19,000원 (매수가 +3틱)'],
      [d1, '14:47:09', 'trade', '🚀 매수 발사', 'trade', '다솜전자', '🚀 다솜전자 매수 발사\n트리거 29,650원 · 67주 · 한도 +1.00%'],
      [d1, '14:47:11', 'trade', '✅ 체결', 'trade', '다솜전자', '✅ 다솜전자 매수 체결 67/67주 · 평균 29,650원'],
      [d1, '15:41:30', 'theme', '★ 주요테마·업종', 'theme', null, '★ 주요테마 «원자력» 오늘 +3.9% · 등락률 TOP10 2위'],
      [d2, '09:00:01', 'system', '▶ 기동', 'order', null, '▶ 주문 프로그램 시작 — 대기 매수 9건 · 매도 조건 9건 · [매수] 켬'],
      [d2, '09:01:15', 'trade', '⚠️ 갭 건너뜀', 'trade', '보람정밀', '⚠️ 보람정밀 시가 갭 +4.8% — 한도를 넘어 오늘은 건너뜁니다'],
      [d2, '13:12:40', 'error', '🔴 이상', 'error', null, '🔴 시세 응답이 40초 늦었습니다 — 다시 연결했습니다 (자동 복구)'],
      [d3, '09:00:02', 'system', '▶ 기동', 'order', null, '▶ 주문 프로그램 시작 — 대기 매수 7건 · 매도 조건 9건 · [매수] 켬'],
      [d3, '11:03:27', 'trade', '📤 본절 발사', 'trade', '미르소재', '📤 미르소재 본절 발사 · 23,600원 · 80주 시장가'],
      [d5, '09:00:02', 'system', '▶ 기동', 'order', null, '▶ 주문 프로그램 시작 — 대기 매수 6건 · 매도 조건 8건 · [매수] 켬'],
      [d5, '15:40:05', 'theme', '★ 주요테마·업종', 'theme', null, '★ 주요테마 «전력설비» 오늘 +5.2% · 등락률 TOP10 1위']
    ].map(function (a) {
      var o = { ts: tsAt(a[0], a[1]), fn: 'send_' + a[2], ch: a[4], ch_label: ({ trade: '매매', error: '에러', theme: '관심테마', order: '알림' })[a[4]] || '',
        ok: true, grp: a[2], grp_label: GL[a[2]], fn_label: a[3], a: { text: a[6] } };
      if (a[5]) o.a.name = a[5];
      return o;
    });
  }
  var BASE_ALERTS = baseAlerts();
  function alertsAll() {
    var n = nowS(), cut = ST.keepH ? n - ST.keepH * 3600 : 0;
    return BASE_ALERTS.concat(ST.extraAlerts).filter(function (o) { return o.ts <= n && o.ts > ST.clearedAt && o.ts >= cut; })
      .sort(function (x, y) { return y.ts - x.ts; });
  }
  function fixResp() {
    return { text: ST.fix.text, enabled: ST.fix.enabled, rev: ST.fix.rev, updated_at: ST.fix.updated_at,
      last_done_at: iso(TODAY) + 'T01:52:30', images: ST.fix.images.slice() };
  }
  function schedResp() {
    var p = ST.sched.time.split(':'), nr = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), +p[0], +p[1]);
    if (nr <= new Date()) nr = addDays(nr, 1), nr.setHours(+p[0], +p[1]);
    return { ok: true, time: ST.sched.time, next_run: iso(nr) + ' ' + ST.sched.time, task_ok: true, after_reset: { armed: ST.sched.armed, run_at: ST.sched.run_at } };
  }
  function patchResp() {
    var ds = [], d = TODAY;
    var items = [
      ['[주문] 대기 매수 카드에 «주문가까지 +x.x% 남음» 을 줄마다 표시', '[잔고] 맨 위 요약을 접어도 평가손익·실현손익이 보이게'],
      ['[시장 개요] 지수 칸을 누르면 지수 차트가 열리도록', '[당일매매] 종목별 한 줄 요약표 + 누르면 건별 체결'],
      ['[차트] 매수선 옆에 매수금액(만원) 태그', '[차트] 가격 칸 폭을 줄여 차트 영역을 넓힘', '[잔고] 종목명 찾기(초성 검색 포함)'],
      ['[알림] 긴 글은 앞부분만 보여 주고 «전문 펼치기»', '[설정] 알림 진동 켜고 끄기'],
      ['[주문] 주문액 일괄 증액·감액(만원 · %)', '[휴장 달력] 앞으로 쉬는 평일 목록']
    ];
    for (var i = 0; i < items.length; i++) { ds.push({ day: iso(d), items: items[i] }); d = addDays(d, -2); }
    return { ok: true, days: ds, notes_total: 2, notes: [
      { title: '🌙 ' + md(TODAY) + ' 새벽 — 수정사항 3건', body: '### 고친 것\n- 잔고 칩을 누르면 합계 판이 바로 바뀌도록\n- 차트 십자선 글자가 화면 밖으로 잘리던 것\n- 알림 날짜 머리줄이 같은 날 두 번 나오던 것\n\n### 확인\n> 폰 화면 검사 32개 통과', cut: false },
      { title: '🌙 ' + md(addDays(TODAY, -1)) + ' 새벽 — 코드리뷰', body: '- 주문 목록 갱신 때 깜빡임 원인(같은 내용도 다시 그리던 것) 정리\n- 느린 응답 20초 넘으면 끊고 다시 받기', cut: false }
    ] };
  }
  function ohlcResp(code, period) {
    var s = S[code];
    if (!s) return { bars: [], accum_line: [], name: code };
    if (PC().indexOf(code) >= 0) triggerFor(code);
    var b = barsOf(code).map(function (x) { return { date: x.date, o: x.o, h: x.h, l: x.l, c: x.c, v: x.v }; });
    if (period === 'weekly') b = weekly(b);
    return { name: s.name, bars: b, accum_line: accumLine(b, period === 'weekly' ? 10 : 50, 2.0), accum_mult: 2.0, accum_min_amount: 1000000000, live_seed: null };
  }
  var IDX_BARS = {};
  function indexResp(code, period) {
    var x = IDX[code === 'KQ11' ? 'kosdaq' : 'kospi'];
    if (!IDX_BARS[code]) IDX_BARS[code] = genBars(code, x.value, x.chg, { idx: true, vol: 0.009, drift: 0.0006 });
    var b = IDX_BARS[code].map(function (y) { return { date: y.date, o: y.o, h: y.h, l: y.l, c: y.c, v: y.v }; });
    if (period === 'weekly') b = weekly(b);
    return { bars: b.map(function (y) { return { date: y.date.slice(0, 4) + '-' + y.date.slice(4, 6) + '-' + y.date.slice(6, 8), o: y.o, h: y.h, l: y.l, c: y.c, v: y.v }; }),
      stale: false, ref: ymd(SESS), note: '', src: '' };
  }
  /* 일괄 매도 미리보기 */
  function gsItems(codes, pct) {
    return holdRows().filter(function (h) { return codes.indexOf(h.code) >= 0; }).map(function (h) {
      return { code: h.code, name: h.name, qty: h.qty, sell_qty: pctQty(h.qty, pct), eval: h.ev, pl: h.pl, buy: h.buy, pl_rate: h.rate };
    });
  }
  function buysOf(codes) { return ST.orders.filter(function (o) { return codes.indexOf(o.code) >= 0; }).map(function (o) { return o.order_id; }); }
  function gsPreview(key, pct, pick) {
    var hg = HG(), all = key === 'all|*', g = hg.filter(function (x) { return x.key === key; })[0];
    var codes = all ? HC() : (g ? g.codes : []), bbc = {};
    HC().forEach(function (c) { bbc[c] = buysOf([c]); });
    return { ok: true, key: key, label: all ? '보유 전체' : (g ? g.label : ''), all: all, n: codes.length,
      items: gsItems(pick ? HC() : codes, pct),
      open: true, open_run_date: iso(OPEN_RUN), pct_ok: true, pct: pct, pick_ok: true, max_items: 20, buys_keep_partial: true,
      chips: hg.map(function (x) { var ids = buysOf(x.codes); return { key: x.key, label: x.label, n: x.codes.length, codes: x.codes, buys: { n: ids.length, ids: ids } }; }),
      buys: { n: buysOf(codes).length, ids: buysOf(codes) }, buys_by_code: bbc, excluded: [] };
  }

  /* ═════════ 바꾸는 요청 ═════════ */
  function E(msg, st) { return J({ ok: false, error: msg, msg: msg }, st || 400); }
  function orderById(id) { return ST.orders.filter(function (o) { return String(o.order_id) === String(id); })[0]; }
  function routeWrite(method, p, q, b) {
    var m, o, i;
    b = b || {};
    if (p === '/api/bot/watch') {
      ST.switchOn = b.mode === 'on';
      return J({ ok: true, msg: ST.switchOn ? '주문 [켬] — 장이 열리면 예약 매수가 나갑니다' : '주문 [끔] — 예약 매수가 안 나갑니다 (매도는 그대로 나갑니다)' });
    }
    if (p === '/api/bot/estop') { ST.stopped = true; addAlert('system', '⏹ 종료', 'order', null, '⏹ 주문 프로그램을 전부 멈췄습니다 (폰에서 요청)'); return J({ ok: true, msg: '🛑 주문 프로그램을 전부 멈췄습니다 — 매수·매도가 안 나갑니다' }); }
    if (p === '/api/bot/eresume') { ST.stopped = false; addAlert('system', '▶ 기동', 'order', null, '▶ 주문 프로그램을 다시 시작했습니다 (폰에서 요청)'); return J({ ok: true, msg: '▶ 주문 프로그램을 다시 시작했습니다' }); }
    if (p === '/api/bot/shutdown') {
      ST.pcOffAt = Date.now() + 30000;
      return J({ ok: true, msg: '💻 30초 뒤 컴퓨터를 끕니다\n(체험판: 가상 컴퓨터는 1분 뒤 다시 켜집니다)' });
    }
    if (p === '/api/alerts/vibrate') { ST.vib = !!b.on; return J({ ok: true }); }
    if (p === '/api/alerts/keep') {
      ST.keepH = +b.hours || 0;
      var lab = (KEEP_OPT.filter(function (x) { return x[0] === ST.keepH; })[0] || [0, ST.keepH + '시간'])[1];
      return J({ ok: true, msg: '알림 기록 자동 삭제를 «' + lab + '» 로 바꿨습니다' });
    }
    if (p === '/api/alerts/clear') { var nn = alertsAll().length; ST.clearedAt = nowS(); return J({ ok: true, msg: '알림 기록 ' + nn + '건을 지웠습니다' }); }
    if ((m = /^\/api\/orders\/(\d+)$/.exec(p)) && method === 'DELETE') {
      o = orderById(m[1]); if (!o) return E('그 주문이 없습니다', 404);
      ST.orders = ST.orders.filter(function (x) { return x !== o; });
      return J({ ok: true, msg: '«' + o.name + '» 주문을 지웠습니다' });
    }
    if ((m = /^\/api\/orders\/(\d+)\/cap_pct$/.exec(p))) {
      o = orderById(m[1]); if (!o) return E('그 주문이 없습니다', 404);
      var v = Math.max(0, +b.value || 0), unit = b.unit === 'ticks' ? 'ticks' : 'pct';
      v = unit === 'ticks' ? Math.min(15, Math.round(v)) : Math.min(5, v);
      o.cap = capOf(o.trigger_price, unit, v, true);
      return J({ ok: true, value: v, unit: unit, cap: o.cap });
    }
    if (p === '/api/bot/edit_buy_amount') {
      o = orderById(b.order_id); if (!o) return E('그 주문이 없습니다', 404);
      var man = parseFloat(String(b.man).replace(/[^\d.]/g, ''));
      if (!(man > 0)) return E('금액을 숫자로 적어 주세요 (만원)');
      if (man * 10000 < o.trigger_price) return E('1주도 살 수 없는 금액입니다 (주문가 ' + won(o.trigger_price) + ')');
      setAmt(o, man * 10000);
      return J({ ok: true, msg: '«' + o.name + '» 매수금액을 ' + comma(man) + '만원으로 바꿨습니다 (' + o.quantity + '주 · ' + won(o.total_amount) + ')' });
    }
    if (p === '/api/bot/delete') {
      var k = b.kind, val = b.value, n0 = ST.orders.length;
      if (k === 'sellrule') {
        var r0 = ST.rules.length + ST.balRules.length;
        ST.rules = ST.rules.filter(function (r) { return r.rule_id !== val; });
        ST.balRules = ST.balRules.filter(function (r) { return r.rule_id !== val; });
        return J({ ok: true, msg: (r0 - ST.rules.length - ST.balRules.length) ? '매도 조건을 지웠습니다' : '그 조건이 없습니다' });
      }
      if (k === 'all') ST.orders = [];
      else if (k === 'code') ST.orders = ST.orders.filter(function (x) { return x.code !== val; });
      else if (k === 'theme') {
        var g = groupsOf(PC(), 1).filter(function (x) { return x.key === val; })[0], cs = g ? g.codes : [];
        ST.orders = ST.orders.filter(function (x) { return cs.indexOf(x.code) < 0; });
      }
      return J({ ok: true, msg: '대기 주문 ' + (n0 - ST.orders.length) + '건을 지웠습니다' });
    }
    if (p === '/api/orders/bulk_adjust') {
      var ids = (b.order_ids || []).map(String), mn = +b.min_amount || 0, upd = [], del = [], skip = [], td = [];
      ST.orders.filter(function (x) { return ids.indexOf(String(x.order_id)) >= 0; }).forEach(function (x) {
        var t = x.total_amount, nv;
        if (b.delta_pct != null) { var g2 = Math.round(t * (1 + b.delta_pct / 100) / 10000) * 10000; nv = b.delta_pct > 0 ? Math.max(g2, t) : Math.min(g2, t); }
        else nv = t + (+b.delta_won || 0);
        var down = nv < t;
        if (down && mn > 0 && t <= mn) { skip.push({ order_id: x.order_id, name: x.name, reason: '이미 기본 베팅액 이하라 줄이지 않았습니다' }); return; }
        if (down && mn > 0) nv = Math.max(nv, mn);
        if (nv < x.trigger_price) { td.push({ order_id: x.order_id, name: x.name }); if (!b.preview && b.delete_zero && (b.confirmed_delete_ids || []).map(String).indexOf(String(x.order_id)) >= 0) del.push(x.order_id); return; }
        if (!b.preview) { setAmt(x, nv); upd.push(x.order_id); }
      });
      if (b.preview) return J({ ok: true, to_delete: td, updated: [], skipped: skip });
      ST.orders = ST.orders.filter(function (x) { return del.indexOf(x.order_id) < 0; });
      return J({ ok: true, updated: upd, deleted: del, skipped: skip, capped: [] });
    }
    if ((m = /^\/api\/sell\/rules\/(\w+)$/.exec(p)) && method === 'PUT') {
      var hr = ST.rules.filter(function (r) { return r.rule_id === m[1]; })[0], br = ST.balRules.filter(function (r) { return r.rule_id === m[1]; })[0];
      if (br) {
        if (b.base_pct != null) { var bp = parseFloat(b.base_pct); if (!isFinite(bp) || (br.direction === 'down' ? bp >= 0 : bp <= 0)) return E('손절은 음수 · 익절은 양수여야 합니다'); br.base_pct = bp; }
        if (b.qty_pct != null) { var bq = parseFloat(b.qty_pct); if (!(bq > 0 && bq <= 100)) return E('수량은 1~100% 사이로 적어 주세요'); br.qty_pct = bq; }
        return J({ ok: true });
      }
      if (!hr) return E('그 조건이 없습니다', 404);
      if (b.target_price != null) { var tp = parseFloat(String(b.target_price).replace(/,/g, '')); if (!(tp > 0)) return E('목표가를 숫자로 적어 주세요'); hr.target_price = rt(tp); if (hr.origin === 'trail21') hr.origin = ''; }
      if (b.qty_pct != null) { var qp = parseFloat(b.qty_pct); if (!(qp > 0 && qp <= 100)) return E('수량은 1~100% 사이로 적어 주세요'); hr.qty_pct = qp; }
      if (b.ref_pct != null) {
        var h = holdOf(hr.code), base = b.ref_basis === 'avg' ? (h ? h.avg : S[hr.code].cur) : S[hr.code].cur;
        hr.target_price = rt(base * (1 + (+b.ref_pct) / 100)); if (hr.origin === 'trail21') hr.origin = '';
      }
      return J({ ok: true });
    }
    if (p === '/api/sell/rules' && method === 'POST') {
      var nb = { rule_id: nid('b'), direction: b.direction === 'up' ? 'up' : 'down', base_pct: +b.base_pct || 0, qty_pct: +b.qty_pct || 100 };
      ST.balRules.push(nb);
      return J({ ok: true, rule_id: nb.rule_id });
    }
    if (p === '/api/bot/breakeven') {
      var ac = b.action;
      if (ac === 'on' || ac === 'off') { ST.be.enabled = ac === 'on'; return J({ ok: true, msg: '본전 자동상향을 ' + (ST.be.enabled ? '켰습니다' : '껐습니다') }); }
      if (ac === 'pct' || ac === 'ticks') {
        var nv2 = parseFloat(b.value); if (!(nv2 > 0)) return E('0 보다 큰 숫자를 적어 주세요');
        ST.be[ac] = ac === 'ticks' ? Math.round(nv2) : nv2;
        return J({ ok: true, msg: ac === 'pct' ? '이익 ' + nv2 + '% 에서 본전으로 올립니다' : '본전 +' + ST.be.ticks + '틱 으로 겁니다' });
      }
      if (ac === 'raise') {
        var done = [];
        (b.codes || []).forEach(function (c) {
          var h2 = holdOf(c); if (!h2) return;
          var be = beOf(h2);
          ST.rules = ST.rules.filter(function (r) { return !(r.code === c && r.direction === 'down' && r.target_price <= be); });
          ST.rules.push({ rule_id: nid('h'), code: c, direction: 'down', target_price: be, qty_pct: 100, origin: 'breakeven' });
          addAlert('trade', '🛡 본전 상향', 'trade', nm(c), '🛡 ' + nm(c) + ' 본전 상향 — 손절 ' + won(be) + ' (매수가 +' + ST.be.ticks + '틱)');
          done.push(nm(c) + ' → ' + won(be));
        });
        return J({ ok: true, msg: done.length ? '🛡 본전으로 올렸습니다\n' + done.join('\n') : '올릴 종목이 없습니다' });
      }
      return E('모르는 동작입니다');
    }
    if (p === '/api/ma_switch_config') {
      if (b.enabled != null) ST.ma.enabled = !!b.enabled;
      [['pct21', 'l21', 'pct'], ['qty21', 'l21', 'qty'], ['pct50', 'l50', 'pct'], ['qty50', 'l50', 'qty']].forEach(function (x) { if (b[x[0]] != null) ST.ma[x[1]][x[2]] = +b[x[0]]; });
      return J({ ok: true, enabled: ST.ma.enabled, l21: ST.ma.l21, l50: ST.ma.l50 });
    }
    if (p === '/api/bvc_config') { ['enabled', 'ratio', 'sell'].forEach(function (k2) { if (b[k2] != null) ST.bvc[k2] = k2 === 'enabled' ? !!b[k2] : +b[k2]; }); return J({ ok: true, enabled: ST.bvc.enabled, ratio: ST.bvc.ratio, sell: ST.bvc.sell }); }
    if (p === '/api/distday_config') { if (b.mult != null) ST.dd.mult = Math.max(0, +b.mult); return J({ ok: true, mult: ST.dd.mult }); }
    if (p === '/api/interest_themes/theme_bookmark') {
      var lb = b.dim === 'upjong' ? '업종·' + b.name : b.name, at = ST.majorLabels.indexOf(lb);
      if (b.bookmarked && at < 0) ST.majorLabels.push(lb); else if (!b.bookmarked && at >= 0) ST.majorLabels.splice(at, 1);
      return J({ ok: true, bookmarked: !!b.bookmarked });
    }
    if (p === '/api/interest_themes/bookmark') {
      var ac2 = ST.majorCodes.indexOf(b.code);
      if (b.bookmarked && ac2 < 0) ST.majorCodes.push(b.code); else if (!b.bookmarked && ac2 >= 0) ST.majorCodes.splice(ac2, 1);
      return J({ ok: true, bookmarked: !!b.bookmarked });
    }
    if (p === '/api/sync_stock') return J({ ok: true });
    if (p === '/api/fix_notes' && method === 'POST') {
      var out = { ok: true };
      if (b.enabled != null) {
        ST.fix.enabled = !!b.enabled;
        if (ST.fix.enabled && ST.sched.armed) { ST.sched.armed = false; ST.sched.run_at = null; out.after_reset_note = '«주간 한도 리셋 뒤 자동 시작» 을 껐습니다'; }
        ST.fix.rev++;
      }
      if (b.text != null) {
        ST.fix.text = String(b.text); ST.fix.rev++; ST.fix.updated_at = iso(new Date()) + 'T' + nowHMS();
        if (!ST.fix.text.trim() && ST.fix.enabled) { ST.fix.enabled = false; out.auto_off = true; }
        out.updated_at = ST.fix.updated_at;
      }
      out.rev = ST.fix.rev;
      return J(out);
    }
    if (p === '/api/fix_notes/image') {
      var f = b && typeof b.get === 'function' ? b.get('file') : null;
      if (!f) return E('사진 파일이 없습니다');
      var id = 'p' + (++ST.seq), url = URL.createObjectURL(f);
      ST.fix.images.push({ id: id, url: url, exists: true });
      return J({ ok: true, id: id, url: url });
    }
    if (p === '/api/nightly_schedule' && method === 'POST') {
      if (!/^\d{1,2}:\d{2}$/.test(b.time || '')) return E('시각을 HH:MM 으로 주세요');
      var tp2 = b.time.split(':'); ST.sched.time = pad(+tp2[0]) + ':' + tp2[1];
      return J(schedResp());
    }
    if (p === '/api/fix_after_reset') {
      ST.sched.armed = !!b.on;
      if (ST.sched.armed) {
        var d = addDays(TODAY, 1); while (d.getDay() !== 1) d = addDays(d, 1);
        ST.sched.run_at = iso(d) + ' 09:05'; ST.fix.enabled = false;
      } else ST.sched.run_at = null;
      return J(schedResp());
    }
    /* 시가 매도 예약 */
    if (p === '/api/sell/open' && method === 'POST') {
      if (!holdOf(b.code)) return E('지금 잔고에 이 종목이 없습니다');
      if (ST.sellOpen.some(function (x) { return x.code === b.code; })) return E('그날 이 종목 시가 매도 예약이 이미 있습니다', 409);
      var it = { req_id: nid('so'), code: b.code, pct: b.amount_man ? 0 : (+b.pct || 100), amount: b.amount_man ? +b.amount_man * 10000 : null };
      ST.sellOpen.push(it);
      return J({ ok: true, run_date: iso(OPEN_RUN), item: { req_id: it.req_id, code: it.code, name: nm(it.code), pct: it.pct, amount: it.amount, run_date: iso(OPEN_RUN) } });
    }
    if ((m = /^\/api\/sell\/open\/(\w+)$/.exec(p)) && method === 'DELETE') {
      var n1 = ST.sellOpen.length; ST.sellOpen = ST.sellOpen.filter(function (x) { return x.req_id !== m[1]; });
      return n1 === ST.sellOpen.length ? E('그 예약이 없습니다', 404) : J({ ok: true });
    }
    /* 바로 매도 */
    if (p === '/api/bot/sell_now' && method === 'POST') {
      var hh = holdOf(b.code); if (!hh) return E('지금 잔고에 이 종목이 없습니다');
      var qq = b.qty ? Math.min(hh.qty, Math.floor(+b.qty)) : pctQty(hh.qty, +b.pct || 100);
      if (!(qq > 0)) return E('팔 주수가 0주입니다');
      var res = sellHolding(b.code, qq, b.pct && b.pct < 100 ? '보유의 ' + b.pct + '%' : (b.qty ? '금액 지정' : '전량'));
      var rid = nid('sn');
      ST.reqs[rid] = { n: 0, msg: '시장가 매도 체결 · ' + comma(res.qty) + '주 × ' + won(res.px) + ' · 손익 ' + (res.pnl >= 0 ? '+' : '−') + won(Math.abs(res.pnl)) };
      return J({ ok: true, req_id: rid });
    }
    /* 일괄 매도 */
    if (p === '/api/bot/sell_group' && method === 'POST') {
      var its = b.items || [], pct = +b.pct || 100;
      if (b.mode === 'open') {
        var results = its.map(function (x) {
          if (ST.sellOpen.some(function (y) { return y.code === x.code; })) return { code: x.code, name: x.name, ok: false, message: '그날 예약이 이미 있습니다' };
          ST.sellOpen.push({ req_id: nid('so'), code: x.code, pct: pct, amount: null });
          return { code: x.code, name: x.name, ok: true, message: (pct >= 100 ? '전량' : pct + '%') + ' · ' + soDayTxt(OPEN_RUN) + ' 09:00 시가' };
        });
        return J({ ok: true, results: results, n_ok: results.filter(function (r) { return r.ok; }).length, run_date: iso(OPEN_RUN), pct: pct, buys: { deleted: 0 } });
      }
      var bid = nid('gs'), rows = its.map(function (x) {
        var r = sellHolding(x.code, +x.qty || 0, '일괄 매도');
        return r ? { code: x.code, name: x.name, snap_qty: r.qty, qty: r.qty, status: 'done', message: '' } : { code: x.code, name: x.name, snap_qty: 0, status: 'failed', message: '잔고에 없습니다' };
      });
      var delN = 0;
      if (pct >= 100 && Array.isArray(b.buy_ids)) { var bi = b.buy_ids.map(String), n2 = ST.orders.length; ST.orders = ST.orders.filter(function (x) { return bi.indexOf(String(x.order_id)) < 0; }); delN = n2 - ST.orders.length; }
      ST.batches[bid] = { rows: rows, pct: pct, deleted: delN, n: 0 };
      return J({ ok: true, batch_id: bid, pct: pct });
    }
    return null;
  }
  function soDayTxt(d) { return (d.getMonth() + 1) + '/' + pad(d.getDate()) + '(' + wdK(d) + ')'; }

  /* ═════════ 보는 요청 ═════════ */
  function J(o, st) { return { status: st || 200, body: o }; }
  var SILENT = 'silent';
  function routeGet(p, q) {
    var m;
    if (p === '/api/page_version') return SILENT;
    if (/^\/usage(\/|$)/.test(p)) return SILENT;
    if (p === '/api/bot/sell_now/preview') {
      var h = holdOf(q.get('code'));
      if (!h) return J({ ok: false, error: '지금 잔고에 이 종목이 없습니다' });
      var pc = +(q.get('pct') || 0), out = { ok: true, code: h.code, name: nm(h.code), open: true, total_qty: h.qty, pct_free: true, qty_ok: true, price: S[h.code].cur };
      if (pc) out.custom_pct = { pct: pc, qty: pctQty(h.qty, pc) };
      return J(out);
    }
    if ((m = /^\/api\/bot\/sell_now\/(\w+)$/.exec(p))) {
      var rq = ST.reqs[m[1]]; if (!rq) return J({ ok: false, status: 'unknown', message: '요청을 찾지 못했습니다' });
      rq.n++;
      return J(rq.n < 2 ? { ok: true, status: 'pending' } : { ok: true, status: 'done', message: rq.msg });
    }
    if (p === '/api/bot/sell_group/preview') return J(gsPreview(q.get('key') || '', +(q.get('pct') || 100), !!q.get('pick')));
    if ((m = /^\/api\/bot\/sell_group\/(\w+)$/.exec(p))) {
      var bt = ST.batches[m[1]]; if (!bt) return J({ ok: false, error: '없는 묶음' });
      bt.n++;
      var fin = bt.n >= 2, rows = bt.rows.map(function (r) { return fin ? r : { code: r.code, name: r.name, snap_qty: r.snap_qty, status: 'pending' }; });
      var dn = rows.filter(function (r) { return r.status === 'done'; }).length, fl = rows.filter(function (r) { return r.status === 'failed'; }).length;
      return J({ ok: true, status: fin ? 'done' : 'running', items: rows, pct: bt.pct, counts: { done: dn, failed: fl, unknown: 0, left: rows.length - dn - fl },
        buys: { deleted: bt.deleted, failed: [] } });
    }
    if (p === '/api/orders') return J({ orders: ST.orders });
    if (p === '/api/market_day') return J({ ok: true, switch_mode: ST.switchOn ? 'on' : 'off', day: iso(TODAY), is_trading_day: isTrade(TODAY) });
    if (p === '/api/bot/orders_live') return J(ordersLive());
    if (p === '/api/bot/menu') return J({ items: [{ key: 'orders', label: '📋 전체 주문', group: 'order' }, { key: 'sell', label: '📕 매도 목록', group: 'order' }] });
    if (p === '/api/bot/theme_tags') return J(themeTags());
    if (p === '/api/bio_exposure') return J(bioResp());
    if (p === '/api/bot/day_chg') return J(dayChg(!!q.get('pending')));
    if (p === '/api/balance') return J(balanceResp());
    if (p === '/api/bot/risk') return J(riskResp());
    if (p === '/api/bot/realized_today') return J(realizedResp());
    if (p === '/api/sell/open') return J({ ok: true, run_date: iso(OPEN_RUN), items: ST.sellOpen.filter(function (x) { return holdOf(x.code); }).map(function (x) {
      return { req_id: x.req_id, code: x.code, name: nm(x.code), pct: x.pct, amount: x.amount, run_date: iso(OPEN_RUN) }; }) });
    if (p === '/api/sell/rules') {
      var kind = q.get('kind');
      return J({ ok: true, rules: kind === 'balance' ? ST.balRules.map(balView) : rules() });
    }
    if (p === '/api/bot/edit_targets') return J(editTargets());
    if (p === '/api/breakeven_candidates') return J(beCands());
    if (p === '/api/bot/breakeven_candidates') {
      var el = beCands().items.filter(function (x) { return x.eligible; });
      return J({ codes: el.map(function (x) { return x.code; }),
        text: el.length ? '🛡 본전 상향 가능 ' + el.length + '종목\n' + el.map(function (x) { return x.name + ' — 손절 → ' + won(x.breakeven) + ' (매수가 +' + ST.be.ticks + '틱)'; }).join('\n') : '지금 올릴 종목이 없습니다' });
    }
    if (p === '/api/ma_switch_config') return J({ ok: true, enabled: ST.ma.enabled, l21: ST.ma.l21, l50: ST.ma.l50 });
    if (p === '/api/bvc_config') return J({ ok: true, enabled: ST.bvc.enabled, ratio: ST.bvc.ratio, sell: ST.bvc.sell });
    if (p === '/api/distday_config') return J({ ok: true, mult: ST.dd.mult });
    if (p === '/api/bot/estop_state') return J({ ok: true, stopped: ST.stopped });
    if (p === '/api/alerts') {
      var all = alertsAll(), lim = +(q.get('limit') || 200);
      var kl = (KEEP_OPT.filter(function (x) { return x[0] === ST.keepH; })[0] || [0, ST.keepH + '시간'])[1];
      return J({ alerts: all.slice(0, lim), keep: { hours: ST.keepH, label: kl, options: KEEP_OPT }, vib: { on: ST.vib, app_code: 18 }, groups: GROUPS_DEF,
        note: all.length ? undefined : '아직 알림이 없습니다' });
    }
    if (p === '/api/alerts/count') {
      var since = +(q.get('since') || 0), al = alertsAll();
      return J({ n: since ? al.filter(function (a) { return a.ts > since; }).length : 0, newest: al.length ? al[0].ts : 0 });
    }
    if ((m = /^\/api\/bot\/text\/(\w+)$/.exec(p))) {
      if (m[1] === 'orders') return J({ label: '📋 전체 주문', text: ordersText() });
      if (m[1] === 'status') {
        var off = pcOff();
        return J({ label: '🟢 봇 상태', text: (off ? '🔴' : '🟢') + ' 📊 분석 서버(main.py): ' + (off ? '꺼짐' : '가동') + '\n' + (ST.stopped || off ? '🔴' : '🟢') + ' ⚙ 예약 매수 워커: ' + (ST.stopped || off ? '꺼짐' : '가동') + '\n' + (off ? '🔴' : '🟢') + ' 📈 주식봇 (텔레그램): ' + (off ? '꺼짐' : '가동') });
      }
      return J({ label: m[1], text: '(체험판에는 이 글이 없습니다)' });
    }
    if (p === '/api/bot/dots') { var po = pcOff(); return J({ pc: !po, worker: (ST.stopped || po) ? 'off' : 'on', switch: ST.switchOn ? 'on' : 'off', stopped: ST.stopped }); }
    if (p === '/app/version') return J({ code: 22, name: '1.22', full: '1.22.1', screen: 1 });
    if (p === '/api/bot/market_overview') return J(overview());
    if (p === '/api/bot/market_group') return J(marketGroup(q.get('dim') || 'theme', q.get('name') || ''));
    if (p === '/api/bot/market_groups_all') return J(marketGroupsAll());
    if (p === '/api/bot/stock_groups') return J(stockGroups(q.get('code')));
    if (p === '/api/bot/today_trades') return J(todayResp());
    if (p === '/api/bot/major_stocks') return J(majorResp());
    if (p === '/api/bot/holidays') return J(holidaysResp());
    if (p === '/api/fix_notes') return J(fixResp());
    if (p === '/api/nightly_schedule') return J(schedResp());
    if (p === '/api/bot/patch_notes') return J(patchResp());
    if ((m = /^\/api\/ohlc\/(\w+)$/.exec(p))) return J(ohlcResp(m[1], q.get('period')));
    if ((m = /^\/api\/index_ohlc\/(\w+)$/.exec(p))) return J(indexResp(m[1], q.get('period')));
    if (p === '/api/live/watch') return J({ session: false, conn: '', err: '', loading: false, stale: false, live: null });
    if (p === '/api/buy_cap') return J({ ok: true, max: 5, ticks_max: 15 });
    if (p === '/api/default_bet') return J({ ok: true, value: 2000000 });
    return null;
  }
  function pcOff() { return ST.pcOffAt && Date.now() >= ST.pcOffAt && Date.now() < ST.pcOffAt + 60000; }

  function route(method, url, body) {
    var s = String(url || '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) || /^\/\//.test(s)) {
      var same = false;
      try { var U = new URL(s, location.href); same = (U.origin !== 'null' && U.origin === location.origin); if (same) s = U.pathname + U.search; } catch (e) {}
      if (!same) return { kind: 'external' };
    }
    if (s.charAt(0) !== '/') return { kind: 'local' };
    var qi = s.indexOf('?'), path = qi >= 0 ? s.slice(0, qi) : s, q = new URLSearchParams(qi >= 0 ? s.slice(qi + 1) : '');
    method = String(method || 'GET').toUpperCase();
    var r;
    if (method !== 'GET' && method !== 'HEAD') {
      if (/^\/usage(\/|$)/.test(path)) return { kind: 'silent' };
      var b = body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
      try { r = routeWrite(method, path, q, b); } catch (e) { r = E('체험판 처리 중 오류: ' + e.message, 500); }
      return r ? { kind: 'write', res: r } : { kind: 'unknownWrite' };
    }
    r = routeGet(path, q);
    if (r === SILENT) return { kind: 'silent' };
    if (!r) return { kind: 'unknown' };
    return { kind: 'data', res: r };
  }

  /* ───────── 토스트 · 체험판 표시 ───────── */
  var TOAST_T = 0;
  function demoToast(msg) {
    try {
      var t = document.getElementById('demo-toast');
      if (!t) { t = document.createElement('div'); t.id = 'demo-toast'; (document.body || document.documentElement).appendChild(t); }
      t.textContent = msg; t.className = 'on';
      clearTimeout(TOAST_T); TOAST_T = setTimeout(function () { t.className = ''; }, 2600);
    } catch (e) {}
  }
  function addStyle() {
    var st = document.createElement('style');
    st.textContent =
      '#demo-badge{position:fixed;top:calc(6px + env(safe-area-inset-top));right:44px;z-index:9998;pointer-events:none;' +
      'font:600 9.5px/12px -apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;color:#fff;background:rgba(17,24,39,.55);' +
      'border-radius:7px;padding:0 6px;letter-spacing:-.2px;white-space:nowrap}' +
      'body.chfull #demo-badge{top:calc(57px + env(safe-area-inset-top))}' +
      '#demo-toast{position:fixed;left:50%;bottom:84px;transform:translate(-50%,8px);z-index:10000;pointer-events:none;' +
      'width:max-content;max-width:calc(100vw - 32px);box-sizing:border-box;' +
      'background:#111827;color:#fff;font:600 13px/1.45 -apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;text-align:center;' +
      'padding:10px 15px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.25);opacity:0;transition:opacity .18s,transform .18s}' +
      '#demo-toast.on{opacity:1;transform:translate(-50%,0)}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* ───────── fetch · XHR · 그 밖 가로채기 ───────── */
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  function jsonResponse(status, obj) {
    return new Response(JSON.stringify(obj), { status: status, statusText: status === 200 ? 'OK' : 'Demo', headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
  function handle(method, url, body) {
    var r = route(method, url, body), e = { m: String(method || 'GET').toUpperCase(), u: String(url), t: Date.now() };
    if (r.kind === 'data') { LOG.served.push(e); return { status: r.res.status, body: r.res.body }; }
    if (r.kind === 'write') { e.st = r.res.status; LOG.writes.push(e); return { status: r.res.status, body: r.res.body }; }
    if (r.kind === 'silent') { LOG.silent.push(e); return { status: 200, body: {} }; }
    if (r.kind === 'unknownWrite') { LOG.unknown.push(e); demoToast('체험판에서 흉내 내지 않는 동작입니다'); return { status: 404, body: { ok: false, error: '체험판에서 흉내 내지 않는 동작입니다' } }; }
    if (r.kind === 'unknown') { LOG.unknown.push(e); return { status: 404, body: { ok: false, error: '체험판에 없는 자료입니다' } }; }
    if (r.kind === 'external') { LOG.external.push(e); return { error: true }; }
    return { local: true };
  }
  window.fetch = function (input, init) {
    init = init || {};
    var url = (typeof input === 'string') ? input : (input && input.url) || String(input);
    var method = init.method || (input && typeof input === 'object' && input.method) || 'GET';
    var signal = init.signal;
    return new Promise(function (res, rej) {
      setTimeout(function () {
        if (signal && signal.aborted) { rej(new DOMException('The user aborted a request.', 'AbortError')); return; }
        var h = handle(method, url, init.body);
        if (h.local) { (realFetch ? realFetch(input, init) : Promise.reject(new TypeError('Failed to fetch'))).then(res, rej); return; }
        if (h.error) { rej(new TypeError('Failed to fetch')); return; }
        res(jsonResponse(h.status, h.body));
      }, 25);
    });
  };
  function FakeXHR() { this.readyState = 0; this.status = 0; this.responseText = ''; this.response = ''; this._ls = {}; }
  FakeXHR.prototype.open = function (m, u) { this._m = m; this._u = u; this.readyState = 1; };
  FakeXHR.prototype.setRequestHeader = function () {};
  FakeXHR.prototype.getResponseHeader = function (k) { return /content-type/i.test(k) ? 'application/json' : null; };
  FakeXHR.prototype.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
  FakeXHR.prototype.addEventListener = function (ev, fn) { (this._ls[ev] = this._ls[ev] || []).push(fn); };
  FakeXHR.prototype.removeEventListener = function () {};
  FakeXHR.prototype.abort = function () { this._ab = true; };
  FakeXHR.prototype._fire = function (ev) {
    var f = this['on' + ev]; if (typeof f === 'function') try { f.call(this, { type: ev, target: this }); } catch (e) {}
    (this._ls[ev] || []).forEach(function (fn) { try { fn.call(this, { type: ev, target: this }); } catch (e) {} }, this);
  };
  FakeXHR.prototype.send = function (body) {
    var self = this;
    setTimeout(function () {
      if (self._ab) return;
      var h = handle(self._m, self._u, body);
      if (h.error || h.local) { self.readyState = 4; self._fire('readystatechange'); self._fire('error'); return; }
      self.status = h.status; self.responseText = self.response = JSON.stringify(h.body); self.readyState = 4;
      self._fire('readystatechange'); self._fire('load'); self._fire('loadend');
    }, 25);
  };
  window.XMLHttpRequest = FakeXHR;
  function NoConn(kind) {
    return function (u) {
      LOG.external.push({ m: kind, u: String(u), t: Date.now() });
      var self = this; this.readyState = 3; this.url = String(u);
      this.close = function () {}; this.send = function () {}; this.addEventListener = function () {}; this.removeEventListener = function () {};
      setTimeout(function () { if (typeof self.onerror === 'function') try { self.onerror({ type: 'error' }); } catch (e) {} }, 30);
    };
  }
  window.EventSource = NoConn('EventSource');
  window.WebSocket = NoConn('WebSocket');
  try { navigator.sendBeacon = function (u) { LOG.silent.push({ m: 'BEACON', u: String(u), t: Date.now() }); return true; }; } catch (e) {}

  /* ───────── 폰 앱처럼 — 앱 이름표 · 앱 통로(가짜) ───────── */
  try {
    var UA = navigator.userAgent + ' StockApp/1.22 code/22';
    Object.defineProperty(navigator, 'userAgent', { get: function () { return UA; }, configurable: true });
  } catch (e) {}
  window.StockApp = { checkUpdate: function () { setTimeout(function () { demoToast('✓ 최신 판입니다 — 앱 v1.22.1'); }, 600); } };

  document.addEventListener('DOMContentLoaded', function () {
    addStyle();
    var bd = document.createElement('div');
    bd.id = 'demo-badge'; bd.textContent = '체험판 · 가상 데이터';
    document.body.appendChild(bd);
    var origSay = window.say;
    if (typeof origSay === 'function') {
      window.say = function (msg) {
        if (/^컴퓨터에 물어보는 중입니다/.test(String(msg))) return;     /* 앱 새 판 확인 — 가짜 통로가 «최신 판» 토스트로 답한다 */
        return origSay.apply(this, arguments);
      };
    }
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('button') : null;
      if (t && /앱으로 깔기/.test(t.textContent || '')) { e.preventDefault(); e.stopImmediatePropagation(); demoToast('체험판에서는 앱을 설치하지 않습니다'); }
    }, true);
  });
})();
