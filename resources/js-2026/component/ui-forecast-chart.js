/**
 * 시간별 예보 차트 렌더링 전용 모듈 (ui-forecast-chart.js)
 * 개발팀에서 차트 스크립트/라이브러리를 독립적으로 커스텀 및 수정할 수 있도록 분리된 파일입니다.
 */

/**
 * 차트 영역 좌표 및 데이터 컨텍스트 생성 함수
 * @param {HTMLElement} container - hourly-forecast-content 컨테이너
 * @returns {Object|null}
 */
export const buildChartContext = (container, validDates = []) => {
  const datesWrapper = container.querySelector('.nr__hourly-dates-wrapper');
  if (!datesWrapper) return null;

  const tempCols = datesWrapper.querySelectorAll('.nr__hourly-col:not(.nr__empty-col)');
  if (!tempCols.length) return null;

  const wrapperRect = datesWrapper.getBoundingClientRect();
  const width = Math.max(datesWrapper.scrollWidth, datesWrapper.offsetWidth);

  // 셀 레이아웃 구하기
  const firstTempCell = datesWrapper.querySelector('.nr__cell-temp-chart');
  const firstRainCell = datesWrapper.querySelector('.nr__cell-rain-chart');
  const firstWindCell = datesWrapper.querySelector('.nr__cell-wind-chart');
  const firstHumidityCell = datesWrapper.querySelector('.nr__cell-humidity-chart');

  const getCellLayout = (cellEl) => {
    if (!cellEl) return null;
    const r = cellEl.getBoundingClientRect();
    return {
      topOffset: r.top - wrapperRect.top,
      height: r.height
    };
  };

  const tempLayout = getCellLayout(firstTempCell);
  const rainLayout = getCellLayout(firstRainCell);
  const windLayout = getCellLayout(firstWindCell);
  const humidityLayout = getCellLayout(firstHumidityCell);

  const points = [];
  let minTemp = Infinity;
  let maxTemp = -Infinity;

  tempCols.forEach(col => {
    const colRect = col.getBoundingClientRect();
    const x = (colRect.left - wrapperRect.left) + (colRect.width / 2);

    const tempVal = parseFloat(col.dataset.temp);
    const rainProb = parseFloat(col.dataset.rainProb) || 0;
    const windDir = parseFloat(col.dataset.windDir) || 0;
    const windSpeed = parseFloat(col.dataset.windSpeed) || 0;
    const windStrength = col.dataset.windStrength || '약';
    const humidity = parseFloat(col.dataset.humidity) || 0;

    if (!isNaN(tempVal)) {
      if (tempVal < minTemp) minTemp = tempVal;
      if (tempVal > maxTemp) maxTemp = tempVal;
    }

    points.push({
      x,
      colEl: col,
      date: col.dataset.date,
      time: col.dataset.time,
      temp: isNaN(tempVal) ? 0 : tempVal,
      rainProb,
      windDir,
      windSpeed,
      windStrength,
      humidity
    });
  });

  if (minTemp === Infinity) minTemp = 0;
  if (maxTemp === -Infinity) maxTemp = 30;

  // 일별 최저/최고 기온 및 분위수 데이터 수집
  const dailyPoints = [];
  const dateGroups = datesWrapper.querySelectorAll('.nr__date-group');
  let minDailyTemp = Infinity;
  let maxDailyTemp = -Infinity;

  dateGroups.forEach(group => {
    const date = group.dataset.date;
    const groupRect = group.getBoundingClientRect();
    const cols = group.querySelectorAll('.nr__hourly-col:not(.nr__empty-col)');

    const dayItem = validDates ? validDates.find(d => d.date === date) : null;
    let maxT = dayItem && dayItem.maxTemp ? parseFloat(dayItem.maxTemp) : -Infinity;
    let minT = dayItem && dayItem.minTemp ? parseFloat(dayItem.minTemp) : Infinity;

    let maxCol = null;
    let minCol = null;
    let colMax = -Infinity;
    let colMin = Infinity;

    cols.forEach(col => {
      const t = parseFloat(col.dataset.temp);
      if (!isNaN(t)) {
        if (t > colMax) {
          colMax = t;
          maxCol = col;
        }
        if (t < colMin) {
          colMin = t;
          minCol = col;
        }
      }
    });

    if (maxT === -Infinity) maxT = (colMax !== -Infinity) ? colMax : 25;
    if (minT === Infinity) minT = (colMin !== Infinity) ? colMin : 15;

    const groupCenterX = (groupRect.left - wrapperRect.left) + (groupRect.width / 2);
    let maxX = groupCenterX;
    let minX = groupCenterX;

    if (maxCol) {
      const r = maxCol.getBoundingClientRect();
      maxX = (r.left - wrapperRect.left) + (r.width / 2);
    }
    if (minCol) {
      const r = minCol.getBoundingClientRect();
      minX = (r.left - wrapperRect.left) + (r.width / 2);
    }

    const pData = dayItem?.percentiles;
    const parseOrCalc = (val, fallback) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const num = parseFloat(val);
        if (!isNaN(num)) return num;
      }
      return fallback;
    };

    const maxP90 = parseOrCalc(pData?.max?.p90, +(maxT + 3.2).toFixed(1));
    const maxP75 = parseOrCalc(pData?.max?.p75, +(maxT + 1.6).toFixed(1));
    const maxP25 = parseOrCalc(pData?.max?.p25, +(maxT - 1.6).toFixed(1));
    const maxP10 = parseOrCalc(pData?.max?.p10, +(maxT - 3.2).toFixed(1));

    const minP10 = parseOrCalc(pData?.min?.p10, +(minT - 3.2).toFixed(1));
    const minP25 = parseOrCalc(pData?.min?.p25, +(minT - 1.6).toFixed(1));
    const minP75 = parseOrCalc(pData?.min?.p75, +(minT + 1.6).toFixed(1));
    const minP90 = parseOrCalc(pData?.min?.p90, +(minT + 3.2).toFixed(1));

    if (minP10 < minDailyTemp) minDailyTemp = minP10;
    if (maxP90 > maxDailyTemp) maxDailyTemp = maxP90;

    dailyPoints.push({
      date,
      dayItem,
      maxX,
      minX,
      groupCenterX,
      maxTemp: maxT,
      minTemp: minT,
      percentiles: {
        max: { p90: maxP90, p75: maxP75, p25: maxP25, p10: maxP10 },
        min: { p10: minP10, p25: minP25, p75: minP75, p90: minP90 }
      }
    });
  });

  if (minDailyTemp === Infinity) minDailyTemp = 10;
  if (maxDailyTemp === -Infinity) maxDailyTemp = 32;

  // 밴드가 위아래로 넓게 펼쳐질 수 있도록 상하 여유 마진 추가
  minDailyTemp = Math.floor(minDailyTemp - 1.5);
  maxDailyTemp = Math.ceil(maxDailyTemp + 1.5);

  // 평균기온과 최저/최고기온의 Y축 기온 스케일(높이 기준)을 통합/동기화
  // 이를 통해 동일한 기온(예: 30°C)이 두 모드 간 전환 시 항상 일치하는 수직 위치에 렌더링됨
  const unifiedMinTemp = Math.min(minTemp, minDailyTemp);
  const unifiedMaxTemp = Math.max(maxTemp, maxDailyTemp);

  return {
    datesWrapper,
    width,
    tempLayout,
    rainLayout,
    windLayout,
    humidityLayout,
    points,
    minTemp,
    maxTemp,
    dailyPoints,
    minDailyTemp,
    maxDailyTemp,
    unifiedMinTemp,
    unifiedMaxTemp
  };
};

