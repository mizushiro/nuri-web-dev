/**
 * @file ui-midterm-summary.js
 * @description JSON 데이터를 기반으로 권역별 중기예보 요약표를 동적으로 생성하고,
 * 권역 필터링, 표출요소(하늘상태, 강수가능성, 변화추이, 기온) 제어 및 범례 모달을 연동하는 컴포넌트
 */

export class RegionalSummaryTable {
	#options;
	#container = null;
	#table = null;
	#data = null;
	#currentRegion = 'all';
	#filters = {
		sky: true,
		precip: true,
		trend: true,
		temp: false
	};
	#abortController = null;

	/**
	 * @param {Object} opt 설정 옵션
	 * @param {string|HTMLElement} [opt.container='.nr__summary-table-container'] 테이블 렌더링 컨테이너
	 * @param {string} [opt.url='./resources/json/midterm-summary.json'] JSON 데이터 URL
	 * @param {Object} [opt.data=null] 직접 전달할 JSON 데이터 객체
	 * @param {string} [opt.selectedRegion='all'] 기본 선택 권역
	 * @param {Object} [opt.initialFilters] 초기 필터 상태
	 * @param {Object} [opt.controls] 외부 컨트롤 엘리먼트 셀렉터 매핑
	 * @param {Function} [opt.onLoaded] 데이터 로드 및 렌더링 완료 콜백
	 * @param {Function} [opt.onRegionChange] 권역 변경 콜백
	 * @param {Function} [opt.onFilterChange] 필터 변경 콜백
	 */
	constructor(opt = {}) {
		const defaults = {
			container: '.nr__summary-table-container',
			url: './resources/json/midterm-summary.json',
			data: null,
			selectedRegion: 'all',
			initialFilters: {
				sky: true,
				precip: true,
				trend: true,
				temp: false
			},
			controls: {
				regionNav: '.nr__region-nav',
				toggleBtn: '#nr-summary-element-toggle',
				popover: '#nr-summary-popover',
				filters: {
					sky: '#filter-sky',
					precip: '#filter-precip',
					trend: '#filter-trend',
					temp: '#filter-temp'
				},
				legendBtn: '#nr-summary-legend-btn, [data-pop-name="open-iconguide-pop"]',
				legendModal: '#nr-summary-legend-modal, [data-pop="open-iconguide-pop"]',
				legendCloseBtn: '#nr-summary-legend-close, [data-pop="open-iconguide-pop"] .pop-close'
			},
			onLoaded: null,
			onRegionChange: null,
			onFilterChange: null
		};

		this.#options = {
			...defaults,
			...opt,
			controls: {
				...defaults.controls,
				...(opt.controls || {}),
				filters: {
					...defaults.controls.filters,
					...((opt.controls && opt.controls.filters) || {})
				}
			}
		};

		this.#currentRegion = this.#options.selectedRegion;
		this.#filters = {
			...defaults.initialFilters,
			...(this.#options.initialFilters || {})
		};

		this.#container = typeof this.#options.container === 'string'
			? document.querySelector(this.#options.container)
			: this.#options.container;

		this.init();
	}

	/**
	 * 컴포넌트 초기화 및 데이터 로드
	 */
	async init() {
		if (this.#options.data) {
			this.#data = this.#options.data;
			this.render(this.#data);
		} else if (this.#options.url) {
			await this.loadData(this.#options.url);
		}
	}

	/**
	 * JSON 데이터 비동기 호출
	 * @param {string} url
	 */
	async loadData(url) {
		try {
			const res = await fetch(url);
			if (!res.ok) {
				throw new Error(`데이터를 불러오지 못했습니다. 상태 코드: ${res.status}`);
			}
			const json = await res.json();
			this.#data = json;
			this.render(this.#data);
		} catch (err) {
			console.error('[RegionalSummaryTable] 데이터 로딩 에러:', err);
		}
	}

	/**
	 * 테이블 HTML 렌더링
	 * @param {Object} data
	 */
	render(data) {
		if (!this.#container || !data) return;

		// 테이블 헤더 (1행: 날짜, 2행: 오전/오후)
		const headers = Array.isArray(data.headers) ? data.headers : [];
		const headerDateCols = headers.map(h => `<th scope="col" colspan="${(h.times && h.times.length) || 2}">${h.date}</th>`).join('');
		const headerTimeCols = headers.flatMap(h => (h.times || ['오전', '오후']).map(t => `<th scope="col">${t}</th>`)).join('');

		// 테이블 바디 (권역별 행 및 날씨 카드 셀)
		const rows = Array.isArray(data.rows) ? data.rows : [];
		const tbodyHtml = rows.map(r => {
			const forecasts = r.forecasts || [];
			const cellsHtml = forecasts.map((f, idx) => {
				let tempRole = null;
				if (f.temp !== undefined) {
					// 같은 날의 오전(짝수 idx)/오후(홀수 idx) 쌍 비교
					const pairIdx = (idx % 2 === 0) ? idx + 1 : idx - 1;
					const pair = forecasts[pairIdx];
					if (pair && pair.temp !== undefined) {
						if (f.temp < pair.temp) {
							tempRole = 'min';
						} else if (f.temp > pair.temp) {
							tempRole = 'max';
						} else {
							// 온도가 같을 경우 오전을 최저(min), 오후를 최고(max)로 기본 지정
							tempRole = (idx % 2 === 0) ? 'min' : 'max';
						}
					} else {
						tempRole = (idx % 2 === 0) ? 'min' : 'max';
					}
				}
				return this.#createCellHtml(f, tempRole);
			}).join('');

			return `
				<tr data-region-group="${r.group || ''}">
					<th scope="row">${r.region}</th>
					${cellsHtml}
				</tr>
			`;
		}).join('');

		// 테이블 클래스 (초기 필터 상태 반영)
		const classList = ['nr__summary-table'];
		if (!this.#filters.sky) classList.push('hide-sky');
		if (!this.#filters.precip) classList.push('hide-precip');
		if (this.#filters.trend) classList.push('show-trend');
		if (this.#filters.temp) classList.push('show-temp');

		const tableHtml = `
			<table class="${classList.join(' ')}" summary="권역별 중기예보 요약표로 ${headers.map(h => h.date).join(', ')} 날짜별 오전, 오후 하늘상태 및 강수가능성을 제공합니다.">
				<caption class="sr-only">권역별 중기예보 요약표</caption>
				<colgroup>
					<col style="width:8.8rem">
					<col span="">
				</colgroup>
				<thead>
					<tr>
						<th scope="col" rowspan="2">권역</th>
						${headerDateCols}
					</tr>
					<tr>
						${headerTimeCols}
					</tr>
				</thead>
				<tbody>
					${tbodyHtml}
				</tbody>
			</table>
		`;

		this.#container.innerHTML = tableHtml;
		this.#table = this.#container.querySelector('.nr__summary-table');

		// 컨트롤 바인딩 및 상태 적용
		this.#bindControls();
		this.filterRegion(this.#currentRegion);

		if (typeof this.#options.onLoaded === 'function') {
			this.#options.onLoaded(this.#data);
		}
	}

	/**
	 * 셀(td) 내부 타일 카드 마크업 생성
	 * @param {Object} item
	 * @param {'min'|'max'|null} [tempRole=null]
	 */
	#createCellHtml(item, tempRole = null) {
		const precipLevel = item.precipLevel || 'none';
		const skyCode = item.skyCode || 'NB01';
		const skyText = item.skyText || '맑음';
		const precipText = item.precipText || '거의 없음';

		// 변화 추이 뱃지
		let trendHtml = '';
		if (item.trend) {
			const trendIcon = item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '≈';
			const trendLabel = item.trend === 'up' ? '높음' : item.trend === 'down' ? '낮음' : '비슷';
			trendHtml = `
				<span class="nr__cell-trend nr__cell-trend--${item.trend}" title="강수가능성 예보 변화 추이: ${trendLabel}" aria-label="${trendLabel}">
					<span class="nr__trend-icon">${trendIcon}</span>
				</span>
			`;
		}

		// 기온 (오전/오후 단일 온도 또는 기존 최저/최고기온 병기 호환)
		let tempHtml = '';
		if (item.temp !== undefined) {
			const isMax = tempRole === 'max';
			const roleClass = isMax ? 'nr__temp-max' : 'nr__temp-min';
			const roleLabel = isMax ? '최고기온' : '최저기온';
			tempHtml = `
				<div class="nr__cell-temp">
					<span class="${roleClass}" title="${roleLabel}: ${item.temp}°" aria-label="${roleLabel} ${item.temp}도">${item.temp}°</span>
				</div>
			`;
		} else if (item.minTemp !== undefined && item.maxTemp !== undefined) {
			tempHtml = `
				<div class="nr__cell-temp">
					<span class="nr__temp-min">${item.minTemp}°</span><span class="nr__temp-sep">/</span><span class="nr__temp-max">${item.maxTemp}°</span>
				</div>
			`;
		}

		return `
			<td>
				<div class="nr__cell-card nr__cell-card--${precipLevel}">
					<div class="nr__cell-main">
						<span data-icon-weather="${skyCode}" aria-hidden="true"></span>
						<span class="nr__cell-sky">${skyText}</span>
						<span class="nr__cell-precip">${precipText}</span>
					</div>
					${trendHtml}
					${tempHtml}
				</div>
			</td>
		`;
	}

	/**
	 * 컨트롤 요소(권역 탭, 팝오버, 체크박스, 범례 모달) 이벤트 바인딩
	 */
	#bindControls() {
		if (this.#abortController) {
			this.#abortController.abort();
		}
		this.#abortController = new AbortController();
		const { signal } = this.#abortController;

		const { regionNav, toggleBtn, popover, filters, legendBtn, legendModal, legendCloseBtn } = this.#options.controls;

		// 1. 권역 네비게이션 버튼 바인딩
		const navEl = typeof regionNav === 'string' ? document.querySelector(regionNav) : regionNav;
		if (navEl) {
			const buttons = navEl.querySelectorAll('.nr__region-btn');
			buttons.forEach(btn => {
				btn.addEventListener('click', () => {
					buttons.forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
					const region = btn.getAttribute('data-region') || 'all';
					this.filterRegion(region);
				}, { signal });
			});
		}

		// 2. 표출요소 보기 팝오버 드롭다운
		const toggleEl = typeof toggleBtn === 'string' ? document.querySelector(toggleBtn) : toggleBtn;
		const popoverEl = typeof popover === 'string' ? document.querySelector(popover) : popover;
		if (toggleEl && popoverEl) {
			toggleEl.addEventListener('click', (e) => {
				e.stopPropagation();
				const isOpen = popoverEl.classList.toggle('is-open');
				toggleEl.setAttribute('aria-expanded', String(isOpen));
			}, { signal });

			popoverEl.addEventListener('click', (e) => {
				e.stopPropagation();
			}, { signal });

			document.addEventListener('click', () => {
				if (popoverEl.classList.contains('is-open')) {
					popoverEl.classList.remove('is-open');
					toggleEl.setAttribute('aria-expanded', 'false');
				}
			}, { signal });
		}

		// 3. 표출요소 체크박스 바인딩
		const bindCheckbox = (selector, filterKey, onClass, offClass, isShowMode = false) => {
			const checkbox = typeof selector === 'string' ? document.querySelector(selector) : selector;
			if (!checkbox) return;

			checkbox.checked = Boolean(this.#filters[filterKey]);
			checkbox.addEventListener('change', (e) => {
				const checked = e.target.checked;
				this.#filters[filterKey] = checked;

				if (this.#table) {
					if (isShowMode) {
						this.#table.classList.toggle(onClass, checked);
					} else {
						this.#table.classList.toggle(offClass, !checked);
					}
				}

				if (typeof this.#options.onFilterChange === 'function') {
					this.#options.onFilterChange(filterKey, checked, this.#filters);
				}
			}, { signal });
		};

		bindCheckbox(filters.sky, 'sky', '', 'hide-sky', false);
		bindCheckbox(filters.precip, 'precip', '', 'hide-precip', false);
		bindCheckbox(filters.trend, 'trend', 'show-trend', '', true);
		bindCheckbox(filters.temp, 'temp', 'show-temp', '', true);

		// 4. 범례 설명 모달
		// 날씨누리 공통 pop-open / modal-pop 시스템(weatherUI)이 있는 경우 중복 실행 방지
		if (typeof window.weatherUI === 'object' && typeof window.weatherUI.popOpen === 'function') {
			return;
		}

		const lBtn = typeof legendBtn === 'string' ? document.querySelector(legendBtn) : legendBtn;
		const lModal = typeof legendModal === 'string' ? document.querySelector(legendModal) : legendModal;
		const lClose = typeof legendCloseBtn === 'string' ? document.querySelector(legendCloseBtn) : legendCloseBtn;

		if (lBtn && lModal) {
			lBtn.addEventListener('click', () => {
				lModal.classList.add('is-open');
				lModal.style.display = 'block';
				lModal.setAttribute('aria-hidden', 'false');
			}, { signal });
		}
		if (lClose && lModal) {
			lClose.addEventListener('click', (e) => {
				e.preventDefault();
				lModal.classList.remove('is-open');
				lModal.style.display = 'none';
				lModal.setAttribute('aria-hidden', 'true');
			}, { signal });
		}
		if (lModal) {
			lModal.addEventListener('click', (e) => {
				if (e.target === lModal) {
					lModal.classList.remove('is-open');
					lModal.style.display = 'none';
					lModal.setAttribute('aria-hidden', 'true');
				}
			}, { signal });
		}
	}

	/**
	 * 특정 권역 필터링
	 * @param {string} region 'all' 또는 '수도권', '강원' 등 권역명
	 */
	filterRegion(region = 'all') {
		this.#currentRegion = region;
		if (!this.#table) return;

		const rows = this.#table.querySelectorAll('tbody tr');
		rows.forEach(row => {
			const group = row.getAttribute('data-region-group');
			if (region === 'all' || group === region) {
				row.style.display = '';
			} else {
				row.style.display = 'none';
			}
		});

		if (typeof this.#options.onRegionChange === 'function') {
			this.#options.onRegionChange(region);
		}
	}

	/**
	 * 표출요소 필터 상태 수동 설정
	 * @param {string} key 'sky' | 'precip' | 'trend' | 'temp'
	 * @param {boolean} value
	 */
	setFilter(key, value) {
		if (this.#filters[key] === undefined) return;
		this.#filters[key] = Boolean(value);

		const { filters } = this.#options.controls;
		const checkbox = typeof filters[key] === 'string' ? document.querySelector(filters[key]) : filters[key];
		if (checkbox) {
			checkbox.checked = this.#filters[key];
		}

		if (this.#table) {
			if (key === 'sky') this.#table.classList.toggle('hide-sky', !value);
			if (key === 'precip') this.#table.classList.toggle('hide-precip', !value);
			if (key === 'trend') this.#table.classList.toggle('show-trend', value);
			if (key === 'temp') this.#table.classList.toggle('show-temp', value);
		}
	}

	/**
	 * 신규 데이터 갱신
	 * @param {Object} newData
	 */
	updateData(newData) {
		this.#data = newData;
		this.render(this.#data);
	}

	/**
	 * 인스턴스 파괴 및 이벤트 정리
	 */
	destroy() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
		if (this.#container) {
			this.#container.innerHTML = '';
		}
		this.#table = null;
	}
}

/**
 * 간편 팩토리 함수
 * @param {Object} options
 * @returns {RegionalSummaryTable}
 */
export function initRegionalSummaryTable(options) {
	return new RegionalSummaryTable(options);
}
