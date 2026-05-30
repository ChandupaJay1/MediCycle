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
    <div className="w-full h-screen bg-bg-rose flex flex-col relative overflow-hidden md:max-w-[430px] md:h-[880px] md:rounded-[24px] md:border-8 md:border-white md:shadow-rose-lg">
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
