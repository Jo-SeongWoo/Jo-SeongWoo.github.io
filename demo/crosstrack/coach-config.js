/* 우편물 위치 조회 체험판 — 화면 안 «여기 눌러 보세요» 표시 설정 (공용 코드 = ../../assets/coach.js)
 * 원본 사이드패널을 다시 복사해 와도 이 파일은 그대로 두고, index.html 끝의 <!-- coach --> 두 줄만 다시 넣으면 된다. */
(function () {
  if (!window.Coach) return;
  var CAT = /^[^\s()]+\(\d+\)$/;            // «세관계류(58)» 같은 분류 단추 글자
  Coach.init([
    // 첫 줄 가운데 단추에 붙여 꼬리표가 위쪽 검색칸(빈 자리)에 오게 한다
    { id: 'cat', sel: '#bulkOut span', text: /^RD\(\d+\)$/, label: '분류별로 보기', at: [0.5, 0.1], side: 'top',
      // 어느 분류 단추를 눌러도 사라진다
      hit: function (x) { var s = x.closest && x.closest('#bulkOut span'); return !!(s && CAT.test((s.textContent || '').trim())); } },
    { id: 'input', sel: '#bulkHideToggle', text: '펼치기', label: '번호 넣어 조회', at: [0.82, 1], side: 'bottom' },
    { id: 'run', sel: '#runBtn', label: '눌러서 조회', at: [0, 0.5], side: 'left' },
    // 탭 위 공간이 좁아 점은 탭 글자 오른쪽, 꼬리표는 그 위(체험판 안내 띠 쪽)에 둔다
    { id: 'watch', sel: '.main-tab[data-tab="watch"]', label: '지켜볼 번호 모음', at: [0.9, 0.55], side: 'top' },
    { id: 'days', sel: '.main-tab[data-tab="days"]', label: '나라별 발송 조건', at: [0.93, 0.55], side: 'top' }
  ], { max: 2, key: 'crosstrack' });
})();
