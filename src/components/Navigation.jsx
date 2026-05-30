import React from 'react';

const Navigation = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'today', name: 'Today', icon: '💊' },
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'history', name: 'History', icon: '📜' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => setActiveTab(item.id)}
        >
          <span className="nav-item-icon">{item.icon}</span>
          <span>{item.name}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
