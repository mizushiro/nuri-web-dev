/**
 * Loads content from a specified source and inserts it into a DOM element.
 * @param {Object} options - Options for the function.
 * @param {Element} options.area - The DOM element where content will be inserted.
 * @param {string} options.src - The source URL to fetch content from.
 * @param {boolean} [options.insert=false] - Whether to insert content at the beginning or replace it.
 * @param {Function|null} [options.callback=null] - A callback function to execute after loading content.
 * @returns {Promise<string>} A promise that resolves with the fetched content.
 * 
 	 loadContent({
			area: document.querySelector('불러올 영역'),
			src: '파일경로',
			insert: true
		})
		.then(() => {
			//로드 후 실행
		})
		.catch(err => console.error('Error loading header content:', err));
*/
export const loadContent = ({ area, src, insert = false, callback = null }) => {
	return new Promise((resolve, reject) => {
		if (!(area instanceof Element)) {
			console.error('Invalid selector provided.');
			reject(new Error('Invalid DOM element.'));
			return;
		}
		if (!src) {
			reject(new Error('Source (src) is required'));
			return;
		}

		fetch(src)
			.then(response => {
				if (!response.ok) throw new Error(`Failed to fetch ${src}`);
				return response.text();
			})
			.then(result => {
				insert ? area.insertAdjacentHTML('afterbegin', result) : area.innerHTML = result;
				if (callback) callback();
				resolve(result);
			})
			.catch(error => reject(error));
	});
};

/**
 * 오늘 날짜 문자열 반환 (YYYY-MM-DD 형식)
 * @returns {string}
 */
export const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 쿠키 설정 함수
 * @param {string} name - 쿠키 키 이름
 * @param {string} value - 쿠키 값
 * @param {Object} [options] - 옵션
 * @param {boolean} [options.endOfDay=false] - 당일 자정(23:59:59.999)까지 유효하도록 설정
 * @param {number} [options.days] - 유지할 일수
 * @param {Date} [options.expires] - 만료 일시
 * @param {string} [options.path='/'] - 경로
 * @param {string} [options.sameSite='Lax'] - SameSite 설정
 */
export const setCookie = (name, value, options = {}) => {
  if (typeof document === 'undefined') return;

  let expiresStr = '';
  if (options.endOfDay) {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    expiresStr = `; expires=${endOfDay.toUTCString()}`;
  } else if (typeof options.days === 'number') {
    const date = new Date();
    date.setTime(date.getTime() + options.days * 24 * 60 * 60 * 1000);
    expiresStr = `; expires=${date.toUTCString()}`;
  } else if (options.expires instanceof Date) {
    expiresStr = `; expires=${options.expires.toUTCString()}`;
  }

  const path = options.path || '/';
  const sameSite = options.sameSite || 'Lax';
  const domain = options.domain ? `; domain=${options.domain}` : '';
  const secure = options.secure ? '; Secure' : '';

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${expiresStr}; path=${path}${domain}; SameSite=${sameSite}${secure}`;
};

/**
 * 쿠키 조회 함수
 * @param {string} name - 쿠키 키 이름
 * @returns {string|null}
 */
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const target = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const c of cookies) {
    if (c.indexOf(target) === 0) {
      return decodeURIComponent(c.substring(target.length));
    }
  }
  return null;
};

/**
 * 쿠키 삭제 함수
 * @param {string} name - 쿠키 키 이름
 * @param {string} [path='/'] - 경로
 */
export const deleteCookie = (name, path = '/') => {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
};

export class ArrowNavigator {
  constructor(opt) {
    const container = opt.container;
    const foucsabledSelector = opt.foucsabledSelector;
    const callback = opt.callback;

    if (!container || !(container instanceof HTMLElement)) {
      throw new Error("ArrowNavigator: 유효한 DOM 요소를 전달해야 합니다.");
    }

    this.container = container;
    this.callback = typeof callback === "function" ? callback : () => {};
    this.focusableSelectors = !foucsabledSelector
      ? [
          '[role="tab"]',
          '[role="button"]',
          "button:not([disabled])",
          "a[href]",
          "input:not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          '[tabindex]:not([tabindex="-1"])',
        ]
      : [foucsabledSelector];
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.container.addEventListener("keydown", this.handleKeyDown);
  }

  getFocusableElements() {
    // container가 null이 된 후에 호출될 경우를 대비한 방어 로직 추가
    if (!this.container) return [];
    return Array.from(
      this.container.querySelectorAll(this.focusableSelectors.join(","))
    ).filter((el) => el.offsetParent !== null);
  }

  handleKeyDown(e) {
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!keys.includes(e.key)) return;

    const elements = this.getFocusableElements();
    // elements가 비어있을 경우 currentIndex가 -1이 될 수 있으므로 추가 확인
    if (elements.length === 0) return;

    const currentIndex = elements.indexOf(document.activeElement);

    // 현재 포커스된 요소가 ArrowNavigator가 관리하는 요소가 아닌 경우 처리
    if (currentIndex === -1) {
      // 컨테이너 내의 첫 번째 또는 마지막 요소로 포커스 이동을 시작하도록 선택적으로 처리 가능
      // 예: nextIndex = 0; 또는 nextIndex = elements.length - 1;
      return; // 현재는 아무것도 하지 않음
    }

    let nextIndex;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % elements.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + elements.length) % elements.length;
    }

    const nextEl = elements[nextIndex];
    if (nextEl) {
      e.preventDefault();
      nextEl.focus();
      this.callback(nextEl, nextIndex);
    }
  }

  destroy() {
    // container가 유효한 경우에만 이벤트 리스너를 제거합니다.
    if (this.container) {
      this.container.removeEventListener("keydown", this.handleKeyDown);
    }

    // 내부 참조를 null로 설정하여 가비지 컬렉션에 도움을 줍니다.
    this.container = null;
    this.callback = null;
    this.focusableSelectors = null;
    this.handleKeyDown = null; // 바인딩된 함수 참조도 null
  }
}

export class ScrollTrigger {
  constructor(options) {
    // 기본 옵션 설정
    this.options = {
      targetSelector: null, // 관찰할 요소의 CSS 선택자 (필수)
      callback: () => {}, // 요소가 트리거될 때 실행할 함수 (필수)
      root: null, // Intersection Observer의 root 옵션 (null = 뷰포트)
      rootMargin: "0px", // Intersection Observer의 rootMargin 옵션
      threshold: 0, // Intersection Observer의 threshold 옵션 (0.0 ~ 1.0 또는 배열)
      once: false, // 한 번 트리거되면 관찰을 중지할지 여부
    };

    // 사용자가 제공한 옵션으로 기본 옵션 오버라이드
    Object.assign(this.options, options);

    // 필수 옵션 검증
    if (!this.options.targetSelector) {
      console.error("ScrollTrigger: targetSelector 옵션은 필수입니다.");
      return;
    }
    if (typeof this.options.callback !== "function") {
      console.error("ScrollTrigger: callback 옵션은 함수여야 합니다.");
      return;
    }

    this.observer = null; // IntersectionObserver 인스턴스
    this.init(); // 초기화 메서드 호출
  }

  init() {
    const { root, rootMargin, threshold } = this.options;
    console.log("rootMargin", rootMargin);
    // Intersection Observer 생성
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        root,
        rootMargin,
        threshold,
      }
    );

    // 모든 대상 요소를 찾아 관찰 시작
    this.targetElements = this.options.targetSelector;
    if (this.targetElements.length === 0) {
      console.warn(
        `ScrollTrigger: '${this.options.targetSelector}'에 해당하는 요소를 찾을 수 없습니다.`
      );
      return;
    }

    this.targetElements.forEach((element) => {
      this.observer.observe(element);
    });
  }

  handleIntersection(entries, observer) {
    entries.forEach((entry) => {
      //target: 대상 요소
      //isIntersecting: 교차 여부
      //intersectionRatio: 교차 비율
      if (entry.isIntersecting) {
        // 요소가 뷰포트에 진입했을 때 콜백 실행
        this.options.callback({
          target: entry.target,
          ratio: entry.intersectionRatio.toPrecision(2),
          rect: entry.boundingClientRect,
        }); // 콜백에 해당 요소 전달

        // once 옵션이 true이면, 콜백 실행 후 해당 요소의 관찰 중지
        if (this.options.once) {
          observer.unobserve(entry.target);
        }
      }
    });
  }

  // 모든 관찰 중지 메서드 (필요시 외부에서 호출)
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

export class SmoothScroller {
  /**
   * @param {Object} opt
   * @param {HTMLElement} opt.element
   * @param {string} [opt.type=center|left|right]
   */
  constructor(opt) {
    this.container = opt.element;
    this.width = this.container.offsetWidth;
    this.type = opt.type || "center";
    const computedStyle = window.getComputedStyle(this.container);
    this.gap = parseFloat(computedStyle.paddingLeft);
  }

  move(item) {
    // If the container has been destroyed, do nothing
    if (!this.container) {
      console.warn(
        "SmoothScroller: Attempted to move item on a destroyed instance."
      );
      return;
    }

    const rect = this.container.getBoundingClientRect();
    const scrollLeft = this.container.scrollLeft;
    const itemRect = item.getBoundingClientRect();

    // targetLeft는 아이템의 시작점이 컨테이너의 시작점(paddingLeft 포함)으로부터 얼마나 떨어져 있는지 계산합니다.
    const targetLeft = Math.abs(
      rect.left + this.gap - (itemRect.left + scrollLeft)
    );

    switch (this.type) {
      case "center":
        // 중앙 정렬: 아이템의 중앙이 컨테이너의 중앙에 오도록 스크롤합니다.
        this.container.scrollTo({
          left: targetLeft - rect.width / 2 + itemRect.width / 2,
          behavior: "smooth",
        });
        break;
      case "left":
        // 좌측 정렬: 아이템의 시작점이 컨테이너의 좌측 정렬 기준에 오도록 스크롤합니다. (paddingLeft 고려)
        this.container.scrollTo({
          left: targetLeft,
          behavior: "smooth",
        });
        break;
      case "right":
        // 우측 정렬: 아이템의 끝점이 컨테이너의 우측 정렬 기준에 오도록 스크롤합니다.
        // targetLeft는 아이템의 시작 위치이므로, 아이템 너비와 컨테이너 너비를 고려하여 계산합니다.
        this.container.scrollTo({
          left: targetLeft - (rect.width - itemRect.width), // 아이템 시작점에서 (컨테이너 너비 - 아이템 너비)를 빼서 우측 정렬
          behavior: "smooth",
        });
        break;
    }
  }

  /**
   * Cleans up the SmoothScroller instance by nullifying internal references.
   */
  destroy() {
    // Nullify references to DOM elements to aid garbage collection.
    this.container = null;
    this.width = null;
    this.type = null;
    this.gap = null;

    // You might want to add a console log for debugging purposes,
    // especially during development, but often omitted in production.
    // console.log("SmoothScroller instance destroyed.");
  }
}

export class FocusTrap {
  constructor(container) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error("FocusTrap requires a valid DOM element.");
    }

    this.container = container;
    this.focusableElements = this.getFocusableElements();
    this.firstElement = this.focusableElements[0];
    this.lastElement =
      this.focusableElements[this.focusableElements.length - 1];

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.activate();
  }

  getFocusableElements() {
    const selectors = [
      "a[href]",
      "area[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "iframe",
      "object",
      "embed",
      "[contenteditable]",
      '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(
      this.container.querySelectorAll(selectors.join(","))
    ).filter((el) => el.offsetParent !== null);
  }

  handleKeyDown(e) {
    if (e.key !== "Tab") return;

    this.focusableElements = this.getFocusableElements(); // update in case of dynamic changes
    this.firstElement = this.focusableElements[0];
    this.lastElement =
      this.focusableElements[this.focusableElements.length - 1];

    if (this.focusableElements.length === 0) return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstElement) {
        e.preventDefault();
        this.lastElement.focus();
      } else if (e.target === this.container) {
        e.preventDefault();
        this.lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastElement) {
        e.preventDefault();
        this.firstElement.focus();
      }
    }
  }

  activate() {
    this.container.addEventListener("keydown", this.handleKeyDown);
  }

  deactivate() {
    this.container.removeEventListener("keydown", this.handleKeyDown);
  }
}
