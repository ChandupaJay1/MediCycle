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
    monthStartDates: [null, null, null],
    periodStartDate: null,
    periodEndDate: null,
    periodDays: [],
    restartDate: null
  };
};

export const CycleProvider = ({ children }) => {
  const [currentCycle, setCurrentCycle] = useState(createNewCycleObject());
  const [pastCycles, setPastCycles] = useState([]);
  const [reminderTime, setReminderTime] = useState('21:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastReminderNotifiedDate, setLastReminderNotifiedDate] = useState(null);

  // Google Drive Integration States
  const [googleClientId, setGoogleClientIdState] = useState('');
  const [gDriveStatus, setGDriveStatus] = useState('disconnected'); // 'disconnected' | 'connected' | 'syncing' | 'synced' | 'error'
  const [lastGDriveSyncTime, setLastGDriveSyncTime] = useState('');
  const [googleAccessToken, setGoogleAccessToken] = useState('');

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

      // Load GDrive configurations
      const savedClientId = localStorage.getItem('medicycle_google_client_id') || '';
      const savedSyncTime = localStorage.getItem('medicycle_last_gdrive_sync') || '';
      setGoogleClientIdState(savedClientId);
      setLastGDriveSyncTime(savedSyncTime);
      
      const wasAuthorized = localStorage.getItem('medicycle_gdrive_authorized') === 'true';
      if (wasAuthorized && savedClientId) {
        setGDriveStatus('connected');
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

  // Update Client ID setting
  const setGoogleClientId = (id) => {
    setGoogleClientIdState(id);
    localStorage.setItem('medicycle_google_client_id', id);
    if (!id) {
      setGDriveStatus('disconnected');
      setGoogleAccessToken('');
      localStorage.removeItem('medicycle_gdrive_authorized');
    }
  };

  // Direct REST API file sync function to Google Drive
  const syncBackupToGDrive = useCallback(async (accessToken) => {
    if (!accessToken) return;
    setGDriveStatus('syncing');

    const backupData = {
      currentCycle,
      pastCycles,
      reminderTime,
      notificationsEnabled,
      exportedAt: new Date().toISOString()
    };
    const backupJSON = JSON.stringify(backupData, null, 2);

    try {
      // 1. Search for 'MediCycle Backups' folder
      const folderSearchUrl = `https://www.googleapis.com/drive/v3/files?q=name='MediCycle Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const folderRes = await fetch(folderSearchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const folderData = await folderRes.json();
      
      let folderId = '';
      if (folderData.files && folderData.files.length > 0) {
        folderId = folderData.files[0].id;
      } else {
        // Create folder
        const createFolderUrl = 'https://www.googleapis.com/drive/v3/files';
        const createFolderRes = await fetch(createFolderUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'MediCycle Backups',
            mimeType: 'application/vnd.google-apps.folder'
          })
        });
        const newFolder = await createFolderRes.json();
        folderId = newFolder.id;
      }

      if (!folderId) throw new Error('Could not resolve or create backup folder.');

      // 2. Search for existing backup file in that folder
      const fileSearchUrl = `https://www.googleapis.com/drive/v3/files?q=name='medicycle_backup.json' and '${folderId}' in parents and trashed=false`;
      const fileRes = await fetch(fileSearchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const fileData = await fileRes.json();

      let fileId = '';
      if (fileData.files && fileData.files.length > 0) {
        fileId = fileData.files[0].id;
      }

      if (fileId) {
        // Update existing file (PATCH upload)
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
        const updateRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: backupJSON
        });
        if (!updateRes.ok) throw new Error('Failed to update remote backup file.');
      } else {
        // Create new file (Multipart POST upload to store metadata + file contents together)
        const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const boundary = 'medicycle_boundary_string';
        const metadata = {
          name: 'medicycle_backup.json',
          parents: [folderId]
        };

        const multipartBody = 
          `\r\n--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${backupJSON}\r\n` +
          `--${boundary}--`;

        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });
        if (!createRes.ok) throw new Error('Failed to upload new remote backup file.');
      }

      // Success
      const nowStr = new Date().toLocaleString();
      setLastGDriveSyncTime(nowStr);
      localStorage.setItem('medicycle_last_gdrive_sync', nowStr);
      setGDriveStatus('synced');
    } catch (err) {
      console.error('Google Drive Sync Error:', err);
      setGDriveStatus('error');
    }
  }, [currentCycle, pastCycles, reminderTime, notificationsEnabled]);

  // Connect Google Drive (Initiate Authentication Popup)
  const connectAndSyncGoogleDrive = () => {
    if (!googleClientId) {
      alert('Please enter your Google Client ID first.');
      return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      alert('Google OAuth library is still loading. Please try again in a few seconds.');
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Google OAuth Error:', tokenResponse);
            setGDriveStatus('error');
            alert(`Authentication failed: ${tokenResponse.error_description || tokenResponse.error}`);
            return;
          }
          
          const token = tokenResponse.access_token;
          setGoogleAccessToken(token);
          localStorage.setItem('medicycle_gdrive_authorized', 'true');
          syncBackupToGDrive(token);
        }
      });
      client.requestAccessToken();
    } catch (e) {
      console.error(e);
      setGDriveStatus('error');
      alert(`OAuth initialization failed: ${e.message}`);
    }
  };

  // Background silent auto-sync check (checks on mount, or whenever token is present)
  // Auto-sync happens on modifications if a valid token is in-memory
  useEffect(() => {
    if (googleAccessToken && gDriveStatus === 'connected') {
      // Sync in background silently
      syncBackupToGDrive(googleAccessToken);
    }
  }, [currentCycle, pastCycles, reminderTime, notificationsEnabled, googleAccessToken, gDriveStatus, syncBackupToGDrive]);

  // Daily auto-refresh check on mount
  useEffect(() => {
    const checkDailySync = async () => {
      const wasAuthorized = localStorage.getItem('medicycle_gdrive_authorized') === 'true';
      const clientId = localStorage.getItem('medicycle_google_client_id');
      const lastSync = localStorage.getItem('medicycle_last_gdrive_sync');

      if (wasAuthorized && clientId && window.google) {
        // Calculate hours since last sync
        let shouldSync = false;
        if (!lastSync) {
          shouldSync = true;
        } else {
          const lastDate = new Date(lastSync);
          const diffHours = Math.abs(new Date() - lastDate) / (3600 * 1000);
          if (diffHours >= 24) {
            shouldSync = true;
          }
        }

        if (shouldSync) {
          // Attempt a silent token request
          try {
            const client = window.google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: 'https://www.googleapis.com/auth/drive.file',
              prompt: '', // Silent request, no popup
              callback: (tokenResponse) => {
                if (!tokenResponse.error && tokenResponse.access_token) {
                  setGoogleAccessToken(tokenResponse.access_token);
                  setGDriveStatus('connected');
                  syncBackupToGDrive(tokenResponse.access_token);
                } else {
                  console.warn('Silent Google authentication failed. Popup will be needed next manual click.');
                }
              }
            });
            client.requestAccessToken();
          } catch (e) {
            console.warn('Silent token init failed:', e);
          }
        }
      }
    };

    // Delay initialization slightly to let Google scripts load
    const timer = setTimeout(checkDailySync, 3000);
    return () => clearTimeout(timer);
  }, [syncBackupToGDrive]);

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
          new Notification(title, { body, icon: './icon-192.png' });
        });
      } catch (err) {
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
      
      if (takenCount === 72) {
        nextPhase = 'period_wait';
        setTimeout(() => {
          fireNotification('Treatment Completed! 🎉', 'You have finished all 72 tablets. Waiting for period start.');
        }, 100);
      } else if (takenCount === 67) {
        setTimeout(() => {
          fireNotification('Almost Done! 🌸', 'Only 5 tablets remain for this treatment cycle.');
        }, 100);
      }

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

  // 2. Undo Tablet
  const undoTablet = () => {
    if (currentCycle.phase !== 'medication' && currentCycle.phase !== 'period_wait') return;

    setCurrentCycle((prev) => {
      const takenTablets = prev.tablets.filter(t => t.taken && t.takenAt);
      if (takenTablets.length === 0) return prev;

      let lastPill = takenTablets.reduce((latest, current) => {
        return new Date(current.takenAt) > new Date(latest.takenAt) ? current : latest;
      }, takenTablets[0]);

      const updatedTablets = [...prev.tablets];
      updatedTablets[lastPill.index] = {
        index: lastPill.index,
        taken: false,
        takenAt: null
      };

      const takenCount = updatedTablets.filter((t) => t.taken).length;
      const nextPhase = takenCount < 72 ? 'medication' : 'period_wait';

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
      periodDays: [todayStr]
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
      setGoogleClientId('');
      setLastGDriveSyncTime('');
      setGoogleAccessToken('');
      setGDriveStatus('disconnected');
      localStorage.removeItem('medicycle_state');
      localStorage.removeItem('medicycle_google_client_id');
      localStorage.removeItem('medicycle_last_gdrive_sync');
      localStorage.removeItem('medicycle_gdrive_authorized');
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
            reject(new Error('Invalid backup file format'));
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
        googleClientId,
        gDriveStatus,
        lastGDriveSyncTime,
        googleAccessToken,
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
        connectAndSyncGoogleDrive
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
