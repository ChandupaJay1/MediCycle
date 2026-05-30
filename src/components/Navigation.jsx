import React from 'react';

const Navigation = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'today', name: 'Today', icon: '💊' },
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'history', name: 'History', icon: '📜' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 h-[72px] bg-white border-t border-border-rose flex justify-around items-center safe-padding-bottom z-10 shadow-[0_-4px_20px_rgba(232,99,138,0.03)]">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`flex flex-col items-center justify-center border-none bg-transparent cursor-pointer text-[0.72rem] font-semibold transition-all duration-200 px-3.5 py-1.5 rounded-xl ${
              isActive ? 'text-primary bg-primary-light font-bold' : 'text-gray-400 hover:text-gray-500'
            }`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className={`text-[1.25rem] mb-0.5 transition-transform duration-200 ${isActive ? '-translate-y-0.5 scale-110' : ''}`}>
              {item.icon}
            </span>
            <span>{item.name}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
