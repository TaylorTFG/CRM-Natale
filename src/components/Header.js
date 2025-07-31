import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

/**
 * Barra superiore dell'applicazione. Contiene il pulsante per aprire
 * la sidebar e il titolo dell'app. I log sono stati rimossi per
 * mantenere la leggerezza del componente.
 */
const Header = ({ sidebarOpen, toggleSidebar }) => {
  return (
    <AppBar
      position="fixed"
      color="primary"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'primary.main',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={toggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          CRM Natale
        </Typography>
        <Box>
          <IconButton color="inherit" aria-label="help">
            <HelpOutlineIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;