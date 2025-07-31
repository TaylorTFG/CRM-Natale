import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button
} from '@mui/material';

/**
 * Pagina che visualizza i record eliminati (soft-delete) e permette
 * il loro ripristino. I dati vengono caricati dal file "eliminati"
 * tramite l'API `loadData('eliminati')`. Per ripristinare si usa
 * `restoreFromEliminati(id)`. La tabella mostra alcune colonne
 * essenziali.
 */
const EliminatiPage = () => {
  const [eliminati, setEliminati] = useState([]);
  const [loading, setLoading] = useState(true);
  // Nomi dei regali presi dalle impostazioni. Default fallback se non caricati.
  const [giftNames, setGiftNames] = useState(['Grappa', 'Extra/Altro', 'Nessuno']);

  useEffect(() => {
    const load = async () => {
      // Carica i record eliminati
      const [elimRes, settingsRes] = await Promise.all([
        window.api.loadData('eliminati', true),
        window.api.loadSettings()
      ]);
      if (elimRes && elimRes.success) {
        setEliminati(elimRes.data);
      }
      if (settingsRes && settingsRes.success) {
        const gifts =
          Array.isArray(settingsRes.data.giftNames) && settingsRes.data.giftNames.length === 3
            ? settingsRes.data.giftNames
            : ['Grappa', 'Extra/Altro', 'Nessuno'];
        setGiftNames(gifts);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleRestore = async (id) => {
    await window.api.restoreFromEliminati(id);
    setEliminati(eliminati.filter((item) => item.id !== id));
  };

  const rows = useMemo(() => eliminati || [], [eliminati]);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Eliminati
      </Typography>
      {loading ? (
        <Typography>Caricamento in corso...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Azienda</TableCell>
                <TableCell>Indirizzo</TableCell>
                <TableCell>Civico</TableCell>
                <TableCell>CAP</TableCell>
                <TableCell>Città</TableCell>
                <TableCell>Provincia</TableCell>
                <TableCell>Telefono</TableCell>
                <TableCell>Regalo</TableCell>
                <TableCell>Consegna</TableCell>
                <TableCell>Eliminato il</TableCell>
                <TableCell align="right">Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.tipo}</TableCell>
                  <TableCell>{item.nome || ''}</TableCell>
                  <TableCell>{item.azienda || ''}</TableCell>
                  <TableCell>{item.indirizzo || ''}</TableCell>
                  <TableCell>{item.civico || ''}</TableCell>
                  <TableCell>{item.cap || ''}</TableCell>
                  <TableCell>{item.localita || ''}</TableCell>
                  <TableCell>{item.provincia || ''}</TableCell>
                  <TableCell>{item.telefono || ''}</TableCell>
                  <TableCell>
                    {item.grappa && (item.grappa === true || item.grappa === '1' || item.grappa === 1)
                      ? giftNames[0]
                      : item.extraAltro && (item.extraAltro === true || item.extraAltro === '1' || item.extraAltro === 1)
                      ? giftNames[1]
                      : giftNames[2]}
                  </TableCell>
                  <TableCell>
                    {item.gls && (item.gls === true || item.gls === '1' || item.gls === 1)
                      ? 'GLS'
                      : item.consegnaSpedizione || ''}
                  </TableCell>
                  <TableCell>
                    {item.eliminatoIl
                      ? new Date(item.eliminatoIl).toLocaleDateString()
                      : ''}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleRestore(item.id)}
                    >
                      Ripristina
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default EliminatiPage;