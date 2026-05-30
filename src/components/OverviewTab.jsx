import React from 'react';
import { useCycle } from '../context/CycleContext';

const OverviewTab = () => {
  const { currentCycle } = useCycle();
  const totalTaken = currentCycle.tablets.filter((t) => t.taken).length;

  // Formatting date utility
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Stats builder for each month (monthIdx = 0, 1, 2)
  const getMonthStats = (monthIdx) => {
    const startIndex = monthIdx * 24;
    const endIndex = startIndex + 23;
    const monthTablets = currentCycle.tablets.slice(startIndex, endIndex + 1);
    const takenInMonth = monthTablets.filter((t) => t.taken).length;
    const startDateStr = currentCycle.monthStartDates[monthIdx];

    if (!startDateStr) {
      return { started: false, completed: false, taken: 0 };
    }

    const completed = takenInMonth === 24;
    const start = new Date(startDateStr);
    const today = new Date();

    let daysElapsed = 0;
    let daysRemaining = 0;
    let completionDateStr = '';

    if (completed) {
      const lastPill = monthTablets[23];
      const end = lastPill.takenAt ? new Date(lastPill.takenAt) : today;
      // Days elapsed is from the start date to the actual 24th pill take date
      daysElapsed = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      daysRemaining = 0;
      completionDateStr = end.toISOString().split('T')[0];
    } else {
      // Current active tracking
      const timeDiff = today.getTime() - start.getTime();
      daysElapsed = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1);
      daysRemaining = Math.max(0, 24 - daysElapsed);
      
      const estCompletion = new Date(start);
      estCompletion.setDate(start.getDate() + 23); // Day 24 is day 1 + 23
      completionDateStr = estCompletion.toISOString().split('T')[0];
    }

    return {
      started: true,
      completed,
      taken: takenInMonth,
      daysElapsed,
      daysRemaining,
      completionDate: completionDateStr
    };
  };

  const months = [
    { title: 'Month 1 💊', stats: getMonthStats(0) },
    { title: 'Month 2 💊', stats: getMonthStats(1) },
    { title: 'Month 3 💊', stats: getMonthStats(2) }
  ];

  return (
    <div className="tab-content">
      <div className="app-header" style={{ padding: 0, borderBottom: 'none', background: 'transparent' }}>
        <div className="app-title-container">
          <h1 className="greeting-text">Cycle Overview 📋</h1>
          <p className="app-subtitle">Detailed monthly breakdown statistics.</p>
        </div>
      </div>

      {/* General Stats Card */}
      <div className="card">
        <div className="card-title">
          <span>📊</span> overall Treatment Stats
        </div>
        <div className="details-row">
          <span className="details-label">Total Pills Taken:</span>
          <span className="details-value">{totalTaken} / 72</span>
        </div>
        <div className="details-row">
          <span className="details-label">Current Cycle Phase:</span>
          <span className="details-value" style={{ textTransform: 'capitalize' }}>
            {currentCycle.phase.replace('_', ' ')}
          </span>
        </div>
        <div className="details-row">
          <span className="details-label">Active Period Days Tracked:</span>
          <span className="details-value">{currentCycle.periodDays.length} days</span>
        </div>
      </div>

      {/* Months Breakdown Card */}
      {months.map((m, index) => {
        const { started, completed, taken, daysElapsed, daysRemaining, completionDate } = m.stats;
        
        return (
          <div className="card" key={index} style={{ opacity: started ? 1 : 0.6 }}>
            <div className="card-title" style={{ justifyContent: 'space-between' }}>
              <span>{m.title}</span>
              {!started && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not Started</span>}
              {started && !completed && <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>In Progress</span>}
              {completed && <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '600' }}>✓ Completed</span>}
            </div>

            {/* Monthly Progress Bar */}
            <div className="progress-bar-container">
              <div className="progress-bar-header">
                <span>Pills Intake</span>
                <span>{taken} / 24</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${(taken / 24) * 100}%` }}></div>
              </div>
            </div>

            {/* Monthly Details (Only shown if started) */}
            {started ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '5px' }}>
                <div className="details-row">
                  <span className="details-label">Days Elapsed:</span>
                  <span className="details-value">{daysElapsed} {daysElapsed === 1 ? 'day' : 'days'}</span>
                </div>
                {!completed && (
                  <div className="details-row">
                    <span className="details-label">Days Remaining:</span>
                    <span className="details-value">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</span>
                  </div>
                )}
                <div className="details-row">
                  <span className="details-label">{completed ? 'Completion Date:' : 'Est. Completion Date:'}</span>
                  <span className="details-value">{formatDate(completionDate)}</span>
                </div>
                <div className="details-row">
                  <span className="details-label">Month Started On:</span>
                  <span className="details-value">{formatDate(currentCycle.monthStartDates[index])}</span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                This month's tracking will start automatically when you take the first tablet of the month.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OverviewTab;
