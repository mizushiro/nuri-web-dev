/**
 * 사이드바(LNB) 동적 메뉴 컴포넌트 (ui-aside.js)
 * aside-menu.json 데이터를 기반으로 서브페이지 사이드 메뉴를 동적으로 렌더링하고
 * 활성 메뉴 상태 제어 및 2depth 아코디언 토글을 지원합니다.
 */

/**
 * 외부 링크(새창 열림) SVG 아이콘 HTML 생성
 */
const getExternalIconHtml = () => `
  <svg class="nr__aside-icon-external" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
`;

/**
 * 북(누리집) SVG 아이콘 HTML 생성
 */
const getBookIconHtml = () => `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#0088FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="#0088FF" fill-opacity="0.15" stroke="#0088FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="8" y1="7" x2="16" y2="7" stroke="#0088FF" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="8" y1="11" x2="14" y2="11" stroke="#0088FF" stroke-width="1.8" stroke-linecap="round"/>
  </svg>
`;

/**
 * Aside 메뉴 렌더링 함수
 * @param {Object} category - aside-menu.json 내 특정 카테고리 데이터
 * @param {Object} quickBanner - 하단 배너 데이터
 * @param {Object} options - 활성 메뉴 옵션
 */
export const renderAsideMenu = (container, category, quickBanner, options = {}) => {
  if (!container || !category) return;

  const activeCategory = options.category || category.id;
  const targetActiveDepth2 = options.activeDepth2 || 'weather-forecast';
  const targetActiveDepth3 = options.activeDepth3 || '해상 예보';

  let html = `
    <nav class="nr__aside-nav" aria-label="사이드 메뉴">
      <!-- 1. 사이드바 대제목 -->
      <div class="nr__aside-header">
        <h2 class="nr__aside-title">
          <a href="${category.link || '#'}" class="nr__aside-title-link">${category.title}</a>
        </h2>
      </div>

      <!-- 2. 2Depth 메뉴 리스트 및 3Depth 서브메뉴 -->
      <div class="nr__aside-body">
        <ul class="nr__aside-depth2-list">
  `;

  if (Array.isArray(category.depth2)) {
    category.depth2.forEach((d2) => {
      const isD2Active = d2.id === targetActiveDepth2 
        || d2.title === targetActiveDepth2 
        || d2.isActive === true;

      const hasSubGroups = Array.isArray(d2.depth3Groups) && d2.depth3Groups.length > 0;

      html += `
        <li class="nr__aside-depth2-item ${isD2Active ? 'is-active' : ''}">
          <a href="${d2.link || '#'}" 
             class="nr__aside-depth2-link ${isD2Active ? 'active' : ''}" 
             data-id="${d2.id}"
             ${isD2Active ? 'aria-current="page"' : ''}>
            ${d2.title}
          </a>
      `;

      if (hasSubGroups) {
        html += `
          <div class="nr__aside-panel" style="${isD2Active ? '' : 'display: none;'}">
        `;

        d2.depth3Groups.forEach((group) => {
          if (Array.isArray(group.items) && group.items.length > 0) {
            html += `<ul class="nr__aside-depth3-group">`;
            group.items.forEach((item) => {
              const isItemActive = isD2Active && (
                item.id === targetActiveDepth3 || 
                item.title === targetActiveDepth3 || 
                item.isActive === true
              );
              const isExternal = item.isExternal === true;
              const targetAttr = isExternal ? 'target="_blank" title="새창열림"' : '';

              html += `
                <li class="nr__aside-depth3-item">
                  <a href="${item.link || '#'}" 
                     class="nr__aside-depth3-link ${isItemActive ? 'active' : ''}" 
                     ${isItemActive ? 'aria-current="page"' : ''}
                     ${targetAttr}>
                    <span>${item.title}</span>
                    ${isExternal ? getExternalIconHtml() : ''}
                  </a>
                </li>
              `;
            });
            html += `</ul>`;
          }
        });

        html += `</div>`;
      }

      html += `</li>`;
    });
  }

  html += `
        </ul>
      </div>
  `;

  // 3. 하단 배너 카드 (기상청 누리집)
  if (quickBanner) {
    const isBannerExternal = quickBanner.isExternal !== false;
    const bannerTargetAttr = isBannerExternal ? 'target="_blank" title="새창열림"' : '';
    html += `
      <div class="nr__aside-footer">
        <a href="${quickBanner.link || 'https://www.kma.go.kr/kma/'}" 
           ${bannerTargetAttr} 
           class="nr__aside-banner">
          <span class="nr__aside-banner-icon">
            ${getBookIconHtml()}
          </span>
          <span class="nr__aside-banner-text">${quickBanner.title || '기상청 누리집'}</span>
        </a>
      </div>
    `;
  }

  html += `</nav>`;

  container.innerHTML = html;

  // 4. 인터랙션: 2depth 클릭 시 아코디언 토글
  const depth2Links = container.querySelectorAll('.nr__aside-depth2-link');
  depth2Links.forEach((link) => {
    link.addEventListener('click', function (e) {
      const parentItem = this.closest('.nr__aside-depth2-item');
      const panel = parentItem?.querySelector('.nr__aside-panel');
      if (panel) {
        // 서브메뉴가 있는 경우 토글
        e.preventDefault();
        const wasActive = parentItem.classList.contains('is-active');
        
        // 형제 항목들 닫기
        container.querySelectorAll('.nr__aside-depth2-item').forEach(item => {
          if (item !== parentItem) {
            item.classList.remove('is-active');
            item.querySelector('.nr__aside-depth2-link')?.classList.remove('active');
            const otherPanel = item.querySelector('.nr__aside-panel');
            if (otherPanel) otherPanel.style.display = 'none';
          }
        });

        if (wasActive) {
          parentItem.classList.remove('is-active');
          this.classList.remove('active');
          panel.style.display = 'none';
        } else {
          parentItem.classList.add('is-active');
          this.classList.add('active');
          panel.style.display = 'block';
        }
      }
    });
  });
};

