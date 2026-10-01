/**
 * 드롭다운 UI 컴포넌트 (ui-dropdown.js)
 * 트리거(.nr__drop-btn)와 콘텐츠(.nr__drop-menu)를 aria-controls와 id로 직접 연결하여
 * 부모 컨테이너(.nr__drop-wrap) 종속 없이 독립적으로 동작 가능합니다.
 * WAI-ARIA 웹접근성, 포커스 진입 및 순환(Focus Trap), 포커스 복원(Focus Restoration),
 * data-position 위치 제어를 지원합니다.
 */
import { getCookie, setCookie, deleteCookie, getTodayDateString } from '../utils/utils.js';

export const initDropdown = (triggerOrContainerOrSelector, options = {}) => {
  let el = typeof triggerOrContainerOrSelector === 'string'
    ? document.querySelector(triggerOrContainerOrSelector)
    : triggerOrContainerOrSelector;

  if (!el) return null;

  let dropBtn = null;
  let dropMenu = null;

  // 1. 트리거 버튼과 메뉴 요소 탐색 (id, aria-controls 우선)
  if (el.matches && (el.matches('.nr__drop-btn, .drop-btn') || el.hasAttribute('aria-controls'))) {
    dropBtn = el;
    const targetId = dropBtn.getAttribute('aria-controls');
    if (targetId) {
      dropMenu = document.getElementById(targetId);
    }
    if (!dropMenu) {
      dropMenu = dropBtn.parentElement?.querySelector('.nr__drop-menu, .drop-menu');
    }
  } else if (el.matches && el.matches('.nr__drop-menu, .drop-menu')) {
    dropMenu = el;
    if (dropMenu.id) {
      dropBtn = document.querySelector(`[aria-controls="${dropMenu.id}"]`);
    }
    if (!dropBtn) {
      dropBtn = dropMenu.parentElement?.querySelector('.nr__drop-btn, .drop-btn');
    }
  } else {
    // 컨테이너 요소인 경우 내부에서 탐색
    dropBtn = el.querySelector('.nr__drop-btn, .drop-btn');
    const targetId = dropBtn?.getAttribute('aria-controls');
    if (targetId) {
      dropMenu = document.getElementById(targetId);
    }
    if (!dropMenu) {
      dropMenu = el.querySelector('.nr__drop-menu, .drop-menu');
    }
  }

  if (!dropBtn || !dropMenu) return null;

  // 중복 초기화 방지 및 콜백 갱신
  if (dropBtn._dropdownInitialized && dropBtn._dropdownInstance) {
    if (typeof options.onSelect === 'function' && typeof dropBtn._dropdownInstance.setOnSelect === 'function') {
      dropBtn._dropdownInstance.setOnSelect(options.onSelect);
    }
    return dropBtn._dropdownInstance;
  }
  if (dropMenu._dropdownInitialized && dropMenu._dropdownInstance) {
    if (typeof options.onSelect === 'function' && typeof dropMenu._dropdownInstance.setOnSelect === 'function') {
      dropMenu._dropdownInstance.setOnSelect(options.onSelect);
    }
    return dropMenu._dropdownInstance;
  }

  dropBtn._dropdownInitialized = true;
  dropMenu._dropdownInitialized = true;

  // 2. 접근성(ARIA) 기본 속성 보강
  if (!dropMenu.id) {
    dropMenu.id = `nr-dropdown-${Math.random().toString(36).slice(2, 9)}`;
  }
  if (!dropBtn.getAttribute('aria-controls')) {
    dropBtn.setAttribute('aria-controls', dropMenu.id);
  }
  if (!dropBtn.hasAttribute('aria-expanded')) {
    dropBtn.setAttribute('aria-expanded', 'false');
  }

  const items = Array.from(dropMenu.querySelectorAll('.nr__item-link, .item-link'));
  let currentOnSelect = typeof options.onSelect === 'function' ? options.onSelect : null;
  const { position = null, hoverDelay = 150 } = options;

  // data-tooltip="true" 여부 확인 (버튼 또는 메뉴에 지정)
  const isTooltip = dropBtn.dataset.tooltip === 'true'
    || dropBtn.getAttribute('data-tooltip') === 'true'
    || dropMenu.dataset.tooltip === 'true'
    || dropMenu.getAttribute('data-tooltip') === 'true'
    || (el.dataset && el.dataset.tooltip === 'true')
    || options.isTooltip === true;

  if (isTooltip) {
    if (!dropBtn.hasAttribute('aria-haspopup')) {
      dropBtn.setAttribute('aria-haspopup', 'dialog');
    }
    if (!dropMenu.hasAttribute('role')) {
      dropMenu.setAttribute('role', 'tooltip');
    }
  } else {
    if (!dropBtn.hasAttribute('aria-haspopup')) {
      dropBtn.setAttribute('aria-haspopup', 'dialog');
    }
    if (!dropMenu.hasAttribute('role')) {
      const hasList = dropMenu.querySelector('.nr__drop-list, .drop-list');
      dropMenu.setAttribute('role', hasList ? 'menu' : 'dialog');
      if (!hasList) {
        dropMenu.setAttribute('aria-modal', 'true');
      }
    }
  }

  if (!dropMenu.hasAttribute('tabindex')) {
    dropMenu.setAttribute('tabindex', '-1');
  }

  // 3. 위치(Position) 제어: nr__drop-menu 의 data-position 값 기준
  const applyPosition = (pos) => {
    if (!pos) return;
    const normalized = pos.trim().replace(/\+/g, '-').replace(/\s+/g, '-').toLowerCase();
    dropMenu.setAttribute('data-position', normalized);
    if (dropMenu.parentElement && dropMenu.parentElement.classList.contains('nr__drop-wrap')) {
      dropMenu.parentElement.setAttribute('data-position', normalized);
    }
  };

  const initialPosition = position
    || dropMenu.dataset.position
    || dropMenu.getAttribute('data-position')
    || dropBtn.dataset.position
    || dropBtn.getAttribute('data-position')
    || (el.dataset && el.dataset.position)
    || 'bottom-right';

  applyPosition(initialPosition);

  let isOpen = false;
  let previouslyFocusedElement = null;

  // 동적 위치 계산 (nr__drop-wrap 없이 독립적으로 존재하는 경우 버튼 기준 정밀 배치)
  const updatePosition = () => {
    if (!isOpen) return;

    const isDedicatedWrap = dropMenu.parentElement && (
      dropMenu.parentElement.classList.contains('nr__drop-wrap') ||
      dropMenu.parentElement.classList.contains('krds-drop-wrap') ||
      dropMenu.parentElement.classList.contains('nr__air-tooltip-wrap') ||
      dropMenu.parentElement.classList.contains('nr__tooltip-wrap')
    ) && dropMenu.parentElement === dropBtn.parentElement;

    const pos = (dropMenu.getAttribute('data-position') || 'bottom-right')
      .trim().replace(/\+/g, '-').replace(/\s+/g, '-').toLowerCase();

    if (!isDedicatedWrap) {
      const btnRect = dropBtn.getBoundingClientRect();
      const menuRect = dropMenu.getBoundingClientRect();
      const offsetParent = dropMenu.offsetParent || document.body;
      const parentRect = offsetParent.getBoundingClientRect();

      const isBody = (offsetParent === document.body || offsetParent === document.documentElement);
      const scrollY = isBody ? (window.pageYOffset || document.documentElement.scrollTop) : offsetParent.scrollTop;
      const scrollX = isBody ? (window.pageXOffset || document.documentElement.scrollLeft) : offsetParent.scrollLeft;

      const relBtnTop = isBody ? (btnRect.top + scrollY) : (btnRect.top - parentRect.top + scrollY);
      const relBtnLeft = isBody ? (btnRect.left + scrollX) : (btnRect.left - parentRect.left + scrollX);

      let top = 0;
      let left = 0;
      const gap = 8;

      if (pos.startsWith('bottom')) {
        top = relBtnTop + btnRect.height + gap;
        if (pos.includes('left')) {
          left = relBtnLeft;
        } else if (pos.includes('right')) {
          left = relBtnLeft + btnRect.width - menuRect.width;
        } else {
          left = relBtnLeft + (btnRect.width / 2) - (menuRect.width / 2);
        }
      } else if (pos.startsWith('top')) {
        top = relBtnTop - menuRect.height - gap;
        if (pos.includes('left')) {
          left = relBtnLeft;
        } else if (pos.includes('right')) {
          left = relBtnLeft + btnRect.width - menuRect.width;
        } else {
          left = relBtnLeft + (btnRect.width / 2) - (menuRect.width / 2);
        }
      } else if (pos.startsWith('left')) {
        left = relBtnLeft - menuRect.width - gap;
        if (pos.includes('top')) {
          top = relBtnTop;
        } else if (pos.includes('bottom')) {
          top = relBtnTop + btnRect.height - menuRect.height;
        } else {
          top = relBtnTop + (btnRect.height / 2) - (menuRect.height / 2);
        }
      } else if (pos.startsWith('right')) {
        left = relBtnLeft + btnRect.width + gap;
        if (pos.includes('top')) {
          top = relBtnTop;
        } else if (pos.includes('bottom')) {
          top = relBtnTop + btnRect.height - menuRect.height;
        } else {
          top = relBtnTop + (btnRect.height / 2) - (menuRect.height / 2);
        }
      }

      // 화면 좌우 넘침 보정
      const viewportLeft = isBody ? (left - (window.pageXOffset || 0)) : (parentRect.left + left);
      if (viewportLeft + menuRect.width > window.innerWidth - 12) {
        left -= (viewportLeft + menuRect.width - (window.innerWidth - 12));
      }
      if (viewportLeft < 12) {
        left += (12 - viewportLeft);
      }

      dropMenu.style.top = `${top}px`;
      dropMenu.style.left = `${left}px`;
      dropMenu.style.right = 'auto';
      dropMenu.style.bottom = 'auto';
    } else {
      // 래퍼 내부에 있는 경우 CSS 기본 배치 유지 및 화면 우측 넘침 체크
      const rect = dropMenu.getBoundingClientRect();
      if (rect.right > window.innerWidth - 10) {
        dropMenu.parentElement?.classList.add('drop-right');
      } else {
        dropMenu.parentElement?.classList.remove('drop-right');
      }
    }
  };

  // 4. 포커스 트랩 (Focus Trap) 관리
  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const getFocusableElements = () => {
    return Array.from(dropMenu.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
      return element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0;
    });
  };

  const handleKeydownTrap = (e) => {
    if (!isOpen) return;

    if (e.key === 'Tab') {
      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: 첫 번째 요소에서 이전으로 갈 때 마지막 요소로 순환
        if (document.activeElement === firstEl || !dropMenu.contains(document.activeElement)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab: 마지막 요소에서 다음으로 갈 때 첫 번째 요소로 순환
        if (document.activeElement === lastEl || !dropMenu.contains(document.activeElement)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    }
  };

  // 5. 열기/닫기/토글 함수
  const open = (shouldFocus = true) => {
    // 다른 열려있는 드롭다운 닫기
    document.querySelectorAll('.nr__drop-menu, .drop-menu').forEach(menu => {
      if (menu !== dropMenu && menu.style.display !== 'none') {
        const menuBtn = document.querySelector(`[aria-controls="${menu.id}"]`)
          || menu.parentElement?.querySelector('.nr__drop-btn, .drop-btn');
        if (menuBtn) {
          menuBtn.classList.remove('active');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
        menu.style.display = 'none';
      }
    });

    previouslyFocusedElement = document.activeElement || dropBtn;

    dropMenu.style.display = 'block';
    dropBtn.classList.add('active');
    dropBtn.setAttribute('aria-expanded', 'true');
    isOpen = true;

    updatePosition();

    // 열렸을 때 드롭다운/팝업 영역 안으로 포커스 진입
    if (shouldFocus) {
      const focusables = getFocusableElements();
      const activeItem = focusables.find(el => el.classList.contains('active'));
      const targetFocus = activeItem || focusables[0] || dropMenu;
      if (targetFocus) {
        requestAnimationFrame(() => {
          targetFocus.focus();
        });
      }
    }

    // 포커스 트랩 및 리사이즈/스크롤 이벤트 바인딩
    dropMenu.addEventListener('keydown', handleKeydownTrap);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
  };

  const close = (restoreFocus = true) => {
    if (!isOpen) return;

    dropMenu.style.display = 'none';
    dropBtn.classList.remove('active');
    dropBtn.setAttribute('aria-expanded', 'false');
    isOpen = false;

    dropMenu.removeEventListener('keydown', handleKeydownTrap);
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('scroll', updatePosition, true);

    // 닫힐 때 이전 포커스 위치(트리거 버튼)로 복원
    if (restoreFocus) {
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
        previouslyFocusedElement.focus();
      } else {
        dropBtn.focus();
      }
    }
  };

  const toggle = () => {
    if (isOpen) {
      close(true);
    } else {
      open(true);
    }
  };

  const selectItem = (item) => {
    items.forEach(el => {
      el.classList.remove('active');
      el.setAttribute('aria-selected', 'false');
      const srOnly = el.querySelector('.sr-only');
      if (srOnly) srOnly.textContent = '';
    });

    item.classList.add('active');
    item.setAttribute('aria-selected', 'true');

    let srOnly = item.querySelector('.sr-only');
    if (!srOnly) {
      srOnly = document.createElement('span');
      srOnly.className = 'sr-only';
      item.appendChild(srOnly);
    }
    srOnly.textContent = '선택됨';

    close(true);

    if (typeof currentOnSelect === 'function') {
      currentOnSelect(item.dataset.view || item.value || item.textContent.trim(), item);
    }
  };

  // 1. 트리거 버튼 클릭
  dropBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  // 2. 트리거 버튼 키보드 (방향키 아래 / Enter / Space 로 열기)
  dropBtn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(true);
    }
  });

  // 3. 내부 닫기 버튼 이벤트 바인딩
  const closeBtns = dropMenu.querySelectorAll(
    '.nr__air-tooltip-close, .nr__tooltip-close, .tooltip-close, .close-btn, .nr__drop-close, [data-action="close"], button[aria-label*="닫기"]'
  );
  closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      close(true);
    });
  });

  // 4. 메뉴 아이템 키보드 및 클릭 이벤트
  items.forEach((item, index) => {
    if (item.classList.contains('active')) {
      item.setAttribute('aria-selected', 'true');
      let srOnly = item.querySelector('.sr-only');
      if (!srOnly) {
        srOnly = document.createElement('span');
        srOnly.className = 'sr-only';
        item.appendChild(srOnly);
      }
      srOnly.textContent = '선택됨';
    } else {
      item.setAttribute('aria-selected', 'false');
    }

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      selectItem(item);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[(index + 1) % items.length];
        next?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[(index - 1 + items.length) % items.length];
        prev?.focus();
      }
    });
  });

  // 5. 외부 클릭 닫기
  document.addEventListener('click', (e) => {
    if (isOpen && !dropBtn.contains(e.target) && !dropMenu.contains(e.target)) {
      close(false);
    }
  });

  // 6. ESC 키 글로벌 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close(true);
    }
  });

  // 7. 툴팁(hover) 모드 이벤트 바인딩
  if (isTooltip) {
    let leaveTimer = null;

    const handleEnter = () => {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
      open(false);
    };

    const handleLeave = () => {
      leaveTimer = setTimeout(() => {
        close(false);
      }, hoverDelay);
    };

    dropBtn.addEventListener('mouseenter', handleEnter);
    dropMenu.addEventListener('mouseenter', handleEnter);
    dropBtn.addEventListener('mouseleave', handleLeave);
    dropMenu.addEventListener('mouseleave', handleLeave);

    dropBtn.addEventListener('focus', () => {
      open(false);
    });
    dropBtn.addEventListener('blur', (e) => {
      if (!dropMenu.contains(e.relatedTarget)) {
        close(false);
      }
    });
  }

  const instance = {
    open,
    close,
    toggle,
    selectItem,
    setPosition: applyPosition,
    updatePosition,
    setOnSelect: (cb) => {
      currentOnSelect = typeof cb === 'function' ? cb : null;
    },
    setActiveView: (viewMode) => {
      const match = items.find(i => i.dataset.view === viewMode);
      if (match) {
        items.forEach(el => {
          el.classList.remove('active');
          el.setAttribute('aria-selected', 'false');
          const sr = el.querySelector('.sr-only');
          if (sr) sr.textContent = '';
        });
        match.classList.add('active');
        match.setAttribute('aria-selected', 'true');
        let sr = match.querySelector('.sr-only');
        if (!sr) {
          sr = document.createElement('span');
          sr.className = 'sr-only';
          match.appendChild(sr);
        }
        sr.textContent = '선택됨';
      }
    }
  };

  dropBtn._dropdownInstance = instance;
  dropMenu._dropdownInstance = instance;
  if (el && el !== dropBtn && el !== dropMenu) {
    el._dropdownInstance = instance;
    el._dropdownInitialized = true;
  }
  return instance;
};

