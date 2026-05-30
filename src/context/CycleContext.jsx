import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CycleContext = createContext();

const createNewCycleObject = () => {
  const tablets = Array.from({ length: 72 }, (_, i) => ({
    index: i,
    taken: false,
    takenAt: null
  }));
  return {
    id: `cycle_${Date.now()}`,
    phase: 'medication', // 'medication' | 'period_wait' | 'period' | 'complete'
    tablets,
    monthStartDates: [null, null, null], // [Month1, Month2, Month3]
    periodStartDate: null,
    periodEndDate: null,
    periodDays: [], // YYYY-MM-DD strings for calendar strip toggles
    restartDate: null
  };
};

export const CycleProvider = ({ children }) => {
  const [currentCycle, setCurrentCycle] = useState(createNewCycleObject());
  const [pastCycles, setPastCycles] = useState([]);
  const [reminderTime, setReminderTime] = useState('21:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastReminderNotifiedDate, setLastReminderNotifiedDate] = useState(null);

  // Load state from localStorage on init
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('medicycle_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.currentCycle) setCurrentCycle(parsed.currentCycle);
        if (parsed.pastCycles) setPastCycles(parsed.pastCycles);
        if (parsed.reminderTime) setReminderTime(parsed.reminderTime);
        if (parsed.notificationsEnabled) setNotificationsEnabled(parsed.notificationsEnabled);
        if (parsed.lastReminderNotifiedDate) setLastReminderNotifiedDate(parsed.lastReminderNotifiedDate);
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    }
  }, []);

  // Save state to localStorage on state changes
  useEffect(() => {
    try {
      const stateToSave = {
        currentCycle,
        pastCycles,
        reminderTime,
        notificationsEnabled,
        lastReminderNotifiedDate
      };
      localStorage.setItem('medicycle_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state to local storage:', e);
    }
  }, [currentCycle, pastCycles, reminderTime, notificationsEnabled, lastReminderNotifiedDate]);

  // Utility to fire web notification
  const fireNotification = useCallback((title, body) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: './icon-192.png',
            badge: './icon-192.png',
            vibrate: [200, 100, 200],
            tag: 'medicycle-notification'
          });
        }).catch(() => {
          // Fallback if service worker isn't fully ready
          new Notification(title, { body, icon: './icon-192.png' });
        });
      } catch (err) {
        // Fallback for direct browser notification
        new Notification(title, { body, icon: './icon-192.png' });
      }
    }
  }, []);

  // Check reminder periodically (e.g. called from App.jsx)
  const checkReminderNotification = useCallback(() => {
    if (!notificationsEnabled) return;
    
    const today = new Date().toISOString().split('T')[0];
    if (lastReminderNotifiedDate === today) return;

    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (currentHHMM === reminderTime) {
      fireNotification('MediCycle Reminder 💊', 'Hi Sandali! It is time to take your daily medication. 🌸');
      setLastReminderNotifiedDate(today);
    }
  }, [notificationsEnabled, reminderTime, lastReminderNotifiedDate, fireNotification]);

  // Request notifications permission
  const requestNotificationPermission = async (enable) => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return false;
    }

    if (enable) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        // Test notification
        fireNotification('Notifications Enabled! 🌸', 'You will now receive daily tablet reminders.');
        return true;
      } else {
        alert('Permission denied. Please enable notifications in your browser settings.');
        setNotificationsEnabled(false);
        return false;
      }
    } else {
      setNotificationsEnabled(false);
      return false;
    }
  };

  // 1. Take Tablet
  const takeTablet = (index) => {
    if (currentCycle.phase !== 'medication') return;

    setCurrentCycle((prev) => {
      const updatedTablets = [...prev.tablets];
      updatedTablets[index] = {
        index,
        taken: true,
        takenAt: new Date().toISOString()
      };

      const takenCount = updatedTablets.filter((t) => t.taken).length;
      let nextPhase = prev.phase;
      
      // Phase transition check
      if (takenCount === 72) {
        nextPhase = 'period_wait';
        setTimeout(() => {
          fireNotification('Treatment Completed! 🎉', 'You have finished all 72 tablets. Waiting for period start.');
        }, 100);
      } else if (takenCount === 67) {
        // Countdown banner triggers at 5 left (67 taken)
        setTimeout(() => {
          fireNotification('Almost Done! 🌸', 'Only 5 tablets remain for this treatment cycle.');
        }, 100);
      }

      // Check month start dates
      const updatedMonthStartDates = [...prev.monthStartDates];
      const monthIdx = Math.floor(index / 24);
      if (updatedMonthStartDates[monthIdx] === null) {
        updatedMonthStartDates[monthIdx] = new Date().toISOString().split('T')[0];
      }

      return {
        ...prev,
        tablets: updatedTablets,
        monthStartDates: updatedMonthStartDates,
        phase: nextPhase
      };
    });
  };

  // 2. Undo Tablet (Untake the last taken pill)
  const undoTablet = () => {
    if (currentCycle.phase !== 'medication' && currentCycle.phase !== 'period_wait') return;

    setCurrentCycle((prev) => {
      // Find the tablet with the latest takenAt timestamp
      const takenTablets = prev.tablets.filter(t => t.taken && t.takenAt);
      if (takenTablets.length === 0) return prev; // nothing to undo

      let lastPill = takenTablets.reduce((latest, current) => {
        return new Date(current.takenAt) > new Date(latest.takenAt) ? current : latest;
      }, takenTablets[0]);

      const updatedTablets = [...prev.tablets];
      updatedTablets[lastPill.index] = {
        index: lastPill.index,
        taken: false,
        takenAt: null
      };

      // Recalculate phase (revert to medication if it was in period_wait)
      const takenCount = updatedTablets.filter((t) => t.taken).length;
      const nextPhase = takenCount < 72 ? 'medication' : 'period_wait';

      // Check if we need to remove a month's start date
      const updatedMonthStartDates = [...prev.monthStartDates];
      const monthIdx = Math.floor(lastPill.index / 24);
      const activeMonthPills = updatedTablets.slice(monthIdx * 24, (monthIdx + 1) * 24);
      const anyPillsTakenInMonth = activeMonthPills.some(t => t.taken);
      if (!anyPillsTakenInMonth) {
        updatedMonthStartDates[monthIdx] = null;
      }

      return {
        ...prev,
        tablets: updatedTablets,
        monthStartDates: updatedMonthStartDates,
        phase: nextPhase
      };
    });
  };

  // 3. Start Period Phase
  const startPeriod = () => {
    if (currentCycle.phase !== 'period_wait') return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    setCurrentCycle((prev) => ({
      ...prev,
      phase: 'period',
      periodStartDate: todayStr,
      periodDays: [todayStr] // Auto mark the start day
    }));
  };

  // 4. Toggle Days on Calendar Strip (14-day)
  const togglePeriodDay = (dateString) => {
    if (currentCycle.phase !== 'period') return;

    setCurrentCycle((prev) => {
      const isDayActive = prev.periodDays.includes(dateString);
      const updatedDays = isDayActive
        ? prev.periodDays.filter((d) => d !== dateString)
        : [...prev.periodDays, dateString].sort();

      return {
        ...prev,
        periodDays: updatedDays
      };
    });
  };

  // 5. End Period
  const endPeriod = () => {
    if (currentCycle.phase !== 'period') return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Auto calculate restart date: Day after period ends
    const endDate = new Date(todayStr);
    const restartDateObj = new Date(endDate);
    restartDateObj.setDate(endDate.getDate() + 1);
    const restartStr = restartDateObj.toISOString().split('T')[0];

    setCurrentCycle((prev) => ({
      ...prev,
      phase: 'complete',
      periodEndDate: todayStr,
      restartDate: restartStr
    }));
  };

  // 6. Start New Cycle
  const startNewCycle = () => {
    if (currentCycle.phase !== 'complete') return;
    
    setPastCycles((prev) => [
      {
        ...currentCycle,
        completedAt: new Date().toISOString()
      },
      ...prev
    ]);
    
    setCurrentCycle(createNewCycleObject());
  };

  // 7. Reset App Data
  const resetAppData = () => {
    if (window.confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      setCurrentCycle(createNewCycleObject());
      setPastCycles([]);
      setReminderTime('21:00');
      setNotificationsEnabled(false);
      setLastReminderNotifiedDate(null);
      localStorage.removeItem('medicycle_state');
    }
  };

  // 8. Export Data
  const exportData = () => {
    const backup = {
      currentCycle,
      pastCycles,
      reminderTime,
      notificationsEnabled
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medicycle_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 9. Import Data
  const importData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed && parsed.currentCycle) {
            setCurrentCycle(parsed.currentCycle);
            if (parsed.pastCycles) setPastCycles(parsed.pastCycles);
            if (parsed.reminderTime) setReminderTime(parsed.reminderTime);
            if (parsed.notificationsEnabled) setNotificationsEnabled(parsed.notificationsEnabled);
            resolve(true);
          } else {
            reject(new Error('Invalid backup file format: missing currentCycle'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsText(file);
    });
  };

  return (
    <CycleContext.Provider
      value={{
        currentCycle,
        pastCycles,
        reminderTime,
        notificationsEnabled,
        setReminderTime,
        requestNotificationPermission,
        checkReminderNotification,
        takeTablet,
        undoTablet,
        startPeriod,
        togglePeriodDay,
        endPeriod,
        startNewCycle,
        resetAppData,
        exportData,
        importData
      }}
    >
      {children}
    </CycleContext.Provider>
  );
};

export const useCycle = () => {
  const context = useContext(CycleContext);
  if (!context) {
    throw new Error('useCycle must be used within a CycleProvider');
  }
  return context;
};
