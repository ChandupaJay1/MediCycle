import React, { useState, useEffect } from 'react';
import { useCycle } from '../context/CycleContext';

const TodayTab = () => {
  const {
    currentCycle,
    takeTablet,
    undoTablet,
    startPeriod,
    togglePeriodDay,
    endPeriod,
    startNewCycle
  } = useCycle();

  const takenCount = currentCycle.tablets.filter((t) => t.taken).length;
  const nextIndexToTake = currentCycle.tablets.findIndex((t) => !t.taken);

  // Focus active month tab automatically
  const [activeMonthTab, setActiveMonthTab] = useState(0);

  useEffect(() => {
    if (nextIndexToTake === -1) {
      setActiveMonthTab(2);
    } else {
      const currentMonthIndex = Math.floor(nextIndexToTake / 24);
      setActiveMonthTab(currentMonthIndex);
    }
  }, [nextIndexToTake]);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is running standalone
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(!!checkStandalone);

    // Detect iOS device
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(checkIOS);

    // Listen for Chrome/Android install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // SVG Progress Ring calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (takenCount / 72) * circumference;

  // Calendar strip builder
  const get14Days = (startDateStr) => {
    if (!startDateStr) return [];
    const dates = [];
    const start = new Date(startDateStr);
    for (let i = 0; i < 14; i++) {
      const next = new Date(start);
      next.setDate(start.getDate() + i);
      const dateStr = next.toISOString().split('T')[0];
      const dayName = next.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = next.getDate();
      dates.push({ dateStr, dayName, dayNum });
    }
    return dates;
  };

  const periodCalendarDays = get14Days(currentCycle.periodStartDate);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPhaseStyles = (phase) => {
    switch (phase) {
      case 'medication':
        return 'bg-[#FFEBF0] text-[#8C2D4A]';
      case 'period_wait':
        return 'bg-[#FFEFCB] text-[#8C6A1A]';
      case 'period':
        return 'bg-[#FFCCD5] text-[#B31E3F]';
      case 'complete':
        return 'bg-[#D4EDDA] text-[#155724]';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 pb-[92px] custom-scrollbar flex flex-col gap-5">
      
      {/* Smart PWA Install Banner */}
      {!isStandalone && (
        <div className="bg-gradient-to-r from-primary/10 to-primary-light border border-primary/20 p-4 rounded-2xl text-gray-800 flex flex-col gap-2.5 shadow-rose-sm">
          <div className="font-bold text-[0.88rem] flex items-center gap-1.5 text-primary">
            <span>📱</span> Install MediCycle
          </div>
          {isIOS ? (
            <p className="text-[0.78rem] text-gray-600 leading-normal font-medium">
              To add MediCycle to your home screen: Tap the Share button <span className="font-bold">📤</span> in Safari, scroll down, and select <span className="font-bold">"Add to Home Screen"</span>. 🌸
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[0.78rem] text-gray-600 leading-normal font-medium">
                Install MediCycle on your device for quick offline access and daily reminder notifications!
              </p>
              {deferredPrompt && (
                <button
                  onClick={handleInstallPWA}
                  className="bg-primary hover:bg-primary-hover text-white text-[0.8rem] font-bold py-2 px-4 rounded-xl shadow-sm self-start transition-all"
                >
                  Install Now
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Header Card */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex flex-col">
          <h1 className="font-title text-2xl font-extrabold text-gray-800 tracking-tight">Hi, Sandali 🌸</h1>
          <p className="text-[0.75rem] text-gray-400 mt-0.5">Track your cycle and stay healthy.</p>
        </div>
        <span className={`text-[0.62rem] font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-lg shadow-sm border border-black/5 ${getPhaseStyles(currentCycle.phase)}`}>
          {currentCycle.phase.replace('_', ' ')}
        </span>
      </div>

      {/* Circular Progress Card */}
      <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col items-center justify-center gap-4 transition-all duration-200 hover:shadow-rose-md">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="transform -rotate-90 w-full h-full">
            <circle className="fill-none stroke-primary-light stroke-[12px]" cx="80" cy="80" r={radius} />
            <circle
              className="fill-none stroke-primary stroke-[12px] stroke-linecap-round progress-ring-bar"
              cx="80"
              cy="80"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-title text-3xl font-extrabold text-primary">{takenCount}/72</span>
            <span className="text-[0.68rem] text-gray-500 font-bold uppercase tracking-wider">Pills taken</span>
          </div>
        </div>
        <div className="text-center w-full">
          <p className="text-[0.92rem] text-gray-600 font-bold">
            Overall Treatment Progress: {Math.round((takenCount / 72) * 100)}%
          </p>
        </div>
      </div>

      {/* 5-tablet countdown banner */}
      {currentCycle.phase === 'medication' && takenCount >= 67 && (
        <div className="bg-gradient-to-br from-[#FFEBF0] to-[#FFD1DC] border-l-4 border-primary p-4 rounded-2xl text-gray-800 flex flex-col gap-2 shadow-sm animate-pulse-slow">
          <div className="font-bold text-[0.92rem] flex items-center gap-1.5 text-primary">
            <span>⚠️</span> Nearly Complete! 5-Tablet Countdown
          </div>
          <p className="text-[0.8rem] text-gray-600 font-medium">
            You have {72 - takenCount} {72 - takenCount === 1 ? 'tablet' : 'tablets'} remaining in this treatment.
          </p>
          <div className="flex gap-2">
            {[67, 68, 69, 70, 71].map((idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full border border-primary transition-all duration-300 ${
                  currentCycle.tablets[idx].taken ? 'bg-primary scale-110' : 'bg-white'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Phase: Medication Grid */}
      {currentCycle.phase === 'medication' && (
        <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4 transition-all duration-200 hover:shadow-rose-md">
          <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5">
            <span>💊</span> Medication Cycle Grid
          </div>

          {/* Month Switcher Tabs */}
          <div className="flex bg-primary-light p-1 rounded-2xl gap-1">
            {['Month 1', 'Month 2', 'Month 3'].map((monthLabel, idx) => (
              <button
                key={idx}
                className={`flex-1 py-2 text-[0.82rem] font-title font-semibold rounded-xl transition-all duration-200 ${
                  activeMonthTab === idx
                    ? 'bg-white text-primary shadow-sm font-bold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveMonthTab(idx)}
              >
                {monthLabel}
              </button>
            ))}
          </div>

          {/* Responsive Pill Grid */}
          <div className="grid grid-cols-6 gap-2 justify-items-center py-2 min-[360px]:gap-2.5">
            {Array.from({ length: 24 }).map((_, i) => {
              const pillNum = i + 1;
              const globalIndex = activeMonthTab * 24 + i;
              const tablet = currentCycle.tablets[globalIndex];
              const isTaken = tablet.taken;
              const isNext = globalIndex === nextIndexToTake;
              const isLocked = globalIndex > nextIndexToTake;

              return (
                <button
                  key={globalIndex}
                  className={`w-10 h-10 min-[375px]:w-11 min-[375px]:h-11 min-[410px]:w-12 min-[410px]:h-12 rounded-full border-2 font-title text-[0.88rem] min-[375px]:text-[0.95rem] font-bold flex items-center justify-center shadow-[0_4px_6px_rgba(232,99,138,0.06)] transition-all duration-150 active:scale-85 ${
                    isTaken
                      ? 'bg-gradient-to-br from-primary to-[#F383A2] border-primary text-white shadow-[0_6px_12px_rgba(232,99,138,0.22)]'
                      : isLocked
                      ? 'opacity-35 border-gray-300 text-gray-400 shadow-none cursor-not-allowed'
                      : 'border-primary bg-white text-primary cursor-pointer hover:bg-primary-light'
                  }`}
                  disabled={isLocked}
                  onClick={() => takeTablet(globalIndex)}
                  title={isTaken ? `Taken at ${new Date(tablet.takenAt).toLocaleString()}` : isNext ? 'Tap to mark taken' : 'Locked'}
                >
                  {isTaken ? '✓' : pillNum}
                </button>
              );
            })}
          </div>

          {/* Grid Controls */}
          <div className="flex gap-2.5 mt-1">
            <button
              className="bg-primary-light text-primary border border-border-rose font-title text-sm font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={takenCount === 0}
              onClick={undoTablet}
            >
              <span>↩️</span> Undo Last Taken
            </button>
          </div>
        </div>
      )}

      {/* Phase: Period Wait */}
      {currentCycle.phase === 'period_wait' && (
        <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4 transition-all duration-200 hover:shadow-rose-md">
          <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5">
            <span>🌸</span> Medication Phase Finished
          </div>
          <p className="text-[0.88rem] text-gray-500 leading-relaxed">
            Congratulations, you completed all 72 tablets of this treatment cycle! 🌸
          </p>
          <p className="text-[0.88rem] text-gray-500 leading-relaxed">
            The app is currently waiting for your period flow to start. Once it does, click the button below to start period tracking.
          </p>
          
          <button
            className="bg-gradient-to-br from-primary to-[#FA8CA8] text-white border-none font-title text-base font-bold py-3.5 px-5 rounded-2xl shadow-[0_4px_15px_rgba(232,99,138,0.18)] flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
            onClick={startPeriod}
          >
            <span>🩸</span> Mark Period Started
          </button>
          
          <button
            className="bg-primary-light text-primary border border-border-rose font-title text-sm font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
            onClick={undoTablet}
          >
            <span>↩️</span> Undo 72nd Pill
          </button>
        </div>
      )}

      {/* Phase: Period Calendar Strip */}
      {currentCycle.phase === 'period' && (
        <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4 transition-all duration-200 hover:shadow-rose-md">
          <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5">
            <span>🩸</span> Period Flow Tracking
          </div>
          <p className="text-[0.85rem] text-gray-500 leading-relaxed">
            Toggle the days on the 14-day strip below where you experienced bleeding flow.
          </p>

          {/* Horizontal Calendar Strip */}
          <div className="flex overflow-x-auto gap-2.5 py-2 custom-scrollbar snap-x">
            {periodCalendarDays.map((day) => {
              const isSelected = currentCycle.periodDays.includes(day.dateStr);
              return (
                <button
                  key={day.dateStr}
                  className={`flex-[0_0_46px] h-[60px] flex flex-col justify-center items-center border rounded-xl cursor-pointer snap-start transition-all duration-200 active:scale-90 ${
                    isSelected
                      ? 'bg-primary border-primary text-white shadow-[0_4px_10px_rgba(232,99,138,0.22)]'
                      : 'border-border-rose bg-white text-gray-800 hover:bg-primary-light'
                  }`}
                  onClick={() => togglePeriodDay(day.dateStr)}
                  title={day.dateStr}
                >
                  <span className={`text-[0.66rem] font-bold ${isSelected ? 'text-[#FFEBF0]' : 'text-gray-400'}`}>
                    {day.dayName}
                  </span>
                  <span className="font-title text-sm font-extrabold mt-0.5">{day.dayNum}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5 mt-1">
            <button
              className="bg-gradient-to-br from-primary to-[#FA8CA8] text-white border-none font-title text-base font-bold py-3.5 px-5 rounded-2xl shadow-[0_4px_15px_rgba(232,99,138,0.18)] flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
              onClick={endPeriod}
            >
              <span>✓</span> Mark Period Ended
            </button>
            <div className="flex justify-between py-2 border-b border-border-rose text-[0.88rem] mt-1">
              <span className="text-gray-500 font-medium">Period Started:</span>
              <span className="text-gray-800 font-bold">{formatDate(currentCycle.periodStartDate)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-rose text-[0.88rem]">
              <span className="text-gray-500 font-medium">Active Period Days:</span>
              <span className="text-gray-800 font-bold">{currentCycle.periodDays.length} days</span>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Complete */}
      {currentCycle.phase === 'complete' && (
        <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4 transition-all duration-200 hover:shadow-rose-md">
          <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5">
            <span>✨</span> Treatment Cycle Complete
          </div>
          <p className="text-[0.88rem] text-gray-500 leading-relaxed">
            This 3-month treatment cycle has successfully finished. Here is the summary:
          </p>

          <div className="flex flex-col gap-2 mt-1">
            <div className="flex justify-between py-2 border-b border-border-rose text-[0.88rem]">
              <span className="text-gray-500 font-medium">Period Started:</span>
              <span className="text-gray-800 font-bold">{formatDate(currentCycle.periodStartDate)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-rose text-[0.88rem]">
              <span className="text-gray-500 font-medium">Period Ended:</span>
              <span className="text-gray-800 font-bold">{formatDate(currentCycle.periodEndDate)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-rose text-[0.88rem]">
              <span className="text-gray-500 font-medium">Period Duration:</span>
              <span className="text-gray-800 font-bold">
                {Math.max(1, Math.round((new Date(currentCycle.periodEndDate) - new Date(currentCycle.periodStartDate)) / (1000 * 60 * 60 * 24)) + 1)} days
              </span>
            </div>
            <div className="flex justify-between py-3 border-b-2 border-dashed border-primary-light text-[0.88rem] mt-1 items-center">
              <span className="text-primary font-bold">Medication Restart Date:</span>
              <span className="text-white bg-primary px-3 py-1 rounded-xl text-xs font-extrabold shadow-sm">
                {formatDate(currentCycle.restartDate)}
              </span>
            </div>
          </div>

          <button
            className="bg-gradient-to-br from-primary to-[#FA8CA8] text-white border-none font-title text-base font-bold py-3.5 px-5 rounded-2xl shadow-[0_4px_15px_rgba(232,99,138,0.18)] flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150 mt-2"
            onClick={startNewCycle}
          >
            <span>🌸</span> Start New Cycle
          </button>
        </div>
      )}
    </div>
  );
};

export default TodayTab;
