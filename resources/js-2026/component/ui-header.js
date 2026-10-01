/**
 * 헤더(GNB) 동적 메뉴 생성 및 활성화 컴포넌트 (ui-header.js)
 * aside-menu.json 데이터를 활용하여 데스크탑 GNB 및 모바일 전체메뉴를
 * 동적으로 생성(렌더링)하고 현재 주소(window.location.pathname) 정보에 맞춰 자동 활성화(선택)합니다.
 */

import { fetchMenuData, normalizeUrlPath, findMenuByPath } from './ui-aside.js';

/**
 * 절대/상대 링크 경로를 현재 서브페이지 깊이에 맞게 변환하는 헬퍼 함수
 * 예: "/special-report/overall.html" -> 서브페이지면 "../special-report/overall.html", 메인이면 "./special-report/overall.html"
 */
export const resolveLinkPath = (linkStr, isSubPage) => {
  if (!linkStr || linkStr === '#' || linkStr.startsWith('http') || linkStr.startsWith('//')) {
    return linkStr || '#';
  }
  const clean = linkStr.replace(/^\/+/, '');
  return isSubPage ? `../${clean}` : `./${clean}`;
};

/**
 * Header 메뉴(데스크탑 GNB, 모바일 탭, 모바일 서브메뉴) 동적 렌더링 함수
 * @param {HTMLElement} container - 헤더 컨테이너
 * @param {Array} categories - aside-menu.json의 categories 배열
 * @param {Object} quickBanner - aside-menu.json의 quickBanner 객체
 * @param {Object} selectedState - { dep1, dep2, dep3 }
 * @param {boolean} isSubPage - 서브페이지 여부
 */
