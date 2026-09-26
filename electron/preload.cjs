const { contextBridge, ipcRenderer } = require('electron');

const runtimeApiBase = 'https://deluxe-tunes-api.onrender.com';

contextBridge.exposeInMainWorld('__DT_API_BASE__', runtimeApiBase);
contextBridge.exposeInMainWorld('__DT_OAUTH_BASE__', runtimeApiBase);
contextBridge.exposeInMainWorld('__DT_CONFIG__', {
  apiBaseUrl: runtimeApiBase,
  oauthBaseUrl: runtimeApiBase,
});

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});

contextBridge.exposeInMainWorld('DeluxeTunesDiscord', {
  setPresence: (payload) => ipcRenderer.invoke('discord-rpc-set-presence', payload),
  clearPresence: () => ipcRenderer.invoke('discord-rpc-clear-presence'),
});
