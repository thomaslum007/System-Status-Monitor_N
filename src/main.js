const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { handleFileProcessing } = require('./main/processor');
const { loadDatabase, saveDatabase } = require('./main/database');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp', 'gif', 'docx', 'xlsx'] }
    ]
  });
  return result.filePaths;
});

ipcMain.handle('process-files', async (event, data) => {
  return await handleFileProcessing(data, (progress) => {
    mainWindow.webContents.send('process-progress', progress);
  });
});

ipcMain.handle('load-db', async (event, type) => {
  return await loadDatabase(type);
});

ipcMain.handle('save-db', async (event, { type, data }) => {
  return await saveDatabase(type, data);
});