/**
 * 페이지 내의 모든 드롭다운 및 툴팁 자동 초기화
 * 1) aria-controls 속성을 가진 트리거 버튼 (.nr__drop-btn[aria-controls])
 * 2) id 속성을 가진 드롭다운 메뉴 (.nr__drop-menu[id])
 * 3) 기존 컨테이너 구조 (.nr__drop-wrap, .krds-drop-wrap 등)
 * @param {HTMLElement|Document} [root=document]
 */
export const initAllDropdowns = (root = document) => {
  // 1. aria-controls 속성을 가진 드롭다운 트리거 버튼
  const triggers = root.querySelectorAll('.nr__drop-btn[aria-controls], [data-dropdown-toggle]');
  triggers.forEach(btn => initDropdown(btn));

  // 2. id 속성을 가진 드롭다운 메뉴
  const menus = root.querySelectorAll('.nr__drop-menu[id], .drop-menu[id]');
  menus.forEach(menu => initDropdown(menu));

  // 3. 기존 컨테이너 구조 호환
  const containers = root.querySelectorAll('.nr__drop-wrap, .krds-drop-wrap, .nr__air-tooltip-wrap, .nr__tooltip-wrap');
  containers.forEach(container => initDropdown(container));
};

/**
 * 메인 방재속보/전국특보 드롭다운 패널 제어 함수 (initNoticeDropdown)
 * 버튼 클릭 시 대응하는 .nr__main-notice-content 영역을 토글(열기/닫기)하며,
 * 상호 배타적 토글(하나가 열리면 다른 것은 닫힘), 바깥 클릭 시 닫기, ESC 키 닫기, ARIA 접근성을 제공합니다.
 */
