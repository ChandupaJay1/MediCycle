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

  // Set default active month tab depending on pills taken
  // Month 0: 0..23, Month 1: 24..47, Month 2: 48..71
  const [activeMonthTab, setActiveMonthTab] = useState(0);

  useEffect(() => {
    if (nextIndexToTake === -1) {
      setActiveMonthTab(2); // If all taken, stay on Month 3
    } else {
      const currentMonthIndex = Math.floor(nextIndexToTake / 24);
      setActiveMonthTab(currentMonthIndex);
    }
  }, [nextIndexToTake]);

  // SVG Progress Ring calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (takenCount / 72) * circumference;

  // Calendar dates generation helper (14 days starting from startDate)
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

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="tab-content">
      {/* Personalized Greeting */}
      <div className="app-header" style={{ padding: 0, borderBottom: 'none', background: 'transparent' }}>
        <div className="app-title-container">
          <h1 className="greeting-text">Hi, Sandali 🌸</h1>
          <p className="app-subtitle">Track your cycle and stay healthy.</p>
        </div>
        <div className="phase-badge">
          <span className={`phase-banner ${currentCycle.phase}`}>
            {currentCycle.phase.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Circular Progress Ring */}
      <div className="card" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="progress-ring-container">
          <svg className="progress-ring-svg">
            <circle className="progress-ring-bg" cx="80" cy="80" r={radius} />
            <circle
              className="progress-ring-bar"
              cx="80"
              cy="80"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="progress-ring-text">
            <span className="progress-ring-value">{takenCount}/72</span>
            <span className="progress-ring-label">Tablets Taken</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', fontWeight: '600' }}>
            Overall Treatment Progress: {Math.round((takenCount / 72) * 100)}%
          </p>
        </div>
      </div>

      {/* Countdown Banner if 5 or fewer tablets remaining */}
      {currentCycle.phase === 'medication' && takenCount >= 67 && (
        <div className="countdown-banner">
          <div className="countdown-title">
            <span>⚠️</span> Nearly Complete! 5-Tablet Countdown
          </div>
          <p style={{ fontSize: '0.85rem' }}>
            You have {72 - takenCount} {72 - takenCount === 1 ? 'tablet' : 'tablets'} remaining in this treatment.
          </p>
          <div className="countdown-dots">
            {[67, 68, 69, 70, 71].map((idx) => (
              <div
                key={idx}
                className={`countdown-dot ${currentCycle.tablets[idx].taken ? 'taken' : ''}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Phase 1: Medication Grid */}
      {currentCycle.phase === 'medication' && (
        <div className="card">
          <div className="card-title">
            <span>💊</span> Medication Cycle Grid
          </div>

          {/* Month Switcher Tabs */}
          <div className="tab-switcher">
            <button
              className={`tab-switch-btn ${activeMonthTab === 0 ? 'active' : ''}`}
              onClick={() => setActiveMonthTab(0)}
            >
              Month 1
            </button>
            <button
              className={`tab-switch-btn ${activeMonthTab === 1 ? 'active' : ''}`}
              onClick={() => setActiveMonthTab(1)}
            >
              Month 2
            </button>
            <button
              className={`tab-switch-btn ${activeMonthTab === 2 ? 'active' : ''}`}
              onClick={() => setActiveMonthTab(2)}
            >
              Month 3
            </button>
          </div>

          {/* Pill Grid */}
          <div className="pill-grid">
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
                  className={`pill-button ${isTaken ? 'taken' : ''} ${isLocked ? 'locked' : ''}`}
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
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              className="btn-secondary"
              disabled={takenCount === 0}
              onClick={undoTablet}
              style={{ flex: 1 }}
            >
              <span>↩️</span> Undo Last Taken
            </button>
          </div>
        </div>
      )}

      {/* Phase 2: Period Wait */}
      {currentCycle.phase === 'period_wait' && (
        <div className="card">
          <div className="card-title">
            <span>🌸</span> Medication Phase Finished
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', lineHeight: '1.4' }}>
            Congratulations, you completed all 72 tablets of this treatment cycle! 🌸
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', lineHeight: '1.4' }}>
            The app is currently waiting for your period flow to start. Once it does, click the button below to start period tracking.
          </p>
          
          <button className="btn-primary" onClick={startPeriod}>
            <span>🩸</span> Mark Period Started
          </button>
          
          <button
            className="btn-secondary"
            onClick={undoTablet}
            style={{ marginTop: '5px' }}
          >
            <span>↩️</span> Undo 72nd Pill
          </button>
        </div>
      )}

      {/* Phase 3: Period Calendar Strip */}
      {currentCycle.phase === 'period' && (
        <div className="card">
          <div className="card-title">
            <span>🩸</span> Period Flow Tracking
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>
            Toggle the days on the 14-day strip below where you experienced bleeding flow.
          </p>

          {/* Horizontal Calendar Strip */}
          <div className="period-strip">
            {periodCalendarDays.map((day) => {
              const isSelected = currentCycle.periodDays.includes(day.dateStr);
              return (
                <button
                  key={day.dateStr}
                  className={`period-day-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => togglePeriodDay(day.dateStr)}
                  title={day.dateStr}
                >
                  <span className="period-day-name">{day.dayName}</span>
                  <span className="period-day-num">{day.dayNum}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <button className="btn-primary" onClick={endPeriod}>
              <span>✓</span> Mark Period Ended
            </button>
            <div className="details-row">
              <span className="details-label">Period Started:</span>
              <span className="details-value">{formatDate(currentCycle.periodStartDate)}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Active Period Days:</span>
              <span className="details-value">{currentCycle.periodDays.length} days</span>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4: Complete Cycle summary */}
      {currentCycle.phase === 'complete' && (
        <div className="card">
          <div className="card-title">
            <span>✨</span> Treatment Cycle Complete
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', lineHeight: '1.4' }}>
            This 3-month treatment cycle has successfully finished. Here is the summary:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '10px 0' }}>
            <div className="details-row">
              <span className="details-label">Period Started:</span>
              <span className="details-value">{formatDate(currentCycle.periodStartDate)}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Period Ended:</span>
              <span className="details-value">{formatDate(currentCycle.periodEndDate)}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Period Duration:</span>
              <span className="details-value">
                {Math.max(1, Math.round((new Date(currentCycle.periodEndDate) - new Date(currentCycle.periodStartDate)) / (1000 * 60 * 60 * 24)) + 1)} days
              </span>
            </div>
            <div className="details-row" style={{ borderTop: '2px dashed var(--primary-light)', paddingTop: '10px' }}>
              <span className="details-label" style={{ color: 'var(--primary)', fontWeight: '700' }}>Medication Restart Date:</span>
              <span className="details-value" style={{ color: 'var(--primary)', fontWeight: '800' }}>{formatDate(currentCycle.restartDate)}</span>
            </div>
          </div>

          <button className="btn-primary" onClick={startNewCycle}>
            <span>🌸</span> Start New Cycle
          </button>
        </div>
      )}
    </div>
  );
};

export default TodayTab;
