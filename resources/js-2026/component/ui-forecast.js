import { renderAllForecastCharts } from './ui-forecast-chart.js';
import { initDropdown } from './ui-dropdown.js';

// 선택된 날짜 및 스크롤 동기화 상태 관리 변수
let currentSelectedDate = null;
let isProgrammaticScroll = false;
let programmaticScrollTimer = null;
let weatherSwiperInstance = null;
let settingsDropdownInstance = null;

/**
 * 일별 예보 카드 클릭 시 시간별 예보의 해당 날짜 위치로 스크롤 이동하는 함수
 * @param {string} targetDate - 선택한 날짜 (예: '05.24')
 */
export const scrollToHourlyDate = (targetDate) => {
  if (!targetDate) return;

  isProgrammaticScroll = true;
  clearTimeout(programmaticScrollTimer);
  programmaticScrollTimer = setTimeout(() => {
    isProgrammaticScroll = false;
  }, 600);

  // Mode 1, Mode 2 & Mode 3: 가로 스크롤 뷰포트 이동
  const viewport = document.querySelector('.nr__hourly-scroll-viewport');
  if (viewport) {
    const targetBlock = viewport.querySelector(`.nr__date-group[data-date="${targetDate}"], .nr__list-date-block[data-date="${targetDate}"]`);
    if (targetBlock) {
      if ('onscrollend' in window) {
        viewport.addEventListener('scrollend', () => {
          isProgrammaticScroll = false;
        }, { once: true });
      }

      viewport.scrollTo({
        left: targetBlock.offsetLeft,
        behavior: 'smooth'
      });
    }
  }
};

/**
 * 특정 날짜의 카드를 활성화하고 상단 Swiper 및 시간별 예보를 동기화하는 함수
 * @param {string} targetDate - 선택할 날짜 (예: '05.24')
 * @param {Object} options
 * @param {boolean} options.fromScroll - 가로 스크롤에 의한 동기화 여부
 */
