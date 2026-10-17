const { app, BrowserWindow, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const os = require('os');

let mainWindow = null;

function getLocalBrandName() {
  try {
    const username = (
      process.env.USERNAME ||
      os.userInfo().username ||
      ''
    ).toLowerCase();
    return username.includes('elbioh') ? 'NEON' : 'SHADOWJOKER';
  } catch {
    return 'NEON';
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  try {
    const brandName = getLocalBrandName();
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-downloaded', (info) => {
      if (!mainWindow) {
        autoUpdater.quitAndInstall(false, true);
        return;
      }
      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          buttons: ['Atualizar e Reiniciar Agora', 'Depois'],
          defaultId: 0,
          title: `Nova Atualização do ${brandName} Disponível!`,
          message: `A versão ${info.version} do ${brandName} foi baixada automaticamente.`,
          detail:
            'Suas tarefas, listas e cronômetros estão 100% salvos. Deseja reiniciar o app agora para aplicar a atualização?',
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall(false, true);
          }
        });
    });

    autoUpdater.on('error', (err) => {
      console.error('AutoUpdater error:', err?.message || err);
    });

    // Check immediately on startup, every 2 minutes, and on window focus
    let lastCheckMs = Date.now();
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    setInterval(() => {
      lastCheckMs = Date.now();
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }, 2 * 60 * 1000);

    if (mainWindow) {
      mainWindow.on('focus', () => {
        if (Date.now() - lastCheckMs > 30 * 1000) {
          lastCheckMs = Date.now();
          autoUpdater.checkForUpdatesAndNotify().catch(() => {});
        }
      });
    }
  } catch (e) {
    console.error('Failed to initialize autoUpdater:', e);
  }
}

function createWindow() {
  const brandName = getLocalBrandName();
  const appVersion = app.getVersion();

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#07050d',
    title: `${brandName} — Routine & Kanban Board`,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090612',
      symbolColor: '#22d3ee',
      height: 36,
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      additionalArguments: [
        `--app-brand=${brandName}`,
        `--app-version=${appVersion}`,
      ],
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