/**
 * 1-1. 평균 기온 선형 차트 렌더링 (SVG)
 */
export const defaultRenderTempChart = (layer, context) => {
  if (!layer || !context || !context.tempLayout) return;
  const { points, unifiedMinTemp, unifiedMaxTemp, minTemp, maxTemp, width, tempLayout, datesWrapper } = context;
  const height = tempLayout.height;
  if (!points || points.length === 0) return;

  // 최저/최고 기온 툴팁 숨김
  const existingTooltip = datesWrapper?.querySelector('.nr__forecast-tooltip');
  if (existingTooltip) {
    existingTooltip.classList.remove('show');
  }

  // 최저/최고기온 차트와 Y축 스케일 기준을 통일하여 30°C 등 동일 온도의 위치를 일치시킴
  const scaleMin = (unifiedMinTemp !== undefined) ? unifiedMinTemp : minTemp;
  const scaleMax = (unifiedMaxTemp !== undefined) ? unifiedMaxTemp : maxTemp;
  const tempRange = (scaleMax - scaleMin) || 1;
  const paddingTop = 32;
  const paddingBottom = 28;
  const usableHeight = Math.max(10, height - paddingTop - paddingBottom);

  const coords = points.map(pt => {
    const y = height - paddingBottom - ((pt.temp - scaleMin) / tempRange) * usableHeight;
    return { ...pt, y };
  });

  let d = '';

  coords.forEach((pt, i) => {
    if (i === 0) {
      d += `M ${pt.x} ${pt.y}`;
    } else {
      const prev = coords[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
    }
  });

  let svgHtml = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <path d="${d}" fill="none" stroke="#0088ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  `;

  coords.forEach(pt => {
    svgHtml += `
      <g class="chart-point-group">
        <circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#ffffff" stroke="#0088ff" stroke-width="2" />
        <text x="${pt.x}" y="${pt.y - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="#111111">${pt.temp}°C</text>
      </g>
    `;
  });

  svgHtml += `</svg>`;
  layer.innerHTML = svgHtml;
};

/**
 * 1-2. 최저/최고 기온 선형 차트 & 분위수 밴드 렌더링 (SVG)
 */
export const renderMinMaxTempChart = (layer, context, validDates = [], options = {}) => {
  if (!layer || !context || !context.tempLayout) return;
  const { dailyPoints, unifiedMinTemp, unifiedMaxTemp, minDailyTemp, maxDailyTemp, width, tempLayout, datesWrapper } = context;
  const height = tempLayout.height;
  if (!dailyPoints || dailyPoints.length === 0) return;

  const paddingTop = 32;
  const paddingBottom = 28;
  const usableHeight = Math.max(10, height - paddingTop - paddingBottom);
  // 평균기온 차트와 Y축 스케일 기준을 통일하여 30°C 등 동일 온도의 위치를 일치시킴
  const scaleMin = (unifiedMinTemp !== undefined) ? unifiedMinTemp : minDailyTemp;
  const scaleMax = (unifiedMaxTemp !== undefined) ? unifiedMaxTemp : maxDailyTemp;
  const tempRange = (scaleMax - scaleMin) || 1;

  const getY = (val) => {
    return height - paddingBottom - ((val - scaleMin) / tempRange) * usableHeight;
  };

  // 최고기온 및 최저기온 포인트 좌표 계산
  const maxCoords = dailyPoints.map(pt => ({
    x: pt.maxX,
    y: getY(pt.maxTemp),
    p90Y: getY(pt.percentiles.max.p90),
    p75Y: getY(pt.percentiles.max.p75),
    p25Y: getY(pt.percentiles.max.p25),
    p10Y: getY(pt.percentiles.max.p10),
    data: pt,
    type: 'max'
  }));

  const minCoords = dailyPoints.map(pt => ({
    x: pt.minX,
    y: getY(pt.minTemp),
    p90Y: getY(pt.percentiles.min.p90),
    p75Y: getY(pt.percentiles.min.p75),
    p25Y: getY(pt.percentiles.min.p25),
    p10Y: getY(pt.percentiles.min.p10),
    data: pt,
    type: 'min'
  }));

  // Bezier Path 생성기
  const createBezierPath = (pts, yProp = 'y') => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0][yProp]}`;
    let d = `M ${pts[0].x} ${pts[0][yProp]}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev[yProp];
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr[yProp];
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr[yProp]}`;
    }
    return d;
  };

  // Band Path 생성기 (상단 곡선 -> 하단 곡선 역순 닫기)
  const createBandPath = (pts, topProp, botProp) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return '';
    let d = `M ${pts[0].x} ${pts[0][topProp]}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev[topProp];
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr[topProp];
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr[topProp]}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x} ${last[botProp]}`;
    for (let i = pts.length - 2; i >= 0; i--) {
      const prev = pts[i + 1];
      const curr = pts[i];
      const cx1 = prev.x - (prev.x - curr.x) / 2;
      const cy1 = prev[botProp];
      const cx2 = prev.x - (prev.x - curr.x) / 2;
      const cy2 = curr[botProp];
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr[botProp]}`;
    }
    d += ' Z';
    return d;
  };

  // 최고기온 분위수 밴드 패스
  const maxBand1090 = createBandPath(maxCoords, 'p90Y', 'p10Y');
  const maxBand2575 = createBandPath(maxCoords, 'p75Y', 'p25Y');

  // 최저기온 분위수 밴드 패스 (minCoords에서 온도가 높은 p90이 상단, p10이 하단)
  const minBand1090 = createBandPath(minCoords, 'p90Y', 'p10Y');
  const minBand2575 = createBandPath(minCoords, 'p75Y', 'p25Y');

  // 최고/최저 실선 패스
  const maxLine = createBezierPath(maxCoords, 'y');
  const minLine = createBezierPath(minCoords, 'y');

  let svgHtml = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- 최고기온 분위수 배경 밴드 (10~90분위 연한 밴드, 25~75분위 진한 밴드) -->
      <path d="${maxBand1090}" fill="#EB3B2E" fill-opacity="0.13" stroke="none" />
      <path d="${maxBand2575}" fill="#EB3B2E" fill-opacity="0.22" stroke="none" />

      <!-- 최저기온 분위수 배경 밴드 (10~90분위 연한 밴드, 25~75분위 진한 밴드) -->
      <path d="${minBand1090}" fill="#0088FF" fill-opacity="0.13" stroke="none" />
      <path d="${minBand2575}" fill="#0088FF" fill-opacity="0.22" stroke="none" />

      <!-- 최고/최저 실선 -->
      <path d="${maxLine}" fill="none" stroke="#EB3B2E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${minLine}" fill="none" stroke="#0088FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  `;

  // 최고기온 포인트 & 라벨
  maxCoords.forEach((pt, idx) => {
    svgHtml += `
      <g class="chart-point-group" data-type="max" data-index="${idx}">
        <circle class="chart-point-circle" cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#ffffff" stroke="#EB3B2E" stroke-width="2.2" />
        <text x="${pt.x}" y="${pt.y - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="#111111">${pt.data.maxTemp}°C</text>
        <circle class="nr__chart-hit-point" cx="${pt.x}" cy="${pt.y}" r="16" fill="transparent" data-type="max" data-index="${idx}" />
      </g>
    `;
  });

  // 최저기온 포인트 & 라벨
  minCoords.forEach((pt, idx) => {
    svgHtml += `
      <g class="chart-point-group" data-type="min" data-index="${idx}">
        <circle class="chart-point-circle" cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#ffffff" stroke="#0088FF" stroke-width="2.2" />
        <text x="${pt.x}" y="${pt.y - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="#111111">${pt.data.minTemp}°C</text>
        <circle class="nr__chart-hit-point" cx="${pt.x}" cy="${pt.y}" r="16" fill="transparent" data-type="min" data-index="${idx}" />
      </g>
    `;
  });

  svgHtml += `</svg>`;
  layer.innerHTML = svgHtml;

  // 툴팁 엘리먼트 준비
  let tooltipEl = datesWrapper.querySelector('.nr__forecast-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'nr__forecast-tooltip';
    datesWrapper.appendChild(tooltipEl);
  }

  let hideTimer = null;

  const cancelHide = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer = setTimeout(() => {
      if (tooltipEl) {
        tooltipEl.classList.remove('show');
      }
    }, 180);
  };

  // 툴팁 영역 위에 마우스가 머무르면 닫히지 않고 유지, 벗어나면 닫히도록 바인딩
  if (!tooltipEl._hasHoverEvents) {
    tooltipEl.addEventListener('mouseenter', () => {
      cancelHide();
    });
    tooltipEl.addEventListener('mouseleave', () => {
      scheduleHide();
    });
    tooltipEl._hasHoverEvents = true;
  }

  // PC 호버 및 모바일 터치 이벤트 바인딩
  const hitPoints = layer.querySelectorAll('.nr__chart-hit-point');
  hitPoints.forEach(hit => {
    const type = hit.dataset.type;
    const idx = parseInt(hit.dataset.index);
    const targetCoord = (type === 'max') ? maxCoords[idx] : minCoords[idx];
    if (!targetCoord) return;

    const showTooltip = () => {
      cancelHide();
      const p = targetCoord.data.percentiles[type];
      const isMax = (type === 'max');

      let html = '';
      if (isMax) {
        html = `
          <div class="nr__tooltip-header header-max">최고기온</div>
          <div class="nr__tooltip-list">
            <div class="nr__tooltip-row"><span class="nr__tt-label">90 <span class="nr__tt-unit">분위</span></span> <strong class="nr__tt-val val-max">${p.p90}°C</strong></div>
            <div class="nr__tooltip-row"><span class="nr__tt-label">75 <span class="nr__tt-unit">분위</span></span> <strong class="nr__tt-val val-max">${p.p75}°C</strong></div>
            <div class="nr__tooltip-row"><span class="nr__tt-label">25 <span class="nr__tt-unit">분위</span></span> <strong class="nr__tt-val val-max">${p.p25}°C</strong></div>
            <div class="nr__tooltip-row"><span class="nr__tt-label">10 <span class="nr__tt-unit">분위</span></span> <strong class="nr__tt-val val-max">${p.p10}°C</strong></div>
          </div>
        `;
        tooltipEl.className = 'nr__forecast-tooltip type-max show';
      } else {
        html = `
          <div class="nr__tooltip-header header-min">최저기온</div>
          <div class="nr__tooltip-list">
            <div class="nr__tooltip-row"><span class="nr__tt-label">10 <span class="nr__tt-unit">분위</span></span> <strong class="nr__tt-val val-min">${p.p10}°C</strong></div>
            <div class="nr__tooltip-row"><span class="nr__tt-label">25 <span class="nr__tt-unit">분위</span></span> <strong class="nr__tt-val val-min">${p.p25}°C</strong></div>
            <div class="nr__tooltip-row"><span class="nr__tt-label">75 <span class="nr__tt-unit">분위</span></span> <strong class="nr__tt-val val-min">${p.p75}°C</strong></div>
            <div class="nr__tooltip-row"><span class="nr__tt-label">90 <span class="nr__tt-unit">분위</span></span> <strong class="nr__tt-val val-min">${p.p90}°C</strong></div>
          </div>
        `;
        tooltipEl.className = 'nr__forecast-tooltip type-min show';
      }
      tooltipEl.innerHTML = html;

      // 위치 계산: 높이를 기온 영역 중간으로 고정하고, 가로 위치에 따라 좌/우 동적 표출
      const tooltipW = tooltipEl.offsetWidth || 140;
      const tooltipH = tooltipEl.offsetHeight || 136;

      // 1. 높이 위치: 기온 영역(tempLayout)의 수직 중간으로 고정
      const tempAreaCenterY = tempLayout.topOffset + (tempLayout.height / 2);
      const top = Math.round(tempAreaCenterY - (tooltipH / 2));

      // 2. 가로 위치: 현재 뷰포트 내 가로 위치에 따라 좌/우 동적 결정
      const viewport = datesWrapper.closest('.nr__hourly-scroll-viewport');
      let isRenderLeft = false;

      if (viewport) {
        const viewportScrollLeft = viewport.scrollLeft;
        const viewportWidth = viewport.clientWidth;
        // 뷰포트 화면 기준 포인트 상대 X좌표
        const screenX = targetCoord.x - viewportScrollLeft;

        // 포인트가 화면 우측(55% 이상)에 위치하거나 우측 여유 공간이 좁으면 좌측으로 표출
        if (screenX + 14 + tooltipW > viewportWidth || screenX > viewportWidth * 0.55) {
          isRenderLeft = true;
        }
      } else {
        // fallback: 전체 width 기준 우측 경계 체크
        if (targetCoord.x + 14 + tooltipW > width) {
          isRenderLeft = true;
        }
      }

      let left = isRenderLeft
        ? Math.round(targetCoord.x - tooltipW - 14)
        : Math.round(targetCoord.x + 14);

      // 전체 wrapper 경계 안전 클램핑
      if (left < 4) left = 4;
      if (left + tooltipW > width - 4) left = width - tooltipW - 4;

      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
    };

    hit.addEventListener('mouseenter', showTooltip);
    hit.addEventListener('mouseleave', scheduleHide);
    hit.addEventListener('click', (e) => {
      e.stopPropagation();
      showTooltip();
    });
  });

  // 외부 클릭 시 툴팁 숨김
  if (!datesWrapper._hasDocClickTooltip) {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nr__chart-hit-point') && !e.target.closest('.nr__forecast-tooltip')) {
        const tip = datesWrapper.querySelector('.nr__forecast-tooltip');
        if (tip) {
          cancelHide();
          tip.classList.remove('show');
        }
      }
    });
    datesWrapper._hasDocClickTooltip = true;
  }
};

