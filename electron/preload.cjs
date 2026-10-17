const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('neonDesktop', {
  isElectron: true,
  platform: process.platform,
});
