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
    driveUserEmail,
    connectAndSyncGoogleDrive,
    disconnectGoogleDrive,
    restoreFromGoogleDrive
  } = useCycle();

  const fileInputRef = useRef(null);
  const [showClientIdField, setShowClientIdField] = useState(false);
  const [showDriveGuide, setShowDriveGuide] = useState(false);

  const handleNotificationToggle = async (e) => {
    await requestNotificationPermission(e.target.checked);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importData(file);
      alert('✅ Backup restored successfully! 🌸');
    } catch (err) {
      alert(`Failed to restore backup: ${err.message}`);
    }
    e.target.value = '';
  };

  const driveStatusConfig = {
    disconnected: { label: 'Not Connected', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
    connected:    { label: 'Connected',     color: 'bg-blue-50 text-blue-600',   dot: 'bg-blue-500' },
    syncing:      { label: 'Syncing…',      color: 'bg-yellow-50 text-yellow-600 animate-pulse', dot: 'bg-yellow-500' },
    synced:       { label: 'Synced ✓',      color: 'bg-green-50 text-green-600', dot: 'bg-green-500' },
    error:        { label: 'Sync Error',    color: 'bg-red-50 text-red-500',     dot: 'bg-red-500' }
  };
  const statusCfg = driveStatusConfig[gDriveStatus] || driveStatusConfig.disconnected;
  const isConnected = gDriveStatus === 'connected' || gDriveStatus === 'syncing' || gDriveStatus === 'synced';

  return (
    <div
      className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-5"
      style={{ paddingBottom: 'calc(92px + env(safe-area-inset-bottom))' }}
    >
      {/* Header */}
      <div className="flex flex-col pt-2">
        <h1 className="font-title text-2xl font-extrabold text-gray-800 tracking-tight">Settings ⚙️</h1>
        <p className="text-[0.75rem] text-gray-400 mt-0.5">Configure reminders and manage data backups.</p>
      </div>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4">
        <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5 border-b border-border-rose pb-2">
          <span>🔔</span> Daily Reminders
        </div>

        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.92rem] font-bold text-gray-800">Tablet Reminder</span>
            <span className="text-[0.75rem] text-gray-400 max-w-[200px]">Get notified to take your pill daily.</span>
          </div>
          <label className="relative inline-block w-[46px] h-6 cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={handleNotificationToggle} />
            <span className="absolute inset-0 bg-gray-300 rounded-full transition-colors duration-200 peer-checked:bg-primary"></span>
            <span className="absolute left-[3px] bottom-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-[22px] shadow-sm"></span>
          </label>
        </div>

        {notificationsEnabled && (
          <div className="flex justify-between items-center border-t border-border-rose/50 pt-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.92rem] font-bold text-gray-800">Reminder Time</span>
              <span className="text-[0.75rem] text-gray-400">Pick what time to notify.</span>
            </div>
            <input
              type="time"
              className="border-2 border-border-rose bg-white px-3 py-1.5 rounded-xl font-title text-sm font-semibold text-gray-800 outline-none focus:border-primary cursor-pointer"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── Google Drive Sync ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-border-rose pb-2">
          <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5">
            <span>☁️</span> Google Drive Backup
          </div>
          <span className={`flex items-center gap-1.5 text-[0.66rem] font-bold uppercase px-2.5 py-1 rounded-full border border-black/5 ${statusCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusCfg.dot}`}></span>
            {statusCfg.label}
          </span>
        </div>

        {/* Connected user info */}
        {isConnected && driveUserEmail ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-3.5 py-2.5">
            <span className="text-xl">✅</span>
            <div className="flex flex-col">
              <span className="text-[0.78rem] font-bold text-green-700">Signed in as</span>
              <span className="text-[0.82rem] font-semibold text-gray-700 truncate max-w-[200px]">{driveUserEmail}</span>
            </div>
          </div>
        ) : (
          <p className="text-[0.82rem] text-gray-500 leading-relaxed">
            Sign in with Google to automatically back up your data to Drive. Your backup syncs every time you take a pill or update your cycle.
          </p>
        )}

        {/* Last sync time */}
        {lastGDriveSyncTime && (
          <div className="flex justify-between text-[0.78rem] bg-bg-rose p-2.5 rounded-xl border border-border-rose/50">
            <span className="text-gray-400 font-semibold">Last synced:</span>
            <span className="text-gray-600 font-bold">{lastGDriveSyncTime}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {!isConnected ? (
            /* Sign In Button */
            <button
              onClick={connectAndSyncGoogleDrive}
              className="bg-gradient-to-br from-primary to-[#FA8CA8] text-white font-title text-[0.92rem] font-bold py-3.5 px-4 rounded-2xl shadow-[0_4px_12px_rgba(232,99,138,0.18)] flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
            >
              <span>🔑</span> Sign in with Google & Backup
            </button>
          ) : (
            /* Sync Now + Restore + Disconnect */
            <>
              <button
                onClick={connectAndSyncGoogleDrive}
                className="bg-gradient-to-br from-primary to-[#FA8CA8] text-white font-title text-[0.92rem] font-bold py-3 px-4 rounded-2xl shadow-[0_4px_12px_rgba(232,99,138,0.15)] flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
              >
                <span>🔄</span> Sync Now
              </button>
              <button
                onClick={restoreFromGoogleDrive}
                className="bg-primary-light text-primary border border-border-rose font-title text-sm font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
              >
                <span>⬇️</span> Restore from Drive
              </button>
              <button
                onClick={disconnectGoogleDrive}
                className="bg-gray-50 text-gray-500 border border-gray-200 font-title text-sm font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
              >
                <span>🔓</span> Disconnect Google Account
              </button>
            </>
          )}
        </div>

        {/* Advanced: Client ID override */}
        <button
          onClick={() => setShowClientIdField(!showClientIdField)}
          className="text-[0.75rem] font-bold text-gray-400 hover:text-primary text-left flex items-center gap-1 mt-1 self-start"
        >
          <span>{showClientIdField ? '▲' : '▼'}</span> Advanced: Custom Client ID
        </button>

        {showClientIdField && (
          <div className="flex flex-col gap-2 mt-1">
            <label className="text-[0.78rem] font-bold text-gray-600">Google OAuth Client ID</label>
            <input
              type="text"
              placeholder="e.g. 12345-abcde.apps.googleusercontent.com"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              className="w-full border border-border-rose rounded-xl px-3.5 py-2.5 bg-bg-rose/50 font-sans text-[0.8rem] focus:outline-none focus:border-primary text-gray-800"
            />
            <button
              onClick={() => setShowDriveGuide(!showDriveGuide)}
              className="text-[0.75rem] font-bold text-primary hover:underline text-left flex items-center gap-1"
            >
              <span>ℹ️</span> {showDriveGuide ? 'Hide setup guide' : 'How to get a Client ID?'}
            </button>
            {showDriveGuide && (
              <div className="text-[0.76rem] text-gray-500 leading-relaxed flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="font-bold text-gray-700">Get your free Client ID in 5 steps:</p>
                <ol className="list-decimal list-inside flex flex-col gap-1.5">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary underline">Google Cloud Console</a>.</li>
                  <li>Create a project → enable <strong>Google Drive API</strong>.</li>
                  <li>OAuth Consent Screen → External → add scope <code>.../auth/drive.file</code>.</li>
                  <li>Credentials → Create OAuth Client ID → Web Application.</li>
                  <li>Add <code>http://localhost:5173</code> (and your live domain) as Authorized JS origin. Copy the Client ID here.</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Local JSON Backup ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-rose-sm border border-border-rose flex flex-col gap-4">
        <div className="font-title text-md font-bold text-gray-800 flex items-center gap-1.5 border-b border-border-rose pb-2">
          <span>📱</span> Device Backup (Offline)
        </div>
        <p className="text-[0.82rem] text-gray-500 leading-relaxed">
          Save a JSON backup file to your phone or computer, or restore from a previously saved file.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={exportData}
            className="bg-primary-light text-primary border border-border-rose font-title text-sm font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
          >
            <span>📤</span> Download Backup to Device
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-primary-light text-primary border border-border-rose font-title text-sm font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150"
          >
            <span>📥</span> Restore from Device File
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />
        </div>
      </div>

      {/* ── Danger Zone ───────────────────────────────────────────────────── */}
      <div className="bg-[#FFF5F5] rounded-2xl p-5 border border-red-200 flex flex-col gap-4">
        <div className="font-title text-md font-bold text-red-700 flex items-center gap-1.5">
          <span>⚠️</span> Danger Zone
        </div>
        <p className="text-[0.82rem] text-red-900/70 leading-relaxed">
          Permanently wipes all progress, history, and credentials. This cannot be undone.
        </p>
        <button
          onClick={resetAppData}
          className="bg-red-50 text-red-600 border border-red-200 font-title text-sm font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-97 cursor-pointer w-full transition-transform duration-150 hover:bg-red-100"
        >
          <span>🗑️</span> Reset All App Data
        </button>
      </div>

      {/* Version */}
      <div className="text-center text-gray-400 text-[0.72rem] mt-2 flex flex-col gap-0.5 font-semibold pb-2">
        <p>MediCycle PWA for Sandali v1.2.0 🌸</p>
        <p>Works Offline • Auto Cloud Backup</p>
      </div>
    </div>
  );
};

export default SettingsTab;
