import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

/**
 * Struttura di layout comune a tutte le pagine. Comprende la barra
 * superiore (Header), la sidebar laterale e l'area principale dove
 * vengono renderizzate le pagine. Lo stato della sidebar è gestito
 * localmente e non vengono usati log per rendere il componente
 * leggero.
 */
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      {/* Header */}
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 8, // spazio per l'header
          overflow: 'auto',
          height: '100vh',
          backgroundColor: (theme) => theme.palette.grey[100],
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;