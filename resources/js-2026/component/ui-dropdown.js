/**
 * 드롭다운 UI 컴포넌트 (ui-dropdown.js)
 * 트리거(.nr__drop-btn)와 콘텐츠(.nr__drop-menu)를 aria-controls와 id로 직접 연결하여
 * 부모 컨테이너(.nr__drop-wrap) 종속 없이 독립적으로 동작 가능합니다.
 * WAI-ARIA 웹접근성, 포커스 진입 및 순환(Focus Trap), 포커스 복원(Focus Restoration),
 * data-position 위치 제어를 지원합니다.
 */

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

  // 중복 초기화 방지
  if (dropBtn._dropdownInitialized && dropBtn._dropdownInstance) {
    return dropBtn._dropdownInstance;
  }
  if (dropMenu._dropdownInitialized && dropMenu._dropdownInstance) {
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
  const { onSelect = null, position = null, hoverDelay = 150 } = options;

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

    if (typeof onSelect === 'function') {
      onSelect(item.dataset.view || item.value || item.textContent.trim(), item);
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

  // 패널 내부 닫기 버튼 및 ESC 이벤트 처리 (닫은 후 열었던 버튼으로 포커스 이동)
  contents.forEach((content, index) => {
    const closeBtns = content.querySelectorAll('button[aria-label="닫기"], .nr__notice-close-btn');
    closeBtns.forEach((closeBtn) => {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const openerBtn = buttons[index] || (activeIndex >= 0 ? buttons[activeIndex] : null);
        closeAll(true, openerBtn);
      });
    });

    content.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
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
      closeAll(false);
    }
  });

  // ESC 키 전역 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeIndex !== -1) {
      e.preventDefault();
      closeAll(true);
    }
  });

  return {
    open: openIndex,
    close: (restoreFocus = false, targetBtn = null) => closeAll(restoreFocus, targetBtn),
    toggle: toggleIndex,
    getActiveIndex: () => activeIndex,
  };
};
