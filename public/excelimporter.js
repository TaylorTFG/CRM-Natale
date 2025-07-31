const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Classe per la gestione dell'importazione da Excel e dell'esportazione
 * in formato compatibile con GLS. Questa versione elimina quasi tutti
 * i log di debug per ridurre la verbosità in console e rendere
 * l'applicazione più leggera, mantenendo comunque la gestione degli
 * errori tramite console.error.
 */
class ExcelImporter {
  /**
   * Importa dati da un file Excel.
   * @param {string} filePath - Percorso del file Excel.
   * @param {string} dataType - Tipo di dati da importare ("clienti" o "partner").
   * @returns {Promise<Object>} - Oggetto con proprietà success (boolean), message (string) e data (array di record).
   */
  async importFile(filePath, dataType) {
    try {
      // Leggi il file Excel con le opzioni necessarie
      const workbook = XLSX.readFile(filePath, {
        cellDates: true,
        dateNF: 'yyyy-mm-dd',
        cellStyles: true,
        cellNF: true,
        type: 'binary',
        raw: false
      });

      // Determina da quale foglio importare in base al dataType
      const sheetName = this.determineSheetName(workbook, dataType);
      const worksheet = workbook.Sheets[sheetName];

      // Prima conversione usando le intestazioni rilevate
      let jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
        blankrows: false
      });

