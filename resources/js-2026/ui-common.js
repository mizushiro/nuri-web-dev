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

export const UX = {
  loadContent,
  initNoticeDropdown,
  initSpecialReportTabs,
  initNoticeHelpTooltips,
  initDropdown,
  initAllDropdowns,
  initMap,
  initAsideMenu,
  Toast,
  showToast,
  init: (name) => {
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
        .then(() => {
          console.log("header load");
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
      // aside.html 불러온 후 JSON 기반 메뉴 렌더링 및 이벤트 초기화
      loadContent({
        area: nrAside,
        src: type === 'main' ? "./inc/aside.html" : "../inc/aside.html",
        insert: false,
      })
        .then(() => {
          console.log("aside load");
          initAsideMenu();
        })
        .catch((err) => {
          console.error("Error loading aside content:", err);
          initAsideMenu();
        });
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

      // 모바일 미디어 카드 이전/다음 네비게이션
      UX.initMediaNav();
  
      // 메인 방재속보/전국특보 드롭다운 초기화
      UX.initNoticeDropdown();
  
      // 전국특보 팝업 기상특보/예비특보 탭 전환 초기화
      initSpecialReportTabs();
  
      // 방재속보 및 전국특보 도움말 툴팁 초기화
      initNoticeHelpTooltips();
  
      // 검색 지도 정보 지역 드롭다운 초기화
      UX.initLocationDropdown();
  
      // 페이지 내 모든 드롭다운 및 툴팁 자동 초기화 (data-tooltip="true"면 툴팁, 아니면 클릭 드롭다운)
      initAllDropdowns();
  
      // 관측지점 필터 칩 토글 초기화
      UX.initStationTabs();
  
      // 즐겨찾기 버튼 및 토스트 초기화
      UX.initBookmark();
  
      // 반응형 날씨 지도 초기화 (desktop/mobile 모드 대응)
      initMap();
  
      // 메인 상단 탭 선택 시 body data-tab-select 연동
      UX.initMainTabs();

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

    // ESC 키로 닫기
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNav.classList.contains("is-open")) {
        closeMenu();
      }
    });

    // 1Depth 탭 전환
    const tabBtns = mobileNav.querySelectorAll(
      ".nr__mobile-tab-btn, .menu-wrap .gnb-main-trigger",
    );
    const subLists = mobileNav.querySelectorAll(
      ".nr__mobile-sub-list, .submenu-wrap .gnb-sub-list",
    );

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        tabBtns.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        const targetId = btn.getAttribute("href")?.replace("#", "");
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
      });
    });

    // 2Depth has-depth3 아코디언 토글
    const depth3Triggers = mobileNav.querySelectorAll(
      ".nr__mobile-sub-link.has-depth3, .gnb-sub-trigger.has-depth3",
    );
    depth3Triggers.forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = trigger.classList.toggle("active");
        trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
        const wrap = trigger.nextElementSibling;
        if (wrap) {
          wrap.classList.toggle("is-open", isOpen);
        }
      });
    });

    // 3Depth has-depth4 아코디언/팝업 토글
    const depth4Triggers = mobileNav.querySelectorAll(
      ".nr__mobile-depth3-link.has-depth4, .depth3-trigger.has-depth4",
    );
    depth4Triggers.forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const wrap = trigger.nextElementSibling;
        if (wrap) {
          wrap.classList.add("is-open");
        }
      });
    });

    // 4Depth 닫기 및 이전 버튼
    const depth4CloseBtns = mobileNav.querySelectorAll(
      ".nr__trigger-close, .nr__trigger-prev, .trigger-close, .trigger-prev",
    );
    depth4CloseBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const depth4Wrap = btn.closest(".nr__mobile-depth4-wrap, .depth4-wrap");
        if (depth4Wrap) {
          depth4Wrap.classList.remove("is-open");
        }
      });
    });
  },
};
