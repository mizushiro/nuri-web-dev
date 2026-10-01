/**
 * 사이드바(LNB) 동적 메뉴 컴포넌트 (ui-aside.js)
 * aside-menu.json 데이터를 기반으로 서브페이지 사이드 메뉴를 직접 렌더링합니다.
 *
 * 1. data-dep1 / initAsideMenu({ dep1, dep2, dep3 }) 인자값이 넘어오면 해당 번호로 선택
 * 2. 넘어오는 data / 옵션 값이 없다면, 주소창(window.location.pathname)의 폴더 및 파일명을 분석하여
 *    .html / .do 확장자 및 /w/ 컨텍스트 무관하게 자동으로 메뉴를 매칭하여 활성화합니다.
 */

/**
 * 북(누리집) 아이콘 HTML 생성
 */
const getBookIconHtml = () => `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#0475F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="#0475F4" fill-opacity="0.15" stroke="#0475F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="8" y1="7" x2="16" y2="7" stroke="#0475F4" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="8" y1="11" x2="14" y2="11" stroke="#0475F4" stroke-width="1.8" stroke-linecap="round"/>
  </svg>
`;

/**
 * aside-menu.json 캐시
 */
export let cachedMenuData = null;

/**
 * JSON 데이터 불러오기
 */
export const fetchMenuData = async (jsonPath) => {
  if (cachedMenuData) return cachedMenuData;
  const response = await fetch(jsonPath);
  if (!response.ok) {
    throw new Error(`Failed to load aside menu JSON from ${jsonPath}: ${response.status}`);
  }
  cachedMenuData = await response.json();
  return cachedMenuData;
};

/**
 * 경로에서 확장자(.html, .do 등) 및 컨텍스트(/w 등)를 제거하고 정규화하는 함수
 * 예: "/w/special-report/ocean.do" -> "special-report/ocean"
 * 예: "/forecast/ocean.html" -> "forecast/ocean"
 */
export const normalizeUrlPath = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return '';
  let path = urlStr.split('?')[0].split('#')[0];
  if (path.includes('://')) {
    try {
      path = new URL(path).pathname;
    } catch (e) {
      path = path.replace(/^[a-zA-Z]+:\/\/[^\/]+/, '');
    }
  }
  // 확장자 제거 (.html, .do, .jsp, .php, .asp 등)
  path = path.replace(/\.(html|do|jsp|php|asp)$/i, '');
  // 전자정부/운영환경의 공통 컨텍스트 경로 (/w/, /nuri-web/ 등) 제거
  path = path.replace(/^\/w(\/|$)/i, '/');
  path = path.replace(/^\/nuri-web(\/|$)/i, '/');
  // 앞뒤 슬래시 정리 및 소문자화
  return path.toLowerCase().replace(/^\/+|\/+$/g, '');
};

/**
 * 현재 브라우저 URL 경로를 기반으로 일치하는 메뉴(dep1, dep2, dep3)를 자동 탐색하는 함수
 * @param {Array} categories - aside-menu.json의 categories 배열
 * @param {string} currentPath - window.location.pathname
 * @returns {Object|null} { dep1, dep2, dep3, category }
 */
