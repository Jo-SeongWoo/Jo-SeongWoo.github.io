/* NightDimmer 체험판 — 화면 안 «여기 눌러 보세요» 표시 설정 (공용 코드 = ../../assets/coach.js) */
(function () {
  if (!window.Coach) return;
  var S = function () { return (window.NightDimmerDemo || {}).state || {}; };
  Coach.init([
    // 밝기 슬라이더 — 끌거나 Ctrl+↑↓ 로 밝기가 바뀌면 사라진다
    { id: 'bright', sel: '#bScale', label: '끌어 보세요', at: [0.36, 0], dy: -3, side: 'top',
      done: function () { var s = S(); return s.brightness != null && Math.abs(s.brightness - 0.6) > 0.001; } },
    // 계산기 키 — 눌러서 끄면 원래 화면과 비교된다
    { id: 'calc', sel: '#keyCalc', label: '꺼서 비교', at: [0.5, 0], side: 'left' },
    // F7 — 저장해 둔 프리셋을 한 번에
    { id: 'f7', sel: '#keyF7', label: '한 번에 적용', at: [0.5, 0], side: 'top' }
  ], { max: 3, key: 'nightdimmer' });
})();