export const renderHeaderMenu = (container, categories, quickBanner, selectedState = {}, isSubPage = false) => {
  if (!container || !Array.isArray(categories)) return;

  const { dep1, dep2, dep3 } = selectedState;

  // ----------------------------------------------------
  // 1. 데스크탑 GNB (.nr__gnb-menu) 동적 렌더링
  // ----------------------------------------------------
  const gnbMenuEl = container.querySelector('.nr__gnb-menu');
  if (gnbMenuEl) {
    let gnbHtml = '';
    categories.forEach((cat, idx) => {
      const isSelected = dep1 === (idx + 1);
      const link = resolveLinkPath(cat.link, isSubPage);
      gnbHtml += `
        <li class="nr__gnb-item ${isSelected ? 'is-active active' : ''}" data-dep1="${idx + 1}">
          <a href="${link}" 
             class="nr__gnb-link ${isSelected ? 'active' : ''}" 
             data-trigger="gnb" 
             data-id="${cat.id}"
             ${isSelected ? 'aria-current="page"' : ''}>
            ${cat.title}
          </a>
        </li>
      `;
    });

    // 기상청 누리집 퀵배너 (외부 링크)
    const banner = quickBanner || {
      title: '기상청 누리집',
      link: 'https://www.kma.go.kr/kma/',
      isExternal: true
    };
    gnbHtml += `
      <li class="nr__gnb-item">
        <a href="${banner.link}" class="nr__gnb-link" target="_blank" title="새 창 열기">
          ${banner.title}
          <span data-icon-cricle="gray">
            <i data-icon="link"></i>
          </span>
        </a>
      </li>
    `;
    gnbMenuEl.innerHTML = gnbHtml;
  }

  // ----------------------------------------------------
  // 2. 모바일 1Depth 탭 (.nr__mobile-tabs ul) 동적 렌더링
  // ----------------------------------------------------
  const mobileTabsEl = container.querySelector('.nr__mobile-tabs ul');
  if (mobileTabsEl) {
    let tabsHtml = '';
    // dep1이 없으면 기본 1번 탭 활성화
    const activeDep1 = (dep1 && dep1 >= 1 && dep1 <= categories.length) ? dep1 : 1;

    categories.forEach((cat, idx) => {
      const isSelected = activeDep1 === (idx + 1);
      tabsHtml += `
        <li>
          <a href="#mGnb-anchor${idx + 1}" 
             class="nr__mobile-tab-btn ${isSelected ? 'active' : ''}" 
             ${isSelected ? 'aria-selected="true"' : 'aria-selected="false"'}
             data-dep1="${idx + 1}">
            ${cat.title}
          </a>
        </li>
      `;
    });
    mobileTabsEl.innerHTML = tabsHtml;
  }

  // ----------------------------------------------------
  // 3. 모바일 서브메뉴 리스트 (.nr__mobile-sub-wrap) 동적 렌더링
  // ----------------------------------------------------
  const mobileSubWrapEl = container.querySelector('.nr__mobile-sub-wrap');
  if (mobileSubWrapEl) {
    let subWrapHtml = '';
    const activeDep1 = (dep1 && dep1 >= 1 && dep1 <= categories.length) ? dep1 : 1;

    categories.forEach((cat, catIdx) => {
      const isCatActive = activeDep1 === (catIdx + 1);
      const isCurrentPageCategory = dep1 === (catIdx + 1);

      subWrapHtml += `
        <div class="nr__mobile-sub-list ${isCatActive ? 'active' : ''}" id="mGnb-anchor${catIdx + 1}">
          <h2 class="nr__mobile-sub-title">${cat.title}</h2>
          <ul>
      `;

      if (Array.isArray(cat.depth2)) {
        cat.depth2.forEach((d2, d2Idx) => {
          const isD2Active = isCurrentPageCategory && (dep2 === d2Idx + 1);
          const hasDepth3 = Array.isArray(d2.depth3Groups) && d2.depth3Groups.length > 0;
          const d2Link = resolveLinkPath(d2.link, isSubPage);
          const d2ExternalAttr = d2.isExternal ? 'target="_blank" title="새창열림"' : '';

          if (hasDepth3) {
            subWrapHtml += `
              <li>
                <a href="${d2Link}" 
                   class="nr__mobile-sub-link has-depth3 ${isD2Active ? 'active' : ''}" 
                   data-id="${d2.id}"
                   aria-expanded="${isD2Active ? 'true' : 'false'}"
                   ${d2ExternalAttr}>
                  ${d2.title}
                </a>
                <div class="nr__mobile-depth3-wrap ${isD2Active ? 'is-open' : ''}">
                  <ul>
            `;

            let itemCounter = 0;
            d2.depth3Groups.forEach((group) => {
              if (Array.isArray(group.items)) {
                group.items.forEach((item) => {
                  itemCounter += 1;
                  const isItemActive = isD2Active && (dep3 === itemCounter);
                  const itemLink = resolveLinkPath(item.link, isSubPage);
                  const itemExternalAttr = item.isExternal ? 'target="_blank" title="새창열림"' : '';

                  subWrapHtml += `
                    <li>
                      <a href="${itemLink}" 
                         class="nr__mobile-depth3-link ${isItemActive ? 'active' : ''}" 
                         data-id="${item.id}"
                         ${isItemActive ? 'aria-current="page"' : ''}
                         ${itemExternalAttr}>
                        ${item.title}
                      </a>
                    </li>
                  `;
                });
              }
            });

            subWrapHtml += `
                  </ul>
                </div>
              </li>
            `;
          } else {
            subWrapHtml += `
              <li>
                <a href="${d2Link}" 
                   class="nr__mobile-sub-link ${isD2Active ? 'active' : ''}" 
                   data-id="${d2.id}"
                   ${isD2Active ? 'aria-current="page"' : ''}
                   ${d2ExternalAttr}>
                  ${d2.title}
                </a>
              </li>
            `;
          }
        });
      }

      subWrapHtml += `
          </ul>
        </div>
      `;
    });

    mobileSubWrapEl.innerHTML = subWrapHtml;
  }
};

/**
 * 모바일 메뉴 인터랙션(탭 전환, 아코디언 토글) 이벤트 등록 함수
 */
export const attachHeaderEvents = (container) => {
  const mobileNav = container.querySelector('#mobile-nav') || document.querySelector('#mobile-nav');
  if (!mobileNav) return;

  // 이미 이벤트가 등록되어 있다면 중복 등록 방지 (더블 토글 방지)
  if (mobileNav.dataset.navInitialized === 'true') return;
  mobileNav.dataset.navInitialized = 'true';

  mobileNav.addEventListener('click', (e) => {
    // 1. 1Depth 탭 전환
    const tabBtn = e.target.closest('.nr__mobile-tab-btn');
    if (tabBtn) {
      e.preventDefault();
      const tabBtns = mobileNav.querySelectorAll('.nr__mobile-tab-btn');
      const subLists = mobileNav.querySelectorAll('.nr__mobile-sub-list');

      tabBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');

      const targetId = tabBtn.getAttribute('href')?.replace('#', '');
      if (targetId) {
        subLists.forEach((list) => {
          if (list.id === targetId) {
            list.classList.add('active');
            list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            list.classList.remove('active');
          }
        });
      }
      return;
    }

    // 2. 2Depth has-depth3 아코디언 토글
    const depth3Trigger = e.target.closest('.nr__mobile-sub-link.has-depth3');
    if (depth3Trigger) {
      e.preventDefault();
      const isOpen = depth3Trigger.classList.toggle('active');
      depth3Trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      const wrap = depth3Trigger.nextElementSibling;
      if (wrap) {
        wrap.classList.toggle('is-open', isOpen);
      }
      return;
    }
  });
};

