(function() {
  'use strict';
  function say(m) {
    try {
      if (typeof window.toast === 'function') window.toast(m);
    } catch (e) {}
  }
  var pad = function(n) {
    return (n < 10 ? '0' : '') + n;
  };
  var ymd = function(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };
  function plus(s, n) {
    var p = s.split('-');
    return ymd(new Date(+p[0], +p[1] - 1, +p[2] + n));
  }
  function today(n) {
    var d = new Date;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (n || 0));
    return ymd(d);
  }
  window.fetch = function() {
    return Promise.reject(new TypeError('체험판: 네트워크 요청은 막혀 있습니다'));
  };
  function NoXHR() {
    this.readyState = 0;
    this.status = 0;
    this.responseText = '';
  }
  NoXHR.prototype.open = function() {
    this.readyState = 1;
  };
  NoXHR.prototype.setRequestHeader = NoXHR.prototype.abort = NoXHR.prototype.overrideMimeType = function() {};
  NoXHR.prototype.send = function() {
    var x = this;
    x.readyState = 4;
    setTimeout((function() {
      if (x.onerror) x.onerror();
      if (x.onloadend) x.onloadend();
    }), 0);
  };
  window.XMLHttpRequest = NoXHR;
  window.WebSocket = window.EventSource = function() {
    throw new Error('체험판: 네트워크 요청은 막혀 있습니다');
  };
  try {
    navigator.sendBeacon = function() {
      return false;
    };
  } catch (e) {}
  window.open = function() {
    return null;
  };
  function esc(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function d8(s) {
    return s.replace(/-/g, '');
  }
  function t6(hm) {
    return hm.replace(':', '') + '00';
  }
  function ics(list) {
    var L = [ 'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jobcal demo//KO' ];
    list.forEach((function(e) {
      L.push('BEGIN:VEVENT', 'UID:' + e.id, 'SUMMARY:' + esc(e.title));
      if (e.memo) L.push('DESCRIPTION:' + esc(e.memo));
      if (e.loc) L.push('LOCATION:' + esc(e.loc));
      if (e.allDay) {
        L.push('DTSTART;VALUE=DATE:' + d8(e.start), 'DTEND;VALUE=DATE:' + d8(plus(e.end || e.start, 1)));
      } else {
        L.push('DTSTART:' + d8(e.start) + 'T' + t6(e.startTime));
        if (e.endTime) L.push('DTEND:' + d8(e.end || e.start) + 'T' + t6(e.endTime));
      }
      if (e.repeat === 'weekly') L.push('RRULE:FREQ=WEEKLY');
      L.push('END:VEVENT');
    }));
    L.push('END:VCALENDAR');
    return L.join('\r\n');
  }
  var DB0 = window.DEMO_DB || {
    subs: []
  };
  function jobIcs() {
    return ics(DB0.subs[0] && DB0.subs[0].events || []);
  }
  function scrapIcs() {
    var s = (DB0.subs || []).filter((function(x) {
      return x.id === 'sscrap';
    }))[0];
    return ics(s && s.events || []);
  }
  function holidayIcs() {
    return ics((window.DEMO_HOLIDAYS || []).map((function(h, i) {
      return {
        id: 'hol' + i + '@demo',
        title: h.name,
        memo: '공휴일',
        allDay: true,
        start: h.date,
        end: h.date
      };
    })));
  }
  function otherIcs(url) {
    var k = String(url).length;
    return ics([ {
      id: 's1-' + k + '@demo',
      title: '취업 스터디',
      memo: '스터디룸 B · 모의 면접 연습',
      allDay: false,
      start: today(2),
      startTime: '19:00',
      endTime: '21:00',
      repeat: 'weekly'
    }, {
      id: 's2-' + k + '@demo',
      title: '자격증 원서 접수 마감',
      memo: '접수 사이트에서 사진 올리기',
      allDay: true,
      start: today(9)
    }, {
      id: 's3-' + k + '@demo',
      title: '직무 특강',
      memo: '온라인 · 사무직 업무 소개',
      allDay: false,
      start: today(16),
      startTime: '15:00',
      endTime: '16:30'
    } ]);
  }
  var banner = null, bannerT = 0, pendingOpen = '', triggers = [], shown = {};
  function notify(title, body, open) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'demoNotif';
      banner.innerHTML = '<div class="dn-app"><span class="dn-ic"></span>취업캘린더 · 지금</div><div class="dn-t"></div><div class="dn-b"></div>';
      document.body.appendChild(banner);
    }
    banner.querySelector('.dn-t').textContent = title;
    banner.querySelector('.dn-b').textContent = body;
    banner.onclick = function() {
      banner.classList.remove('on');
      if (open) {
        pendingOpen = open;
        try {
          window.checkOpen();
        } catch (e) {}
      }
    };
    banner.getBoundingClientRect();
    banner.classList.add('on');
    clearTimeout(bannerT);
    bannerT = setTimeout((function() {
      banner.classList.remove('on');
    }), 6e3);
  }
  setInterval((function() {
    var now = Date.now();
    triggers.forEach((function(x) {
      var k = x.t + '|' + x.title;
      if (x.t <= now && now - x.t < 6e4 && !shown[k]) {
        shown[k] = 1;
        notify(x.title, x.short || x.body || '', x.open);
      }
    }));
  }), 5e3);
  function copy(t) {
    var ok = false;
    try {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.focus({
        preventScroll: true
      });
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) {}
    if (!ok) {
      try {
        navigator.clipboard.writeText(t).catch((function() {}));
      } catch (e) {}
    }
  }
  function download(name, text) {
    try {
      var u = URL.createObjectURL(new Blob([ text ], {
        type: 'application/json'
      }));
      var a = document.createElement('a');
      a.href = u;
      a.download = name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout((function() {
        URL.revokeObjectURL(u);
      }), 4e3);
      return true;
    } catch (e) {
      return false;
    }
  }
  function openPortfolio(url) {
    var co = '';
    try {
      co = new URL(url).searchParams.get('co') || '';
    } catch (e) {}
    var v = document.createElement('div');
    v.id = 'demoViewer';
    v.innerHTML = '<div class="dv-h"><span>포트폴리오 · 예시</span><button class="icon" aria-label="닫기">' + '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' + '<iframe title="예시 포트폴리오"></iframe>';
    v.querySelector('iframe').src = 'portfolio.html' + (co ? '?co=' + encodeURIComponent(co) : '');
    v.querySelector('button').onclick = function() {
      v.parentNode.removeChild(v);
    };
    document.body.appendChild(v);
  }
  function openPosting(url) {
    var co = '', t = '';
    try {
      var u = new URL(url);
      co = u.searchParams.get('co') || '';
      t = u.searchParams.get('t') || '';
    } catch (e) {}
    var v = document.createElement('div');
    v.id = 'demoViewer';
    v.innerHTML = '<div class="dv-h"><span>채용 공고 · 예시</span><button class="icon" aria-label="닫기">' + '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' + '<div class="dv-post"><span class="dp-tag">예시 공고</span><div class="dp-co"></div><h3></h3>' + '<p>체험판이라 실제 채용 사이트로 나가지 않아요. 실제 앱에서는 [공고 열기] 를 누르면 폰의 브라우저로 이 공고 페이지가 열려요.</p>' + '<p class="dp-sm">스크랩은 PC 크롬 확장 «구직 도우미» 의 «📅 캘린더에 담기» 로 구글 «스크랩 공고» 캘린더에 담기고, 앱은 그 캘린더를 구독해 «📌 스크랩 공고» 탭에 모아요.</p></div>';
    v.querySelector('.dp-co').textContent = co || '가상 회사';
    v.querySelector('h3').textContent = t || '공고 제목';
    v.querySelector('button').onclick = function() {
      v.parentNode.removeChild(v);
    };
    document.body.appendChild(v);
  }
  var START = JSON.stringify(DB0);
  window.App = {
    load: function() {
      return START;
    },
    save: function() {},
    setAlarms: function(json) {
      try {
        triggers = JSON.parse(json) || [];
      } catch (e) {
        triggers = [];
      }
    },
    readAsset: function(name) {
      return name === 'holidays.json' ? JSON.stringify(window.DEMO_HOLIDAYS || []) : '';
    },
    testAlarm: function() {
      setTimeout((function() {
        notify('알림 시험', '이게 보이면 일정 알림도 이렇게 와요');
      }), 5e3);
    },
    checkUpdate: function() {
      setTimeout((function() {
        say('이미 가장 새 판입니다');
      }), 800);
    },
    isSystemDark: function() {
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch (e) {
        return false;
      }
    },
    takeOpen: function() {
      var v = pendingOpen;
      pendingOpen = '';
      return v;
    },
    setBars: function() {},
    requestNotif: function() {
      say('체험판에서는 폰 설정 화면을 열 수 없어요');
    },
    openExactAlarmSettings: function() {
      say('체험판에서는 폰 설정 화면을 열 수 없어요');
    },
    info: function() {
      var next = '';
      try {
        var T = window.buildTriggers();
        if (T.length) {
          var d = new Date(T[0].t);
          next = d.getMonth() + 1 + '월 ' + d.getDate() + '일 (' + '일월화수목금토'.charAt(d.getDay()) + ') ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }
      } catch (e) {}
      return JSON.stringify({
        notif: true,
        exact: true,
        next: next,
        version: '1.20 체험판'
      });
    },
    share: function(text) {
      say(download('취업캘린더_백업.json', text) ? '백업 파일을 내려받았어요 · 취업캘린더_백업.json' : '내려받지 못했어요');
    },
    copy: function(t) {
      copy(String(t || ''));
    },
    openUrl: function(url) {
      if (/\/job-demo\b/.test(String(url || ''))) openPosting(url); else openPortfolio(url);
    },
    fetch: function(url, cb) {
      var text = !url || /holiday/.test(url) ? holidayIcs() : url === window.DEMO_JOB_URL ? jobIcs() : url === window.DEMO_SCRAP_URL ? scrapIcs() : otherIcs(url);
      setTimeout((function() {
        if (typeof window[cb] === 'function') window[cb](true, text);
      }), 500);
    }
  };
  function backupText() {
    var b = JSON.parse(START);
    var d = today(3);
    var ev = (b.events || []).concat([ {
      id: 'demo-backup-1',
      title: '면접 복장 점검',
      start: d,
      end: d,
      allDay: false,
      startTime: '20:00',
      endTime: '20:30',
      color: 'green',
      heart: false,
      repeat: 'none',
      alarm: true,
      memo: '백업 파일에서 가져온 일정(가상)',
      src: ''
    } ]);
    return JSON.stringify({
      events: ev,
      settings: b.settings,
      subs: (b.subs || []).map((function(x) {
        return {
          name: x.name,
          url: x.url,
          color: x.color
        };
      }))
    }, null, 1);
  }
  function fillSettings() {
    var n = document.getElementById('subName'), u = document.getElementById('subUrl'), t = document.getElementById('impTxt');
    if (n && !n.value) n.value = '스터디 일정';
    if (u && !u.value) u.value = 'https://example.com/study-demo.ics';
    if (t && !t.value) t.value = backupText();
  }
  document.addEventListener('DOMContentLoaded', (function() {
    var css = document.createElement('style');
    css.textContent = '#demoBadge{align-self:center;flex:none;margin-left:2px;pointer-events:none;white-space:nowrap;' + 'height:20px;line-height:20px;padding:0 9px;border-radius:10px;font-size:11px;font-weight:700;letter-spacing:-.2px;' + 'background:var(--soft2);color:var(--ink2)}' + '#toast{z-index:1000}' + '.sh-body{scrollbar-width:thin;scrollbar-color:var(--grab) transparent}' + '#demoNotif{position:fixed;left:10px;right:10px;top:10px;z-index:1100;background:var(--card);color:var(--ink);' + 'border-radius:18px;padding:12px 16px 14px;box-shadow:0 8px 28px rgba(0,0,0,.18);cursor:pointer;' + 'transform:translateY(-130%);transition:transform .28s cubic-bezier(.2,.8,.2,1)}' + '#demoNotif.on{transform:none}' + '#demoNotif .dn-app{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink3);font-weight:600}' + '#demoNotif .dn-ic{width:14px;height:14px;border-radius:4px;background:#8e24aa}' + '#demoNotif .dn-t{margin-top:6px;font-size:15px;font-weight:800}' + '#demoNotif .dn-b{margin-top:2px;font-size:13.5px;color:var(--ink2);white-space:pre-line}' + '#demoViewer{position:fixed;inset:0;z-index:900;background:var(--bg);display:flex;flex-direction:column}' + '#demoViewer .dv-h{height:52px;flex:none;display:flex;align-items:center;justify-content:space-between;' + 'padding:0 8px 0 18px;font-size:16px;font-weight:800;border-bottom:1px solid var(--line)}' + '#demoViewer iframe{flex:1;width:100%;border:0;background:#fff}' + '#demoViewer .dv-post{flex:1;overflow-y:auto;padding:22px 20px}' + '#demoViewer .dp-tag{display:inline-block;font-size:11.5px;font-weight:800;color:var(--hol-ink);background:var(--hol-bg);border-radius:8px;padding:3px 9px}' + '#demoViewer .dp-co{margin-top:14px;font-size:14px;font-weight:700;color:var(--ink2)}' + '#demoViewer h3{margin:4px 0 14px;font-size:20px;line-height:1.4;letter-spacing:-.4px}' + '#demoViewer .dv-post p{font-size:14px;line-height:1.7;color:var(--ink2);margin:0 0 10px}' + '#demoViewer .dv-post p.dp-sm{font-size:12.5px;color:var(--ink3)}';
    document.head.appendChild(css);
    var b = document.createElement('div');
    b.id = 'demoBadge';
    b.textContent = '체험판 · 가상 데이터';
    var yr = document.getElementById('yearTitle');
    if (yr && yr.parentNode) yr.parentNode.insertBefore(b, yr.nextSibling); else document.body.appendChild(b);
    var set = document.getElementById('shSet');
    if (set && window.MutationObserver) new MutationObserver(fillSettings).observe(set, {
      childList: true
    });
    var w = document.getElementById('gridWrap'), sx = 0, sy = 0, t0 = 0, on = false;
    if (!w) return;
    w.addEventListener('mousedown', (function(e) {
      if (e.button !== 0) return;
      sx = e.clientX;
      sy = e.clientY;
      t0 = Date.now();
      on = true;
    }));
    window.addEventListener('mouseup', (function(e) {
      if (!on) return;
      on = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - t0 < 1200) {
        window.swiped = Date.now();
        window.go(dx < 0 ? 1 : -1);
      }
    }));
  }));
  window.addEventListener('message', (function(e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || typeof d.demoCal !== 'number') return;
    if (d.demoCal === 0) {
      var t = document.getElementById('todayBtn');
      if (t && t.style.display !== 'none') t.click();
    } else if (typeof window.go === 'function') window.go(d.demoCal > 0 ? 1 : -1);
  }));
})();
