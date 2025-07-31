import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

// Definisce un tema Material UI personalizzato.
// Definisce un tema Material UI personalizzato con i colori Overlog.
// Primary (blu) e secondary (giallo) sono presi dalla palette aziendale.
const theme = createTheme({
  palette: {
    primary: {
      main: '#19354E', // Blu Overlog
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#DAA848', // Giallo Overlog
      contrastText: '#000000',
    },
    warning: {
      main: '#DAA848',
    },
    info: {
      main: '#19354E',
    },
  },
});

// Attende che il DOM sia pronto prima di renderizzare l'applicazione.
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  // Se l'elemento root non esiste, interrompe senza loggare in console
  if (!container) {
    return;
  }
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
});