      // Se il formato non contiene intestazioni valide, prova altre strategie
      if (!jsonData.length || Object.keys(jsonData[0]).length <= 1) {
        // Conversione senza intestazioni (usa lettere come intestazioni)
        jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
          blankrows: false,
          header: 'A'
        });
        // Se ancora fallisce, prova con intestazioni esplicite
        if (!jsonData.length || Object.keys(jsonData[0]).length <= 1) {
          const explicitHeaders = this.createExplicitHeaders();
          jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false,
            blankrows: false,
            header: explicitHeaders
          });
        }
      }

      // Normalizza ogni riga e assegna un ID univoco se assente
      const normalizedData = jsonData.map((row, index) => {
        const normalizedRow = this.normalizeRowData(row, dataType);
        if (!normalizedRow.id) {
          normalizedRow.id = Date.now() + index;
        }
        return normalizedRow;
      });

      // Filtra i dati validi: richiede almeno il nome o l'azienda e almeno 3 campi non vuoti
      const validData = normalizedData.filter(row => {
        const nonEmptyFields = Object.values(row).filter(val =>
          val !== undefined && val !== null && val !== ''
        ).length;
        return (row.nome || row.azienda) && nonEmptyFields >= 3;
      });

      return {
        success: true,
        message: `Importazione completata con successo: ${validData.length} record validi su ${normalizedData.length} totali`,
        data: validData
      };
    } catch (error) {
      console.error('Errore durante l\'importazione Excel:', error);
      return {
        success: false,
        message: `Errore durante l'importazione: ${error.message}`
      };
    }
  }

  /**
   * Determina quale foglio usare in base al tipo di dati.
   * @param {Object} workbook - Workbook Excel.
   * @param {string} dataType - Tipo di dati (clienti/partner).
   * @returns {string} - Nome del foglio da usare.
   */
  determineSheetName(workbook, dataType) {
    const sheetNames = workbook.SheetNames;
    const possibleNames = [
      dataType.charAt(0).toUpperCase() + dataType.slice(1),
      dataType,
      dataType + 'i',
      dataType.charAt(0).toUpperCase() + dataType.slice(1, -1) + 'i'
    ];
    for (const name of possibleNames) {
      if (sheetNames.includes(name)) {
        return name;
      }
    }
    for (const sheetName of sheetNames) {
      if (sheetName.toLowerCase().includes(dataType.toLowerCase())) {
        return sheetName;
      }
    }
    return sheetNames[0];
  }

  /**
   * Crea un array di intestazioni esplicite per il foglio.
   * @returns {Array} - Array di intestazioni standardizzate.
   */
  createExplicitHeaders() {
    return [
      'nome', 'azienda', 'indirizzo', 'civico', 'cap', 'localita',
      'provincia', 'telefono', 'email', 'note', 'grappa',
      'extraAltro', 'consegnaSpedizione', 'gls'
    ];
  }

  /**
   * Normalizza i dati di una riga proveniente da Excel.
   * Converte le chiavi in nomi standard e i valori in formati coerenti.
   * @param {Object} row - Riga di dati da normalizzare.
   * @param {string} dataType - Tipo di dati (clienti/partner).
   * @returns {Object} - Dati normalizzati.
   */
  normalizeRowData(row, dataType) {
    const normalizedRow = {
      tipo: dataType,
      eliminato: false,
      createdAt: Date.now()
    };

    // Mappatura dei nomi di colonna a nomi standard
    const keyMapping = {
      nome: ['nome', 'nome persona', 'nominativo', 'nome_persona', 'nome cliente', 'nome e cognome', 'persona', 'referente', 'nome referente', 'cliente'],
      azienda: ['azienda', 'nome azienda', 'società', 'ragione sociale', 'company', 'ditta', 'società cliente', 'societa', 'nome societa', 'società'],
      indirizzo: ['indirizzo', 'via', 'strada', 'address', 'via/piazza', 'indirizzo stradale', 'via piazza', 'indirizzo spedizione'],
      civico: ['civico', 'numero civico', 'n. civico', 'n.civico', 'n°', 'numero', 'numero indirizzo', 'n. civico', 'num', 'num.'],
      cap: ['cap', 'codice postale', 'postal code', 'zip', 'codice avviamento postale', 'c.a.p.', 'c.a.p'],
      localita: ['localita', 'località', 'comune', 'città', 'city', 'paese', 'town', 'citta', 'loc', 'loc.'],
      provincia: ['provincia', 'prov', 'province', 'pr', 'pr.', 'sigla provincia', 'prov.', 'provincia sigla'],
      telefono: ['telefono', 'tel', 'phone', 'cellulare', 'tel.', 'numero telefono', 'cell', 'numero cellulare', 'tel/cell', 'cell.'],
      email: ['email', 'e-mail', 'mail', 'posta elettronica', 'indirizzo email', 'e mail', 'posta'],
      note: ['note', 'annotazioni', 'commenti', 'notes', 'note aggiuntive', 'note cliente', 'commento'],
      tipologia: ['tipologia', 'tipo partner', 'categoria', 'tipo cliente', 'tipo', 'category', 'gruppo'],
      grappa: ['grappa', 'regalo grappa', 'omaggio grappa', 'regalo', 'gift', 'presente', 'omaggio', 'dono'],
      extraAltro: ['extra/altro', 'extra', 'altro regalo', 'altro omaggio', 'extra regalo', 'regalo extra', 'altro', 'altri regali', 'extra/altri'],
      consegnaSpedizione: ['consegna/spedizione', 'consegna', 'consegna a mano', 'incaricato consegna', 'consegnatario', 'deliverer', 'spedizione', 'incaricato', 'consegna spedizione'],
      gls: ['gls', 'spedizione gls', 'corriere', 'spedizione', 'shipping', 'courier', 'corriere gls']
    };

    // Se la riga contiene colonne generiche A, B, C... mappa in base all'ordine tipico dei file importati
    const hasGenericColumns = Object.keys(row).some(key => /^[A-Z]{1,2}$/.test(key));
    if (hasGenericColumns) {
      const columnOrder = ['nome', 'azienda', 'indirizzo', 'civico', 'cap', 'localita', 'provincia', 'telefono', 'email', 'note', 'grappa', 'extraAltro', 'consegnaSpedizione', 'gls'];
      let colIndex = 0;
      for (const key of Object.keys(row).sort()) {
        if (/^[A-Z]{1,2}$/.test(key) && colIndex < columnOrder.length) {
          const value = row[key];
          if (value !== undefined && value !== null && value !== '') {
            normalizedRow[columnOrder[colIndex]] = this.normalizeValue(columnOrder[colIndex], value);
          }
          colIndex++;
        }
      }
      // Se non è presente la colonna civico ma l'indirizzo contiene un numero civico
      if (normalizedRow.indirizzo && (!normalizedRow.civico || normalizedRow.civico === '')) {
        const raw = normalizedRow.indirizzo.toString().trim();
        // Cerca un numero civico alla fine dell'indirizzo, separato da spazio o virgola
        const match = raw.match(/^(.*?)[,\s]+(\d[^,]*)$/);
        if (match) {
          normalizedRow.indirizzo = match[1].trim();
          normalizedRow.civico = match[2].trim();
        }
      }
      return normalizedRow;
    }

    // Analizza ogni campo della riga e mappa il nome se possibile
    for (const originalKey in row) {
      if (Object.prototype.hasOwnProperty.call(row, originalKey)) {
        const value = row[originalKey];
        if (value === '' || value === null || value === undefined) {
          continue;
        }
        // Normalizza la chiave rimuovendo caratteri speciali e spazi multipli
        const normalizedKey = String(originalKey).toLowerCase()
          .trim()
          .replace(/[\/\-_.]/g, ' ')
          .replace(/\s+/g, ' ');
        let mappedKey = null;
        // Cerca corrispondenza esatta
        for (const key in keyMapping) {
          if (keyMapping[key].includes(normalizedKey)) {
            mappedKey = key;
            break;
          }
        }
        // Se non c'è corrispondenza esatta, cerca corrispondenze parziali
        if (!mappedKey) {
          for (const key in keyMapping) {
            for (const possibleKey of keyMapping[key]) {
              if (normalizedKey.includes(possibleKey) || possibleKey.includes(normalizedKey)) {
                mappedKey = key;
                break;
              }
            }
            if (mappedKey) break;
          }
        }
        const finalKey = mappedKey || normalizedKey.replace(/\s+/g, '_');
        normalizedRow[finalKey] = this.normalizeValue(finalKey, value);
      }
    }
    // Se non è stato specificato il civico ma l'indirizzo contiene un numero civico
    if (normalizedRow.indirizzo && (!normalizedRow.civico || normalizedRow.civico === '')) {
      const raw = normalizedRow.indirizzo.toString().trim();
      const match = raw.match(/^(.*?)[,\s]+(\d[^,]*)$/);
      if (match) {
        normalizedRow.indirizzo = match[1].trim();
        normalizedRow.civico = match[2].trim();
      }
    }
    return normalizedRow;
  }

  /**
   * Normalizza un valore in base al tipo di campo.
   * Alcuni campi (grappa, gls) sono trattati come booleani; le date
   * vengono convertite in stringa ISO.
   * @param {string} fieldName - Nome del campo standardizzato.
   * @param {*} value - Valore da normalizzare.
   * @returns {*} - Valore normalizzato.
   */
  normalizeValue(fieldName, value) {
    // Campi booleani: "1" se vero, stringa vuota altrimenti
    if (fieldName === 'grappa' || fieldName === 'gls') {
      return this.normalizeBoolean(value) ? '1' : '';
    }
    // Date convertite in ISO string
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Tutti gli altri campi convertiti in stringa trimmed
    return String(value).trim();
  }

  /**
   * Normalizza i valori booleani provenienti da diversi formati.
   * @param {*} value - Valore da interpretare come booleano.
   * @returns {boolean} - Valore booleano normalizzato.
   */
  normalizeBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      const lowercaseValue = value.toLowerCase().trim();
      return lowercaseValue === '1' ||
             lowercaseValue === 'true' ||
             lowercaseValue === 'yes' ||
             lowercaseValue === 'sì' ||
             lowercaseValue === 'si' ||
             lowercaseValue === 'vero' ||
             lowercaseValue === 'x' ||
             lowercaseValue === '✓' ||
             lowercaseValue === '✔' ||
             lowercaseValue === '√';
    }
    return false;
  }

  /**
   * Esporta dati in formato compatibile con la spedizione GLS.
   * Filtra i record con campo gls impostato e produce un file Excel
   * con colonne nel formato richiesto.
   * @param {Array} data - Array di clienti/partner.
   * @returns {Buffer} - File Excel in memoria.
   */
  exportGLS(data) {
    try {
      // Filtra solo i record con GLS impostato
      const glsRecords = data.filter(record =>
        record.gls && (record.gls === '1' || record.gls === 1 || record.gls === true)
      );
      if (glsRecords.length === 0) {
        throw new Error('Nessun record da esportare per GLS');
      }
      // Converte i record in formato richiesto
      const formattedData = glsRecords.map(record => {
        const nomeDestinatario = record.azienda && record.azienda.trim() !== ''
          ? record.azienda
          : record.nome;
        const indirizzo = `${record.indirizzo || ''} ${record.civico || ''}`.trim();
        return {
          'NOME DESTINATARIO': nomeDestinatario || '',
          'INDIRIZZO': indirizzo || '',
          'LOCALITA\'': record.localita || '',
          'PROV': record.provincia || '',
          'CAP': record.cap || '',
          'TIPO MERCE': 'OMAGGIO NATALIZIO',
          'COLLI': '1',
          'NOTE SPEDIZIONE': record.note || '',
          'RIFERIMENTO MITTENTE': record.nome || '',
          'TELEFONO': record.telefono || ''
        };
      });
      // Crea un nuovo workbook e worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      // Imposta larghezza delle colonne per migliorare la leggibilità
      const colWidths = [
        { wch: 30 }, // NOME DESTINATARIO
        { wch: 40 }, // INDIRIZZO
        { wch: 20 }, // LOCALITA
        { wch: 5 },  // PROV
        { wch: 10 }, // CAP
        { wch: 20 }, // TIPO MERCE
        { wch: 5 },  // COLLI
        { wch: 30 }, // NOTE SPEDIZIONE
        { wch: 25 }, // RIFERIMENTO MITTENTE
        { wch: 15 }  // TELEFONO
      ];
      worksheet['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Spedizioni GLS');
      // Esporta il workbook come buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return excelBuffer;
    } catch (error) {
      console.error('Errore durante l\'esportazione GLS:', error);
      throw error;
    }
  }
}

module.exports = new ExcelImporter();