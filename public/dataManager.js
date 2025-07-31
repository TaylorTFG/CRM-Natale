const fs = require('fs');
const path = require('path');

/**
 * DataManager gestisce la persistenza dei dati su disco usando file JSON.
 * Le funzioni sono asincrone e ritornano un oggetto {success, data|error}.
 */
class DataManager {
  /**
   * Carica un insieme di record dal file corrispondente.  Se il file non
   * esiste viene restituito un array vuoto.  Per default i record
   * marcati con eliminato=true vengono filtrati via.
   *
   * @param {string} dataType      Tipo di dati (clienti/partner/settings/eliminati)
   * @param {string} dataFolderPath Percorso della cartella dati
   * @param {boolean} includeEliminati Includere record eliminati
   */
  async loadData(dataType, dataFolderPath, includeEliminati = false) {
    try {
      const filePath = path.join(dataFolderPath, `${dataType}.json`);
      if (!fs.existsSync(filePath)) {
        return { success: true, data: [] };
      }
      const raw = await fs.promises.readFile(filePath, 'utf8');
      if (!raw.trim()) {
        return { success: true, data: [] };
      }
      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [parsed];
      if (!includeEliminati && dataType !== 'eliminati') {
        parsed = parsed.filter((item) => !item.eliminato);
      }
      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva l'array di record su disco sovrascrivendo il file esistente.
   *
   * @param {string} dataType  Tipo di dati
   * @param {Array|Object} data  Dati da salvare
   */
  async saveData(dataType, data, dataFolderPath) {
    try {
      const filePath = path.join(dataFolderPath, `${dataType}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Segna un record come eliminato e lo aggiunge all'elenco degli eliminati.
   *
   * @param {string} dataType  Tipo di dati (clienti/partner)
   * @param {number|string} id Identificativo del record
   */
  async moveToEliminati(dataType, id, dataFolderPath) {
    try {
      const { success, data, error } = await this.loadData(dataType, dataFolderPath, true);
      if (!success) throw new Error(error);
      const index = data.findIndex((item) => item.id === id);
      if (index === -1) throw new Error(`Record con ID ${id} non trovato`);
      data[index].eliminato = true;
      data[index].eliminatoIl = Date.now();
      await this.saveData(dataType, data, dataFolderPath);
      const eliminatiResult = await this.loadData('eliminati', dataFolderPath, true);
      const eliminati = eliminatiResult.success ? eliminatiResult.data : [];
      eliminati.push(data[index]);
      await this.saveData('eliminati', eliminati, dataFolderPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ripristina un record precedentemente eliminato.
   *
   * @param {number|string} id Identificativo del record
   */
  async restoreFromEliminati(id, dataFolderPath) {
    try {
      const eliminatiResult = await this.loadData('eliminati', dataFolderPath, true);
      if (!eliminatiResult.success) throw new Error(eliminatiResult.error);
      const data = eliminatiResult.data;
      const index = data.findIndex((item) => item.id === id);
      if (index === -1) throw new Error(`Record con ID ${id} non trovato`);
      const record = { ...data[index] };
      data.splice(index, 1);
      await this.saveData('eliminati', data, dataFolderPath);
      record.eliminato = false;
      delete record.eliminatoIl;
      const dataType = record.tipo;
      const currentResult = await this.loadData(dataType, dataFolderPath, true);
      const currentData = currentResult.success ? currentResult.data : [];
      const existingIndex = currentData.findIndex((item) => item.id === id);
      if (existingIndex !== -1) {
        currentData[existingIndex] = record;
      } else {
        currentData.push(record);
      }
      await this.saveData(dataType, currentData, dataFolderPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Carica le impostazioni dell'applicazione.  Se non esistono o sono
   * incomplete, vengono restituite impostazioni di default.
   */
  async loadSettings(dataFolderPath) {
    try {
      const result = await this.loadData('settings', dataFolderPath, true);
      if (!result.success) throw new Error(result.error);
      let settingsData = result.data;
      if (Array.isArray(settingsData) && settingsData.length > 0) {
        settingsData = settingsData[0];
      }
      const defaults = {
        regaloCorrente: 'Grappa',
        annoCorrente: new Date().getFullYear(),
        consegnatari: ['Andrea Gosgnach', 'Marco Crasnich', 'Massimo Cendron', 'Matteo Rocchetto'],
        // Nomi dei regali. Il primo è il regalo principale, il secondo la categoria "extra/altro"
        // ed il terzo rappresenta l'assenza di regalo. Questi valori possono essere
        // personalizzati tramite la pagina Impostazioni.
        giftNames: ['Grappa', 'Extra/Altro', 'Nessuno'],
      };
      const normalized = {
        regaloCorrente: (settingsData && settingsData.regaloCorrente) || defaults.regaloCorrente,
        annoCorrente: (settingsData && settingsData.annoCorrente) || defaults.annoCorrente,
        consegnatari: Array.isArray(settingsData && settingsData.consegnatari)
          ? settingsData.consegnatari
          : defaults.consegnatari,
        giftNames: Array.isArray(settingsData && settingsData.giftNames) && (settingsData.giftNames.length === 3)
          ? settingsData.giftNames
          : defaults.giftNames,
      };
      return { success: true, data: normalized };
    } catch (error) {
      const defaults = {
        regaloCorrente: 'Grappa',
        annoCorrente: new Date().getFullYear(),
        consegnatari: ['Andrea Gosgnach', 'Marco Crasnich', 'Massimo Cendron', 'Matteo Rocchetto'],
      };
      return { success: true, data: defaults };
    }
  }

  /**
   * Salva le impostazioni normalizzando i campi e assicurandosi che i
   * campi mancanti vengano sostituiti con valori di default.
   */
  async saveSettings(settings, dataFolderPath) {
    try {
      const defaults = {
        regaloCorrente: 'Grappa',
        annoCorrente: new Date().getFullYear(),
        consegnatari: ['Andrea Gosgnach', 'Marco Crasnich', 'Massimo Cendron', 'Matteo Rocchetto'],
        giftNames: ['Grappa', 'Extra/Altro', 'Nessuno'],
      };
      const normalized = {
        regaloCorrente: settings && settings.regaloCorrente ? settings.regaloCorrente : defaults.regaloCorrente,
        annoCorrente: settings && settings.annoCorrente ? settings.annoCorrente : defaults.annoCorrente,
        consegnatari: Array.isArray(settings && settings.consegnatari) && settings.consegnatari.length > 0
          ? settings.consegnatari
          : defaults.consegnatari,
        giftNames: Array.isArray(settings && settings.giftNames) && settings.giftNames.length === 3
          ? settings.giftNames
          : defaults.giftNames,
      };
      const result = await this.saveData('settings', normalized, dataFolderPath);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DataManager();