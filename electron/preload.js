const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (fileName, data) => ipcRenderer.invoke('save-data', { fileName, data }),
  loadData: (fileName) => ipcRenderer.invoke('load-data', { fileName }),
  exportData: (defaultPath, data) => ipcRenderer.invoke('export-data', { defaultPath, data }),
  importData: () => ipcRenderer.invoke('import-data')
});
