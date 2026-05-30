import React, { useState } from 'react';
import { useCycle } from '../context/CycleContext';

const HistoryTab = () => {
  const { pastCycles } = useCycle();
  const [expandedCycles, setExpandedCycles] = useState({});

  const toggleExpand = (cycleId) => {
    setExpandedCycles((prev) => ({
      ...prev,
      [cycleId]: !prev[cycleId]
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPeriodDuration = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="tab-content">
      <div className="app-header" style={{ padding: 0, borderBottom: 'none', background: 'transparent' }}>
        <div className="app-title-container">
          <h1 className="greeting-text">Cycle History 📜</h1>
          <p className="app-subtitle">Log of all your past completed treatments.</p>
        </div>
      </div>

      {pastCycles.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', alignItems: 'center' }}>
          <div className="empty-placeholder">
            <span className="empty-icon">🌸</span>
            <h3>No Cycle History Yet</h3>
            <p>Your finished treatment cycles will be stored and broken down here.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pastCycles.map((cycle, index) => {
            const isExpanded = !!expandedCycles[cycle.id];
            const startStr = cycle.monthStartDates[0] ? formatDate(cycle.monthStartDates[0]) : 'Unknown Start';
            const endStr = cycle.periodEndDate ? formatDate(cycle.periodEndDate) : 'Unknown End';
            const periodLen = getPeriodDuration(cycle.periodStartDate, cycle.periodEndDate);

            return (
              <div className="history-card" key={cycle.id || index}>
                {/* Collapsible Header */}
                <div className="history-header" onClick={() => toggleExpand(cycle.id)}>
                  <div className="history-header-left">
                    <span className="history-date">
                      Cycle: {startStr} – {endStr}
                    </span>
                    <span className="history-duration">
                      Treatment Cycle #{pastCycles.length - index} • Period: {periodLen} days
                    </span>
                  </div>
                  <span className={`history-toggle-arrow ${isExpanded ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>

                {/* Collapsible Body */}
                {isExpanded && (
                  <div className="history-body">
                    {/* Medication Phase Breakdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                        💊 Medication Breakdown
                      </h4>
                      {cycle.monthStartDates.map((startDate, mIdx) => (
                        <div className="details-row" key={mIdx} style={{ fontSize: '0.85rem' }}>
                          <span className="details-label">Month {mIdx + 1} Started:</span>
                          <span className="details-value">{formatDate(startDate)}</span>
                        </div>
                      ))}
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

                    {/* Period & Restart Date Breakdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                        🩸 Period details
                      </h4>
                      <div className="details-row" style={{ fontSize: '0.85rem' }}>
                        <span className="details-label">Period Dates:</span>
                        <span className="details-value">{formatDate(cycle.periodStartDate)} – {formatDate(cycle.periodEndDate)}</span>
                      </div>
                      <div className="details-row" style={{ fontSize: '0.85rem' }}>
                        <span className="details-label">Bleeding Days:</span>
                        <span className="details-value">{cycle.periodDays.length} days</span>
                      </div>
                      <div className="details-row" style={{ fontSize: '0.85rem' }}>
                        <span className="details-label">Total Cycle Duration:</span>
                        <span className="details-value">
                          {cycle.monthStartDates[0] && cycle.periodEndDate
                            ? `${Math.ceil(Math.abs(new Date(cycle.periodEndDate) - new Date(cycle.monthStartDates[0])) / (1000 * 60 * 60 * 24)) + 1} days`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="details-row" style={{ fontSize: '0.85rem', borderTop: '1px dashed var(--primary-light)', paddingTop: '8px', marginTop: '4px' }}>
                        <span className="details-label" style={{ fontWeight: '700', color: 'var(--primary)' }}>Medication Restarted:</span>
                        <span className="details-value" style={{ fontWeight: '800', color: 'var(--primary)' }}>{formatDate(cycle.restartDate)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
