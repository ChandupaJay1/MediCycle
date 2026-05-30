import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const CycleContext = createContext();

// ─── Google Drive Config ───────────────────────────────────────────────────────
// Put your OAuth Client ID in .env as VITE_GOOGLE_CLIENT_ID
// or enter it once in Settings and it will be saved to localStorage.
const ENV_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FOLDER_NAME = 'MediCycle Backups';
const BACKUP_FILE_NAME = 'medicycle_backup.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
    monthStartDates: [null, null, null],
    periodStartDate: null,
    periodEndDate: null,
    periodDays: [],
    restartDate: null
  };
};

const buildBackupPayload = (currentCycle, pastCycles, reminderTime, notificationsEnabled) => ({
  currentCycle,
  pastCycles,
  reminderTime,
  notificationsEnabled,
  exportedAt: new Date().toISOString(),
  version: '1.2.0'
});

// ─── Drive REST helpers ────────────────────────────────────────────────────────
async function driveGetOrCreateFolder(token) {
  const q = encodeURIComponent(
    `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) return data.files[0].id;

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: BACKUP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
  });
  const folder = await createRes.json();
  if (!folder.id) throw new Error('Could not create backup folder on Drive.');
  return folder.id;
}

async function driveGetBackupFileId(token, folderId) {
  const q = encodeURIComponent(
    `name='${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false`
  );
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

async function driveUploadBackup(token, folderId, fileId, jsonString) {
  if (fileId) {
    // Update existing file
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: jsonString
      }
    );
    if (!res.ok) throw new Error('Failed to update backup on Drive.');
    return fileId;
  } else {
    // Create new file (multipart)
    const boundary = 'medicycle_mp_boundary';
    const metadata = JSON.stringify({ name: BACKUP_FILE_NAME, parents: [folderId] });
    const body =
      `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      `${jsonString}\r\n--${boundary}--`;

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      }
    );
    if (!res.ok) throw new Error('Failed to create backup on Drive.');
    const created = await res.json();
    return created.id;
  }
}

async function driveDownloadBackup(token, fileId) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to download backup from Drive.');
  return await res.json();
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const CycleProvider = ({ children }) => {
  const [currentCycle, setCurrentCycle] = useState(createNewCycleObject());
  const [pastCycles, setPastCycles] = useState([]);
  const [reminderTime, setReminderTime] = useState('21:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastReminderNotifiedDate, setLastReminderNotifiedDate] = useState(null);

  // Google Drive states
  const [googleClientId, setGoogleClientIdState] = useState(ENV_CLIENT_ID);
  const [gDriveStatus, setGDriveStatus] = useState('disconnected');
  const [lastGDriveSyncTime, setLastGDriveSyncTime] = useState('');
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [driveUserEmail, setDriveUserEmail] = useState('');

  // Refs to always have latest state inside callbacks without stale closures
  const stateRef = useRef({});
  stateRef.current = { currentCycle, pastCycles, reminderTime, notificationsEnabled };

  // ── Load from localStorage ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('medicycle_state');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.currentCycle) setCurrentCycle(p.currentCycle);
        if (p.pastCycles) setPastCycles(p.pastCycles);
        if (p.reminderTime) setReminderTime(p.reminderTime);
        if (p.notificationsEnabled) setNotificationsEnabled(p.notificationsEnabled);
        if (p.lastReminderNotifiedDate) setLastReminderNotifiedDate(p.lastReminderNotifiedDate);
      }
      const savedClientId = localStorage.getItem('medicycle_google_client_id') || ENV_CLIENT_ID;
      const savedSyncTime = localStorage.getItem('medicycle_last_gdrive_sync') || '';
      const savedEmail = localStorage.getItem('medicycle_drive_email') || '';
      if (savedClientId) setGoogleClientIdState(savedClientId);
      setLastGDriveSyncTime(savedSyncTime);
      setDriveUserEmail(savedEmail);
      if (localStorage.getItem('medicycle_gdrive_authorized') === 'true' && savedClientId) {
        setGDriveStatus('connected');
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }, []);

  // ── Persist to localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem('medicycle_state', JSON.stringify({
        currentCycle, pastCycles, reminderTime, notificationsEnabled, lastReminderNotifiedDate
      }));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [currentCycle, pastCycles, reminderTime, notificationsEnabled, lastReminderNotifiedDate]);

  // ── Client ID setter ────────────────────────────────────────────────────────
  const setGoogleClientId = (id) => {
    setGoogleClientIdState(id);
    localStorage.setItem('medicycle_google_client_id', id);
    if (!id) {
      setGDriveStatus('disconnected');
      setGoogleAccessToken('');
      setDriveUserEmail('');
      localStorage.removeItem('medicycle_gdrive_authorized');
      localStorage.removeItem('medicycle_drive_email');
    }
  };

  // ── Core sync function (uses stateRef so it's always fresh) ─────────────────
  const syncBackupToGDrive = useCallback(async (token) => {
    if (!token) return;
    setGDriveStatus('syncing');
    try {
      const { currentCycle: cc, pastCycles: pc, reminderTime: rt, notificationsEnabled: ne } = stateRef.current;
      const jsonString = JSON.stringify(buildBackupPayload(cc, pc, rt, ne), null, 2);

      const folderId = await driveGetOrCreateFolder(token);
      const existingFileId = await driveGetBackupFileId(token, folderId);
      await driveUploadBackup(token, folderId, existingFileId, jsonString);

      const nowStr = new Date().toLocaleString();
      setLastGDriveSyncTime(nowStr);
      localStorage.setItem('medicycle_last_gdrive_sync', nowStr);
      setGDriveStatus('synced');
    } catch (err) {
      console.error('Drive sync error:', err);
      setGDriveStatus('error');
    }
  }, []);

  // ── Get a fresh token silently or via popup ─────────────────────────────────
  const getTokenAndSync = useCallback((clientId, { silent = false } = {}) => {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google OAuth library not loaded yet.'));
        return;
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        prompt: silent ? '' : 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }
          const token = tokenResponse.access_token;
          setGoogleAccessToken(token);
          localStorage.setItem('medicycle_gdrive_authorized', 'true');
          setGDriveStatus('connected');

          // Fetch user email for display
          try {
            const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const info = await infoRes.json();
            if (info.email) {
              setDriveUserEmail(info.email);
              localStorage.setItem('medicycle_drive_email', info.email);
            }
          } catch (_) { /* non-critical */ }

          await syncBackupToGDrive(token);
          resolve(token);
        }
      });
      client.requestAccessToken();
    });
  }, [syncBackupToGDrive]);

  // ── Manual connect & sync (called from Settings button) ────────────────────
  const connectAndSyncGoogleDrive = async () => {
    const clientId = googleClientId || ENV_CLIENT_ID;
    if (!clientId) {
      alert('Please enter your Google Client ID in Settings first.');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      alert('Google OAuth library is still loading. Please wait a moment and try again.');
      return;
    }
    try {
      await getTokenAndSync(clientId, { silent: false });
    } catch (e) {
      console.error('OAuth error:', e);
      setGDriveStatus('error');
      alert(`Google sign-in failed: ${e.message}`);
    }
  };

  // ── Disconnect Drive ────────────────────────────────────────────────────────
  const disconnectGoogleDrive = () => {
    setGoogleAccessToken('');
    setDriveUserEmail('');
    setGDriveStatus('disconnected');
    localStorage.removeItem('medicycle_gdrive_authorized');
    localStorage.removeItem('medicycle_drive_email');
    if (window.google?.accounts?.oauth2 && googleAccessToken) {
      window.google.accounts.oauth2.revoke(googleAccessToken, () => {});
    }
  };

  // ── Restore from Google Drive ───────────────────────────────────────────────
  const restoreFromGoogleDrive = async () => {
    const clientId = googleClientId || ENV_CLIENT_ID;
    if (!clientId) {
      alert('Please enter your Google Client ID first.');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      alert('Google OAuth library is still loading. Please try again.');
      return;
    }
    try {
      setGDriveStatus('syncing');
      const token = await new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: DRIVE_SCOPE,
          prompt: googleAccessToken ? '' : 'select_account',
          callback: (r) => r.error ? reject(new Error(r.error)) : resolve(r.access_token)
        });
        client.requestAccessToken();
      });

      setGoogleAccessToken(token);
      localStorage.setItem('medicycle_gdrive_authorized', 'true');

      const folderId = await driveGetOrCreateFolder(token);
      const fileId = await driveGetBackupFileId(token, folderId);

      if (!fileId) {
        setGDriveStatus('connected');
        alert('No backup file found on Google Drive. Nothing to restore.');
        return;
      }

      const backup = await driveDownloadBackup(token, fileId);
      applyBackupData(backup);
      setGDriveStatus('synced');
      const nowStr = new Date().toLocaleString();
      setLastGDriveSyncTime(nowStr);
      localStorage.setItem('medicycle_last_gdrive_sync', nowStr);
      alert('✅ Data restored from Google Drive successfully! 🌸');
    } catch (e) {
      console.error('Restore error:', e);
      setGDriveStatus('error');
      alert(`Restore failed: ${e.message}`);
    }
  };

  // ── Apply backup data (shared by Drive restore + JSON import) ───────────────
  const applyBackupData = (parsed) => {
    if (!parsed?.currentCycle) throw new Error('Invalid backup file format.');
    setCurrentCycle(parsed.currentCycle);
    if (parsed.pastCycles) setPastCycles(parsed.pastCycles);
    if (parsed.reminderTime) setReminderTime(parsed.reminderTime);
    if (typeof parsed.notificationsEnabled === 'boolean') setNotificationsEnabled(parsed.notificationsEnabled);
  };

  // ── Auto-sync when data changes (debounced 3s) ──────────────────────────────
  const autoSyncTimer = useRef(null);
  useEffect(() => {
    if (!googleAccessToken || gDriveStatus === 'syncing') return;
    clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = setTimeout(() => {
      syncBackupToGDrive(googleAccessToken);
    }, 3000);
    return () => clearTimeout(autoSyncTimer.current);
  }, [currentCycle, pastCycles, reminderTime, notificationsEnabled, googleAccessToken, syncBackupToGDrive]);

  // ── Silent daily auto-sync on app load ─────────────────────────────────────
  useEffect(() => {
    const trySilentSync = async () => {
      const wasAuthorized = localStorage.getItem('medicycle_gdrive_authorized') === 'true';
      const clientId = localStorage.getItem('medicycle_google_client_id') || ENV_CLIENT_ID;
      if (!wasAuthorized || !clientId || !window.google?.accounts?.oauth2) return;

      const lastSync = localStorage.getItem('medicycle_last_gdrive_sync');
      const hoursSince = lastSync
        ? (Date.now() - new Date(lastSync).getTime()) / 3_600_000
        : Infinity;

      if (hoursSince < 6) return; // Don't spam - only sync if 6+ hours since last

      try {
        await getTokenAndSync(clientId, { silent: true });
      } catch (e) {
        console.warn('Silent auto-sync failed (will retry on next manual connect):', e.message);
      }
    };

    const timer = setTimeout(trySilentSync, 4000);
    return () => clearTimeout(timer);
  }, [getTokenAndSync]);

  // ── Notifications ───────────────────────────────────────────────────────────
  const fireNotification = useCallback((title, body) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body, icon: './icon-192.png', badge: './icon-192.png',
          vibrate: [200, 100, 200], tag: 'medicycle-notification'
        });
      }).catch(() => new Notification(title, { body, icon: './icon-192.png' }));
    } catch {
      new Notification(title, { body, icon: './icon-192.png' });
    }
  }, []);

  const checkReminderNotification = useCallback(() => {
    if (!notificationsEnabled) return;
    const today = new Date().toISOString().split('T')[0];
    if (lastReminderNotifiedDate === today) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (hhmm === reminderTime) {
      fireNotification('MediCycle Reminder 💊', 'Hi Sandali! Time to take your daily medication. 🌸');
      setLastReminderNotifiedDate(today);
    }
  }, [notificationsEnabled, reminderTime, lastReminderNotifiedDate, fireNotification]);

  const requestNotificationPermission = async (enable) => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications.');
      return false;
    }
    if (enable) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        fireNotification('Notifications Enabled! 🌸', 'You will receive daily tablet reminders.');
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

  // ── Cycle Actions ───────────────────────────────────────────────────────────
  const takeTablet = (index) => {
    if (currentCycle.phase !== 'medication') return;
    setCurrentCycle((prev) => {
      const updatedTablets = [...prev.tablets];
      updatedTablets[index] = { index, taken: true, takenAt: new Date().toISOString() };
      const takenCount = updatedTablets.filter((t) => t.taken).length;
      let nextPhase = prev.phase;
      if (takenCount === 72) {
        nextPhase = 'period_wait';
        setTimeout(() => fireNotification('Treatment Completed! 🎉', 'All 72 tablets done. Waiting for period start.'), 100);
      } else if (takenCount === 67) {
        setTimeout(() => fireNotification('Almost Done! 🌸', 'Only 5 tablets remaining.'), 100);
      }
      const updatedMonthStartDates = [...prev.monthStartDates];
      const monthIdx = Math.floor(index / 24);
      if (updatedMonthStartDates[monthIdx] === null) {
        updatedMonthStartDates[monthIdx] = new Date().toISOString().split('T')[0];
      }
      return { ...prev, tablets: updatedTablets, monthStartDates: updatedMonthStartDates, phase: nextPhase };
    });
  };

  const undoTablet = () => {
    if (currentCycle.phase !== 'medication' && currentCycle.phase !== 'period_wait') return;
    setCurrentCycle((prev) => {
      const takenTablets = prev.tablets.filter((t) => t.taken && t.takenAt);
      if (takenTablets.length === 0) return prev;
      const lastPill = takenTablets.reduce((a, b) => new Date(a.takenAt) > new Date(b.takenAt) ? a : b);
      const updatedTablets = [...prev.tablets];
      updatedTablets[lastPill.index] = { index: lastPill.index, taken: false, takenAt: null };
      const takenCount = updatedTablets.filter((t) => t.taken).length;
      const nextPhase = takenCount < 72 ? 'medication' : 'period_wait';
      const updatedMonthStartDates = [...prev.monthStartDates];
      const monthIdx = Math.floor(lastPill.index / 24);
      const anyInMonth = updatedTablets.slice(monthIdx * 24, (monthIdx + 1) * 24).some((t) => t.taken);
      if (!anyInMonth) updatedMonthStartDates[monthIdx] = null;
      return { ...prev, tablets: updatedTablets, monthStartDates: updatedMonthStartDates, phase: nextPhase };
    });
  };

  const startPeriod = () => {
    if (currentCycle.phase !== 'period_wait') return;
    const todayStr = new Date().toISOString().split('T')[0];
    setCurrentCycle((prev) => ({ ...prev, phase: 'period', periodStartDate: todayStr, periodDays: [todayStr] }));
  };

  const togglePeriodDay = (dateString) => {
    if (currentCycle.phase !== 'period') return;
    setCurrentCycle((prev) => {
      const isDayActive = prev.periodDays.includes(dateString);
      const updatedDays = isDayActive
        ? prev.periodDays.filter((d) => d !== dateString)
        : [...prev.periodDays, dateString].sort();
      return { ...prev, periodDays: updatedDays };
    });
  };

  const endPeriod = () => {
    if (currentCycle.phase !== 'period') return;
    const todayStr = new Date().toISOString().split('T')[0];
    const restartDateObj = new Date(todayStr);
    restartDateObj.setDate(restartDateObj.getDate() + 1);
    setCurrentCycle((prev) => ({
      ...prev, phase: 'complete', periodEndDate: todayStr,
      restartDate: restartDateObj.toISOString().split('T')[0]
    }));
  };

  const startNewCycle = () => {
    if (currentCycle.phase !== 'complete') return;
    setPastCycles((prev) => [{ ...currentCycle, completedAt: new Date().toISOString() }, ...prev]);
    setCurrentCycle(createNewCycleObject());
  };

  const resetAppData = () => {
    if (!window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
    setCurrentCycle(createNewCycleObject());
    setPastCycles([]);
    setReminderTime('21:00');
    setNotificationsEnabled(false);
    setLastReminderNotifiedDate(null);
    setGoogleClientId('');
    setLastGDriveSyncTime('');
    setGoogleAccessToken('');
    setDriveUserEmail('');
    setGDriveStatus('disconnected');
    localStorage.removeItem('medicycle_state');
    localStorage.removeItem('medicycle_google_client_id');
    localStorage.removeItem('medicycle_last_gdrive_sync');
    localStorage.removeItem('medicycle_gdrive_authorized');
    localStorage.removeItem('medicycle_drive_email');
  };

  // ── Local JSON Export (download to device) ──────────────────────────────────
  const exportData = () => {
    const backup = buildBackupPayload(currentCycle, pastCycles, reminderTime, notificationsEnabled);
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

  // ── Local JSON Import (restore from device file) ────────────────────────────
  const importData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          applyBackupData(parsed);
          resolve(true);
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
        googleClientId,
        gDriveStatus,
        lastGDriveSyncTime,
        googleAccessToken,
        driveUserEmail,
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
        importData,
        setGoogleClientId,
        connectAndSyncGoogleDrive,
        disconnectGoogleDrive,
        restoreFromGoogleDrive
      }}
    >
      {children}
    </CycleContext.Provider>
  );
};

export const useCycle = () => {
  const context = useContext(CycleContext);
  if (!context) throw new Error('useCycle must be used within a CycleProvider');
  return context;
};