export const initNoticeDropdown = (options = {}) => {
  const noticeContainer = document.querySelector('.nr__main-notice');
  if (!noticeContainer) return null;

  const buttons = Array.from(noticeContainer.querySelectorAll('button'));
  const contents = Array.from(document.querySelectorAll('.nr__main-notice-content'));
  if (!buttons.length || !contents.length) return null;

  let activeIndex = -1;

  const closeAll = (restoreFocus = false, targetBtn = null) => {
    buttons.forEach((btn) => {
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });
    contents.forEach((content) => {
      content.classList.remove('is-open', 'active');
    });
    const focusTarget = targetBtn || (activeIndex >= 0 && buttons[activeIndex] ? buttons[activeIndex] : null);
    if (restoreFocus && focusTarget) {
      focusTarget.focus();
    }
    activeIndex = -1;
  };

  const getTargetContent = (btn, index) => {
    const targetId = btn.getAttribute('aria-controls') || btn.dataset.target;
    if (targetId) {
      const el = document.getElementById(targetId.replace(/^#/, ''));
      if (el) return el;
    }
    return contents[index] || null;
  };

  const openIndex = (index) => {
    const btn = buttons[index];
    const content = getTargetContent(btn, index);
    if (!btn || !content) return;

    closeAll();
    btn.classList.add('active');
    btn.setAttribute('aria-expanded', 'true');
    content.classList.add('is-open', 'active');
    activeIndex = index;

    // 패널 열릴 때 오늘 다시 열지 않기 쿠키 상태와 체크박스 UI 동기화
    syncTodayCheckbox();
  };

  const toggleIndex = (index) => {
    if (activeIndex === index) {
      closeAll(true, buttons[index]);
    } else {
      openIndex(index);
    }
  };

  buttons.forEach((btn, index) => {
    const content = getTargetContent(btn, index);
    if (!content) return;

    if (!content.id) {
      content.id = `notice-content-${index + 1}`;
    }
    if (!btn.getAttribute('aria-controls')) {
      btn.setAttribute('aria-controls', content.id);
    }
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleIndex(index);
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAll(true, btn);
      } else if (e.key === 'ArrowDown') {
        if (activeIndex !== index) {
          e.preventDefault();
          openIndex(index);
        }
      }
    });
  });

  // 대상 인덱스(숫자 또는 'disaster', 'special', '방재속보', '전국특보') 변환 헬퍼
  const resolveTargetIndex = (target) => {
    if (typeof target === 'number') return target;
    if (typeof target === 'string') {
      const lower = target.toLowerCase().trim();
      if (lower === 'disaster' || lower === '방재속보' || lower === 'notice-content-1' || lower === '0') {
        return 0;
      }
      if (lower === 'special' || lower === '전국특보' || lower === 'notice-content-2' || lower === '1') {
        return 1;
      }
    }
    return 0;
  };

  const openNotice = (target = 0) => {
    const idx = resolveTargetIndex(target);
    openIndex(idx);
  };

  const closeNotice = (restoreFocus = false, targetBtn = null) => {
    closeAll(restoreFocus, targetBtn);
  };

  const toggleNotice = (target = 0) => {
    const idx = resolveTargetIndex(target);
    toggleIndex(idx);
  };

  // 쿠키 및 스토리지 키 상수
  const NOTICE_COOKIE_NAME = 'nr_hide_notice_today';

  // '오늘 다시 열지 않기' 쿠키/스토리지 확인 함수 (오늘 날짜와 일치하면 true)
  const isHiddenToday = () => {
    const todayStr = getTodayDateString();

    // 1. 쿠키 검사 (우선순위)
    const cookieVal = getCookie(NOTICE_COOKIE_NAME);
    if (cookieVal === todayStr || cookieVal === 'Y') {
      return true;
    }

    // 2. 로컬스토리지 보조 검사 (쿠키 제한 환경 대응)
    try {
      const localVal = localStorage.getItem(NOTICE_COOKIE_NAME);
      if (localVal === todayStr || localVal === new Date().toDateString()) {
        return true;
      }
    } catch (e) {}

    return false;
  };

  // 체크박스 UI 상태를 쿠키 유효 여부와 동기화하는 함수
  const syncTodayCheckbox = () => {
    const isHidden = isHiddenToday();
    const checkboxes = document.querySelectorAll('.nr__notice-check-input');
    checkboxes.forEach((cb) => {
      cb.checked = isHidden;
    });
  };

  // '오늘 다시 열지 않기' 쿠키 및 로컬스토리지 저장 함수 (당일 자정 23:59:59 만료)
  const setHideNoticeToday = () => {
    const todayStr = getTodayDateString();
    // 당일 자정까지 유효한 쿠키 설정 (path=/)
    setCookie(NOTICE_COOKIE_NAME, todayStr, { endOfDay: true, path: '/' });
    try {
      localStorage.setItem(NOTICE_COOKIE_NAME, todayStr);
    } catch (e) {}
    syncTodayCheckbox();
  };

  // '오늘 다시 열지 않기' 쿠키 및 로컬스토리지 삭제 함수 (테스트/초기화용 및 체크 해제 후 닫을 때)
  const clearHideNoticeToday = () => {
    deleteCookie(NOTICE_COOKIE_NAME, '/');
    try {
      localStorage.removeItem(NOTICE_COOKIE_NAME);
    } catch (e) {}
    syncTodayCheckbox();
  };

  // 체크박스 상태 확인 후 쿠키 저장 또는 삭제 처리 헬퍼
  const checkAndSaveTodayPreference = (contentEl) => {
    const checkbox = (contentEl && contentEl.querySelector('.nr__notice-check-input')) ||
                     document.querySelector('.nr__notice-check-input');
    if (checkbox) {
      if (checkbox.checked) {
        // 체크되어 있으면 오늘 날짜 기준 쿠키 저장
        setHideNoticeToday();
      } else {
        // 체크를 풀고 닫기를 누르면 쿠키를 삭제하여 다시 접속 시 열리도록 처리
        clearHideNoticeToday();
      }
    }
  };

  // 체크박스 변경 시 상호 상태 동기화
  const allNoticeCheckboxes = document.querySelectorAll('.nr__notice-check-input');
  allNoticeCheckboxes.forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const checked = e.target.checked;
      allNoticeCheckboxes.forEach((other) => {
        if (other !== e.target) other.checked = checked;
      });
    });
  });

  // 초기 로드 시 체크박스 상태를 쿠키와 동기화
  syncTodayCheckbox();

  // 패널 내부 닫기 버튼 및 ESC 이벤트 처리 (닫은 후 열었던 버튼으로 포커스 이동)
  contents.forEach((content, index) => {
    const closeBtns = content.querySelectorAll('button[aria-label="닫기"], .nr__notice-close-btn');
    closeBtns.forEach((closeBtn) => {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        checkAndSaveTodayPreference(content);
        const openerBtn = buttons[index] || (activeIndex >= 0 ? buttons[activeIndex] : null);
        closeAll(true, openerBtn);
      });
    });

    content.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        checkAndSaveTodayPreference(content);
        const openerBtn = buttons[index] || (activeIndex >= 0 ? buttons[activeIndex] : null);
        closeAll(true, openerBtn);
      }
    });
  });

  // 바깥 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (activeIndex === -1) return;
    const isInsideNotice = noticeContainer.contains(e.target);
    const isInsideContent = contents.some((c) => c.contains(e.target));
    if (!isInsideNotice && !isInsideContent) {
      checkAndSaveTodayPreference(contents[activeIndex]);
      closeAll(false);
    }
  });

  // ESC 키 전역 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeIndex !== -1) {
      e.preventDefault();
      checkAndSaveTodayPreference(contents[activeIndex]);
      closeAll(true);
    }
  });

  // 초기 오픈 상태 처리 (기본: 0번 방재속보 자동 오픈)
  // 오늘 날짜 기준 '오늘 다시 열지 않기' 쿠키가 유효한 경우, defaultOpen: 0 (또는 어떠한 값)이어도 절대 뜨지 않고 닫힌 상태를 유지합니다.
  const defaultOpen = options.defaultOpen !== undefined ? options.defaultOpen : 0;
  const isHidden = isHiddenToday();

  if (defaultOpen !== false && defaultOpen !== null && defaultOpen !== -1 && !isHidden) {
    const initialIdx = resolveTargetIndex(defaultOpen);
    openIndex(initialIdx);
  } else {
    // defaultOpen이 false/null이거나, 오늘 날짜 기준 쿠키가 존재하는 경우 100% 전체 닫힘 처리
    closeAll();
  }

  const instance = {
    open: openNotice,
    close: closeNotice,
    toggle: toggleNotice,
    getActiveIndex: () => activeIndex,
    isOpen: () => activeIndex !== -1,
    isHiddenToday,
    setHideToday: setHideNoticeToday,
    clearHideToday: clearHideNoticeToday,
  };

  noticeContainer._noticeInstance = instance;

  // 전역 함수로 컨트롤할 수 있도록 등록
  if (typeof window !== 'undefined') {
    window.noticeDropdown = instance;
    window.openNotice = openNotice;
    window.closeNotice = closeNotice;
    window.toggleNotice = toggleNotice;
    window.clearNoticeTodayCookie = clearHideNoticeToday;
  }

  return instance;
};

