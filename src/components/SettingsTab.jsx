import React, { useRef } from 'react';
import { useCycle } from '../context/CycleContext';

const SettingsTab = () => {
  const {
    reminderTime,
    setReminderTime,
    notificationsEnabled,
    requestNotificationPermission,
    exportData,
    importData,
    resetAppData
  } = useCycle();

  const fileInputRef = useRef(null);

  const handleNotificationToggle = async (e) => {
    const checked = e.target.checked;
    await requestNotificationPermission(checked);
  };

  const handleTimeChange = (e) => {
    setReminderTime(e.target.value);
  };

  const handleFileImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await importData(file);
      if (result) {
        alert('MediCycle backup restored successfully! 🌸');
      }
    } catch (err) {
      alert(`Failed to restore backup: ${err.message}`);
      console.error(err);
    }
    // Clear file selection
    e.target.value = '';
  };

  return (
    <div className="tab-content">
      <div className="app-header" style={{ padding: 0, borderBottom: 'none', background: 'transparent' }}>
        <div className="app-title-container">
          <h1 className="greeting-text">Settings ⚙️</h1>
          <p className="app-subtitle">Configure reminders and manage data backups.</p>
        </div>
      </div>

      {/* Notifications Configuration Card */}
      <div className="card">
        <div className="card-title">
          <span>🔔</span> Web Notifications
        </div>
        <div className="settings-group">
          {/* Toggle Reminders */}
          <div className="settings-row">
            <div className="settings-label-container">
              <span className="settings-label">Daily Tablet Reminders</span>
              <span className="settings-desc">Get notified to take your pill daily.</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleNotificationToggle}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Daily Reminder Time */}
          {notificationsEnabled && (
            <div className="settings-row">
              <div className="settings-label-container">
                <span className="settings-label">Reminder Time</span>
                <span className="settings-desc">Pick what time to show notification.</span>
              </div>
              <input
                type="time"
                className="time-picker"
                value={reminderTime}
                onChange={handleTimeChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Backup & Restore Data */}
      <div className="card">
        <div className="card-title">
          <span>💾</span> Backup & Restore
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-medium)', lineHeight: '1.4' }}>
          Secure your tracking records. Export to device storage or restore them at any time.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
          <button className="btn-secondary" onClick={exportData}>
            <span>📤</span> Export JSON Backup
          </button>
          
          <button className="btn-secondary" onClick={handleFileImportClick}>
            <span>📥</span> Restore JSON Backup
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Safety / Danger Zone Card */}
      <div className="card" style={{ border: '1px solid #FED7D7', backgroundColor: '#FFF5F5' }}>
        <div className="card-title" style={{ color: '#C53030' }}>
          <span>⚠️</span> Danger Zone
        </div>
        <p style={{ fontSize: '0.85rem', color: '#742A2A', lineHeight: '1.4' }}>
          Resetting will permanently wipe your active progress and history records.
        </p>
        <button className="btn-danger" onClick={resetAppData}>
          <span>🗑️</span> Reset App Data
        </button>
      </div>

      {/* App Version Info */}
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '10px' }}>
        <p>MediCycle PWA for Sandali v1.0.0 🌸</p>
        <p style={{ marginTop: '4px' }}>Works Offline • Persistent Local Storage</p>
      </div>
    </div>
  );
};

export default SettingsTab;
