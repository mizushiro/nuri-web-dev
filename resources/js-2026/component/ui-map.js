/**
 * 반응형 날씨 지도 컴포넌트
 * index.html에 초기화된 지도(.kmap-app)의 DOM 노드를 데스크톱/모바일 컨테이너 간에 이동시켜
 * OpenLayers 인스턴스, 캔버스 렌더링, 이벤트 리스너를 100% 보존합니다.
 */
export const initMap = () => {
  const desktopTarget = document.querySelector(
    '.nr__map-area[data-map="desktop"]'
  );
  const mobileContainer = document.querySelector(
    '.nr__map-area[data-map="mobile"]'
  );
  const mobileTarget = mobileContainer?.querySelector(".nr__map-area-wrap");

  if (!desktopTarget || !mobileTarget) return;

  const mediaQuery = window.matchMedia("(max-width: 1024px)");

  /**
   * 지도 엘리먼트를 찾음 (desktopTarget 또는 mobileTarget 안에 위치)
   */
  const getMapElement = () => {
    return (
      desktopTarget.querySelector(".kmap-app") ||
      mobileTarget.querySelector(".kmap-app") ||
      document.querySelector(".kmap-app")
    );
  };

  /**
   * 지도 캔버스 및 레이아웃 리사이즈 트리거
   */
  const triggerMapResize = () => {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  };

  /**
   * 모드에 따라 지도 DOM 이동
   * @param {boolean} isMobile 
   */
  const relocateMap = (isMobile) => {
    const mapElement = getMapElement();
    if (!mapElement) return;

    const targetContainer = isMobile ? mobileTarget : desktopTarget;

    // 이미 올바른 컨테이너에 있으면 이동 불필요
    if (targetContainer.contains(mapElement)) {
      return;
    }

    targetContainer.appendChild(mapElement);
    triggerMapResize();
  };

  // 1. 초기 로드 시 뷰포트에 맞게 배치 (DOM 준비 후 실행)
  requestAnimationFrame(() => {
    relocateMap(mediaQuery.matches);
  });

  // 2. 화면 리사이즈/반응형 분기점(1024px) 전환 시 이동
  const handleBreakpointChange = (e) => {
    relocateMap(e.matches);
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handleBreakpointChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleBreakpointChange);
  }

  // 3. 모바일 날씨지도 열기/닫기 체크박스 연동
  const toggleCheckbox = document.getElementById("mapShowhide");
  const toggleText = mobileContainer?.querySelector(".nr__map-area-btn span");

  if (toggleCheckbox && toggleText) {
    const updateToggleState = () => {
      toggleText.textContent = toggleCheckbox.checked
        ? "날씨지도 닫기"
        : "날씨지도 열기";
      if (toggleCheckbox.checked) {
        triggerMapResize();
      }
    };

    toggleCheckbox.addEventListener("change", updateToggleState);
    updateToggleState();
  }
};
