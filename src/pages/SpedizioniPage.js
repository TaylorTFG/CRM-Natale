import React, { useEffect, useState, useMemo } from 'react';
// Material UI components
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import SortableTableCell from '../components/SortableTableCell';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

/**
 * Pagina che elenca tutti i record (clienti e partner) marcati per
 * spedizione GLS. I record vengono caricati dai rispettivi file
 * tramite l'API loadData. Un pulsante permette di esportare tutti
 * i record GLS in un file Excel (tramite l'API exportGLS).
 */
const SpedizioniPage = () => {
  // Lista di record con spedizione GLS
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  // Stato per ricerca e ordinamento
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('nome');
  // Definizione delle colonne con possibilità di riordinare/nascondere
  const initialColumns = [
    { id: 'tipo', label: 'Tipo', field: 'tipo', sortable: false, visible: true },
    { id: 'nome', label: 'Nome', field: 'nome', sortable: true, visible: true },
    { id: 'azienda', label: 'Azienda', field: 'azienda', sortable: true, visible: true },
    { id: 'indirizzo', label: 'Indirizzo', field: 'indirizzo', sortable: false, visible: true },
    { id: 'civico', label: 'Civico', field: 'civico', sortable: false, visible: true },
    { id: 'localita', label: 'Città', field: 'localita', sortable: true, visible: true },
    { id: 'provincia', label: 'Provincia', field: 'provincia', sortable: false, visible: true },
    { id: 'telefono', label: 'Telefono', field: 'telefono', sortable: false, visible: true }
  ];
  const [columns, setColumns] = useState(initialColumns);
  // Dialog temporaneo per riordino/nascondi colonne
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [tempColumns, setTempColumns] = useState([]);

  useEffect(() => {
    const load = async () => {
      const clientiRes = await window.api.loadData('clienti');
      const partnerRes = await window.api.loadData('partner');
      let list = [];
      if (clientiRes && clientiRes.success) list = list.concat(clientiRes.data);
      if (partnerRes && partnerRes.success) list = list.concat(partnerRes.data);
      // Filtra solo record con gls vero
      list = list.filter((item) => item.gls && (item.gls === true || item.gls === '1' || item.gls === 1));
      setRecords(list);
      setLoading(false);
    };
    load();
  }, []);

  const handleExport = async () => {
    await window.api.exportGLS();
  };

  // Colonne: apertura del dialogo
  const openColumnDialogFn = () => {
    setTempColumns(columns.map((c) => ({ ...c })));
    setColumnDialogOpen(true);
  };
  const closeColumnDialog = () => setColumnDialogOpen(false);
  const moveColumnUp = (index) => {
    if (index <= 0) return;
    setTempColumns((prev) => {
      const arr = [...prev];
      const tmp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = tmp;
      return arr;
    });
  };
  const moveColumnDown = (index) => {
    setTempColumns((prev) => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      const tmp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = tmp;
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
    setColumns(tempColumns);
    setColumnDialogOpen(false);
  };

  // Applica filtro di ricerca e ordinamento ai record GLS
  const filteredRecords = useMemo(() => {
    let data = records;
    if (search) {
      const s = search.toLowerCase();
      data = data.filter((item) => {
        const name = item.nome ? item.nome.toLowerCase() : '';
        const surname = item.cognome ? item.cognome.toLowerCase() : '';
        const company = item.azienda ? item.azienda.toLowerCase() : '';
        return (
          (name && name.includes(s)) ||
          (surname && surname.includes(s)) ||
          (company && company.includes(s))
        );
      });
    }
    return data
      .slice()
      .sort((a, b) => {
        const getField = (obj) => {
          if (orderBy === 'nome') return (obj.nome || '').toString().toLowerCase();
          if (orderBy === 'azienda') return (obj.azienda || '').toString().toLowerCase();
          return '';
        };
        const aVal = getField(a);
        const bVal = getField(b);
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });
  }, [records, search, order, orderBy]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Spedizioni GLS</Typography>
        {/* Barra di azioni: esporta e gestione colonne */}
        <Box>
          <Button variant="contained" onClick={handleExport} sx={{ mr: 1 }}>
            Esporta XLSX
          </Button>
          {/* Pulsante per configurare la visibilità e l'ordine delle colonne */}
          <IconButton onClick={openColumnDialogFn} color="primary">
            <ViewColumnIcon />
          </IconButton>
        </Box>
      </Box>
      {/* Barra di ricerca */}
      <Box display="flex" alignItems="center" mb={2}>
        <TextField
          label="Cerca per nome, cognome o azienda"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: '40%' }}
        />
      </Box>
      {loading ? (
        <Typography>Caricamento in corso...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns
                  .filter((col) => col.visible)
                  .map((col) => {
                    if (col.sortable) {
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
                    return <TableCell key={col.id}>{col.label}</TableCell>;
                  })}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.map((item) => (
                <TableRow key={item.id} hover>
                  {columns
                    .filter((col) => col.visible)
                    .map((col) => {
                      const value = item[col.field] || '';
                      return <TableCell key={col.id}>{value}</TableCell>;
                    })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Dialog per personalizzare l'ordine e la visibilità delle colonne */}
      <Dialog open={columnDialogOpen} onClose={closeColumnDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Configura colonne</DialogTitle>
        <DialogContent>
          {tempColumns.map((col, index) => (
            <Box key={col.id} display="flex" alignItems="center" mb={1}>
              <IconButton
                size="small"
                onClick={() => moveColumnUp(index)}
                disabled={index === 0}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => moveColumnDown(index)}
                disabled={index === tempColumns.length - 1}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={col.visible}
                    onChange={() => toggleColumnVisible(index)}
                  />
                }
                label={col.label}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeColumnDialog}>Annulla</Button>
          <Button onClick={saveColumnSettings} variant="contained">
            Salva
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpedizioniPage;