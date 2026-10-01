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
