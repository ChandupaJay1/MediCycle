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
    <div className="flex-1 overflow-y-auto p-5 pb-[92px] custom-scrollbar flex flex-col gap-5">
      <div className="flex flex-col pt-2">
        <h1 className="font-title text-2xl font-extrabold text-gray-800 tracking-tight">Cycle History 📜</h1>
        <p className="text-[0.75rem] text-gray-400 mt-0.5">Log of all your past completed treatments.</p>
      </div>

      {pastCycles.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-border-rose shadow-rose-sm flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-3">🌸</span>
          <h3 className="font-title text-md font-bold text-gray-800">No Cycle History Yet</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-[240px] leading-relaxed">
            Your finished treatment cycles will be stored and broken down here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {pastCycles.map((cycle, index) => {
            const isExpanded = !!expandedCycles[cycle.id];
            const startStr = cycle.monthStartDates[0] ? formatDate(cycle.monthStartDates[0]) : 'Unknown Start';
            const endStr = cycle.periodEndDate ? formatDate(cycle.periodEndDate) : 'Unknown End';
            const periodLen = getPeriodDuration(cycle.periodStartDate, cycle.periodEndDate);

            return (
              <div className="border border-border-rose rounded-2xl bg-white overflow-hidden shadow-rose-sm flex flex-col" key={cycle.id || index}>
                {/* Collapsible Header */}
                <div
                  className="p-4 flex justify-between items-center cursor-pointer select-none transition-colors duration-150 hover:bg-bg-rose"
                  onClick={() => toggleExpand(cycle.id)}
                >
                  <div className="flex flex-col">
                    <span className="font-title text-[0.92rem] font-bold text-gray-800">
                      Cycle: {startStr} – {endStr}
                    </span>
                    <span className="text-[0.75rem] text-gray-400 font-semibold mt-0.5">
                      Treatment Cycle #{pastCycles.length - index} • Period: {periodLen} days
                    </span>
                  </div>
                  <span className={`text-primary text-xs font-bold transition-transform duration-200 transform inline-block ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>

                {/* Collapsible Body */}
                {isExpanded && (
                  <div className="p-4 border-t border-border-rose bg-[#FCF6F8] flex flex-col gap-3.5">
                    {/* Medication Phase Breakdown */}
                    <div className="flex flex-col gap-2">
                      <h4 className="text-[0.75rem] text-primary font-bold tracking-wider uppercase border-b border-primary/10 pb-1">
                        💊 Medication Breakdown
                      </h4>
                      {cycle.monthStartDates.map((startDate, mIdx) => (
                        <div className="flex justify-between text-[0.82rem] pb-1 border-b border-border-rose/40" key={mIdx}>
                          <span className="text-gray-500">Month {mIdx + 1} Started:</span>
                          <span className="text-gray-800 font-bold">{formatDate(startDate)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Period & Restart Date Breakdown */}
                    <div className="flex flex-col gap-2 mt-1">
                      <h4 className="text-[0.75rem] text-primary font-bold tracking-wider uppercase border-b border-primary/10 pb-1">
                        🩸 Period details
                      </h4>
                      <div className="flex justify-between text-[0.82rem] pb-1 border-b border-border-rose/40">
                        <span className="text-gray-500">Period Dates:</span>
                        <span className="text-gray-800 font-bold">{formatDate(cycle.periodStartDate)} – {formatDate(cycle.periodEndDate)}</span>
                      </div>
                      <div className="flex justify-between text-[0.82rem] pb-1 border-b border-border-rose/40">
                        <span className="text-gray-500">Bleeding Days:</span>
                        <span className="text-gray-800 font-bold">{cycle.periodDays.length} days</span>
                      </div>
                      <div className="flex justify-between text-[0.82rem] pb-1 border-b border-border-rose/40">
                        <span className="text-gray-500">Total Cycle Duration:</span>
                        <span className="text-gray-800 font-bold">
                          {cycle.monthStartDates[0] && cycle.periodEndDate
                            ? `${Math.ceil(Math.abs(new Date(cycle.periodEndDate) - new Date(cycle.monthStartDates[0])) / (1000 * 60 * 60 * 24)) + 1} days`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[0.82rem] pt-1.5 items-center">
                        <span className="text-primary font-bold">Medication Restarted:</span>
                        <span className="text-white bg-primary px-2.5 py-0.5 rounded-lg text-[0.7rem] font-extrabold">
                          {formatDate(cycle.restartDate)}
                        </span>
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