export const findMenuByPath = (categories, currentPath, breadcrumbText = '') => {
  const curNorm = normalizeUrlPath(currentPath);
  const curSegments = curNorm ? curNorm.split('/') : [];
  const curFilename = curSegments[curSegments.length - 1] || ''; // 파일명 (예: "ocean")
  const curFolder = curSegments.length > 1 ? curSegments[curSegments.length - 2] : ''; // 직전 폴더명 (예: "special-report")
  const normBread = breadcrumbText ? breadcrumbText.replace(/[\s·]/g, '').toLowerCase() : '';

  let bestMatch = null;
  let highestScore = 0;

  categories.forEach((cat, catIdx) => {
    const catNorm = normalizeUrlPath(cat.link);
    const catFolder = catNorm.split('/')[0] || cat.id;

    if (Array.isArray(cat.depth2)) {
      cat.depth2.forEach((d2, d2Idx) => {
        const d2Norm = normalizeUrlPath(d2.link);
        const d2Segments = d2Norm.split('/');
        const d2File = d2Segments[d2Segments.length - 1];
        const d2Folder = d2Segments.length > 1 ? d2Segments[d2Segments.length - 2] : '';

        // 3Depth 아이템 검색
        let itemCounter = 0;
        if (Array.isArray(d2.depth3Groups)) {
          d2.depth3Groups.forEach((group) => {
            if (Array.isArray(group.items)) {
              group.items.forEach((item) => {
                itemCounter += 1;

                // 외부 링크(새창 열림)는 내부 페이지 URL 매칭 대상에서 제외
                if (item.isExternal || (item.link && item.link.startsWith('http'))) {
                  return;
                }

                const itemNorm = normalizeUrlPath(item.link);
                const itemSegments = itemNorm.split('/');
                const itemFile = itemSegments[itemSegments.length - 1];
                const itemFolder = itemSegments.length > 1 ? itemSegments[itemSegments.length - 2] : '';
                const itemTitleNorm = (item.title || '').replace(/[\s·]/g, '').toLowerCase();

                // 점수 계산
                // 1) 브레드크럼(Breadcrumb) 텍스트 일치 (예: '해상예보' === '해상예보')
                if (normBread && itemTitleNorm && (normBread === itemTitleNorm || normBread.includes(itemTitleNorm) || itemTitleNorm.includes(normBread))) {
                  const score = 120;
                  if (score > highestScore) {
                    highestScore = score;
                    bestMatch = { dep1: catIdx + 1, dep2: d2Idx + 1, dep3: itemCounter, category: cat };
                  }
                }

                // 2) 전체 경로 완전 일치 (예: "forecast/ocean" === "forecast/ocean" 또는 "special-report/overall")
                if (curNorm && (curNorm === itemNorm || curNorm.endsWith('/' + itemNorm))) {
                  const score = 100;
                  if (score > highestScore) {
                    highestScore = score;
                    bestMatch = { dep1: catIdx + 1, dep2: d2Idx + 1, dep3: itemCounter, category: cat };
                  }
                }

                // 3) 폴더명과 파일명이 모두 일치
                else if (curFolder && itemFolder && curFolder === itemFolder && curFilename === itemFile) {
                  const score = 90;
                  if (score > highestScore) {
                    highestScore = score;
                    bestMatch = { dep1: catIdx + 1, dep2: d2Idx + 1, dep3: itemCounter, category: cat };
                  }
                }

                // 4) 파일명(슬러그)이 일치 (예: 'ocean' === 'ocean')
                else if (curFilename && itemFile && curFilename === itemFile && curFilename !== 'index') {
                  const score = 85;
                  if (score > highestScore) {
                    highestScore = score;
                    bestMatch = { dep1: catIdx + 1, dep2: d2Idx + 1, dep3: itemCounter, category: cat };
                  }
                }
              });
            }
          });
        }

        // 2Depth의 link와 직접 일치하는지 검사
        if (d2Norm && !d2.isExternal && (!d2.link || !d2.link.startsWith('http'))) {
          const d2TitleNorm = (d2.title || '').replace(/[\s·]/g, '').toLowerCase();

          // 브레드크럼 일치
          if (normBread && d2TitleNorm && (normBread === d2TitleNorm || normBread.includes(d2TitleNorm))) {
            const score = 110;
            if (score > highestScore) {
              highestScore = score;
              bestMatch = { dep1: catIdx + 1, dep2: d2Idx + 1, dep3: (d2.depth3Groups ? 1 : null), category: cat };
            }
          }

          if (curNorm === d2Norm || curNorm.endsWith('/' + d2Norm)) {
            const score = 80;
            if (score > highestScore) {
              highestScore = score;
              bestMatch = { dep1: catIdx + 1, dep2: d2Idx + 1, dep3: (d2.depth3Groups ? 1 : null), category: cat };
            }
          } else if (curFilename && d2File && curFilename === d2File && curFilename !== 'index') {
            const score = 65;
            if (score > highestScore) {
              highestScore = score;
              bestMatch = { dep1: catIdx + 1, dep2: d2Idx + 1, dep3: (d2.depth3Groups ? 1 : null), category: cat };
            }
          }
        }
      });
    }

    // 1Depth 카테고리 폴더명 또는 ID 일치 검사
    if (curFolder && (curFolder === catFolder || curFolder === cat.id)) {
      const score = 40;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = { dep1: catIdx + 1, dep2: 1, dep3: 1, category: cat };
      }
    }
  });

  return bestMatch;
};

