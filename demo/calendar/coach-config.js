/* 취업캘린더 체험판 — 화면 안 «여기 눌러 보세요» 표시 설정 (공용 코드 = ../../assets/coach.js)
 * 원본 앱을 다시 복사해 와도 이 파일은 그대로 두고, index.html 끝의 <!-- coach --> 두 줄만 다시 넣으면 된다. */
(function () {
  if (!window.Coach) return;
  var firstMonth = null;
  function monthNow() { var y = document.getElementById('yearTitle'), m = document.getElementById('monthTitle'); return (y ? y.textContent : '') + '/' + (m ? m.textContent : ''); }
  Coach.init([
    // 꼬리표는 탭 아래 «체험판 · 가상 데이터» 알약 오른쪽 빈 자리로 뻗게 한다
    { id: 'scrap', sel: '#tabs [data-tab="scrap"]', label: '모아 둔 공고', at: [1, 0.85], dx: 8, side: 'bottom', align: 'start' },
    // 한 번에 2개만 보이므로 처음 둘은 서로 멀리 있는 것(위 탭 · 달력 가운데)으로 — 위쪽 단추 셋이 한꺼번에 뜨면 꼬리표가 몰린다
    { id: 'swipe', sel: '#gridWrap', label: '옆으로 밀어 다음 달', at: [0.93, 0.55], side: 'left',
      hit: function () { return false; },
      done: function () { var n = monthNow(); if (n === '/') return false; if (firstMonth === null) { firstMonth = n; return false; } return n !== firstMonth; } },
    { id: 'menu', sel: '#bMenu', label: '지원 현황 보기', at: [0.85, 0.15], side: 'left', dx: -10 },
    { id: 'apply', sel: '#shMenu .mItem[data-m="apply"]', label: '회사별 진행 상황', at: [0.62, 0.5], side: 'left' },
    { id: 'co', sel: '#shApply .ap:not(.done)', label: '회사 눌러 보기', at: [0.74, 0.5], side: 'left' },
    // 점은 첫 문항 글 바로 아래 빈 줄에(글자를 가리지 않게)
    { id: 'copy', sel: '#shCo .letter .lb', label: '눌러서 자소서 복사', at: [0.96, 1], dy: 9, side: 'left' },
    { id: 'add', sel: '#bAdd', label: '일정 추가', at: [0.85, 0.15], side: 'bottom', dy: 22 }
  ], { max: 2, key: 'calendar' });
})();