/**
 * Aside 메뉴 초기화 및 JSON 로드 함수
 * @param {Object} [customOptions] - 카테고리 및 활성 메뉴 옵션
 */
export const initAsideMenu = async (customOptions = {}) => {
  const asideContainer = document.querySelector('.nr__aside, aside');
  if (!asideContainer) return;

  // 서브 디렉토리 여부에 따른 json 경로 결정
  const isSubPage = window.location.pathname.includes('/sub/') || document.querySelector('.nr__sub');
  const defaultJsonPath = isSubPage ? '../resources/json/aside-menu.json' : './resources/json/aside-menu.json';
  const jsonPath = customOptions.jsonPath || defaultJsonPath;

  // 브레드크럼이나 data 속성으로부터 현재 활성 메뉴 유추
  const pageCategoryAttr = asideContainer.dataset.asideCategory || document.body.dataset.asideCategory;
  const pageActiveDepth2Attr = asideContainer.dataset.asideDepth2 || document.body.dataset.asideDepth2;
  const pageActiveDepth3Attr = asideContainer.dataset.asideActive || asideContainer.dataset.asideDepth3 || document.body.dataset.asideActive;

  const breadcrumbActive = document.querySelector('#breadcrumb li:last-child span')?.textContent?.trim();

  const options = {
    category: customOptions.category || pageCategoryAttr || 'forecast',
    activeDepth2: customOptions.activeDepth2 || pageActiveDepth2Attr || 'weather-forecast',
    activeDepth3: customOptions.activeDepth3 || pageActiveDepth3Attr || breadcrumbActive || '해상 예보',
    ...customOptions
  };

  try {
    const response = await fetch(jsonPath);
    if (!response.ok) {
      throw new Error(`Failed to load aside menu JSON: ${response.status}`);
    }
    const data = await response.json();
    
    // 카테고리 매칭
    const targetCategory = data.categories.find(c => 
      c.id === options.category || c.title.replace(/\s/g, '').includes(options.category.replace(/\s/g, ''))
    ) || data.categories[0];

    renderAsideMenu(asideContainer, targetCategory, data.quickBanner, options);
  } catch (error) {
    console.error('Error initializing aside menu:', error);
  }
};
