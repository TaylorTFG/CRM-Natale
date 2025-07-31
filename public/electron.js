const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

// Import modules that manage data and Excel I/O.  These are kept in the
// same folder for easier resolution.
const dataManager = require(path.join(__dirname, 'dataManager'));
const excelImporter = require(path.join(__dirname, 'excelimporter'));

// Keep a reference to the main window to avoid garbage collection.
let mainWindow;

// The application stores its JSON data in a `data` folder located
// alongside the application executable.  If it does not exist it is
// created on startup.
const exePath = app.getAppPath();
const dataFolderPath = path.join(path.dirname(exePath), 'data');
if (!fs.existsSync(dataFolderPath)) {
  fs.mkdirSync(dataFolderPath, { recursive: true });
}

/**
 * Create the main application window and load the React app.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  // Disable web security so local files can be loaded in production.
  mainWindow.webContents.session.webSecurity = false;

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(app.getAppPath(), 'build', 'index.html')}`;
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Application lifecycle: create the window when Electron is ready.
app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

/**
 * Handle a request from the renderer to load data for a given type.  If
 * includeEliminati is true records marked as deleted are returned as
 * well.
 */
ipcMain.handle('load-data', async (event, dataType, includeEliminati = false) => {
  try {
    return await dataManager.loadData(dataType, dataFolderPath, includeEliminati);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Save an array of records for a given data type.  The payload is an
 * object containing the type and the data to persist.
 */
ipcMain.handle('save-data', async (event, { dataType, data }) => {
  try {
    return await dataManager.saveData(dataType, data, dataFolderPath);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Load application settings.  Returns an object with defaults when none
 * exist.
 */
ipcMain.handle('load-settings', async () => {
  try {
    return await dataManager.loadSettings(dataFolderPath);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Persist application settings.
 */
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    return await dataManager.saveSettings(settings, dataFolderPath);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Mark a record as deleted and move it to the eliminati list.
 */
ipcMain.handle('move-to-eliminati', async (event, { dataType, id }) => {
  try {
    return await dataManager.moveToEliminati(dataType, id, dataFolderPath);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Restore a record previously marked as deleted.
 */
ipcMain.handle('restore-from-eliminati', async (event, { id }) => {
  try {
    return await dataManager.restoreFromEliminati(id, dataFolderPath);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Present a file dialog to import an Excel file and merge its contents
 * into the existing dataset.  Records are updated if they already
 * exist (match by nome and azienda) or appended otherwise.
 */
ipcMain.handle('import-excel', async (event, { dataType }) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Seleziona file Excel',
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0) {
      return { success: false, message: 'Importazione annullata' };
    }
    const filePath = filePaths[0];
    const result = await excelImporter.importFile(filePath, dataType);
    if (result.success && result.data && result.data.length > 0) {
      // Load current data (including deleted items) to merge.
      const currentResult = await dataManager.loadData(dataType, dataFolderPath, true);
      if (!currentResult.success) {
        return { success: false, message: currentResult.error };
      }
      let currentData = currentResult.data || [];
      // Exclude deleted records when merging.
      currentData = currentData.filter((item) => !item.eliminato);
      const updatedData = [...currentData];
      let newRecords = 0;
      let updatedRecords = 0;
      for (const importedItem of result.data) {
        const existingIndex = updatedData.findIndex(
          (item) =>
            item.nome && importedItem.nome &&
            item.azienda && importedItem.azienda &&
            item.nome.toLowerCase() === importedItem.nome.toLowerCase() &&
            item.azienda.toLowerCase() === importedItem.azienda.toLowerCase()
        );
        if (existingIndex !== -1) {
          const originalId = updatedData[existingIndex].id;
          const eliminato = updatedData[existingIndex].eliminato || false;
          updatedData[existingIndex] = {
            ...updatedData[existingIndex],
            ...importedItem,
            id: originalId,
            eliminato,
            lastUpdate: Date.now(),
          };
          updatedRecords++;
        } else {
          const newId = Date.now() + updatedData.length + newRecords;
          updatedData.push({
            ...importedItem,
            id: newId,
            eliminato: false,
            createdAt: Date.now(),
          });
          newRecords++;
        }
      }
      const saveResult = await dataManager.saveData(dataType, updatedData, dataFolderPath);
      if (!saveResult.success) {
        return { success: false, message: saveResult.error };
      }
      return {
        success: true,
        message: `Importazione completata: ${newRecords} nuovi record, ${updatedRecords} record aggiornati`,
        data: updatedData.filter((item) => !item.eliminato),
      };
    }
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/**
 * Export all records marked for GLS shipment into an Excel file.  The
 * user is prompted to choose the destination path.  Only records with
 * the `gls` field truthy are exported.
 */
ipcMain.handle('export-gls', async () => {
  try {
    const clientiResult = await dataManager.loadData('clienti', dataFolderPath);
    const partnerResult = await dataManager.loadData('partner', dataFolderPath);
    if (!clientiResult.success) throw new Error(clientiResult.error);
    if (!partnerResult.success) throw new Error(partnerResult.error);
    const allData = [...clientiResult.data, ...partnerResult.data];
    const glsData = allData.filter(
      (record) => record.gls && (record.gls === '1' || record.gls === 1 || record.gls === true)
    );
    if (glsData.length === 0) {
      return { success: false, message: 'Nessun record da esportare per GLS' };
    }
    const excelBuffer = excelImporter.exportGLS(glsData);
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salva file Excel per GLS',
      defaultPath: path.join(app.getPath('documents'), 'Spedizioni_GLS.xlsx'),
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) {
      return { success: false, message: 'Esportazione annullata' };
    }
    await fs.promises.writeFile(filePath, excelBuffer);
    return {
      success: true,
      message: `Esportazione completata con successo: ${glsData.length} record`,
      filePath,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/**
 * Update multiple records setting a specific property to the same value.
 */
ipcMain.handle('update-bulk', async (event, { dataType, ids, propertyName, propertyValue }) => {
  try {
    const result = await dataManager.loadData(dataType, dataFolderPath, true);
    if (!result.success) throw new Error(result.error);
    const updatedData = result.data.map((item) => {
      if (ids.includes(item.id)) {
        return { ...item, [propertyName]: propertyValue, lastUpdate: Date.now() };
      }
      return item;
    });
    const saveResult = await dataManager.saveData(dataType, updatedData, dataFolderPath);
    if (!saveResult.success) throw new Error(saveResult.error);
    return {
      success: true,
      message: `Aggiornamento completato con successo: ${ids.length} record`,
      data: updatedData.filter((item) => !item.eliminato),
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});