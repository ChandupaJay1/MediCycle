import React from 'react';
import { useCycle } from '../context/CycleContext';

const OverviewTab = () => {
  const { currentCycle } = useCycle();
  const totalTaken = currentCycle.tablets.filter((t) => t.taken).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
      daysElapsed = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      daysRemaining = 0;
      completionDateStr = end.toISOString().split('T')[0];
    } else {
      const timeDiff = today.getTime() - start.getTime();
      daysElapsed = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1);
      daysRemaining = Math.max(0, 24 - daysElapsed);
      
      const estCompletion = new Date(start);
      estCompletion.setDate(start.getDate() + 23);
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
    <div className="flex-1 overflow-y-auto p-5 pb-[92px] custom-scrollbar flex flex-col gap-5">
      <div className="flex flex-col pt-2">
        <h1 className="font-title text-2xl font-extrabold text-gray-800 tracking-tight">Cycle Overview 📋</h1>
        <p className="text-[0.75rem] text-gray-400 mt-0.5">Detailed monthly breakdown statistics.</p>
      </div>

      {/* General Stats Card */}
      <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-3.5 transition-all duration-200 hover:shadow-rose-md">
        <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5 border-b border-border-rose pb-2">
          <span>📊</span> overall Treatment Stats
        </div>
        <div className="flex justify-between text-[0.88rem]">
          <span className="text-gray-500 font-medium">Total Pills Taken:</span>
          <span className="text-gray-800 font-bold">{totalTaken} / 72</span>
        </div>
        <div className="flex justify-between text-[0.88rem]">
          <span className="text-gray-500 font-medium">Current Cycle Phase:</span>
          <span className="text-gray-800 font-bold text-right capitalize">
            {currentCycle.phase.replace('_', ' ')}
          </span>
        </div>
        <div className="flex justify-between text-[0.88rem]">
          <span className="text-gray-500 font-medium">Active Period Days Tracked:</span>
          <span className="text-gray-800 font-bold">{currentCycle.periodDays.length} days</span>
        </div>
      </div>

      {/* Months Breakdown Card */}
      {months.map((m, index) => {
        const { started, completed, taken, daysElapsed, daysRemaining, completionDate } = m.stats;
        
        return (
          <div
            className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4 transition-all duration-200 hover:shadow-rose-md"
            key={index}
            style={{ opacity: started ? 1 : 0.6 }}
          >
            <div className="font-title text-md font-bold text-gray-800 flex justify-between items-center">
              <span>{m.title}</span>
              {!started && <span className="text-[0.7rem] bg-gray-100 text-gray-400 px-2 py-1 rounded-md font-bold">Not Started</span>}
              {started && !completed && <span className="text-[0.7rem] bg-primary-light text-primary px-2 py-1 rounded-md font-bold">In Progress</span>}
              {completed && <span className="text-[0.7rem] bg-green-50 text-green-600 px-2 py-1 rounded-md font-bold">✓ Completed</span>}
            </div>

            {/* Monthly Progress Bar */}
            <div className="flex flex-col">
              <div className="flex justify-between text-[0.75rem] font-semibold text-gray-500 mb-1.5">
                <span>Pills Intake</span>
                <span>{taken} / 24</span>
              </div>
              <div className="h-2.5 w-full bg-primary-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-[#FA8CA8] rounded-full transition-all duration-500"
                  style={{ width: `${(taken / 24) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Monthly Details */}
            {started ? (
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex justify-between text-[0.88rem] border-b border-border-rose pb-1.5">
                  <span className="text-gray-500 font-medium">Days Elapsed:</span>
                  <span className="text-gray-800 font-bold">{daysElapsed} {daysElapsed === 1 ? 'day' : 'days'}</span>
                </div>
                {!completed && (
                  <div className="flex justify-between text-[0.88rem] border-b border-border-rose pb-1.5">
                    <span className="text-gray-500 font-medium">Days Remaining:</span>
                    <span className="text-gray-800 font-bold">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</span>
                  </div>
                )}
                <div className="flex justify-between text-[0.88rem] border-b border-border-rose pb-1.5">
                  <span className="text-gray-500 font-medium">{completed ? 'Completion Date:' : 'Est. Completion Date:'}</span>
                  <span className="text-gray-800 font-bold">{formatDate(completionDate)}</span>
                </div>
                <div className="flex justify-between text-[0.88rem]">
                  <span className="text-gray-500 font-medium">Month Started On:</span>
                  <span className="text-gray-800 font-bold">{formatDate(currentCycle.monthStartDates[index])}</span>
                </div>
              </div>
            ) : (
              <p className="text-[0.8rem] text-gray-400 font-semibold italic text-center py-2">
                Starts automatically when you take Month {index + 1}'s first tablet.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OverviewTab;