/**
 * 2. 강수확률 막대 차트 렌더링 (SVG)
 */
export const defaultRenderRainChart = (layer, context) => {
  if (!layer || !context || !context.rainLayout) return;
  const { points, width, rainLayout } = context;
  const height = rainLayout.height;
  if (!points || points.length === 0) return;

  const barWidth = 20; // 2rem (20px)
  const paddingTop = 26;
  const maxBarHeight = height - paddingTop;

  let svgHtml = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  `;

  points.forEach(pt => {
    const prob = Math.min(100, Math.max(0, pt.rainProb));
    const barH = (prob / 100) * maxBarHeight;
    const barX = pt.x - barWidth / 2;
    const barY = height - barH;

    if (prob > 0) {
      svgHtml += `
        <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" fill="#8DC0FD" />
        <text x="${pt.x}" y="${barY - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#111111">${prob}%</text>
      `;
    } else {
      svgHtml += `
        <text x="${pt.x}" y="${height - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#111111">0%</text>
      `;
    }
  });

  svgHtml += `</svg>`;
  layer.innerHTML = svgHtml;
};

/**
 * 3. 풍향/풍속 차트 렌더링 (SVG 화살표, 풍속 선 그래프 & 텍스트)
 */
export const defaultRenderWindChart = (layer, context) => {
  if (!layer || !context || !context.windLayout) return;
  const { points, width, windLayout } = context;
  const height = windLayout.height;
  if (!points || points.length === 0) return;

  let minWind = 0;
  let maxWind = 6;
  points.forEach(pt => {
    if (pt.windSpeed > maxWind) maxWind = pt.windSpeed;
  });
  const windRange = (maxWind - minWind) || 1;
  const minY = 32; // 최고 풍속 위치
  const maxY = 48; // 최저 풍속 위치 (0m/s)

  const coords = points.map(pt => {
    const y = maxY - ((pt.windSpeed - minWind) / windRange) * (maxY - minY);
    return { ...pt, y };
  });

  let lineD = '';
  coords.forEach((pt, i) => {
    if (i === 0) lineD += `M ${pt.x} ${pt.y}`;
    else lineD += ` L ${pt.x} ${pt.y}`;
  });

  let svgHtml = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- 풍속 라인 차트 선 -->
      <path d="${lineD}" fill="none" stroke="#0088ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  `;

  coords.forEach(pt => {
    // 0.4rem (약 4px) 간격 계산
    // 포인트 원 반지름 3.5px
    const arrowY = pt.y - 14.5;    // 포인트 원 상단 4px 위 화살표
    const speedY = pt.y + 16.5;    // 포인트 원 하단 4px 아래 풍속 숫자
    const strengthY = pt.y + 29.5;  // 풍속 숫자 4px 아래 풍속 강도 텍스트

    svgHtml += `
      <g class="wind-item">
        <!-- 풍향 화살표 (포인트 원 0.4rem 위) -->
        <g transform="translate(${pt.x}, ${arrowY}) rotate(${pt.windDir})">
          <path d="M 0 -6 L 3 3.5 L 0 2 L -3 3.5 Z" fill="#111111" />
        </g>
        <!-- 풍속 차트 포인트 원 -->
        <circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#ffffff" stroke="#0088ff" stroke-width="2" />
        <!-- 풍속 숫자 (포인트 원 0.4rem 아래) -->
        <text x="${pt.x}" y="${speedY}" text-anchor="middle" font-size="12" font-weight="700" fill="#111111">${pt.windSpeed}</text>
        <!-- 풍속 강도 (숫자 0.4rem 아래) -->
        <text x="${pt.x}" y="${strengthY}" text-anchor="middle" font-size="11" font-weight="500" fill="#666666">${pt.windStrength}</text>
      </g>
    `;
  });

  svgHtml += `</svg>`;
  layer.innerHTML = svgHtml;
};

