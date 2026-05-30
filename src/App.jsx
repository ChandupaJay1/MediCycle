import React, { useState, useEffect } from 'react';
import { CycleProvider, useCycle } from './context/CycleContext';
import Navigation from './components/Navigation';
import TodayTab from './components/TodayTab';
import OverviewTab from './components/OverviewTab';
import HistoryTab from './components/HistoryTab';
import SettingsTab from './components/SettingsTab';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('today');
  const { checkReminderNotification } = useCycle();

  // Check reminder status every 30 seconds
  useEffect(() => {
    checkReminderNotification();
    const interval = setInterval(() => {
      checkReminderNotification();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkReminderNotification]);

  const renderTab = () => {
    switch (activeTab) {
      case 'today':
        return <TodayTab />;
      case 'overview':
        return <OverviewTab />;
      case 'history':
        return <HistoryTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <TodayTab />;
    }
  };

  return (
    <div className="w-full max-w-[430px] h-screen bg-bg-rose shadow-rose-lg flex flex-col relative overflow-hidden sm:h-[880px] sm:rounded-[24px] sm:border-8 sm:border-white">
      {renderTab()}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

const App = () => {
  return (
    <CycleProvider>
      <AppContent />
    </CycleProvider>
  );
};

export default App;