/**
 * 헤더 메뉴 초기화 및 생성 함수
 * @param {Object} [options={}] - 선택 파라미터 (미지정 시 URL 자동 분석)
 * @param {number|string} [options.dep1] - 1Depth 대메뉴 번호 (1~6) 또는 ID/제목
 * @param {number|string} [options.dep2] - 2Depth 메뉴 번호 (1-based index)
 * @param {number|string} [options.dep3] - 3Depth 메뉴 번호 (1-based index)
 * @param {string} [options.target] - 헤더 컨테이너 선택자 (기본: '.nr__header, header')
 * @param {string} [options.jsonPath] - JSON 파일 경로 (미지정 시 자동 계산)
 */
export const initHeaderMenu = async (options = {}) => {
  const container = document.querySelector(options.target || '.nr__header, header');
  if (!container) return;

  const pathname = window.location.pathname;

  // 서브페이지 여부 판단
  const isSubPage = pathname.includes('/sub/') ||
                    pathname.includes('/special-report/') ||
                    pathname.includes('/forecast/') ||
                    pathname.includes('/weather/') ||
                    pathname.includes('/typhoon/') ||
                    pathname.includes('/climate/') ||
                    pathname.includes('/earthquake/') ||
                    pathname.includes('/numerical/') ||
                    !!document.querySelector('.nr__sub');

  const defaultJsonPath = isSubPage ? '../resources/json/aside-menu.json' : './resources/json/aside-menu.json';
  const jsonPath = options.jsonPath || defaultJsonPath;

  try {
    const data = await fetchMenuData(jsonPath);
    if (!data || !Array.isArray(data.categories)) return;

    // 1. 전달받은 옵션 또는 container의 data 속성 확인
    let dep1 = options.dep1 ?? (container.dataset.dep1 ? container.dataset.dep1 : null);
    let dep2 = options.dep2 ?? (container.dataset.dep2 ? container.dataset.dep2 : null);
    let dep3 = options.dep3 ?? (container.dataset.dep3 ? container.dataset.dep3 : null);

    // 2. data 값이나 옵션으로 넘어온 게 없다면, 주소창(pathname) 및 브레드크럼에서 일치하는 메뉴 자동 탐색!
    if (dep1 === null || dep1 === undefined) {
      // 메인 페이지(index.html 또는 '/')인 경우 강제 선택을 하지 않음
      const isMain = !pathname || pathname.endsWith('/') || pathname.endsWith('/index.html') || pathname.endsWith('/index.do');
      if (!isMain || isSubPage) {
        const breadcrumbActive = document.querySelector('#breadcrumb li:last-child span, #breadcrumb li:last-child a')?.textContent?.trim() || '';
        const urlMatch = findMenuByPath(data.categories, pathname, breadcrumbActive);
        if (urlMatch) {
          dep1 = urlMatch.dep1;
          dep2 = dep2 ?? urlMatch.dep2;
          dep3 = dep3 ?? urlMatch.dep3;
        }
      }
    }

    // 3. dep1이 문자열 ID나 제목일 경우 인덱스로 변환 (예: 'forecast' -> 1)
    if (typeof dep1 === 'string' && isNaN(dep1)) {
      const normDep1 = dep1.replace(/[\s·]/g, '');
      const matchedIdx = data.categories.findIndex(c =>
        c.id === dep1 || c.title.replace(/[\s·]/g, '') === normDep1
      );
      if (matchedIdx !== -1) {
        dep1 = matchedIdx + 1;
      }
    } else if (dep1 !== null && dep1 !== undefined) {
      dep1 = parseInt(dep1, 10);
    }

    if (dep2 !== null && dep2 !== undefined && !isNaN(dep2)) {
      dep2 = parseInt(dep2, 10);
    }
    if (dep3 !== null && dep3 !== undefined && !isNaN(dep3)) {
      dep3 = parseInt(dep3, 10);
    }

    // 4. aside-menu.json 데이터를 기반으로 데스크탑 GNB 및 모바일 메뉴 동적 렌더링
    renderHeaderMenu(container, data.categories, data.quickBanner, {
      dep1,
      dep2,
      dep3,
    }, isSubPage);

    // 5. 모바일 메뉴 이벤트 연결
    attachHeaderEvents(container);

  } catch (error) {
    console.error('Error initializing header menu:', error);
  }
};

// 전역 호출 지원
if (typeof window !== 'undefined') {
  window.initHeaderMenu = initHeaderMenu;
}
