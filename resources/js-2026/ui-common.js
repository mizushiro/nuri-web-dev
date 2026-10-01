import { loadContent } from "./utils/utils.js";
import {
  initDropdown,
  initNoticeDropdown,
  initSpecialReportTabs,
  initAllDropdowns,
  initNoticeHelpTooltips,
} from "./component/ui-dropdown.js";
import { Toast, showToast } from "./component/ui-toast.js";
import { initMap } from "./component/ui-map.js";
import { initAsideMenu } from "./component/ui-aside.js";
import { initHeaderMenu } from "./component/ui-header.js";
import { uiForecastExe } from "./component/ui-forecast.js";

export const UX = {
  loadContent,
  initNoticeDropdown,
  initSpecialReportTabs,
  initNoticeHelpTooltips,
  initDropdown,
  initAllDropdowns,
  initMap,
  initAsideMenu,
  initHeaderMenu,
  uiForecastExe,
  noticeDropdown: null,
  openNotice: (target) => UX.noticeDropdown?.open(target) ?? window.openNotice?.(target),
  closeNotice: (restoreFocus) => UX.noticeDropdown?.close(restoreFocus) ?? window.closeNotice?.(restoreFocus),
  toggleNotice: (target) => UX.noticeDropdown?.toggle(target) ?? window.toggleNotice?.(target),
  clearNoticeTodayCookie: () => UX.noticeDropdown?.clearHideToday?.() ?? window.clearNoticeTodayCookie?.(),
  Toast,
  showToast,
  init: (name, options = {}) => {
    console.log(name);
    const type = name;
    const global = "UI";
    if (!window[global]) {
      window[global] = {};
    }
    const Global = window[global];
    Global.Toast = Toast;
    Global.showToast = showToast;
    window.showToast = showToast;
    const nrHeader = document.querySelector(".nr__header");
    const nrFooter = document.querySelector(".nr__footer");
    const nrAside = document.querySelector(".nr__aside, aside");
    const nrLinks = document.querySelectorAll('[data-include="links"]');

    if (nrHeader) {
      loadContent({
        area: nrHeader,
        src: type === 'main' ? "./inc/header.html" : "../inc/header.html",
        insert: true,
      })
        .then(async () => {
          console.log("header load");
          const dep1 = nrHeader.dataset.dep1 ? nrHeader.dataset.dep1 : undefined;
          const dep2 = nrHeader.dataset.dep2 ? nrHeader.dataset.dep2 : undefined;
          const dep3 = nrHeader.dataset.dep3 ? nrHeader.dataset.dep3 : undefined;
          await initHeaderMenu({ dep1, dep2, dep3 });
          UX.initMobileNav();
        })
        .catch((err) => console.error("Error loading header content:", err));
    }
    if (nrFooter) {
      loadContent({
        area: nrFooter,
        src: type === 'main' ? "./inc/footer.html" : "../inc/footer.html",
        insert: true,
      })
        .then(() => {
          console.log("footer load");
        })
        .catch((err) => console.error("Error loading footer content:", err));
    }
    if (nrAside) {
      // data 속성이 명시되어 있지 않으면 undefined를 전달하여 URL 자동 매칭이 동작하도록 함
      const dep1 = nrAside.dataset.dep1 ? nrAside.dataset.dep1 : undefined;
      const dep2 = nrAside.dataset.dep2 ? nrAside.dataset.dep2 : undefined;
      const dep3 = nrAside.dataset.dep3 ? nrAside.dataset.dep3 : undefined;
      initAsideMenu({ dep1, dep2, dep3 });
    }
    if (nrLinks) {
      nrLinks.forEach((nrLink) => {
        loadContent({
          area: nrLink,
          src: "./inc/links.html",
          insert: true,
        })
        .then(() => {
          console.log("footer load");
        })
        .catch((err) => console.error("Error loading footer content:", err));
      });
    }

    // 페이지 내 모든 범용 드롭다운 및 툴팁 자동 초기화
    initAllDropdowns();

    // 메인 페이지일 경우 메인 전용 UI 자동 초기화
    if (type === "main") {
      UX.initMain(options);
    }
  },

  /**
   * 메인 페이지 전용 UI 및 컨트롤러 초기화 (UX.init('main') 시 자동 호출)
   */
  initMain: (options = {}) => {
    // 1. 방재속보/전국특보 드롭다운 초기화 (기본: 방재속보 0번 오픈)
    const defaultOpen = options.defaultOpen !== undefined ? options.defaultOpen : 0;
    UX.noticeDropdown = UX.initNoticeDropdown({ defaultOpen });

    // 전역 UI 객체 연동 (콘솔 및 인라인 스크립트에서도 제어 가능하도록)
    if (typeof window !== "undefined") {
      window.noticeDropdown = UX.noticeDropdown;
      window.openNotice = UX.openNotice;
      window.closeNotice = UX.closeNotice;
      window.toggleNotice = UX.toggleNotice;
      window.clearNoticeTodayCookie = UX.clearNoticeTodayCookie;
      if (window.UI) {
        window.UI.noticeDropdown = UX.noticeDropdown;
        window.UI.openNotice = UX.openNotice;
        window.UI.closeNotice = UX.closeNotice;
        window.UI.toggleNotice = UX.toggleNotice;
        window.UI.clearNoticeTodayCookie = UX.clearNoticeTodayCookie;
      }
    }

    // 2. 전국특보 팝업 기상특보/예비특보 탭 전환 & 도움말 툴팁
    UX.initSpecialReportTabs();
    UX.initNoticeHelpTooltips();

    // 3. 메인 상단 탭 (날씨/전국/태풍/폭염) 연동
    UX.initMainTabs();

    // 4. 모바일 미디어 카드 이전/다음 네비게이션
    UX.initMediaNav();

    // 5. 검색 지도 정보 지역 드롭다운
    UX.initLocationDropdown();

    // 6. 관측지점 필터 칩 토글
    UX.initStationTabs();

    // 7. 관심지역 즐겨찾기 버튼 & 토스트 알림
    UX.initBookmark();

    // 8. 반응형 날씨 지도 초기화
    UX.initMap();

    // 9. 타임바 슬라이더 진행률 제어
    UX.initMainTimebar();

    // 10. 예보 데이터 로드 및 차트/테이블 렌더링
    UX.initForecastData(options.forecastOptions);

    return UX.noticeDropdown;
  },

  /**
   * 지도 타임바 슬라이더 진행률 CSS 커스텀 속성(--progress) 동기화
   */
  initMainTimebar: () => {
    const rangeInput = document.querySelector(
      ".nr__map-area .kmap-app .timebar .range",
    );
    if (!rangeInput) return;

    const updateRangeProgress = () => {
      const min = Number(rangeInput.min) || 0;
      const max = Number(rangeInput.max) || 100;
      const val = Number(rangeInput.value) || 0;
      const percentage = ((val - min) / (max - min)) * 100;
      rangeInput.style.setProperty("--progress", `${percentage}%`);
    };

    rangeInput.addEventListener("input", updateRangeProgress);
    updateRangeProgress();
  },

  /**
   * 날씨 예보 JSON 데이터 비동기 로드 및 예보 뷰(차트/테이블) 렌더링
   */
  initForecastData: (chartOptions = {}) => {
    return fetch("./resources/json/weather.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        uiForecastExe(data, chartOptions);
        return data;
      })
      .catch((err) => {
        console.error("날씨 예보 데이터 로드 오류:", err);
      });
  },
  

  initMainTabs: () => {
    const mainTabs = document.querySelectorAll(".nr__main-tab");
    if (!mainTabs.length) return;

    const updateTabSelect = (value) => {
      if (value !== undefined && value !== null) {
        document.body.setAttribute("data-tab-select", value);
      }
    };

    // 초기 체크된 탭 값 반영
    const checkedInput = document.querySelector(
      '.nr__main-tab input[type="radio"]:checked',
    );
    if (checkedInput) {
      updateTabSelect(checkedInput.value);
    }

    // 탭 변경 시 body data-tab-select 속성 갱신
    mainTabs.forEach((tabContainer) => {
      tabContainer.addEventListener("change", (e) => {
        const radio = e.target.closest('input[type="radio"]');
        if (radio && radio.checked) {
          updateTabSelect(radio.value);
        }
      });
    });
  },

  initAirTooltips: () => {
    document
      .querySelectorAll(
        ".nr__btn-status-help, .nr__air-tooltip-layer, .nr__air-tooltip-wrap",
      )
      .forEach((el) => {
        initDropdown(el);
      });
  },

  initBookmark: () => {
    const starBtn = document.querySelector(".nr__btn-star");
    if (!starBtn) return;

    starBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // 활성화 상태 토글
      const isActive = starBtn.classList.toggle("active");
      starBtn.setAttribute("aria-pressed", isActive ? "true" : "false");

      // 현재 선택된 지역명 추출 (예: "인천광역시 중구 전동")
      const locName =
        document.querySelector(".nr__loc-name")?.textContent.trim() ||
        "현재 지역";

      // 토스트 메시지 생성
      const message = isActive
        ? `${locName}이 관심지역에 등록되었습니다.`
        : `${locName}이 관심지역에서 삭제되었습니다.`;

      // 날씨 상세 카드(.nr__weather-detail-card) 상단에 토스트 팝업 띄우기
      showToast(message, {
        target: ".nr__weather-detail-card",
        position: "card-top",
        duration: 3000,
        type: "warning",
      });
    });
  },

  initLocationDropdown: () => {
    const locDropdownEl = document.querySelector(".nr__loc-dropdown");
    if (locDropdownEl) {
      initDropdown(locDropdownEl, {
        onSelect: (value, item) => {
          const itemName =
            item.querySelector(".nr__item-name")?.textContent.trim() || value;
          const subNameEl = document.querySelector(".nr__loc-sub-name");
          if (subNameEl) {
            subNameEl.textContent = itemName;
          }
        },
      });
    }
  },

  initStationTabs: () => {
    const section = document.querySelector(".nr__station-section");
    if (!section) return;

    const btns = Array.from(section.querySelectorAll(".nr__btn-station-chip"));
    const contents = Array.from(
      section.querySelectorAll(".nr__station-tab-content"),
    );
    if (!btns.length || !contents.length) return;

    const activateTab = (index, focusBtn = false) => {
      btns.forEach((b, i) => {
        const isActive = i === index;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
        b.setAttribute("tabindex", isActive ? "0" : "-1");
      });

      contents.forEach((content, i) => {
        content.classList.toggle("active", i === index);
      });

      if (focusBtn && btns[index]) {
        btns[index].focus();
      }
    };

    btns.forEach((btn, index) => {
      btn.setAttribute(
        "tabindex",
        btn.classList.contains("active") ? "0" : "-1",
      );

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        activateTab(index);
      });

      btn.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          const nextIndex = (index + 1) % btns.length;
          activateTab(nextIndex, true);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          const prevIndex = (index - 1 + btns.length) % btns.length;
          activateTab(prevIndex, true);
        }
      });
    });
  },

  initMediaNav: () => {
    const prevBtn = document.querySelector(".nr__media-nav-btn.prev");
    const nextBtn = document.querySelector(".nr__media-nav-btn.next");
    const items = document.querySelectorAll(".nr__main-media-item");
    if (!prevBtn || !nextBtn || !items.length) return;

    let currentIndex = 0;
    const update = (idx) => {
      currentIndex = idx;
      items.forEach((item, i) => {
        item.classList.toggle("active", i === currentIndex);
      });
    };

    prevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const nextIdx = (currentIndex - 1 + items.length) % items.length;
      update(nextIdx);
    });

    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const nextIdx = (currentIndex + 1) % items.length;
      update(nextIdx);
    });
  },

  initMobileNav: () => {
    const mobileNav = document.getElementById("mobile-nav");
    if (!mobileNav) return;

    const openBtn = document.querySelector(
      ".nr__btn-allmenu, [data-icon='allmenu'], [aria-controls='mobile-nav']",
    );
    const closeBtn = document.querySelector(
      "#close-nav, .nr__mobile-close-btn",
    );
    const backdrop = mobileNav.querySelector(".nr__mobile-nav-backdrop");

    const openMenu = (e) => {
      if (e) e.preventDefault();
      mobileNav.classList.add("is-open");
      document.body.classList.add("is-gnb-mobile");
      mobileNav.setAttribute("aria-hidden", "false");
    };

    const closeMenu = (e) => {
      if (e) e.preventDefault();
      mobileNav.classList.remove("is-open");
      document.body.classList.remove("is-gnb-mobile");
      mobileNav.setAttribute("aria-hidden", "true");
    };

    if (openBtn) {
      openBtn.removeEventListener("click", openMenu);
      openBtn.addEventListener("click", openMenu);
    }
    if (closeBtn) {
      closeBtn.removeEventListener("click", closeMenu);
      closeBtn.addEventListener("click", closeMenu);
    }
    if (backdrop) {
      backdrop.removeEventListener("click", closeMenu);
      backdrop.addEventListener("click", closeMenu);
    }

    // 중복 등록 방지 (단 1회만 이벤트 위임 바인딩)
    if (mobileNav.dataset.navInitialized === "true") return;
    mobileNav.dataset.navInitialized = "true";

    // ESC 키로 닫기
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNav.classList.contains("is-open")) {
        closeMenu();
      }
    });

    // 이벤트 위임을 통한 모바일 메뉴 인터랙션 통합 처리
    mobileNav.addEventListener("click", (e) => {
      // 1. 1Depth 탭 전환
      const tabBtn = e.target.closest(".nr__mobile-tab-btn, .menu-wrap .gnb-main-trigger");
      if (tabBtn) {
        e.preventDefault();
        const tabBtns = mobileNav.querySelectorAll(".nr__mobile-tab-btn, .menu-wrap .gnb-main-trigger");
        const subLists = mobileNav.querySelectorAll(".nr__mobile-sub-list, .submenu-wrap .gnb-sub-list");

        tabBtns.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        tabBtn.classList.add("active");
        tabBtn.setAttribute("aria-selected", "true");

        const targetId = tabBtn.getAttribute("href")?.replace("#", "");
        if (targetId) {
          subLists.forEach((list) => {
            if (list.id === targetId) {
              list.classList.add("active");
              list.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } else {
              list.classList.remove("active");
            }
          });
        }
        return;
      }

      // 2. 2Depth has-depth3 아코디언 토글
      const depth3Trigger = e.target.closest(".nr__mobile-sub-link.has-depth3, .gnb-sub-trigger.has-depth3");
      if (depth3Trigger) {
        e.preventDefault();
        const isOpen = depth3Trigger.classList.toggle("active");
        depth3Trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
        const wrap = depth3Trigger.nextElementSibling;
        if (wrap) {
          wrap.classList.toggle("is-open", isOpen);
        }
        return;
      }

      // 3. 3Depth has-depth4 토글
      const depth4Trigger = e.target.closest(".nr__mobile-depth3-link.has-depth4, .depth3-trigger.has-depth4");
      if (depth4Trigger) {
        e.preventDefault();
        const wrap = depth4Trigger.nextElementSibling;
        if (wrap) {
          wrap.classList.add("is-open");
        }
        return;
      }

      // 4. 4Depth 닫기 및 이전 버튼
      const depth4CloseBtn = e.target.closest(".nr__trigger-close, .nr__trigger-prev, .trigger-close, .trigger-prev");
      if (depth4CloseBtn) {
        e.preventDefault();
        const depth4Wrap = depth4CloseBtn.closest(".nr__mobile-depth4-wrap, .depth4-wrap");
        if (depth4Wrap) {
          depth4Wrap.classList.remove("is-open");
        }
        return;
      }
    });
  },
};
