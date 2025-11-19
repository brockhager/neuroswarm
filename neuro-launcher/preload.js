const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('neuroswarm', {
    // Future: Add IPC methods for status updates
});