export const selectWeatherCard = (targetDate, options = {}) => {
  const { fromScroll = false } = options;
  if (!targetDate) return;
  if (currentSelectedDate === targetDate) return;

  currentSelectedDate = targetDate;

  // 1. Swiper 날씨 카드 active 상태 갱신
  const weatherCards = document.querySelectorAll('.nr__weather-card');
  let targetIndex = -1;
  let targetCard = null;

  weatherCards.forEach((card, idx) => {
    if (card.dataset.date === targetDate) {
      targetCard = card;
      targetIndex = idx;
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // date-group 및 list-date-block data-current 속성 갱신
  const dateGroups = document.querySelectorAll('.nr__date-group, .nr__list-date-block');
  dateGroups.forEach(group => {
    group.setAttribute('data-current', group.dataset.date === targetDate ? 'true' : 'false');
  });

  if (!targetCard) return;

  // 2. Swiper 슬라이드 위치 조정 (선택된 카드가 화면 밖으로 벗어나면 화면 안으로 이동)
  if (weatherSwiperInstance && targetIndex >= 0) {
    const swiperEl = document.querySelector('.nr__weather-swiper');
    if (swiperEl) {
      const swiperRect = swiperEl.getBoundingClientRect();
      const cardRect = targetCard.getBoundingClientRect();

      // 카드가 화면 왼쪽으로 벗어난 경우
      if (cardRect.left < swiperRect.left + 5) {
        weatherSwiperInstance.slideTo(targetIndex);
      }
      // 카드가 화면 오른쪽으로 벗어난 경우
      else if (cardRect.right > swiperRect.right - 5) {
        const visibleSlides = Math.floor(weatherSwiperInstance.slidesPerViewDynamic?.() || weatherSwiperInstance.params.slidesPerView || 1);
        const targetSlide = Math.max(0, targetIndex - visibleSlides + 1);
        weatherSwiperInstance.slideTo(targetSlide);
      }
    }
  }

  // 3. 하단 안내 영역 업데이트
  const infoDetail = document.getElementById('selected-info-detail');
  if (infoDetail) {
    infoDetail.textContent = `${targetCard.dataset.day}(${targetCard.dataset.date}) - 오전 ${targetCard.dataset.amTemp} (강수 ${targetCard.dataset.amRain}) / 오후 ${targetCard.dataset.pmTemp} (강수 ${targetCard.dataset.pmRain})`;
  }

  // 4. 데이터 수집 및 커스텀 이벤트 전달
  const cardData = {
    day: targetCard.dataset.day,
    date: targetCard.dataset.date,
    amTemp: targetCard.dataset.amTemp,
    amRain: targetCard.dataset.amRain,
    pmTemp: targetCard.dataset.pmTemp,
    pmRain: targetCard.dataset.pmRain
  };
  console.log('[콜백 실행] 선택한 날씨 정보:', cardData);
  targetCard.dispatchEvent(new CustomEvent('weatherSelect', { detail: cardData, bubbles: true }));

  // 5. 카드 클릭 등 스크롤 외에서 선택한 경우 시간별 예보 스크롤 이동
  if (!fromScroll) {
    scrollToHourlyDate(targetDate);
  }
};

/**
 * Swiper 초기화 함수 및 데이터 바인딩
 * @param {Array} data - 날씨 카드 데이터 목록
 */
export const weatherSwiperExe = (data) => {
  // JSON 데이터를 Swiper 슬라이드 HTML 문자열로 생성하는 함수
  const weatherSlideMaker = (dataList) => {
    let result = '';
    dataList.forEach((item, idx) => {
      const displayDay = idx === 0 ? '오늘' : idx === 1 ? '내일' : idx === 2 ? '모레' : (item.dayOfWeek || item.day);
      result += `
        <div class="swiper-slide nr__weather-card ${item.active ? 'active' : ''}" data-date="${item.date}" data-day="${displayDay}" data-am-temp="${item.amTemp}" data-am-rain="${item.amRain}" data-pm-temp="${item.pmTemp}" data-pm-rain="${item.pmRain}">
          <div class="nr__card-header">
            <strong class="nr__card-day">${displayDay}</strong>
            <span class="nr__card-date">${item.date}</span>
          </div>
          <div class="nr__card-body">
            <div class="nr__time-col am">
              <div class="nr__weather-icon">
                <div data-icon-weather="${item.amIcon}">
                  <span class="sr-only">${item.amText}</span>
                </div>
              </div>
              <span class="nr__temp am">${item.amTemp}</span>
              <span class="nr__rain">${item.amRain}</span>
            </div>
            <div class="nr__time-col pm">
              <div class="nr__weather-icon">
                <div data-icon-weather="${item.pmIcon}">
                  <span class="sr-only">${item.pmText}</span>
                </div>
              </div>
              <span class="nr__temp pm">${item.pmTemp}</span>
              <span class="nr__rain">${item.pmRain}</span>
            </div>
          </div>
        </div>
      `;
    });
    return result;
  };

  // HTML 슬라이드 노드 추가
  const wrapper = document.querySelector('.nr__weather-swiper .swiper-wrapper');
  if (wrapper) {
    wrapper.innerHTML = weatherSlideMaker(data);
  }

  // 기존 Swiper 인스턴스 정리
  if (weatherSwiperInstance && typeof weatherSwiperInstance.destroy === 'function') {
    weatherSwiperInstance.destroy(true, true);
    weatherSwiperInstance = null;
  }

  // Swiper 인스턴스 생성
  const swiperTarget = document.querySelector('.nr__weather-swiper');
  if (swiperTarget) {
    weatherSwiperInstance = new Swiper(swiperTarget, {
      slidesPerView: 2,
      slidesPerGroup: 1, // 버튼 클릭 시 하나씩 이동
      spaceBetween: 12, 
      navigation: {
        nextEl: '.nr__weather-swiper-next',
        prevEl: '.nr__weather-swiper-prev',
      },
      breakpoints: {
        320: { slidesPerView: 2.2, spaceBetween: 8 },
        480: { slidesPerView: 2.6, spaceBetween: 10 },
        640: { slidesPerView: 3.2, spaceBetween: 10 },
        768: { slidesPerView: 4.2, spaceBetween: 12 },
        1024: { slidesPerView: 6, spaceBetween: 12 }
      }
    });
  }

  // 초기 선택 날짜 설정
  const activeData = Array.isArray(data) ? (data.find(item => item.active) || data[0]) : null;
  const initialActive = document.querySelector('.nr__weather-card.active') || document.querySelector('.nr__weather-card');
  currentSelectedDate = activeData ? activeData.date : (initialActive ? initialActive.dataset.date : null);

  // 카드 클릭 이벤트 및 콜백 바인딩
  const weatherCards = document.querySelectorAll('.nr__weather-card');
  weatherCards.forEach((card) => {
    card.addEventListener('click', function () {
      selectWeatherCard(this.dataset.date, { fromScroll: false });
    });
  });
};

/**
 * 시간별 예보 컴포넌트 실행 함수
 * @param {Array} data - weather.json 데이터
 * @param {Object} options - 차트 렌더링 옵션 (options.renderTempChart 등)
 */
export const hourlyForecastExe = (data, options = {}) => {
  let currentInterval = 1; // 1: 1시간 간격, 3: 3시간 간격
  let currentViewMode = 'mode1'; // mode1: 선형 차트, mode2: 막대 차트, mode3: 리스트

  const getWindAngle = (dir) => {
    if (typeof dir === 'number') return dir;
    const angles = {
      'N': 0, 'NNE': 23, 'NE': 45, 'ENE': 68,
      'E': 90, 'ESE': 113, 'SE': 135, 'SSE': 158,
      'S': 180, 'SSW': 203, 'SW': 225, 'WSW': 248,
      'W': 270, 'WNW': 293, 'NW': 315, 'NNW': 338
    };
    return angles[dir] ?? 0;
  };

  const filterHours = (hours, interval) => {
    if (!hours) return [];
    if (interval === 1) return hours;
    // 3시간 간격 필터링 (03시, 06시, 09시, 12시, 15시, 18시, 21시, 00시 등)
    return hours.filter(h => {
      const num = parseInt(h.time);
      return num % 3 === 0;
    });
  };

  const renderComponent = () => {
    const container = document.getElementById('hourly-forecast-content');
    if (!container) return;

    // hourly 데이터가 존재하는 날짜 항목만 사용
    const validDates = data.filter(d => d.hourly && d.hourly.length > 0);
    if (!currentSelectedDate && validDates.length > 0) {
      const activeItem = validDates.find(d => d.active) || validDates[0];
      currentSelectedDate = activeItem.date;
    }

    if (currentViewMode === 'mode3') {
      // Mode 3: 리스트 형태 (가로 스크롤 및 상단 스와이퍼 연동)
      let html = '<div class="nr__hourly-list-container nr__hourly-scroll-viewport"><div class="nr__hourly-list-wrapper">';
      validDates.forEach((dayItem, dayIndex) => {
        const hours = filterHours(dayItem.hourly, currentInterval);
        const isCurrent = currentSelectedDate ? (dayItem.date === currentSelectedDate) : (dayIndex === 0);
        html += `
          <div class="nr__list-date-block" data-date="${dayItem.date}" data-length="${hours.length}" data-current="${isCurrent}">
            <div class="nr__list-date-header">
              ${dayItem.forecastType ? `<span class="nr__badge-type">${dayItem.forecastType}</span>` : ''}
              <span class="nr__date-pill"> <span class="nr__date-pill-icon"><span data-icon="calendar-check"></span></span> ${dayItem.date} ${dayItem.dayOfWeek || dayItem.day}</span>
              <span class="nr__temp-range">
                <span class="nr__temp-range-group">
                  최저 <span class="nr__min-temp">${dayItem.minTemp || '-'}</span>
                </span>
                <span class="nr__divider">|</span>
                <span class="nr__temp-range-group">
                  최고 <span class="nr__max-temp">${dayItem.maxTemp || '-'}</span>
                </span>
              </span>
            </div>
            <table class="nr__hourly-list-table">
              <thead>
                <tr>
                  <th>시각</th>
                  <th>날씨</th>
                  <th>기온(체감)</th>
                  <th>강수량</th>
                  <th>강수강도</th>
                  <th>강수확률</th>
                  <th>바람</th>
                  <th>습도</th>
                  <th>폭염영향</th>
                </tr>
              </thead>
              <tbody>
        `;
        hours.forEach(h => {
          let windText = '-';
          if (Array.isArray(h.windText)) {
            if (h.windText.length >= 3) {
              windText = `${h.windText[0]} ${h.windText[1]} ${h.windText[2]}m/s`;
            } else if (h.windText.length === 2) {
              windText = `${h.windText[0]} ${h.windText[1]}`;
            } else if (h.windText.length === 1) {
              windText = h.windText[0];
            }
          } else if (h.windText) {
            windText = h.windText;
          }

          html += `
            <tr>
              <td>${h.time}</td>
              <td>
                <div class="nr__td-weather">
                  <div data-icon-weather="${h.icon}"></div>
                  <span>${h.text}</span>
                </div>
              </td>
              <td><strong>${h.temp}</strong><span class="nr__sensory-temp">(${h.sensoryTemp})</span></td>
              <td>${h.precip || '-'}</td>
              <td>${h.precipIntensity || '-'}</td>
              <td>${h.rainProb || '0%'}</td>
              <td>${windText}</td>
              <td>${h.humidity || '-'}</td>
              <td>${h.heatImpact || '-'}</td>
            </tr>
          `;
        });
        html += `
              </tbody>
            </table>
          </div>
        `;
      });
      html += '</div></div>';
      container.innerHTML = html;

      // 드래그 스크롤 이벤트 바인딩
      bindDragScroll();
      // 가로 스크롤 시 상단 스와이퍼 날짜 연동 바인딩
      bindScrollSync();
      return;
    }

    // Mode 1 (선형 차트) 및 Mode 2 (막대 차트)
    const isBarChartMode = (currentViewMode === 'mode2');

    let fixedColHtml = '';
    const headerCellHtml = `
      <div class="nr__fixed-header-cell">
        <button type="button" class="nr__drop-btn nr__fixed-info-btn" aria-controls="hourly-info-tooltip" aria-expanded="false" aria-haspopup="dialog" aria-label="시간별 예보 안내" data-tooltip="true">
          <span class="icon-aspect-info-round" data-size="22"></span>
        </button>
        <div id="hourly-info-tooltip" class="nr__drop-menu nr__tooltip-layer" data-position="bottom-left" role="tooltip" style="display: none;">
          <div class="nr__tooltip-body nr__hourly-help">
            <div class="nr__hourly-help-img"></div>
            <div class="nr__hourly-help-cont">
              <h4>예보 요소별 시간 안내(1시간 간격)</h4>
              <ul>
                <li><b>시각 :</b> 01시 기준 예시</li>
                <li><b>날씨 :</b> 이전 1시간(00시~01시)의 날씨</li>
                <li><b>기온 :</b> 01시 기준 예시</li>
                <li><b>체감온도 :</b> 01시 정시 체감온도</li>
                <li><b>강수량 :</b> 이전 1시간(00시~01시) 강수량<br />
                ※ ‘~1’은 1mm미만(예상강수량<1)을 나타냄</li>
                <li><b>강수강도 :</b> 이전 1시간(00시~01시) 강수량 또는 신적설을 텍스트 기반 체감도 높은 정보로 표출</li>
                <li><b>강수확률 :</b> 이전 1시간(00시~01시) 강수확률</li>
                <li><b>바람 :</b> 01시 정시 바람(풍향 및 강도, 풍속)</li>
                <li><b>습도 :</b> 01시 정시 습도</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    if (isBarChartMode) {
      fixedColHtml = `
        <div class="nr__hourly-fixed-column">
          ${headerCellHtml}
          <div class="nr__fixed-row-cell nr__row-time">시각</div>
          <div class="nr__fixed-row-cell nr__row-weather">날씨</div>
          <div class="nr__fixed-row-cell nr__row-temp-chart">기온</div>
          <div class="nr__fixed-row-cell nr__row-rain-prob has-chart">강수확률</div>
          <div class="nr__fixed-row-cell nr__row-wind has-chart">풍향/풍속(m/s)</div>
          <div class="nr__fixed-row-cell nr__row-humidity has-chart">습도</div>
        </div>
      `;
    } else {
      fixedColHtml = `
        <div class="nr__hourly-fixed-column">
          ${headerCellHtml}
          <div class="nr__fixed-row-cell nr__row-time">시각</div>
          <div class="nr__fixed-row-cell nr__row-weather">날씨</div>
          <div class="nr__fixed-row-cell nr__row-temp-chart">기온</div>
          <div class="nr__fixed-row-cell nr__row-sensory">체감온도</div>
          <div class="nr__fixed-row-cell nr__row-precip">강수량(mm)</div>
          <div class="nr__fixed-row-cell nr__row-rain-prob">강수확률</div>
          <div class="nr__fixed-row-cell nr__row-wind">바람(m/s)</div>
          <div class="nr__fixed-row-cell nr__row-humidity">습도</div>
          <div class="nr__fixed-row-cell nr__row-heat">폭염영향</div>
        </div>
      `;
    }

    let chartLayersHtml = `
      <div class="nr__hourly-chart-layer nr__temp-chart-layer" id="hourly-temp-chart-layer"></div>
    `;
    if (isBarChartMode) {
      chartLayersHtml += `
        <div class="nr__hourly-chart-layer nr__rain-chart-layer" id="hourly-rain-chart-layer"></div>
        <div class="nr__hourly-chart-layer nr__wind-chart-layer" id="hourly-wind-chart-layer"></div>
        <div class="nr__hourly-chart-layer nr__humidity-chart-layer" id="hourly-humidity-chart-layer"></div>
      `;
    }

    let scrollViewportHtml = `
      <div class="nr__hourly-scroll-viewport">
        <div class="nr__hourly-dates-wrapper">
          ${chartLayersHtml}
    `;

    validDates.forEach((dayItem, dayIndex) => {
      const isLastDate = (dayIndex === validDates.length - 1);
      const hours = filterHours(dayItem.hourly, currentInterval);
      const isCurrent = currentSelectedDate ? (dayItem.date === currentSelectedDate) : (dayIndex === 0);
      scrollViewportHtml += `
        <div class="nr__date-group" data-date="${dayItem.date}" data-length="${hours.length}" data-current="${isCurrent}">
          <div class="nr__date-sticky-header">
            <span class="nr__badge-type">${dayItem.forecastType}</span>
            <span class="nr__date-pill"> <span class="nr__date-pill-icon"><span data-icon="calendar-check"></span></span> ${dayItem.date} ${dayItem.dayOfWeek || dayItem.day}</span>
            <span class="nr__temp-range">
              <span class="nr__temp-range-group">
                최저 <span class="nr__min-temp">${dayItem.minTemp || '-'}</span>
              </span>
              <span class="nr__divider">|</span>
              <span class="nr__temp-range-group">
                최고 <span class="nr__max-temp">${dayItem.maxTemp || '-'}</span>
              </span>
            </span>
          </div>
          <div class="nr__hourly-columns-row">
      `;

      hours.forEach(h => {
        const numericTemp = parseInt(h.temp) || 0;
        const rainProbVal = parseInt(h.rainProb) || 0;
        const windDirVal = typeof h.windDir === 'number' ? h.windDir : getWindAngle(h.windDir);
        const windSpeedVal = Array.isArray(h.windText) ? (h.windText.length >= 3 ? h.windText[2] : h.windText[1]) : (h.windSpeed || '0');
        const windStrengthVal = Array.isArray(h.windText) && h.windText.length >= 3 ? h.windText[1] : '약';
        const humidityVal = parseInt(h.humidity) || 0;

        if (isBarChartMode) {
          scrollViewportHtml += `
            <div class="nr__hourly-col" data-date="${dayItem.date}" data-time="${h.time}" data-temp="${numericTemp}" data-rain-prob="${rainProbVal}" data-wind-dir="${windDirVal}" data-wind-speed="${windSpeedVal}" data-wind-strength="${windStrengthVal}" data-humidity="${humidityVal}">
              <div class="nr__cell nr__row-time nr__cell-time">
                <span class="sr-only">시각</span>
                ${h.time}
              </div>
              <div class="nr__cell nr__row-weather nr__cell-weather">
                <span class="sr-only">날씨</span>
                <div data-icon-weather="${h.icon}">
                  <span class="sr-only">${h.text}</span>
                </div>
              </div>
              <div class="nr__cell nr__row-temp-chart nr__cell-temp-chart">
                <span class="sr-only">기온 ${h.temp}</span>
              </div>
              <div class="nr__cell nr__row-rain-prob nr__cell-rain-chart has-chart" data-rain-prob="${h.rainProb}">
                <span class="sr-only">강수확률 ${h.rainProb}</span>
              </div>
              <div class="nr__cell nr__row-wind nr__cell-wind-chart has-chart">
                <span class="sr-only">풍향/풍속</span>
              </div>
              <div class="nr__cell nr__row-humidity nr__cell-humidity-chart has-chart" data-humidity="${h.humidity}">
                <span class="sr-only">습도 ${h.humidity}</span>
              </div>
            </div>
          `;
        } else {
          scrollViewportHtml += `
            <div class="nr__hourly-col" data-date="${dayItem.date}" data-time="${h.time}" data-temp="${numericTemp}" data-rain-prob="${rainProbVal}" data-wind-dir="${windDirVal}" data-wind-speed="${windSpeedVal}" data-wind-strength="${windStrengthVal}" data-humidity="${humidityVal}">
              <div class="nr__cell nr__row-time nr__cell-time">
                <span class="sr-only">시각</span>
                ${h.time}
              </div>
              <div class="nr__cell nr__row-weather nr__cell-weather">
                <span class="sr-only">날씨</span>
                <div data-icon-weather="${h.icon}">
                  <span class="sr-only">${h.text}</span>
                </div>
              </div>
              <div class="nr__cell nr__row-temp-chart nr__cell-temp-chart">
                <span class="sr-only">기온 ${h.temp}</span>
              </div>
              <div class="nr__cell nr__row-sensory nr__cell-sensory">
                <span class="sr-only">체감기온</span>
                <div class="nr__cell-sensory-value">${h.sensoryTemp}</div>
              </div>
              <div class="nr__cell nr__row-precip nr__cell-precip">
                <span class="sr-only">강수량</span>
                <div class="nr__cell-precip-value">${h.precip}</div>
              </div>
              <div class="nr__cell nr__row-rain-prob nr__cell-rain-prob">
                <span class="sr-only">강수확률</span>
                <div class="nr__cell-rain-prob-value">${h.rainProb}</div>
              </div>
              <div class="nr__cell nr__row-wind nr__cell-wind">
                <span class="sr-only">${Array.isArray(h.windText) ? `${h.windText[0]} ${h.windText.length >= 3 ? h.windText[1] + ' ' : ''}${h.windText.length >= 3 ? h.windText[2] : h.windText[1]}m/s` : '풍향 및 풍속'}</span>
                <span class="nr__wind-arrow" data-icon="wind-arrow" style="transform: rotate(${windDirVal}deg);"></span>
                <span class="nr__wind-strength">${windStrengthVal}</span>
                <span class="nr__wind-text">${windSpeedVal}</span>
              </div>
              <div class="nr__cell nr__row-humidity nr__cell-humidity">
                <span class="sr-only">습도</span>
                ${h.humidity}
              </div>
              <div class="nr__cell nr__row-heat nr__cell-heat">
                <span class="sr-only">폭염영향</span>
                ${h.heatImpact || '-'}
              </div>
            </div>
          `;
        }
      });

      if (isLastDate) {
        if (isBarChartMode) {
          scrollViewportHtml += `
            <div class="nr__hourly-col nr__empty-col">
              <div class="nr__cell nr__row-time nr__cell-time"></div>
              <div class="nr__cell nr__row-weather nr__cell-weather"></div>
              <div class="nr__cell nr__row-temp-chart nr__cell-temp-chart"></div>
              <div class="nr__cell nr__row-rain-prob nr__cell-rain-chart has-chart"></div>
              <div class="nr__cell nr__row-wind nr__cell-wind-chart has-chart"></div>
              <div class="nr__cell nr__row-humidity nr__cell-humidity-chart has-chart"></div>
            </div>
          `;
        } else {
          scrollViewportHtml += `
            <div class="nr__hourly-col nr__empty-col">
              <div class="nr__cell nr__row-time nr__cell-time"></div>
              <div class="nr__cell nr__row-weather nr__cell-weather"></div>
              <div class="nr__cell nr__row-temp-chart nr__cell-temp-chart"></div>
              <div class="nr__cell nr__row-sensory nr__cell-sensory"><div class="nr__cell-sensory-value"></div></div>
              <div class="nr__cell nr__row-precip nr__cell-precip"><div class="nr__cell-precip-value"></div></div>
              <div class="nr__cell nr__row-rain-prob nr__cell-rain-prob"><div class="nr__cell-rain-prob-value"></div></div>
              <div class="nr__cell nr__row-wind nr__cell-wind"></div>
              <div class="nr__cell nr__row-humidity nr__cell-humidity"></div>
              <div class="nr__cell nr__row-heat nr__cell-heat"></div>
            </div>
          `;
        }
      }

      scrollViewportHtml += `
          </div>
        </div>
      `;
    });

    scrollViewportHtml += `
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="nr__hourly-grid-container ${isBarChartMode ? 'nr__mode-bar-chart' : 'nr__mode-line-chart'}">
        ${fixedColHtml}
        ${scrollViewportHtml}
      </div>
    `;

    // 고정 열 헤더 정보 툴팁 초기화
    const fixedTooltipEl = container.querySelector('.nr__fixed-header-cell .nr__fixed-info-btn, .nr__fixed-header-cell .nr__tooltip-wrap');
    if (fixedTooltipEl) {
      initDropdown(fixedTooltipEl);
    }

    // 차트 레이어 렌더링 (전체 4가지 차트 통합 렌더링)
    renderAllForecastCharts(container, validDates, options);

    // 드래그 스크롤 이벤트 바인딩
    bindDragScroll();
    // 가로 스크롤 시 상단 스와이퍼 날짜 연동 바인딩
    bindScrollSync();
  };

  // 마우스 드래그 스크롤 바인딩 함수
  const bindDragScroll = () => {
    const slider = document.querySelector('.nr__hourly-scroll-viewport');
    if (!slider) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    slider.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, a, input, select')) return;
      isDown = true;
      slider.classList.add('grabbing');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
      if (!isDown) return;
      isDown = false;
      slider.classList.remove('grabbing');
    });

    slider.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      slider.classList.remove('grabbing');
    });

    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
    });
  };

  // 가로 스크롤 시 상단 Swiper 날짜 연동 바인딩
  const bindScrollSync = () => {
    const viewport = document.querySelector('.nr__hourly-scroll-viewport');
    if (!viewport) return;

    let scrollRafId = null;

    const onViewportScroll = () => {
      if (isProgrammaticScroll) return;
      if (scrollRafId) return;

      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = null;
        syncDateFromScroll();
      });
    };

    viewport.addEventListener('scroll', onViewportScroll, { passive: true });

    // 사용자의 직접적인 마우스 클릭/드래그/터치/휠 입력 시 프로그래밍 스크롤 잠금 해제
    const unlockScroll = () => {
      isProgrammaticScroll = false;
      if (programmaticScrollTimer) {
        clearTimeout(programmaticScrollTimer);
        programmaticScrollTimer = null;
      }
    };

    viewport.addEventListener('pointerdown', unlockScroll, { passive: true });
    viewport.addEventListener('wheel', unlockScroll, { passive: true });
    viewport.addEventListener('touchstart', unlockScroll, { passive: true });
  };

  // 현재 가로 스크롤 위치를 기준으로 활성화할 날짜 계산 및 연동
  const syncDateFromScroll = () => {
    const viewport = document.querySelector('.nr__hourly-scroll-viewport');
    if (!viewport) return;

    const dateGroups = viewport.querySelectorAll('.nr__date-group, .nr__list-date-block');
    if (!dateGroups.length) return;

    const scrollLeft = viewport.scrollLeft;
    // 고정 컬럼 또는 화면 좌측 기준 오프셋 (약 24px)
    const checkOffset = 24;
    const checkPos = scrollLeft + checkOffset;

    let activeDate = null;

    for (let i = 0; i < dateGroups.length; i++) {
      const group = dateGroups[i];
      const start = group.offsetLeft;
      const end = start + group.offsetWidth;

      if (checkPos >= start && checkPos < end) {
        activeDate = group.dataset.date;
        break;
      }
    }

    // 스크롤 끝에 도달했을 때 마지막 날짜 처리
    const isScrolledToEnd = Math.ceil(scrollLeft + viewport.clientWidth) >= viewport.scrollWidth - 10;
    if (isScrolledToEnd) {
      activeDate = dateGroups[dateGroups.length - 1].dataset.date;
    }

    if (activeDate) {
      selectWeatherCard(activeDate, { fromScroll: true });
    }
  };

  // 뷰 모드 변경 처리 함수
  const switchViewMode = (newMode) => {
    if (!newMode) return;
    currentViewMode = newMode;

    // 1. 데스크탑 버튼 동기화
    const viewBtns = document.querySelectorAll('.nr__hourly-view-btn');
    viewBtns.forEach(b => {
      if (b.dataset.view === newMode) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // 2. 모바일 드롭다운 메뉴 아이템 동기화
    const mobileViewBtns = document.querySelectorAll('.nr__hourly-settings-menu .nr__item-link');
    mobileViewBtns.forEach(b => {
      if (b.dataset.view === newMode) {
        b.classList.add('active');
        b.setAttribute('aria-selected', 'true');
      } else {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      }
    });

    // 3. 모바일 드롭다운 인스턴스 동기화 및 닫기
    if (settingsDropdownInstance) {
      if (typeof settingsDropdownInstance.setActiveView === 'function') {
        settingsDropdownInstance.setActiveView(newMode);
      }
      if (typeof settingsDropdownInstance.close === 'function') {
        settingsDropdownInstance.close(false);
      }
    } else {
      const menu = document.getElementById('hourly-settings-menu');
      const trigger = document.querySelector('.nr__hourly-settings-btn');
      if (menu) menu.style.display = 'none';
      if (trigger) {
        trigger.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
      }
    }

    renderComponent();
    if (currentSelectedDate) {
      scrollToHourlyDate(currentSelectedDate);
    }
  };

  // 초기 렌더링
  renderComponent();

  // 간격 버튼 이벤트 바인딩
  const intervalBtns = document.querySelectorAll('.nr__hourly-interval-btn');
  intervalBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      intervalBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentInterval = parseInt(this.dataset.interval);
      renderComponent();
      if (currentSelectedDate) {
        scrollToHourlyDate(currentSelectedDate);
      }
    });
  });

  // 데스크탑 뷰 모드 버튼 이벤트 바인딩
  const viewBtns = document.querySelectorAll('.nr__hourly-view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      switchViewMode(this.dataset.view);
    });
  });

  // 모바일 뷰 모드 드롭다운 메뉴 아이템 이벤트 바인딩 (피씨형과 동일한 이벤트 적용)
  const mobileViewBtns = document.querySelectorAll('.nr__hourly-settings-menu .nr__item-link');
  mobileViewBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const mode = this.dataset.view;
      if (mode) {
        switchViewMode(mode);
      }
    });
  });

  // 모바일 설정 드롭다운 초기화
  const settingsDropdownEl = document.querySelector('.nr__hourly-settings-dropdown, .nr__hourly-settings-btn');
  if (settingsDropdownEl) {
    settingsDropdownInstance = initDropdown(settingsDropdownEl, {
      onSelect: (selectedMode) => {
        switchViewMode(selectedMode);
      }
    });
    if (settingsDropdownInstance && typeof settingsDropdownInstance.setActiveView === 'function') {
      settingsDropdownInstance.setActiveView(currentViewMode);
    }
  }
};

/**
 * 예보 UI 통합 실행 함수
 * 외부에서 불러온 데이터를 전달받아 내부에서 일별(Swiper) 및 시간별 예보를 각각 분기 실행합니다.
 * @param {Array} data - 날씨 예보 데이터
 * @param {Object} [options] - 차트 렌더링 및 UI 옵션 객체
 * @param {Function|string} [options.renderTempChart] - 외부 기온 챠트 스크립트/함수
 * @param {Function|string} [options.renderRainChart] - 외부 강수확률 챠트 스크립트/함수
 * @param {Function|string} [options.renderWindChart] - 외부 풍향/풍속 챠트 스크립트/함수
 * @param {Function|string} [options.renderHumidityChart] - 외부 습도 챠트 스크립트/함수
 */
export const uiForecastExe = (data, options = {}) => {
  if (!data) return;
  weatherSwiperExe(data);
  hourlyForecastExe(data, options);
};

export const initForecast = uiForecastExe;
