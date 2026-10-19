(function() {
  'use strict';
  var pad = function(n) {
    return (n < 10 ? '0' : '') + n;
  };
  var ymd = function(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };
  var T0 = new Date;
  T0.setHours(0, 0, 0, 0);
  function day(n, wk) {
    var d = new Date(T0);
    d.setDate(d.getDate() + n);
    if (wk) {
      var w = d.getDay();
      if (w === 0 || w === 6) d.setDate(d.getDate() + (n >= 0 ? w === 6 ? 2 : 1 : w === 6 ? -1 : -2));
    }
    return ymd(d);
  }
  function plus(s, n) {
    var p = s.split('-');
    return ymd(new Date(+p[0], +p[1] - 1, +p[2] + n));
  }
  function monthOf(n) {
    var d = new Date(T0);
    d.setDate(d.getDate() + n);
    return d.getMonth() + 1;
  }
  function at(s, hm) {
    var p = s.split('-'), t = hm.split(':');
    return new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1]).getTime();
  }
  var SUB = [], results = {}, rejected = {}, seq = 0;
  window.DEMO_JOB_URL = 'https://example.com/jobcal-demo.ics';
  var key = function(e) {
    return 's:sjob:' + e.id;
  };
  function job(co, role, title, start, o) {
    o = o || {};
    var e = {
      id: 'demo' + ++seq + '@jobcal.demo',
      title: '[' + co + '] ' + title,
      start: start,
      end: o.end || start,
      allDay: !o.time,
      startTime: o.time || '',
      endTime: o.endTime || '',
      repeat: 'none',
      alarm: true,
      heart: false,
      memo: o.memo + '\n직무: ' + role
    };
    SUB.push(e);
    return e;
  }
  function applied(co, role, start, head, qs) {
    var memo = head.map((function(l) {
      return l === PF ? PF + '?co=' + encodeURIComponent(co) : l;
    })).join('\n');
    if (qs && qs.length) memo += '\n━━━━━━ 제출 자소서 ━━━━━━\n' + qs.map((function(q) {
      return '======\n' + q[0] + '\n   — ' + q[1].length + '자 / ' + q[2] + '자 이내\n======\n' + q[1];
    })).join('\n\n');
    var e = {
      id: 'demo' + ++seq + '@jobcal.demo',
      title: '[' + co + '] ⓪ 지원 · ' + role,
      start: start,
      end: start,
      allDay: true,
      startTime: '',
      endTime: '',
      repeat: 'none',
      alarm: true,
      heart: false,
      memo: memo
    };
    SUB.push(e);
    return e;
  }
  function reject(co, ev) {
    results[key(ev)] = 'fail';
    rejected[co] = {
      at: at(ev.start, '19:20'),
      title: ev.title,
      keys: SUB.filter((function(e) {
        return e.title.indexOf('[' + co + ']') === 0;
      })).map(key)
    };
  }
  var PF = '포폴: https://example.com/portfolio.pdf';
  var c, r, e;
  c = '한결물류';
  r = '물류운영 사무';
  applied(c, r, day(-20), [ '다음: 1차 면접', '전형: 서류 → 1차 면접 → 2차 면접 → 최종', PF ], [ [ '1. 지원 동기', '물건이 들어오고 나가는 흐름을 숫자로 정리하는 일에 끌려 지원했습니다. 현장과 사무실 사이에서 정확한 서류로 일의 속도를 받쳐 주겠습니다.', 500 ], [ '2. 입사 후 포부', '첫해에는 입출고 서류의 흐름을 빠짐없이 익히고, 이후에는 자주 생기는 실수를 목록으로 정리해 같은 일이 되풀이되지 않게 하겠습니다.', 500 ] ]);
  e = job(c, r, '① 서류 발표', day(-6, true), {
    memo: '채용 홈페이지 «결과 확인» 메뉴'
  });
  results[key(e)] = 'pass';
  job(c, r, '② 1차 면접', day(5, true), {
    time: '14:00',
    endTime: '15:00',
    memo: '본사 3층 회의실 · 신분증 지참'
  });
  c = '새벽소프트';
  r = '인사총무';
  applied(c, r, day(-15), [ '다음: 서류 발표', '전형: 서류 → 인적성 → 면접 → 최종' ], [ [ '1. 지원 동기', '구성원이 일에만 집중할 수 있게 뒤에서 받쳐 주는 인사총무 업무에 보람을 느껴 지원했습니다.', 600 ], [ '2. 본인의 강점과 그것을 보여 주는 경험', '꼼꼼하게 기록하는 습관이 강점입니다. 동아리 회계를 맡았을 때 영수증을 날짜별로 정리해 결산 감사를 한 번에 통과했습니다.', 600 ] ]);
  job(c, r, '① 서류 발표 ⏳', day(2, true), {
    time: '10:00',
    memo: '개별 메일로 안내'
  });
  e = job(c, r, '② 인적성 검사', day(9, true), {
    memo: '온라인 응시 · 이틀 안에 아무 때나'
  });
  e.end = plus(e.start, 1);
  c = '푸른들식품';
  r = 'SCM 사무';
  applied(c, r, day(-12), [ '다음: 서류 발표', '전형: 서류 → 실무 면접 → 임원 면접' ], [ [ '1. 지원 동기', '식품은 하루만 늦어도 가치가 떨어지는 만큼, 재고와 납기를 맞추는 일이 곧 품질이라고 생각해 지원했습니다.', 500 ], [ '2. 입사 후 포부', '발주와 재고 숫자를 매일 맞춰 보며 품절과 폐기를 함께 줄이는 담당자가 되겠습니다.', 500 ] ]);
  job(c, r, '① 서류 마감', day(-9), {
    time: '18:00',
    memo: '채용 사이트 접수'
  });
  job(c, r, '② 서류 발표 ⏳', day(12, true), {
    memo: '문자로 개별 안내'
  });
  c = '다온상사';
  r = '무역사무';
  applied(c, r, day(-2), [ '다음: 서류 발표', '전형: 서류 → 1차 면접 → 2차 면접' ], [ [ '1. 지원 동기', '서류 한 장이 통관과 결제를 좌우하는 무역사무의 정확함에 매력을 느껴 지원했습니다.', 500 ], [ '2. 협업 경험', '팀 과제에서 자료 정리를 맡아 모두가 같은 파일을 보도록 공유 폴더 규칙을 만들었고, 마감을 이틀 앞당겼습니다.', 700 ] ]);
  job(c, r, '① 서류 마감', day(1), {
    time: '18:00',
    memo: '이메일 접수 · 이력서와 자기소개서'
  });
  job(c, r, '② 서류 발표 ⏳', day(17, true), {
    memo: '합격자에게만 개별 연락'
  });
  c = '가람에너지';
  r = '총무';
  applied(c, r, day(-25), [ '다음: 인적성 검사', '전형: 서류 → 인적성 → 1차 면접 → 최종' ], [ [ '1. 지원 동기', '사무실과 설비가 문제없이 돌아가도록 살림을 챙기는 총무의 역할이 회사의 기초 체력이라고 생각해 지원했습니다.', 500 ], [ '2. 입사 후 포부', '비품·계약·시설 관리 일정을 한 장의 표로 묶어, 누가 맡아도 같은 날짜에 같은 일을 처리할 수 있게 하겠습니다.', 500 ] ]);
  job(c, r, '① 인적성 검사', day(19, true), {
    time: '10:00',
    endTime: '12:00',
    memo: '온라인 응시 · 웹캠 필요'
  });
  job(c, r, '② 1차 면접', day(33, true), {
    time: '09:30',
    endTime: '10:30',
    memo: '일정은 인적성 합격자에게 다시 안내'
  });
  c = '소담문화재단';
  r = '일반행정';
  applied(c, r, day(-8), [ '다음: 서류 발표', '전형: 서류 → 필기 → 면접 → 최종', PF ], [ [ '1. 지원 동기', '문화 사업이 시민에게 닿기까지 필요한 행정 절차를 빈틈없이 챙기는 일을 하고 싶어 지원했습니다.', 800 ], [ '2. 공공기관 직원에게 필요한 자세', '정해진 규정을 지키되, 민원인이 그 규정이 왜 필요한지 이해하도록 쉬운 말로 설명하는 태도라고 생각합니다.', 800 ] ]);
  job(c, r, '① 서류 발표 ⏳', day(7, true), {
    time: '17:00',
    memo: '재단 홈페이지 공지'
  });
  job(c, r, '② 필기시험', day(22, true), {
    time: '13:00',
    endTime: '15:00',
    memo: '직업기초능력 · 수험표 지참'
  });
  job(c, r, '③ 면접', day(38, true), {
    memo: '시간은 필기 합격자에게 따로 안내'
  });
  c = '별빛가구';
  r = '인사 신입';
  applied(c, r, day(-10), [ '다음: 서류 결과 ' + monthOf(30) + '월 중 발표', '전형: 서류 → 면접 → 최종' ], [ [ '1. 지원 동기', '좋은 가구처럼 오래 함께할 사람을 뽑고 키우는 인사 업무를 배우고 싶어 지원했습니다.', 500 ], [ '2. 입사 후 포부', '채용 일정과 서류를 꼼꼼히 챙기는 일부터 시작해, 지원자가 기다리는 시간을 줄이는 담당자가 되겠습니다.', 500 ] ]);
  job(c, r, '① 서류 마감', day(-5), {
    time: '23:59',
    memo: '채용 사이트 접수'
  });
  c = '마루보험서비스';
  r = '고객지원 사무';
  applied(c, r, day(-18), [ '다음: 없음', '전형: 서류 → 실무 면접 → 최종 (날짜 없음)' ]);
  c = '이음로지스';
  r = '물류기획';
  applied(c, r, day(-30), [ '전형: 서류 → 면접 → 최종', PF ], [ [ '1. 지원 동기', '창고와 차량을 잇는 계획 한 장이 비용을 바꾸는 물류기획의 일에 관심이 있어 지원했습니다.', 500 ], [ '2. 문제를 해결한 경험', '학과 행사 물품이 매번 모자라 지난 기록을 모아 필요량을 미리 계산했고, 그 뒤로 추가 구매가 사라졌습니다.', 500 ] ]);
  reject(c, job(c, r, '① 서류 발표', day(-4, true), {
    memo: '채용 홈페이지 공지'
  }));
  c = '청솔정밀';
  r = '생산관리 사무';
  applied(c, r, day(-35), [ '전형: 서류 → 면접' ], [ [ '1. 지원 동기', '생산 계획과 실적을 맞춰 보는 사무 업무가 공장의 하루를 지탱한다고 생각해 지원했습니다.', 500 ] ]);
  reject(c, job(c, r, '① 서류 발표', day(-16, true), {
    memo: '문자로 개별 안내'
  }));
  var test = day(13, true);
  var local = {
    id: 'demo-local-1',
    title: '컴활 1급 실기 시험',
    start: test,
    end: test,
    allDay: false,
    startTime: '10:00',
    endTime: '11:30',
    color: 'blue',
    heart: false,
    repeat: 'none',
    alarm: true,
    memo: '수험표·신분증 챙기기',
    src: ''
  };
  var SCRAP = [];
  window.DEMO_SCRAP_URL = 'https://example.com/scrap-demo.ics';
  function scrap(co, title, start, o) {
    var memo = [ '구직 도우미 스크랩', '마감: ' + (o.always ? '상시' : start) ];
    if (o.place) memo.push('근무지: ' + o.place);
    if (o.commute) memo.push('통근: ' + o.commute + ' (시청 기준)');
    if (o.rating) memo.push('평점: ' + o.rating);
    memo.push('사이트: ' + (o.site || '회사 채용 사이트'));
    memo.push('링크: https://example.com/job-demo?co=' + encodeURIComponent(co) + '&t=' + encodeURIComponent(title));
    if (o.note) memo.push(o.note);
    var e = {
      id: 'demo-scrap' + (SCRAP.length + 1) + '@jobcal.demo',
      title: '📌 [' + co + '] ' + title,
      start: start,
      end: start,
      allDay: true,
      startTime: '',
      endTime: '',
      repeat: 'none',
      alarm: true,
      heart: false,
      memo: memo.join('\n')
    };
    if (o.loc) e.loc = o.loc;
    SCRAP.push(e);
  }
  scrap('너울유통', '물류센터 운영 사무 (신입)', day(2), {
    place: '경기 이천시',
    commute: '68분',
    rating: '3.4',
    site: '채용 포털(가상)',
    loc: '경기 이천시 마장면'
  });
  scrap('하늘빛제약', '구매·자재 관리 사무', day(6), {
    place: '서울 금천구',
    commute: '41분',
    rating: '3.6'
  });
  scrap('모아테크', '인사 총무 담당 (신입/경력)', day(6), {
    place: '서울 성동구',
    commute: '35분',
    rating: '2.9',
    site: '채용 포털(가상)',
    note: '우대: 노무 관련 자격증'
  });
  scrap('단비교육', '교육 운영 매니저', day(13), {
    place: '서울 마포구',
    commute: '28분',
    rating: '3.8',
    site: '채용 포털(가상)'
  });
  scrap('바른숲재단', '사업 운영 행정 (계약직)', day(24), {
    place: '서울 종로구',
    commute: '22분',
    rating: '3.5'
  });
  scrap('이룸물산', '해외영업 지원 (무역사무)', day(-3), {
    always: true,
    place: '인천 연수구',
    commute: '64분',
    rating: '2.7',
    site: '채용 포털(가상)'
  });
  scrap('누리커머스', 'MD 보조 (상시 채용)', day(-1), {
    always: true,
    place: '서울 구로구',
    commute: '33분'
  });
  scrap('고운빛화장품', 'CS 운영 사무', day(-3), {
    place: '서울 강남구',
    commute: '47분',
    rating: '3.0',
    site: '채용 포털(가상)'
  });
  var now = Date.now();
  window.DEMO_DB = {
    v: 1,
    mig1: true,
    mig2: true,
    mig3: true,
    events: [ local ],
    subs: [ {
      id: 'sjob',
      name: '취업캘린더',
      url: window.DEMO_JOB_URL,
      color: 'purple',
      events: SUB,
      fetchedAt: now
    }, {
      id: 'sscrap',
      name: '스크랩 공고',
      url: window.DEMO_SCRAP_URL,
      color: 'teal',
      events: SCRAP,
      fetchedAt: now
    } ],
    holidays: {
      fetchedAt: now,
      list: window.DEMO_HOLIDAYS || []
    },
    settings: {
      evening: {
        on: true,
        time: '21:00'
      },
      morning: {
        on: true,
        time: '08:00'
      },
      before: {
        on: true,
        min: 30
      },
      theme: 'light'
    },
    results: results,
    rejected: rejected
  };
})();
