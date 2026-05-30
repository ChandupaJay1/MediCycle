import React, { useRef, useState } from 'react';
import { useCycle } from '../context/CycleContext';

const SettingsTab = () => {
  const {
    reminderTime,
    setReminderTime,
    notificationsEnabled,
    requestNotificationPermission,
    exportData,
    importData,
    resetAppData,
    googleClientId,
    setGoogleClientId,
    gDriveStatus,
    lastGDriveSyncTime,
    connectAndSyncGoogleDrive
  } = useCycle();

  const fileInputRef = useRef(null);
  const [showDriveGuide, setShowDriveGuide] = useState(false);

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
    e.target.value = '';
  };

  // Google status badge styles helper
  const getDriveStatusBadge = (status) => {
    switch (status) {
      case 'disconnected':
        return 'bg-gray-100 text-gray-500';
      case 'connected':
        return 'bg-blue-50 text-blue-600';
      case 'syncing':
        return 'bg-yellow-50 text-yellow-600 animate-pulse';
      case 'synced':
        return 'bg-green-50 text-green-600';
      case 'error':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 pb-[92px] custom-scrollbar flex flex-col gap-5">
      <div className="flex flex-col pt-2">
        <h1 className="font-title text-2xl font-extrabold text-gray-800 tracking-tight">Settings ⚙️</h1>
        <p className="text-[0.75rem] text-gray-400 mt-0.5">Configure reminders and manage data backups.</p>
      </div>

      {/* Notifications Configuration Card */}
      <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4 transition-all duration-200 hover:shadow-rose-md">
        <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5 border-b border-border-rose pb-2">
          <span>🔔</span> Web Notifications
        </div>
        <div className="flex flex-col gap-4">
          {/* Toggle Reminders */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.92rem] font-bold text-gray-800">Daily Tablet Reminders</span>
              <span className="text-[0.75rem] text-gray-400 leading-normal max-w-[200px]">
                Get notified to take your pill daily.
              </span>
            </div>
            
            {/* Toggle Switch */}
            <label className="relative inline-block w-[46px] h-6 cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationsEnabled}
                onChange={handleNotificationToggle}
              />
              <span className="absolute inset-0 bg-gray-300 rounded-full transition-colors duration-200 peer-checked:bg-primary"></span>
              <span className="absolute left-[3px] bottom-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-[22px] shadow-sm"></span>
            </label>
          </div>

          {/* Daily Reminder Time */}
          {notificationsEnabled && (
            <div className="flex justify-between items-center border-t border-border-rose/50 pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[0.92rem] font-bold text-gray-800">Reminder Time</span>
                <span className="text-[0.75rem] text-gray-400">Pick what time to show notification.</span>
              </div>
              <input
                type="time"
                className="border-2 border-border-rose bg-white px-3 py-1.5 rounded-xl font-title text-sm font-semibold text-gray-800 outline-none focus:border-primary cursor-pointer"
                value={reminderTime}
                onChange={handleTimeChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Google Drive Automated Daily Backup */}
      <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4 transition-all duration-200 hover:shadow-rose-md">
        <div className="font-title text-md font-bold text-gray-800 flex items-center justify-between border-b border-border-rose pb-2">
          <div className="flex items-center gap-1.5">
            <span>☁️</span> Google Drive Sync
          </div>
          <span className={`text-[0.66rem] font-bold uppercase px-2.5 py-1 rounded-full border border-black/5 ${getDriveStatusBadge(gDriveStatus)}`}>
            {gDriveStatus}
          </span>
        </div>

        <p className="text-[0.82rem] text-gray-500 leading-relaxed">
          Log in to Google Drive to keep your tracking data synchronized. A secure JSON backup file will automatically sync to your Drive.
        </p>

        <div className="flex flex-col gap-3">
          {/* Client ID Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-bold text-gray-700">Google OAuth Client ID</label>
            <input
              type="text"
              placeholder="e.g. 12345-abcde.apps.googleusercontent.com"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              className="w-full border border-border-rose rounded-xl px-3.5 py-2.5 bg-bg-rose/50 font-sans text-[0.8rem] focus:outline-none focus:border-primary text-gray-800"
            />
          </div>

          {/* Sync Metadata */}
          {lastGDriveSyncTime && (
            <div className="flex justify-between text-[0.78rem] bg-bg-rose p-2.5 rounded-xl border border-border-rose/50">
              <span className="text-gray-400 font-semibold">Last Cloud Sync:</span>
              <span className="text-gray-600 font-bold">{lastGDriveSyncTime}</span>
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={connectAndSyncGoogleDrive}
            disabled={!googleClientId}
            className="bg-gradient-to-br from-primary to-[#FA8CA8] text-white border-none font-title text-[0.92rem] font-bold py-3 px-4 rounded-xl shadow-[0_4px_12px_rgba(232,99,138,0.15)] flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>🔄</span> Connect & Sync now
          </button>

          {/* Expandable Guide Button */}
          <button
            onClick={() => setShowDriveGuide(!showDriveGuide)}
            className="text-[0.78rem] font-bold text-primary hover:underline text-left mt-1 self-start flex items-center gap-1"
          >
            <span>ℹ️</span> {showDriveGuide ? 'Hide Guide' : 'How to set up Google Client ID?'}
          </button>

          {/* Expandable Developer Guide */}
          {showDriveGuide && (
            <div className="text-[0.76rem] text-gray-500 leading-relaxed flex flex-col gap-2 mt-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="font-bold text-gray-700">Get your free Client ID in 5 steps:</p>
              <ol className="list-decimal list-inside flex flex-col gap-1.5">
                <li>Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary underline">Google Cloud Console</a>.</li>
                <li>Create a new project, search for <strong>Google Drive API</strong>, and click <strong>Enable</strong>.</li>
                <li>Go to the <strong>OAuth Consent Screen</strong> tab, select <strong>External</strong>, and fill in the required support emails. Add the scope <code>.../auth/drive.file</code>.</li>
                <li>Go to the <strong>Credentials</strong> tab, click <strong>Create Credentials</strong> &rarr; <strong>OAuth Client ID</strong>.</li>
                <li>Select <strong>Web Application</strong>. Under <strong>Authorized JavaScript origins</strong>, add your local URL: <code>http://localhost:5173</code> (and your deployment domain when live). Copy the Client ID and paste it here!</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Backup & Restore Data */}
      <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4 transition-all duration-200 hover:shadow-rose-md">
        <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5 border-b border-border-rose pb-2">
          <span>💾</span> Local Backups (Offline)
        </div>
        <p className="text-[0.82rem] text-gray-500 leading-relaxed">
          Download a JSON backup of your cycle data to your device's files, or upload a backup to restore progress offline.
        </p>
        
        <div className="flex flex-col gap-2.5">
          <button
            className="bg-primary-light text-primary border border-border-rose font-title text-sm font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
            onClick={exportData}
          >
            <span>📤</span> Export JSON Backup
          </button>
          
          <button
            className="bg-primary-light text-primary border border-border-rose font-title text-sm font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
            onClick={handleFileImportClick}
          >
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
      <div className="bg-[#FFF5F5] rounded-2xl p-5 border border-red-200 flex flex-col gap-4 transition-all duration-200">
        <div className="font-title text-md font-bold text-red-700 flex items-center gap-1.5">
          <span>⚠️</span> Danger Zone
        </div>
        <p className="text-[0.82rem] text-red-900/70 leading-relaxed">
          Resetting will permanently wipe your active progress, past history cycles, and clear all credentials.
        </p>
        <button
          className="bg-red-50 text-red-600 border border-red-200 font-title text-sm font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150 hover:bg-red-100"
          onClick={resetAppData}
        >
          <span>🗑️</span> Reset App Data
        </button>
      </div>

      {/* App Version Info */}
      <div className="text-center text-gray-400 text-[0.72rem] mt-2 flex flex-col gap-0.5 font-semibold">
        <p>MediCycle PWA for Sandali v1.1.0 🌸</p>
        <p>Works Offline • Cloud Auto-Backup Enabled</p>
      </div>
    </div>
  );
};

export default SettingsTab;
