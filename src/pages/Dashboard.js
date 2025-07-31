import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress,
  Avatar
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import PersonIcon from '@mui/icons-material/Person';

/**
 * Pagina della dashboard.
 *
 * Questa versione è stata semplificata rispetto al progetto originale
 * rimuovendo grafici e statistiche avanzate. Vengono mostrati solo
 * alcuni contatori di base (numero di clienti, partner e spedizioni GLS).
 * Tutte le chiamate ai servizi sono gestite attraverso l'oggetto
 * `window.api` esposto da Electron nel preload. In caso di errore
 * viene visualizzato un indicatore di caricamento.
 */
const Dashboard = () => {
  const [clienti, setClienti] = useState([]);
  const [partner, setPartner] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carica dati e impostazioni all'avvio
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientiRes, partnerRes, settingsRes] = await Promise.all([
          window.api.loadData('clienti'),
          window.api.loadData('partner'),
          window.api.loadSettings()
        ]);
        if (clientiRes && clientiRes.success) setClienti(clientiRes.data);
        if (partnerRes && partnerRes.success) setPartner(partnerRes.data);
        if (settingsRes && settingsRes.success) setSettings(settingsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Calcola i totali e statistiche
  const totalClienti = clienti.length;
  const totalPartner = partner.length;
  const allRecords = [...clienti, ...partner];
  const totalGLS = allRecords.filter(
    (rec) => rec.gls && (rec.gls === true || rec.gls === '1' || rec.gls === 1)
  ).length;
  // Conteggio regali (booleani grappa/extraAltro)
  const totalGrappa = allRecords.filter(
    (rec) => rec.grappa && (rec.grappa === true || rec.grappa === '1' || rec.grappa === 1)
  ).length;
  const totalExtra = allRecords.filter(
    (rec) => rec.extraAltro && (rec.extraAltro === true || rec.extraAltro === '1' || rec.extraAltro === 1)
  ).length;
  const totalNoGift = allRecords.length - totalGrappa - totalExtra;
  // Conteggio consegnatari
  const consegnatariCounts = {};
  if (settings && Array.isArray(settings.consegnatari)) {
    settings.consegnatari.forEach((name) => {
      consegnatariCounts[name] = allRecords.filter(
        (rec) =>
          !(rec.gls && (rec.gls === true || rec.gls === '1' || rec.gls === 1)) &&
          rec.consegnaSpedizione &&
          rec.consegnaSpedizione.toLowerCase() === name.toLowerCase()
      ).length;
    });
  }

  // Calcolo progressi per regali e consegne
  const totalRecordsCount = allRecords.length;
  const giftProgress = {
    grappa: totalRecordsCount ? totalGrappa / totalRecordsCount : 0,
    extra: totalRecordsCount ? totalExtra / totalRecordsCount : 0,
    none: totalRecordsCount ? totalNoGift / totalRecordsCount : 0
  };
  const delivererNames = settings && Array.isArray(settings.consegnatari) ? settings.consegnatari : [];
  const totalInternalDeliveries = delivererNames.reduce(
    (sum, name) => sum + (consegnatariCounts[name] || 0),
    0
  );
  const maxDeliveries = delivererNames.reduce(
    (max, name) => Math.max(max, consegnatariCounts[name] || 0),
    0
  );

  // Nomi dinamici dei regali dalle impostazioni
  const giftNamesList =
    settings && Array.isArray(settings.giftNames) && settings.giftNames.length === 3
      ? settings.giftNames
      : ['Grappa', 'Extra/Altro', 'Nessuno'];

  return loading ? (
    <Box display="flex" alignItems="center" justifyContent="center" height="100%" p={3}>
      <CircularProgress />
    </Box>
  ) : (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Clienti
                  </Typography>
                  <Typography variant="h5">{totalClienti}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Partner
                  </Typography>
                  <Typography variant="h5">{totalPartner}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <LocalShippingIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Spedizioni GLS
                  </Typography>
                  <Typography variant="h5">{totalGLS}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* Card per i regali
           La grappa è il regalo principale, per questo viene evidenziato con un'icona specifica e un valore
           grande come nelle card Clienti/Partner. Le altre tipologie di regalo sono rappresentate da
           barre di avanzamento per offrire una panoramica visiva immediata. */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              {/* Testata: icona personalizzata e totale grappe */}
              <Box display="flex" alignItems="center" mb={1}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  {/* Utilizziamo l'icona del bicchiere per rappresentare il regalo principale */}
                  <LocalBarIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Regalo principale ({giftNamesList[0]})
                  </Typography>
                  {/* Valore messo in evidenza con un font grande */}
                  <Typography variant="h5">{totalGrappa}</Typography>
                </Box>
              </Box>
              {/* Barre di avanzamento per ogni tipo di regalo */}
              <Typography variant="body2" color="text.secondary">
                {giftNamesList[0]} ({totalGrappa})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={giftProgress.grappa * 100}
                sx={{ height: 8, borderRadius: 4, mb: 1, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: 'warning.main' } }}
              />
              <Typography variant="body2" color="text.secondary">
                {giftNamesList[1]} ({totalExtra})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={giftProgress.extra * 100}
                sx={{ height: 8, borderRadius: 4, mb: 1, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: 'info.main' } }}
              />
              <Typography variant="body2" color="text.secondary">
                {giftNamesList[2]} ({totalNoGift})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={giftProgress.none * 100}
                sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: 'secondary.light' } }}
              />
            </CardContent>
          </Card>
        </Grid>
        {/* Card per consegnatari */}
        <Grid item xs={12} sm={6} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <PersonIcon />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Consegne interne
                </Typography>
              </Box>
              {delivererNames && delivererNames.length > 0 ? (
                <Box>
                  {delivererNames.map((name) => {
                    const count = consegnatariCounts[name] || 0;
                    const ratio = maxDeliveries > 0 ? count / maxDeliveries : 0;
                    return (
                      <Box key={name} mb={1.5}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {count}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={ratio * 100}
                          sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: 'info.main' } }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2">Nessun consegnatario impostato</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;