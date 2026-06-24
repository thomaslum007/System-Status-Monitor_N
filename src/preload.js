const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  processFiles: (data) => ipcRenderer.invoke('process-files', data),
  onProgress: (callback) => ipcRenderer.on('process-progress', (event, value) => callback(value)),
  loadDb: (type) => ipcRenderer.invoke('load-db', type),
  saveDb: (type, data) => ipcRenderer.invoke('save-db', { type, data })
});
