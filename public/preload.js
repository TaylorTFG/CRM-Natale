const { contextBridge, ipcRenderer } = require('electron');

// Espone API sicure al processo di rendering.
// Questo file è caricato nel contesto isolato di Electron e non ha accesso
// diretto alle API di Node.js. Le funzioni qui esposte interagiscono con
// l'evento IPC nel main process per caricare o salvare dati, importare
// file Excel ed eseguire altre azioni. Rimuovendo le chiamate a
// console.log si riduce il rumore in console e si rende l'applicazione più
// leggera.
contextBridge.exposeInMainWorld('api', {
  // Carica dati per il tipo specificato (clienti, partner, eliminati)
  loadData: (dataType, includeEliminati = false) =>
    ipcRenderer.invoke('load-data', dataType, includeEliminati),

  // Salva i dati per il tipo specificato
  saveData: (dataType, data) =>
    ipcRenderer.invoke('save-data', { dataType, data }),

  // Importa dati da un file Excel selezionato dall'utente
  importExcel: (dataType) =>
    ipcRenderer.invoke('import-excel', { dataType }),

  // Esporta i dati in un formato Excel per le spedizioni GLS
  exportGLS: () =>
    ipcRenderer.invoke('export-gls'),

  // Carica le impostazioni dell'applicazione (regalo, anno, consegnatari)
  loadSettings: () =>
    ipcRenderer.invoke('load-settings'),

  // Salva le impostazioni modificate
  saveSettings: (settings) =>
    ipcRenderer.invoke('save-settings', settings),

  // Sposta un record negli eliminati (soft delete)
  moveToEliminati: (dataType, id) =>
    ipcRenderer.invoke('move-to-eliminati', { dataType, id }),

  // Ripristina un record precedentemente eliminato
  restoreFromEliminati: (id) =>
    ipcRenderer.invoke('restore-from-eliminati', { id }),

  // Aggiornamento di gruppo di una proprietà su più record
  updateBulk: (dataType, ids, propertyName, propertyValue) =>
    ipcRenderer.invoke('update-bulk', { dataType, ids, propertyName, propertyValue })
});