/**
 * 4. 습도 선형 차트 렌더링 (SVG)
 */
export const defaultRenderHumidityChart = (layer, context) => {
  if (!layer || !context || !context.humidityLayout) return;
  const { points, width, humidityLayout } = context;
  const height = humidityLayout.height;
  if (!points || points.length === 0) return;

  const paddingTop = 26;
  const paddingBottom = 16;
  const usableHeight = Math.max(10, height - paddingTop - paddingBottom);

  const coords = points.map(pt => {
    const prob = Math.min(100, Math.max(0, pt.humidity));
    const y = height - paddingBottom - (prob / 100) * usableHeight;
    return { ...pt, y, prob };
  });

  let d = '';
  let areaD = '';

  coords.forEach((pt, i) => {
    if (i === 0) {
      d += `M ${pt.x} ${pt.y}`;
      areaD += `M ${pt.x} ${height} L ${pt.x} ${pt.y}`;
    } else {
      const prev = coords[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
      areaD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
    }
  });

  if (coords.length > 0) {
    const lastPt = coords[coords.length - 1];
    const firstPt = coords[0];
    areaD += ` L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`;
  }

  let svgHtml = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="humidityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0288d1" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#0288d1" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#humidityGrad)" />
      <path d="${d}" fill="none" stroke="#0288d1" stroke-width="2" stroke-linecap="round" />
  `;

  coords.forEach(pt => {
    svgHtml += `
      <g class="chart-point-group">
        <circle cx="${pt.x}" cy="${pt.y}" r="3" fill="#ffffff" stroke="#0288d1" stroke-width="2" />
        <text x="${pt.x}" y="${pt.y - 7}" text-anchor="middle" font-size="11" font-weight="700" fill="#0288d1">${pt.prob}%</text>
      </g>
    `;
  });

  svgHtml += `</svg>`;
  layer.innerHTML = svgHtml;
};

/**
 * 통합 차트 렌더링 실행 함수
 * @param {HTMLElement} container
 * @param {Array} validDates
 * @param {Object} options
 */
export const renderAllForecastCharts = (container, validDates, options = {}) => {
  if (!container) return;
  const context = buildChartContext(container, validDates);
  if (!context) return;

  const tempLayer = container.querySelector('#hourly-temp-chart-layer');
  const rainLayer = container.querySelector('#hourly-rain-chart-layer');
  const windLayer = container.querySelector('#hourly-wind-chart-layer');
  const humidityLayer = container.querySelector('#hourly-humidity-chart-layer');

  const setupLayer = (layer, layout) => {
    if (!layer || !layout) return false;
    layer.style.top = `${layout.topOffset}px`;
    layer.style.height = `${layout.height}px`;
    layer.style.width = `${context.width}px`;
    layer.style.minWidth = `${context.width}px`;
    return true;
  };

  // 1. 기온 차트
  if (setupLayer(tempLayer, context.tempLayout)) {
    if (options.tempType === 'minmax') {
      renderMinMaxTempChart(tempLayer, context, validDates, options);
    } else {
      const fn = typeof options.renderTempChart === 'function' ? options.renderTempChart : (typeof window[options.renderTempChart] === 'function' ? window[options.renderTempChart] : defaultRenderTempChart);
      fn(tempLayer, context, validDates, options);
    }
  }

  // 2. 강수확률 차트
  if (setupLayer(rainLayer, context.rainLayout)) {
    const fn = typeof options.renderRainChart === 'function' ? options.renderRainChart : (typeof window[options.renderRainChart] === 'function' ? window[options.renderRainChart] : defaultRenderRainChart);
    fn(rainLayer, context, validDates, options);
  }

  // 3. 풍향/풍속 차트
  if (setupLayer(windLayer, context.windLayout)) {
    const fn = typeof options.renderWindChart === 'function' ? options.renderWindChart : (typeof window[options.renderWindChart] === 'function' ? window[options.renderWindChart] : defaultRenderWindChart);
    fn(windLayer, context, validDates, options);
  }

  // 4. 습도 차트
  if (setupLayer(humidityLayer, context.humidityLayout)) {
    const fn = typeof options.renderHumidityChart === 'function' ? options.renderHumidityChart : (typeof window[options.renderHumidityChart] === 'function' ? window[options.renderHumidityChart] : defaultRenderHumidityChart);
    fn(humidityLayer, context, validDates, options);
  }
};
