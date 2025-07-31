import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortableTableCell from '../components/SortableTableCell';

/**
 * Pagina per la gestione dei clienti.
 *
 * Questa versione semplifica notevolmente la gestione rispetto
 * all'implementazione originale: fornisce una ricerca di base, un
 * ordinamento per colonna, funzionalità di inserimento/modifica con
 * dialog e la possibilità di eliminare (soft delete) un record. Sono
 * previsti anche i pulsanti per importare da Excel e per esportare i
 * record marcati per GLS. Tutti i log inutili sono stati rimossi.
 */
const ClientiPage = () => {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deliverers, setDeliverers] = useState([]);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('nome');
  // Gestione selezione multipla
  const [selected, setSelected] = useState([]);
  // Gestione dialog di aggiornamento massivo
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    consegna: '',
    regalo: '',
    gls: ''
  });
  // Gestione nomi dei regali dal settings
  const [giftNames, setGiftNames] = useState(['Grappa', 'Extra/Altro', 'Nessuno']);
  // Gestione colonne per la tabella: permettono di riordinare e nascondere campi
  const initialColumns = [
    { id: 'select', label: '', sortable: false, visible: true },
    { id: 'nome', label: 'Nome', field: 'nome', sortable: true, visible: true },
    { id: 'azienda', label: 'Azienda', field: 'azienda', sortable: true, visible: true },
    { id: 'localita', label: 'Città', field: 'localita', sortable: true, visible: true },
    { id: 'indirizzo', label: 'Indirizzo', sortable: false, visible: true },
    { id: 'civico', label: 'Civico', sortable: false, visible: true },
    { id: 'consegna', label: 'Consegna', sortable: false, visible: true },
    { id: 'regalo', label: 'Regalo', sortable: false, visible: true },
    { id: 'gls', label: 'GLS', sortable: false, visible: true },
    { id: 'azioni', label: 'Azioni', sortable: false, visible: true },
  ];
  const [columns, setColumns] = useState(initialColumns);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [tempColumns, setTempColumns] = useState([]);

  // Carica configurazioni colonne salvate da localStorage all'avvio
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clientiColumns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
        }
      }
    } catch (err) {
      // se parsing fallisce, ignora e usa le colonne di default
    }
  }, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    azienda: '',
    indirizzo: '',
    civico: '',
    cap: '',
    localita: '',
    provincia: '',
    telefono: '',
    email: '',
    note: '',
    grappa: false,
    extraAltro: false,
    gls: false,
    consegnaSpedizione: '',
    tipologia: ''
  });

  // Carica i dati e le impostazioni all'avvio
  useEffect(() => {
    const load = async () => {
      const [clientiRes, settingsRes] = await Promise.all([
        window.api.loadData('clienti'),
        window.api.loadSettings()
      ]);
      if (clientiRes && clientiRes.success) {
        setClienti(clientiRes.data);
      }
      if (settingsRes && settingsRes.success) {
        const c = settingsRes.data.consegnatari || [];
        setDeliverers(Array.isArray(c) ? c : []);
        const gifts = Array.isArray(settingsRes.data.giftNames) && settingsRes.data.giftNames.length === 3
          ? settingsRes.data.giftNames
          : ['Grappa', 'Extra/Altro', 'Nessuno'];
        setGiftNames(gifts);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Gestione ordinamento colonne
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Ricerca e ordinamento combinati
  const filteredClienti = useMemo(() => {
    let data = clienti;
    if (search) {
      const s = search.toLowerCase();
      data = data.filter((c) => {
        const name = c.nome ? c.nome.toLowerCase() : '';
        const surname = c.cognome ? c.cognome.toLowerCase() : '';
        const company = c.azienda ? c.azienda.toLowerCase() : '';
        const city = c.localita ? c.localita.toLowerCase() : '';
        return (
          (name && name.includes(s)) ||
          (surname && surname.includes(s)) ||
          (company && company.includes(s)) ||
          (city && city.includes(s))
        );
      });
    }
    return data
      .slice()
      .sort((a, b) => {
        const aVal = (a[orderBy] || '').toString().toLowerCase();
        const bVal = (b[orderBy] || '').toString().toLowerCase();
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });
  }, [clienti, search, order, orderBy]);

  // Controlla se una riga è selezionata
  const isSelected = (id) => selected.indexOf(id) !== -1;

  // Gestisce la selezione/deselezione di tutte le righe
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = filteredClienti.map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  // Gestisce la selezione di una singola riga
  const handleSelectRow = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else {
      newSelected = selected.filter((sid) => sid !== id);
    }
    setSelected(newSelected);
  };

  // Apertura del dialogo di configurazione colonne. Vengono escluse le colonne di selezione e di azioni.
  const openColumnDialogFn = () => {
    // Filtra le colonne personalizzabili (tutte tranne select e azioni)
    const editable = columns.filter((col) => col.id !== 'select' && col.id !== 'azioni');
    setTempColumns(editable.map((c) => ({ ...c })));
    setColumnDialogOpen(true);
  };
  const closeColumnDialog = () => {
    setColumnDialogOpen(false);
  };
  const moveColumnUp = (index) => {
    if (index <= 0) return;
    setTempColumns((prev) => {
      const arr = [...prev];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };
  const moveColumnDown = (index) => {
    setTempColumns((prev) => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };
  const toggleColumnVisible = (index) => {
    setTempColumns((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], visible: !arr[index].visible };
      return arr;
    });
  };
  const saveColumnSettings = () => {
    // Ricostruisci l'array delle colonne, mantenendo select e azioni
    const newColumns = [];
    columns.forEach((col) => {
      if (col.id === 'select') newColumns.push(col);
    });
    tempColumns.forEach((col) => {
      newColumns.push(col);
    });
    columns.forEach((col) => {
      if (col.id === 'azioni') newColumns.push(col);
    });
    setColumns(newColumns);
    // Salva configurazione colonne su localStorage
    try {
      localStorage.setItem('clientiColumns', JSON.stringify(newColumns));
    } catch (err) {
      // storage potrebbe non essere disponibile
    }
    setColumnDialogOpen(false);
  };

  // Gestione cambiamento dei campi del bulk dialog
  const handleBulkChange = (field) => (event) => {
    setBulkForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const openBulkDialog = () => {
    setBulkForm({ consegna: '', regalo: '', gls: '' });
    setBulkDialogOpen(true);
  };

  const closeBulkDialog = () => {
    setBulkDialogOpen(false);
  };

  // Salva le modifiche massime sui record selezionati
  const handleBulkSave = async () => {
    const { consegna, regalo, gls: glsVal } = bulkForm;
    let updatedList = clienti.map((c) => {
      if (!selected.includes(c.id)) return c;
      const updated = { ...c };
      // Aggiorna consegna
      if (consegna !== '') {
        updated.consegnaSpedizione = consegna;
        // Se assegniamo una consegna interna, togli GLS
        updated.gls = false;
      }
      // Aggiorna regalo
      if (regalo !== '') {
        if (regalo === 'grappa') {
          updated.grappa = true;
          updated.extraAltro = false;
        } else if (regalo === 'extra') {
          updated.grappa = false;
          updated.extraAltro = true;
        } else if (regalo === 'nessuno') {
          updated.grappa = false;
          updated.extraAltro = false;
        }
      }
      // Aggiorna GLS
      if (glsVal !== '') {
        if (glsVal === 'true') {
          updated.gls = true;
          // quando GLS è attivo, rimuoviamo consegna interna
          updated.consegnaSpedizione = '';
        } else if (glsVal === 'false') {
          updated.gls = false;
        }
      }
      return updated;
    });
    setClienti(updatedList);
    await window.api.saveData('clienti', updatedList);
    setBulkDialogOpen(false);
    setSelected([]);
  };

  // Gestisce l'apertura del dialog per nuovo record
  const handleAddClick = () => {
    setEditingClient(null);
    setFormData({
      nome: '',
      azienda: '',
      indirizzo: '',
      civico: '',
      cap: '',
      localita: '',
      provincia: '',
      telefono: '',
      email: '',
      note: '',
      grappa: false,
      extraAltro: false,
      gls: false,
      consegnaSpedizione: '',
      tipologia: ''
    });
    setDialogOpen(true);
  };

  // Gestisce l'apertura del dialog per modifica
  const handleEditClick = (client) => {
    setEditingClient(client);
    setFormData({
      nome: client.nome || '',
      azienda: client.azienda || '',
      indirizzo: client.indirizzo || '',
      civico: client.civico || '',
      cap: client.cap || '',
      localita: client.localita || '',
      provincia: client.provincia || '',
      telefono: client.telefono || '',
      email: client.email || '',
      note: client.note || '',
      grappa: client.grappa === true || client.grappa === '1',
      extraAltro: client.extraAltro === true || client.extraAltro === '1',
      gls: client.gls === true || client.gls === '1',
      consegnaSpedizione: client.consegnaSpedizione || '',
      tipologia: client.tipologia || ''
    });
    setDialogOpen(true);
  };

  // Elimina un record spostandolo negli eliminati
  const handleDeleteClick = async (client) => {
    await window.api.moveToEliminati('clienti', client.id);
    setClienti(clienti.filter((c) => c.id !== client.id));
  };

  // Gestisce il salvataggio del dialog
  const handleDialogSave = async () => {
    let updatedList;
    if (editingClient) {
      // Modifica esistente
      updatedList = clienti.map((c) =>
        c.id === editingClient.id
          ? {
              ...c,
              ...formData,
              id: editingClient.id,
              grappa: formData.grappa,
              extraAltro: formData.extraAltro,
              gls: formData.gls,
              lastUpdate: Date.now()
            }
          : c
      );
    } else {
      // Aggiunta nuovo record
      const newRecord = {
        ...formData,
        id: Date.now(),
        tipo: 'clienti',
        eliminato: false,
        createdAt: Date.now()
      };
      updatedList = [...clienti, newRecord];
    }
    // Verifica che se non si spedisce con GLS ci sia un consegnatario
    if (!(formData.gls === true || formData.gls === '1') && (!formData.consegnaSpedizione || formData.consegnaSpedizione === '')) {
      alert('È necessario selezionare un consegnatario per le consegne interne');
      return;
    }
    setClienti(updatedList);
    await window.api.saveData('clienti', updatedList);
    setDialogOpen(false);
  };

  // Importa dati da Excel
  const handleImport = async () => {
    const result = await window.api.importExcel('clienti');
    if (result && result.success && result.data) {
      // Sostituisci la lista attuale con quella restituita
      setClienti(result.data);
    }
  };

  // Esporta dati per GLS
  const handleExportGLS = async () => {
    await window.api.exportGLS();
  };

  // Aggiorna il form al cambiamento dei valori
  const handleChange = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Clienti
      </Typography>
      <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
        <TextField
          label="Cerca per nome, cognome o azienda"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mr: 2, width: '40%', mb: { xs: 1, sm: 0 } }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
          sx={{ mr: 1, mb: { xs: 1, sm: 0 } }}
        >
          Nuovo
        </Button>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={handleImport}
          sx={{ mr: 1, mb: { xs: 1, sm: 0 } }}
        >
          Importa
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportGLS}
          sx={{ mr: 1, mb: { xs: 1, sm: 0 } }}
        >
          Esporta GLS
        </Button>
        <Button
          variant="outlined"
          onClick={openBulkDialog}
          disabled={selected.length === 0}
          sx={{ mb: { xs: 1, sm: 0 } }}
        >
          Modifica selezionati
        </Button>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<ViewColumnIcon />}
          onClick={openColumnDialogFn}
          sx={{ mb: { xs: 1, sm: 0 } }}
        >
          Colonne
        </Button>
      </Box>
      {loading ? (
        <Typography>Caricamento in corso...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.filter((col) => col.visible).map((col) => {
                  if (col.id === 'select') {
                    return (
                      <TableCell key={col.id} padding="checkbox">
                        <Checkbox
                          indeterminate={selected.length > 0 && selected.length < filteredClienti.length}
                          checked={filteredClienti.length > 0 && selected.length === filteredClienti.length}
                          onChange={handleSelectAllClick}
                          inputProps={{ 'aria-label': 'seleziona tutti i clienti' }}
                        />
                      </TableCell>
                    );
                  }
                  if (col.sortable && col.field) {
                    return (
                      <SortableTableCell
                        key={col.id}
                        label={col.label}
                        field={col.field}
                        orderBy={orderBy}
                        orderDirection={order}
                        onRequestSort={(e, property) => handleRequestSort(property)}
                      />
                    );
                  }
                  // Colonna Azioni allineata a destra
                  if (col.id === 'azioni') {
                    return (
                      <TableCell key={col.id} align="right">
                        {col.label}
                      </TableCell>
                    );
                  }
                  return <TableCell key={col.id}>{col.label}</TableCell>;
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClienti.map((client) => {
                const isItemSelected = isSelected(client.id);
                return (
                  <TableRow key={client.id} hover selected={isItemSelected}>
                    {columns.filter((col) => col.visible).map((col) => {
                      switch (col.id) {
                        case 'select':
                          return (
                            <TableCell key={col.id} padding="checkbox">
                              <Checkbox
                                checked={isItemSelected}
                                onChange={(event) => handleSelectRow(event, client.id)}
                              />
                            </TableCell>
                          );
                        case 'nome':
                          return <TableCell key={col.id}>{client.nome}</TableCell>;
                        case 'azienda':
                          return <TableCell key={col.id}>{client.azienda}</TableCell>;
                        case 'localita':
                          return <TableCell key={col.id}>{client.localita}</TableCell>;
                        case 'indirizzo':
                          return <TableCell key={col.id}>{`${client.indirizzo || ''}`.trim()}</TableCell>;
                        case 'civico':
                          return <TableCell key={col.id}>{client.civico || ''}</TableCell>;
                        case 'consegna':
                          return (
                            <TableCell key={col.id}>
                              {client.gls && (client.gls === true || client.gls === '1' || client.gls === 1)
                                ? 'GLS'
                                : client.consegnaSpedizione || ''}
                            </TableCell>
                          );
                        case 'regalo':
                          return (
                            <TableCell key={col.id}>
                              {client.grappa
                                ? giftNames[0]
                                : client.extraAltro
                                ? giftNames[1]
                                : giftNames[2]}
                            </TableCell>
                          );
                        case 'gls':
                          return <TableCell key={col.id}>{client.gls ? 'Sì' : 'No'}</TableCell>;
                        case 'azioni':
                          return (
                            <TableCell key={col.id} align="right">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditClick(client)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteClick(client)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Dialog per aggiungere o modificare un cliente */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <TextField
              label="Nome"
              value={formData.nome}
              onChange={handleChange('nome')}
              fullWidth
            />
            <TextField
              label="Azienda"
              value={formData.azienda}
              onChange={handleChange('azienda')}
              fullWidth
            />
            <TextField
              label="Indirizzo"
              value={formData.indirizzo}
              onChange={handleChange('indirizzo')}
              fullWidth
            />
            <TextField
              label="Civico"
              value={formData.civico}
              onChange={handleChange('civico')}
              fullWidth
            />
            <TextField
              label="CAP"
              value={formData.cap}
              onChange={handleChange('cap')}
              fullWidth
            />
            <TextField
              label="Località"
              value={formData.localita}
              onChange={handleChange('localita')}
              fullWidth
            />
            <TextField
              label="Provincia"
              value={formData.provincia}
              onChange={handleChange('provincia')}
              fullWidth
            />
            <TextField
              label="Telefono"
              value={formData.telefono}
              onChange={handleChange('telefono')}
              fullWidth
            />
            <TextField
              label="Email"
              value={formData.email}
              onChange={handleChange('email')}
              fullWidth
            />
            <TextField
              label="Note"
              value={formData.note}
              onChange={handleChange('note')}
              fullWidth
            />
            <TextField
              label="Consegnatario / Spedizione"
              value={formData.consegnaSpedizione}
              onChange={handleChange('consegnaSpedizione')}
              fullWidth
            />
            <TextField
              label="Tipologia"
              value={formData.tipologia}
              onChange={handleChange('tipologia')}
              fullWidth
            />
            {/* Selezione del consegnatario */}
            <FormControl fullWidth>
              <InputLabel id="consegnatario-label">Consegnatario</InputLabel>
              <Select
                labelId="consegnatario-label"
                value={formData.consegnaSpedizione}
                label="Consegnatario"
                onChange={handleChange('consegnaSpedizione')}
              >
                {deliverers.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.grappa}
                  onChange={handleChange('grappa')}
                />
              }
              label={`Regalo ${giftNames[0]}`}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.extraAltro}
                  onChange={handleChange('extraAltro')}
                />
              }
              label={giftNames[1]}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.gls}
                  onChange={handleChange('gls')}
                />
              }
              label="Spedizione GLS"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleDialogSave}>
            Salva
          </Button>
        </DialogActions>
      </Dialog>
    {/* Dialogo configurazione colonne */}
    <Dialog open={columnDialogOpen} onClose={closeColumnDialog} fullWidth maxWidth="sm">
      <DialogTitle>Configura colonne</DialogTitle>
      <DialogContent>
        {tempColumns.map((col, idx) => (
          <Box key={col.id} display="flex" alignItems="center" mb={1}>
            <IconButton
              size="small"
              onClick={() => moveColumnUp(idx)}
              disabled={idx === 0}
            >
              <ArrowUpwardIcon fontSize="inherit" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => moveColumnDown(idx)}
              disabled={idx === tempColumns.length - 1}
            >
              <ArrowDownwardIcon fontSize="inherit" />
            </IconButton>
            <FormControlLabel
              control={
                <Checkbox
                  checked={col.visible}
                  onChange={() => toggleColumnVisible(idx)}
                />
              }
              label={col.label}
              sx={{ flexGrow: 1, ml: 1 }}
            />
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={closeColumnDialog}>Annulla</Button>
        <Button variant="contained" onClick={saveColumnSettings}>Salva</Button>
      </DialogActions>
    </Dialog>
    </Box>
    {/* Dialogo per aggiornamento massivo */}
    <Dialog open={bulkDialogOpen} onClose={closeBulkDialog} fullWidth maxWidth="sm">
      <DialogTitle>Aggiornamento multiplo</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>Consegna</InputLabel>
          <Select
            value={bulkForm.consegna}
            onChange={handleBulkChange('consegna')}
            label="Consegna"
          >
            <MenuItem value="">Non modificare</MenuItem>
            {deliverers.map((d) => (
              <MenuItem value={d} key={d}>
                {d}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense">
          <InputLabel>Regalo</InputLabel>
          <Select
            value={bulkForm.regalo}
            onChange={handleBulkChange('regalo')}
            label="Regalo"
          >
            <MenuItem value="">Non modificare</MenuItem>
            <MenuItem value="grappa">{giftNames[0]}</MenuItem>
            <MenuItem value="extra">{giftNames[1]}</MenuItem>
            <MenuItem value="nessuno">{giftNames[2]}</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense">
          <InputLabel>Spedizione GLS</InputLabel>
          <Select
            value={bulkForm.gls}
            onChange={handleBulkChange('gls')}
            label="Spedizione GLS"
          >
            <MenuItem value="">Non modificare</MenuItem>
            <MenuItem value="true">Sì</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeBulkDialog}>Annulla</Button>
        <Button onClick={handleBulkSave} variant="contained" color="primary">
          Salva
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default ClientiPage;