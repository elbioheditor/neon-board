const { contextBridge } = require('electron');

const brandArg = process.argv.find((a) => a.startsWith('--app-brand='));
const versionArg = process.argv.find((a) => a.startsWith('--app-version='));

const brandName = brandArg ? brandArg.replace('--app-brand=', '') : 'NEON';
const version = versionArg ? versionArg.replace('--app-version=', '') : '1.2.6';

contextBridge.exposeInMainWorld('neonDesktop', {
  isElectron: true,
  platform: process.platform,
  brandName,
  version,
});
