import { loadContent } from "./utils/utils.js";
import {
  initDropdown,
  initNoticeDropdown,
  initAllDropdowns,
} from "./component/ui-dropdown.js";
import { Toast, showToast } from "./component/ui-toast.js";

export const UX = {
  loadContent,
  initNoticeDropdown,
  initDropdown,
  initAllDropdowns,
  Toast,
  showToast,
  init: (type) => {
    const global = "UI";
    if (!window[global]) {
      window[global] = {};
    }
    const Global = window[global];
    Global.Toast = Toast;
    Global.showToast = showToast;
    window.showToast = showToast;
    const krdsHeader = document.querySelector(".krds-header");
    const krdsFooter = document.querySelector(".krds-footer");

    if (krdsHeader) {
      loadContent({
        area: krdsHeader,
        src: "./inc/header.html",
        insert: true,
      })
        .then(() => {
          console.log("header load");
        })
        .catch((err) => console.error("Error loading header content:", err));
    }
    if (krdsFooter) {
      loadContent({
        area: krdsFooter,
        src: "./inc/footer.html",
        insert: true,
      })
        .then(() => {
          console.log("footer load");
        })
        .catch((err) => console.error("Error loading footer content:", err));
    }

    // 모바일 미디어 카드 이전/다음 네비게이션
    UX.initMediaNav();

    // 메인 방재속보/전국특보 드롭다운 초기화
    UX.initNoticeDropdown();

    // 검색 지도 정보 지역 드롭다운 초기화
    UX.initLocationDropdown();

    // 페이지 내 모든 드롭다운 및 툴팁 자동 초기화 (data-tooltip="true"면 툴팁, 아니면 클릭 드롭다운)
    initAllDropdowns();

    // 관측지점 필터 칩 토글 초기화
    UX.initStationTabs();

    // 즐겨찾기 버튼 및 토스트 초기화
    UX.initBookmark();
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
};
