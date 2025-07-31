import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  Stack
} from '@mui/material';

/**
 * Pagina per la gestione delle impostazioni generali.
 *
 * Permette di modificare il regalo corrente, l'anno corrente e
 * l'elenco dei consegnatari. L'elenco dei consegnatari è
 * rappresentato come una lista di nomi separati da virgola. La
 * persistenza avviene tramite le API esposte in preload.
 */
const SettingsPage = () => {
  const [settings, setSettings] = useState({
    regaloCorrente: 'Grappa',
    annoCorrente: new Date().getFullYear(),
    consegnatari: [],
    // Nomina personalizzata dei regali. Indice 0 = regalo principale, 1 = extra/altro, 2 = nessuno.
    giftNames: ['Grappa', 'Extra/Altro', 'Nessuno'],
  });
  const [inputConsegnatari, setInputConsegnatari] = useState('');
  const [loading, setLoading] = useState(true);
  // I nomi dei regali vengono caricati dalle impostazioni e possono essere modificati.

  useEffect(() => {
    const load = async () => {
      const result = await window.api.loadSettings();
      if (result && result.success) {
        // Garantisce la presenza di giftNames con 3 elementi
        const loaded = {
          ...result.data,
          giftNames: Array.isArray(result.data.giftNames) && result.data.giftNames.length === 3
            ? result.data.giftNames
            : ['Grappa', 'Extra/Altro', 'Nessuno'],
        };
        setSettings(loaded);
        setInputConsegnatari((loaded.consegnatari || []).join(', '));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleChange = (field) => (event) => {
    setSettings((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = async () => {
    // Prepara la struttura aggiornata. Normalizza l'elenco dei consegnatari
    // rimuovendo spazi e voci vuote.
    const updated = {
      ...settings,
      consegnatari: inputConsegnatari
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s),
    };
    // Salva le impostazioni tramite l'API
    await window.api.saveSettings(updated);
    setSettings(updated);
    alert('Impostazioni salvate');
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Impostazioni
      </Typography>
      {loading ? (
        <Typography>Caricamento in corso...</Typography>
      ) : (
        <Box component="form" noValidate autoComplete="off" sx={{ maxWidth: 600 }}>
          {/* Selezione del regalo corrente basata sui nomi personalizzati */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="regalo-label">Regalo corrente</InputLabel>
            <Select
              labelId="regalo-label"
              value={settings.regaloCorrente}
              label="Regalo corrente"
              onChange={handleChange('regaloCorrente')}
            >
              {settings.giftNames.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Campi per modificare i nomi dei regali */}
          <TextField
            label="Nome regalo principale"
            value={settings.giftNames[0] || ''}
            onChange={(e) => {
              const val = e.target.value;
              setSettings((prev) => {
                const newNames = [...prev.giftNames];
                newNames[0] = val;
                // Se il regalo corrente corrisponde a quello vecchio, aggiorna il riferimento
                const newRegaloCorrente = prev.regaloCorrente === prev.giftNames[0] ? val : prev.regaloCorrente;
                return { ...prev, giftNames: newNames, regaloCorrente: newRegaloCorrente };
              });
            }}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Nome regalo extra/altro"
            value={settings.giftNames[1] || ''}
            onChange={(e) => {
              const val = e.target.value;
              setSettings((prev) => {
                const newNames = [...prev.giftNames];
                newNames[1] = val;
                return { ...prev, giftNames: newNames };
              });
            }}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Nome per nessun regalo"
            value={settings.giftNames[2] || ''}
            onChange={(e) => {
              const val = e.target.value;
              setSettings((prev) => {
                const newNames = [...prev.giftNames];
                newNames[2] = val;
                // Se il regalo corrente corrisponde a quello vecchio, aggiorna il riferimento
                const newRegaloCorrente = prev.regaloCorrente === prev.giftNames[2] ? val : prev.regaloCorrente;
                return { ...prev, giftNames: newNames, regaloCorrente: newRegaloCorrente };
              });
            }}
            fullWidth
            sx={{ mb: 2 }}
          />
          {/* Campo per l'anno */}
          <TextField
            label="Anno corrente"
            type="number"
            value={settings.annoCorrente}
            onChange={handleChange('annoCorrente')}
            fullWidth
            sx={{ mb: 2 }}
          />
          {/* Elenco dei consegnatari come stringa separata da virgole */}
          <TextField
            label="Consegnatari (separati da virgola)"
            value={inputConsegnatari}
            onChange={(e) => setInputConsegnatari(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          {settings.consegnatari && settings.consegnatari.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {settings.consegnatari.map((name) => (
                <Chip key={name} label={name} />
              ))}
            </Stack>
          )}
          <Button variant="contained" onClick={handleSave}>
            Salva
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SettingsPage;