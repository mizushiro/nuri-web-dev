/**
 * @file ui-table-sort.js
 * thead의 th 클릭 시 3단계(오름차순 -> 내림차순 -> 기본 처음상태) 테이블 정렬 모듈
 * (단일 행 및 복합 다단 행 thead 완벽 지원)
 */

/**
 * 테이블 행 정렬 초기화 함수
 * @param {HTMLTableElement|string} tableTarget 대상 테이블 또는 선택자
 * @param {Object} [options] 설정 옵션
 * @param {string} [options.excludeSelector='.no-sort, [data-sort="false"]'] 정렬 제외할 th 선택자
 * @param {Function} [options.onSort] 정렬 완료 후 실행될 콜백 함수
 * @returns {Object|null} 정렬 제어 API
 */
export function initTableSort(tableTarget, options = {}) {
	const table = typeof tableTarget === 'string' ? document.querySelector(tableTarget) : tableTarget;
	if (!table) return null;

	const thead = table.querySelector('thead');
	const tbody = table.querySelector('tbody');
	if (!thead || !tbody) return null;

	const excludeSelector = options.excludeSelector || '.no-sort, [data-sort="false"]';

	// 2D 가상 그리드로 thead th별 실제 colIndex 계산 (다단 헤더 지원)
	const theadRows = Array.from(thead.querySelectorAll('tr'));
	const grid = [];
	const leafHeaders = []; // { th: Element, colIndex: number }

	theadRows.forEach((tr, rIdx) => {
		if (!grid[rIdx]) grid[rIdx] = [];
		let cIdx = 0;
		Array.from(tr.children).forEach(cell => {
			while (grid[rIdx][cIdx]) {
				cIdx++;
			}
			const rowspan = cell.rowSpan || 1;
			const colspan = cell.colSpan || 1;

			// colspan이 1인 리프 컬럼만 정렬 대상 컬럼으로 등록
			if (colspan === 1) {
				leafHeaders.push({ th: cell, colIndex: cIdx });
			}

			for (let r = 0; r < rowspan; r++) {
				for (let c = 0; c < colspan; c++) {
					if (!grid[rIdx + r]) grid[rIdx + r] = [];
					grid[rIdx + r][cIdx + c] = cell;
				}
			}
			cIdx += colspan;
		});
	});

	if (leafHeaders.length === 0) return null;

	// 초기 행 순서(원본 상태) 보존
	const captureOriginalRows = () => {
		const rows = Array.from(tbody.querySelectorAll('tr'));
		rows.forEach((row, idx) => {
			if (!row.dataset.originIdx) {
				row.dataset.originIdx = String(idx);
			}
		});
	};
	captureOriginalRows();

	// 현재 정렬 상태: { colIndex: number, state: 'none' | 'asc' | 'desc' }
	let currentSort = {
		colIndex: -1,
		state: 'none'
	};

	// 셀 텍스트 추출
	const getCellValue = (row, colIndex) => {
		const cell = row.children[colIndex];
		if (!cell) return '';
		return cell.innerText.trim();
	};

	// 스마트 정렬 비교 (숫자 / 날짜 / 문자열 자연 정렬)
	const compareValues = (valA, valB) => {
		// 1. 숫자 비교 (쉼표 제거 후 평가)
		const cleanA = valA.replace(/,/g, '');
		const cleanB = valB.replace(/,/g, '');
		const numA = Number(cleanA);
		const numB = Number(cleanB);
		const isNumA = cleanA !== '' && !isNaN(numA);
		const isNumB = cleanB !== '' && !isNaN(numB);

		if (isNumA && isNumB) {
			return numA - numB;
		}

		// 2. 날짜/시각 비교 (YYYY-MM-DD 포맷 감지)
		const datePattern = /^\d{4}[-/.]\d{2}[-/.]\d{2}/;
		if (datePattern.test(valA) && datePattern.test(valB)) {
			const timeA = Date.parse(valA.replace(/\s+/g, ' '));
			const timeB = Date.parse(valB.replace(/\s+/g, ' '));
			if (!isNaN(timeA) && !isNaN(timeB)) {
				return timeA - timeB;
			}
		}

		// 3. 한국어/영문 자연 정렬 (문자열 내 숫자 포함 비교 지원)
		return valA.localeCompare(valB, 'ko', { numeric: true, sensitivity: 'base' });
	};

	// 헤더 UI 상태 초기화
	const resetHeaderStyles = () => {
		leafHeaders.forEach(({ th }) => {
			th.classList.remove('is-sorted-asc', 'is-sorted-desc');
			th.setAttribute('aria-sort', 'none');
		});
	};

	// 정렬 실행
	const applySort = (colIndex, nextState) => {
		currentSort = { colIndex, state: nextState };
		resetHeaderStyles();

		const rows = Array.from(tbody.querySelectorAll('tr'));
		const targetItem = leafHeaders.find(item => item.colIndex === colIndex);
		const targetTh = targetItem ? targetItem.th : null;

		if (nextState === 'asc' && targetTh) {
			targetTh.classList.add('is-sorted-asc');
			targetTh.setAttribute('aria-sort', 'ascending');

			rows.sort((rowA, rowB) => {
				const valA = getCellValue(rowA, colIndex);
				const valB = getCellValue(rowB, colIndex);
				const diff = compareValues(valA, valB);
				return diff !== 0 ? diff : Number(rowA.dataset.originIdx) - Number(rowB.dataset.originIdx);
			});

			rows.forEach(row => tbody.appendChild(row));
		} else if (nextState === 'desc' && targetTh) {
			targetTh.classList.add('is-sorted-desc');
			targetTh.setAttribute('aria-sort', 'descending');

			rows.sort((rowA, rowB) => {
				const valA = getCellValue(rowA, colIndex);
				const valB = getCellValue(rowB, colIndex);
				const diff = compareValues(valA, valB);
				return diff !== 0 ? -diff : Number(rowA.dataset.originIdx) - Number(rowB.dataset.originIdx);
			});

			rows.forEach(row => tbody.appendChild(row));
		} else {
			// 'none': 3번째 클릭 시 기본 처음 상태(원본 순서) 복구
			if (targetTh) {
				targetTh.setAttribute('aria-sort', 'none');
			}

			rows.sort((rowA, rowB) => {
				const idxA = Number(rowA.dataset.originIdx ?? 0);
				const idxB = Number(rowB.dataset.originIdx ?? 0);
				return idxA - idxB;
			});

			rows.forEach(row => tbody.appendChild(row));
		}

		if (typeof options.onSort === 'function') {
			options.onSort({ colIndex, state: nextState, table });
		}
	};

	// 헤더 이벤트 바인딩
	leafHeaders.forEach(({ th, colIndex }) => {
		if (th.matches(excludeSelector)) {
			return;
		}

		th.classList.add('sortable-th');
		th.setAttribute('tabindex', '0');
		th.setAttribute('role', 'columnheader');
		th.setAttribute('aria-sort', 'none');
		th.setAttribute('title', '클릭 시 정렬 (오름차순 → 내림차순 → 기본상태)');

		const handleSortClick = () => {
			let nextState = 'asc';

			if (currentSort.colIndex === colIndex) {
				// 1단계: asc -> 2단계: desc -> 3단계: none (기본 처음상태)
				if (currentSort.state === 'asc') {
					nextState = 'desc';
				} else if (currentSort.state === 'desc') {
					nextState = 'none';
				} else {
					nextState = 'asc';
				}
			} else {
				// 다른 열 클릭 시 오름차순(asc)부터 시작
				nextState = 'asc';
			}

			applySort(colIndex, nextState);
		};

		th.addEventListener('click', handleSortClick);
		th.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleSortClick();
			}
		});
	});

	return {
		reset: () => applySort(-1, 'none'),
		sort: (colIndex, state) => applySort(colIndex, state),
		updateOriginalRows: () => {
			captureOriginalRows();
		}
	};
}

// 브라우저 전역 객체 등록
if (typeof window !== 'undefined') {
	window.initTableSort = initTableSort;
}
