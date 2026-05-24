import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { SyncAlt, Menu as MenuIcon } from '@mui/icons-material';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  onToggleTheme: () => void;
}

/** Main layout component with responsive sidebar navigation and top bar */
const Layout: React.FC<LayoutProps> = ({ children, darkMode, onToggleTheme }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Close sidebar on mobile when navigating
  const handleSidebarNavigate = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onNavigate={handleSidebarNavigate} />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <Box
          onClick={() => setSidebarOpen(false)}
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 1100,
          }}
        />
      )}

      {/* Main content area */}
      <Box
        sx={{
          flex: 1,
          ml: { xs: 0, md: sidebarOpen ? '240px' : 0 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: theme.palette.background.default,
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
        }}
      >
        {/* Top AppBar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: theme.palette.mode === 'dark'
              ? 'rgba(30, 41, 59, 0.8)'
              : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            color: theme.palette.text.primary,
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={handleToggleSidebar}
                sx={{ color: theme.palette.text.secondary, mr: 0.5 }}
                size="small"
              >
                <MenuIcon />
              </IconButton>
              <SyncAlt sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                GitSync
              </Typography>
            </Box>
            <ThemeToggle darkMode={darkMode} onToggle={onToggleTheme} />
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            maxWidth: 1400,
            width: '100%',
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