/**
 * 전국특보 팝업 내부 기상특보 / 예비특보 탭 전환 제어 함수 (initSpecialReportTabs)
 * 탭 버튼 클릭 및 키보드 좌우 탐색 시 대응하는 패널을 토글합니다.
 */
export const initSpecialReportTabs = () => {
  const tabsContainer = document.querySelector('.nr__special-report-tabs');
  if (!tabsContainer) return null;

  const tabBtns = Array.from(tabsContainer.querySelectorAll('.nr__special-report-tab-btn'));
  const panels = Array.from(document.querySelectorAll('.nr__special-report-panel'));
  if (!tabBtns.length) return null;

  const activateTab = (targetBtn) => {
    tabBtns.forEach((btn) => {
      btn.classList.remove('is-active');
      btn.setAttribute('aria-selected', 'false');
    });
    panels.forEach((panel) => {
      panel.classList.remove('is-active');
      panel.setAttribute('hidden', '');
    });

    targetBtn.classList.add('is-active');
    targetBtn.setAttribute('aria-selected', 'true');

    const panelId = targetBtn.getAttribute('aria-controls');
    const targetPanel = panelId ? document.getElementById(panelId) : null;
    if (targetPanel) {
      targetPanel.classList.add('is-active');
      targetPanel.removeAttribute('hidden');
    }
  };

  tabBtns.forEach((btn, idx) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      activateTab(btn);
    });

    btn.addEventListener('keydown', (e) => {
      let nextIdx = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIdx = (idx + 1) % tabBtns.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIdx = (idx - 1 + tabBtns.length) % tabBtns.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIdx = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIdx = tabBtns.length - 1;
      }

      if (nextIdx >= 0) {
        tabBtns[nextIdx].focus();
        activateTab(tabBtns[nextIdx]);
      }
    });
  });

  return {
    activateTab,
  };
};

/**
 * 방재속보 및 전국특보 도움말 버튼 툴팁 제어 함수 (initNoticeHelpTooltips)
 * 호버(CSS) 외에 터치 디바이스 및 키보드 인터랙션을 보강합니다.
 */
export const initNoticeHelpTooltips = () => {
  const helpBtns = document.querySelectorAll('.nr__notice-help-btn');
  if (!helpBtns.length) return null;

  helpBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      // 툴팁 내부 링크나 텍스트 클릭 시 이벤트 버블링 방지
      if (e.target.closest('.tcor')) {
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      const isActive = btn.classList.contains('is-active');
      helpBtns.forEach((b) => b.classList.remove('is-active'));
      if (!isActive) {
        btn.classList.add('is-active');
      }
    });
  });

  // 바깥 클릭 시 모든 도움말 툴팁 active 해제
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nr__notice-help-btn')) {
      helpBtns.forEach((b) => b.classList.remove('is-active'));
    }
  });

  // ESC 키 누를 때 툴팁 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      helpBtns.forEach((b) => b.classList.remove('is-active'));
    }
  });
};

