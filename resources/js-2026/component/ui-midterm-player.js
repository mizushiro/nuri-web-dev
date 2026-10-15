/**
 * 중기예보 지도 타임라인 플레이어 컴포넌트
 * - 기준시간 범위(기본 3시간, 6시간 등 가변) 내 22칸 1/n 균등 분할
 * - 분 단위 툴팁 말풍선 실시간 연동
 * - 진행 바(Track Fill) 및 지나간 눈금 파란색 채움
 * - 자정을 넘기는 시간대(예: 23시~02시) 날짜/요일 자동 분기 포맷팅
 * - 자동 순차 재생 및 이전/다음 1칸 증감 이동
 */

export function initMidtermPlayer(options) {
	// 이미 실행 중인 기존 플레이어 인스턴스가 있다면 정리(destroy)하여 타이머 및 이벤트 리스너 제거
	if (window.nrMidtermPlayer && typeof window.nrMidtermPlayer.destroy === 'function') {
		window.nrMidtermPlayer.destroy();
	}

	var abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
	var evOpt = abortController ? { signal: abortController.signal } : false;
	var passiveEvOpt = abortController ? { passive: true, signal: abortController.signal } : { passive: true };

	var totalSteps = (options && options.totalSteps) ? Number(options.totalSteps) : 22;
	var currentIndex = (options && options.initialIndex !== undefined) ? Number(options.initialIndex) : 0;
	var isPlaying = false;
	var playInterval = null;

	// 날짜 안전 파싱 헬퍼 (잘못된 포맷에 의한 NaN 방지)
	function parseSafeDate(val, fallback) {
		if (!val) return fallback;
		var d = new Date(val);
		return isNaN(d.getTime()) ? fallback : d;
	}

	// 기준 시작 시간 및 시간 범위 (기본 3시간, 가변 설정 가능)
	var defaultDate = new Date(2026, 10, 24, 9, 0, 0);
	var startDate = (options && options.startDate) ? parseSafeDate(options.startDate, defaultDate) : defaultDate;
  var totalDurationMs = 3 * 3600 * 1000;
  if (options && options.endDate) {
    var endParsed = parseSafeDate(options.endDate, null);
    if (endParsed) {
      totalDurationMs = Math.max(1000, endParsed.getTime() - startDate.getTime());
    }
  } else if (options && options.durationHours) {
    totalDurationMs = Math.max(0.5, Number(options.durationHours) || 3) * 3600 * 1000;
  }
  var dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  var timeTextEl = document.getElementById('nr-midterm-time-text');
  var tooltipEl = document.getElementById('nr-midterm-tooltip');
  var tooltipTextEl = document.getElementById('nr-midterm-tooltip-text');
  var trackFillEl = document.getElementById('nr-midterm-track-fill');
  var trackAreaEl = document.getElementById('nr-midterm-track-area');
  var ticksContainer = document.getElementById('nr-midterm-ticks');
  var prevBtn = document.getElementById('nr-midterm-prev-btn');
  var nextBtn = document.getElementById('nr-midterm-next-btn');
  var playBtn = document.getElementById('nr-midterm-play-btn');
  var iconPlay = playBtn ? playBtn.querySelector('.nr__midterm-icon-play') : null;
  var iconPause = playBtn ? playBtn.querySelector('.nr__midterm-icon-pause') : null;

  if (!trackFillEl || !tooltipEl) return null;

  // WAI-ARIA 슬라이더 초기 접근성 속성 부여
  if (trackAreaEl) {
    trackAreaEl.setAttribute('role', 'slider');
    trackAreaEl.setAttribute('tabindex', '0');
    trackAreaEl.setAttribute('aria-label', '예보 시점 타임라인 슬라이더');
    trackAreaEl.setAttribute('aria-valuemin', '0');
    trackAreaEl.setAttribute('aria-valuemax', String(totalSteps - 1));
  }

  // 기준시간 범위 텍스트 생성 (예: 11.24.(화) 09~12시 또는 11.24.(화) 23시 ~ 11.25(수) 02시)
  function getRangeText() {
    var start = startDate;
    var end = new Date(startDate.getTime() + totalDurationMs);

    var sM = String(start.getMonth() + 1).padStart(2, '0');
    var sD = String(start.getDate()).padStart(2, '0');
    var sDay = dayNames[start.getDay()];
    var sH = String(start.getHours()).padStart(2, '0');

    var eM = String(end.getMonth() + 1).padStart(2, '0');
    var eD = String(end.getDate()).padStart(2, '0');
    var eDay = dayNames[end.getDay()];
    var eH = String(end.getHours()).padStart(2, '0');

    var isSameDate = (start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate());

    if (isSameDate) {
      return sM + '.' + sD + '.(' + sDay + ') ' + sH + '~' + eH + '시';
    } else {
      return sM + '.' + sD + '.(' + sDay + ') ' + sH + '시 ~ ' + eM + '.' + eD + '(' + eDay + ') ' + eH + '시';
    }
  }

  // 기준시간 범위 내 22칸 1/n 이동 계산 (분 단위까지 정확히 노출)
  function calculateStepInfo(index) {
    var stepMs = Math.round((totalDurationMs / (totalSteps - 1)) * index);
    var currentTime = new Date(startDate.getTime() + stepMs);

    var cM = String(currentTime.getMonth() + 1).padStart(2, '0');
    var cD = String(currentTime.getDate()).padStart(2, '0');
    var cH = String(currentTime.getHours()).padStart(2, '0');
    var cMin = String(currentTime.getMinutes()).padStart(2, '0');

    // 파란 말풍선 툴팁: 분단위까지 노출 (예: 11/24.09:00, 11/24.09:09 ... 11/24.12:00)
    var tooltipText = cM + '/' + cD + '.' + cH + ':' + cMin;

    return {
      tooltipText: tooltipText,
      rangeText: getRangeText()
    };
  }

  // UI 업데이트
  function updateUI() {
    var percent = (currentIndex / (totalSteps - 1)) * 100;

    // 진행바 채움 (파란색으로 채워짐)
    trackFillEl.style.width = percent + '%';

    // 파란 말풍선 위치 이동
    tooltipEl.style.left = percent + '%';

    // 텍스트 업데이트
    var info = calculateStepInfo(currentIndex);
    if (tooltipTextEl) tooltipTextEl.textContent = info.tooltipText;
    if (timeTextEl) timeTextEl.textContent = info.rangeText;

    // WAI-ARIA 접근성 속성 실시간 동기화
    if (trackAreaEl) {
      trackAreaEl.setAttribute('aria-valuenow', String(currentIndex));
      trackAreaEl.setAttribute('aria-valuetext', info.tooltipText);
    }

    // 눈금 상태 업데이트 (지나간 눈금 파란색)
    if (ticksContainer) {
      var ticks = ticksContainer.querySelectorAll('.nr__midterm-tick');
      ticks.forEach(function (tick, idx) {
        if (idx < currentIndex) {
          tick.className = 'nr__midterm-tick nr__midterm-tick--passed';
        } else if (idx === currentIndex) {
          tick.className = 'nr__midterm-tick nr__midterm-tick--active';
        } else {
          tick.className = 'nr__midterm-tick';
        }
      });
    }

    // 상태 변경 이벤트 디스패치 (가이드 등 외부 연동용)
    var changeDetail = {
      currentIndex: currentIndex,
      totalSteps: totalSteps,
      info: info,
      options: options || {}
    };

    if (options && typeof options.onChange === 'function') {
      options.onChange(changeDetail);
    }

    window.dispatchEvent(new CustomEvent('midtermPlayerChange', {
      detail: changeDetail
    }));
  }

  // 스텝 이동
  function goToStep(index) {
    if (index < 0) index = 0;
    if (index >= totalSteps) index = totalSteps - 1;
    currentIndex = index;
    updateUI();
  }

  // 재생/일시정지 제어
  function setPlaying(playing) {
    isPlaying = playing;
    if (isPlaying) {
      if (iconPlay) iconPlay.style.display = 'none';
      if (iconPause) iconPause.style.display = 'block';
      if (playBtn) playBtn.setAttribute('title', '일시정지');

      if (currentIndex >= totalSteps - 1) {
        currentIndex = 0;
        updateUI();
      }

      if (playInterval) clearInterval(playInterval);
      playInterval = setInterval(function () {
        if (currentIndex < totalSteps - 1) {
          currentIndex++;
          updateUI();
        } else {
          currentIndex = 0;
          updateUI();
        }
      }, 800);
    } else {
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconPause) iconPause.style.display = 'none';
      if (playBtn) playBtn.setAttribute('title', '재생');
      if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
      }
    }
  }

  // 이전/다음 버튼 이벤트
  if (prevBtn) {
    prevBtn.onclick = function () {
      goToStep(currentIndex - 1);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = function () {
      goToStep(currentIndex + 1);
    };
  }

  if (playBtn) {
    playBtn.onclick = function () {
      setPlaying(!isPlaying);
    };
  }

  // 트랙 터치 및 드래그(스크러빙) 제어
  if (trackAreaEl) {
    var isDragging = false;

    // 터치/클릭 좌표로부터 22칸 스텝 인덱스 계산
    function getIndexFromClientX(clientX) {
      var rect = trackAreaEl.getBoundingClientRect();
      if (!rect.width) return 0;
      var clickX = clientX - rect.left;
      var ratio = Math.max(0, Math.min(1, clickX / rect.width));
      return Math.round(ratio * (totalSteps - 1));
    }

    function onDragStart(clientX) {
      isDragging = true;
      trackAreaEl.classList.add('is-dragging');
      // 드래그 조작 시 자동 재생 일시 정지
      if (isPlaying) {
        setPlaying(false);
      }
      var targetIndex = getIndexFromClientX(clientX);
      goToStep(targetIndex);
    }

    function onDragMove(clientX) {
      if (!isDragging) return;
      var targetIndex = getIndexFromClientX(clientX);
      if (targetIndex !== currentIndex) {
        goToStep(targetIndex);
      }
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      trackAreaEl.classList.remove('is-dragging');
    }

    // 1) Pointer Events 지원 (모바일 터치 / PC 마우스 통합)
    if (window.PointerEvent) {
      trackAreaEl.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.nr__midterm-btn-group')) return;
        if (e.button !== undefined && e.button !== 0) return;
        try {
          trackAreaEl.setPointerCapture(e.pointerId);
        } catch (err) {}
        onDragStart(e.clientX);
      }, evOpt);

      trackAreaEl.addEventListener('pointermove', function (e) {
        if (!isDragging) return;
        e.preventDefault();
        onDragMove(e.clientX);
      }, evOpt);

      trackAreaEl.addEventListener('pointerup', function (e) {
        try {
          trackAreaEl.releasePointerCapture(e.pointerId);
        } catch (err) {}
        onDragEnd();
      }, evOpt);

      trackAreaEl.addEventListener('pointercancel', function (e) {
        try {
          trackAreaEl.releasePointerCapture(e.pointerId);
        } catch (err) {}
        onDragEnd();
      }, evOpt);
    } else {
      // 2) 레거시 터치 이벤트 (Fallback)
      trackAreaEl.addEventListener('touchstart', function (e) {
        if (e.target.closest('.nr__midterm-btn-group')) return;
        if (e.touches && e.touches.length > 0) {
          onDragStart(e.touches[0].clientX);
        }
      }, passiveEvOpt);

      window.addEventListener('touchmove', function (e) {
        if (!isDragging) return;
        if (e.touches && e.touches.length > 0) {
          onDragMove(e.touches[0].clientX);
        }
      }, passiveEvOpt);

      window.addEventListener('touchend', onDragEnd, passiveEvOpt);
      window.addEventListener('touchcancel', onDragEnd, passiveEvOpt);

      // 레거시 마우스 이벤트
      trackAreaEl.addEventListener('mousedown', function (e) {
        if (e.target.closest('.nr__midterm-btn-group')) return;
        if (e.button !== 0) return;
        onDragStart(e.clientX);
      }, evOpt);

      window.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        onDragMove(e.clientX);
      }, evOpt);

      window.addEventListener('mouseup', onDragEnd, evOpt);
    }

    // 키보드 방향키 접근성 지원 (좌/우/상/하 1스텝, Home 처음, End 끝, Space/Enter 재생토글)
    trackAreaEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToStep(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToStep(currentIndex - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToStep(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToStep(totalSteps - 1);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setPlaying(!isPlaying);
      }
    }, evOpt);
  }

  // 초기 UI 반영
  updateUI();

  // 컨트롤러 인터페이스 생성
  var playerInstance = {
    goToStep: goToStep,
    setPlaying: setPlaying,
    setStartDate: function (newDate, newDurationHours) {
      startDate = parseSafeDate(newDate, startDate);
      if (newDurationHours) {
        totalDurationMs = Math.max(0.5, Number(newDurationHours) || 3) * 3600 * 1000;
      }
      updateUI();
    },
    setDuration: function (newDurationHours) {
      totalDurationMs = Math.max(0.5, Number(newDurationHours) || 3) * 3600 * 1000;
      updateUI();
    },
    setRange: function (newStartDate, newEndDate) {
      startDate = parseSafeDate(newStartDate, startDate);
      var end = parseSafeDate(newEndDate, null);
      if (end) {
        totalDurationMs = Math.max(1000, end.getTime() - startDate.getTime());
      }
      updateUI();
    },
    getCurrentIndex: function () {
      return currentIndex;
    },
    getInfo: function () {
      return calculateStepInfo(currentIndex);
    },
    destroy: function () {
      if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
      }
      isPlaying = false;
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconPause) iconPause.style.display = 'none';
      if (playBtn) playBtn.setAttribute('title', '재생');

      isDragging = false;
      if (trackAreaEl) {
        trackAreaEl.classList.remove('is-dragging');
      }
      if (abortController) {
        abortController.abort();
      }
      if (prevBtn) prevBtn.onclick = null;
      if (nextBtn) nextBtn.onclick = null;
      if (playBtn) playBtn.onclick = null;
    }
  };

  // 전역 객체 등록
  window.nrMidtermPlayer = playerInstance;
  return playerInstance;
}

// 전역 함수 등록
if (typeof window !== 'undefined') {
  window.initMidtermPlayer = initMidtermPlayer;
}
