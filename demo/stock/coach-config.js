/* 자동매매 앱 체험판 — 화면 안 «여기 눌러 보세요» 표시 설정 (공용 코드 = ../../assets/coach.js)
 * 원본 앱을 다시 복사해 와도 이 파일은 그대로 두고, index.html 끝의 <!-- coach --> 두 줄만 다시 넣으면 된다. */
(function () {
  if (!window.Coach) return;
  function pick(txt) { return function () { return [].slice.call(document.querySelectorAll('#dlg.on #dlg-pick button')).filter(function (b) { return (b.textContent || '').indexOf(txt) >= 0; }); }; }
  Coach.init([
    // 아래 탭 줄 — 어느 탭을 눌러도 사라진다
    { id: 'tabs', sel: '.tb button[data-tab="balance"]', label: '아래 탭 넘겨 보기', at: [0.8, 0.12], side: 'top',
      hit: function (x) { return !!(x.closest && x.closest('.tb button')); } },
    // 매수 켜고 끄기 스위치(주문 화면 맨 위)
    { id: 'buysw', find: function () { return [].slice.call(document.querySelectorAll('.topsw')).filter(function (w) { var l = w.querySelector('.lb'); return l && /매수/.test(l.textContent); }).map(function (w) { return w.querySelector('.seg'); }); },
      label: '매수 켜고 끄기', at: [0, 0.5], side: 'left' },
    // 주문 화면의 종목 카드 → 차트 · 매수금액 수정
    { id: 'card', sel: '.card.pbc.tap', label: '종목 눌러 차트', at: [0.97, 0.42], side: 'left' },
    { id: 'chart', find: pick('차트 보기'), label: '차트 열기', at: [0.86, 0.5], side: 'left' },
    { id: 'amount', find: pick('매수금액 수정'), label: '주문 금액 바꾸기', at: [0.86, 0.5], side: 'left' },
    // 잔고 화면의 보유 종목 → 바로 매도
    { id: 'hold', sel: '.card.tap[data-bnm]', label: '눌러서 바로 매도', at: [0.97, 0.5], side: 'left' },
    // 이 단추는 설명이 여러 줄이라 점은 제목 줄 오른쪽 끝, 꼬리표는 그 위 빈 줄로
    { id: 'sell', find: pick('바로 매도'), label: '지금 팔기', at: [0.93, 0.14], side: 'top', align: 'end' }
  ], { max: 2, key: 'stock' });
})();