/**
 * Aside 메뉴 렌더링 함수
 */
export const renderAsideMenu = (container, category, quickBanner, selectedState = {}) => {
  if (!container || !category) return;

  const { targetD2Index, targetD3Index, targetD2Raw, targetD3Raw } = selectedState;

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
    category.depth2.forEach((d2, d2Idx) => {
      // 2Depth 활성화 판별
      const isD2Active = (targetD2Index === d2Idx + 1) ||
        (targetD2Raw && (d2.id === targetD2Raw || d2.title === targetD2Raw));

      const hasSubGroups = Array.isArray(d2.depth3Groups) && d2.depth3Groups.length > 0;
      const isD2External = d2.isExternal === true;

      html += `
        <li class="nr__aside-depth2-item ${isD2Active ? 'is-active' : ''}">
          <a href="${d2.link || '#'}" 
             class="nr__aside-depth2-link ${isD2Active ? 'active' : ''}" 
             data-id="${d2.id}"
             data-index="${d2Idx + 1}"
             ${isD2Active ? 'aria-current="page"' : ''}
             ${isD2External ? 'target="_blank" title="새창열림"' : ''}>
            <span>${d2.title}</span>
          </a>
      `;

      if (hasSubGroups) {
        html += `
          <div class="nr__aside-panel" style="${isD2Active ? '' : 'display: none;'}">
        `;

        let itemCounter = 0;
        d2.depth3Groups.forEach((group) => {
          if (Array.isArray(group.items) && group.items.length > 0) {
            html += `<ul class="nr__aside-depth3-group">`;
            group.items.forEach((item) => {
              itemCounter += 1;
              const isItemActive = isD2Active && (
                (targetD3Index === itemCounter) ||
                (targetD3Raw && (item.id === targetD3Raw || item.title === targetD3Raw))
              );
              const isExternal = item.isExternal === true;
              const targetAttr = isExternal ? 'target="_blank" title="새창열림"' : '';

              html += `
                <li class="nr__aside-depth3-item">
                  <a href="${item.link || '#'}" 
                     class="nr__aside-depth3-link ${isItemActive ? 'active' : ''}" 
                     data-id="${item.id}"
                     data-index="${itemCounter}"
                     ${isItemActive ? 'aria-current="page"' : ''}
                     ${targetAttr}>
                    <span>${item.title}</span>
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
          <span class="nr__aside-banner-icon icon-aspect-book" data-size="24"></span>
          <span class="nr__aside-banner-text">${quickBanner.title || '기상청 누리집'}</span>
        </a>
      </div>
    `;
  }

  html += `</nav>`;

  container.innerHTML = html;

  // 4. 2Depth 메뉴 클릭 시 아코디언 토글 인터랙션
  const depth2Links = container.querySelectorAll('.nr__aside-depth2-link');
  depth2Links.forEach((link) => {
    link.addEventListener('click', function (e) {
      const parentItem = this.closest('.nr__aside-depth2-item');
      const panel = parentItem?.querySelector('.nr__aside-panel');
      if (panel) {
        e.preventDefault();
        const wasActive = parentItem.classList.contains('is-active');

        // 다른 2Depth 패널 닫기
        container.querySelectorAll('.nr__aside-depth2-item').forEach((item) => {
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
          panel.style.display = 'flex';
        }
      }
    });
  });
};

/**
 * Aside 메뉴 초기화 함수
 * @param {Object} [options={}] - 메뉴 선택 파라미터 (미지정 시 URL 자동 분석)
 * @param {number|string} [options.dep1] - 1Depth 대메뉴 (1: 특보·예보, 2: 현재날씨, 3: 위험기상, 4: 수치일기도, 5: 기후·기후변화, 6: 지진·화산)
 * @param {number|string} [options.dep2] - 2Depth 메뉴 인덱스(1-based) 또는 ID/제목
 * @param {number|string} [options.dep3] - 3Depth 메뉴 인덱스(1-based) 또는 ID/제목
 * @param {string} [options.target] - 사이드바를 주입할 컨테이너 선택자 (기본: '.nr__aside, aside')
 * @param {string} [options.jsonPath] - JSON 파일 경로 (미지정 시 자동 결정)
 */
export const initAsideMenu = async (options = {}) => {
  const container = document.querySelector(options.target || '.nr__aside, aside');
  if (!container) return;

  // JSON 경로 결정 (서브 디렉터리 경로 자동 보정)
  const isSubPage = window.location.pathname.includes('/sub/') ||
                    window.location.pathname.includes('/special-report/') ||
                    window.location.pathname.includes('/forecast/') ||
                    window.location.pathname.includes('/weather/') ||
                    window.location.pathname.includes('/typhoon/') ||
                    window.location.pathname.includes('/climate/') ||
                    window.location.pathname.includes('/earthquake/') ||
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
      const breadcrumbActive = document.querySelector('#breadcrumb li:last-child span, #breadcrumb li:last-child a')?.textContent?.trim() || '';
      const urlMatch = findMenuByPath(data.categories, window.location.pathname, breadcrumbActive);
      if (urlMatch) {
        dep1 = urlMatch.dep1;
        dep2 = dep2 ?? urlMatch.dep2;
        dep3 = dep3 ?? urlMatch.dep3;
      }
    }

    // 기본값 폴백 (1, 1, 1)
    dep1 = dep1 ?? 1;
    dep2 = dep2 ?? 1;
    dep3 = dep3 ?? (dep2 ? 1 : null);

    // 3. dep1 매칭 (숫자 인덱스 또는 ID/타이틀 매칭)
    let selectedCategory = null;
    if (typeof dep1 === 'number' || (!isNaN(dep1) && typeof dep1 === 'string' && dep1.trim() !== '')) {
      const idx = parseInt(dep1, 10) - 1;
      selectedCategory = data.categories[idx];
    }
    if (!selectedCategory && typeof dep1 === 'string') {
      const normalizedDep1 = dep1.replace(/[\s·]/g, '');
      selectedCategory = data.categories.find(c => 
        c.id === dep1 || c.title.replace(/[\s·]/g, '') === normalizedDep1
      );
    }
    if (!selectedCategory) {
      selectedCategory = data.categories[0];
    }

    // 4. dep2 매칭 준비
    let targetD2Index = null;
    let targetD2Raw = null;
    if (typeof dep2 === 'number' || (!isNaN(dep2) && typeof dep2 === 'string' && dep2.trim() !== '')) {
      targetD2Index = parseInt(dep2, 10);
    } else if (typeof dep2 === 'string') {
      targetD2Raw = dep2;
    }

    // 5. dep3 매칭 준비
    let targetD3Index = null;
    let targetD3Raw = null;
    if (typeof dep3 === 'number' || (!isNaN(dep3) && typeof dep3 === 'string' && dep3.trim() !== '')) {
      targetD3Index = parseInt(dep3, 10);
    } else if (typeof dep3 === 'string') {
      targetD3Raw = dep3;
    }

    renderAsideMenu(container, selectedCategory, data.quickBanner, {
      targetD2Index,
      targetD2Raw,
      targetD3Index,
      targetD3Raw
    });

  } catch (error) {
    console.error('Error initializing aside menu:', error);
  }
};

// 전역 호출 지원
if (typeof window !== 'undefined') {
  window.initAsideMenu = initAsideMenu;
}
