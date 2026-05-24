import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';

interface ThemeToggleProps {
  darkMode: boolean;
  onToggle: () => void;
}

/** Theme toggle button component for switching between light and dark mode */
const ThemeToggle: React.FC<ThemeToggleProps> = ({ darkMode, onToggle }) => {
  const theme = useTheme();

  return (
    <Tooltip title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}>
      <IconButton
        onClick={onToggle}
        sx={{
          color: theme.palette.text.primary,
          bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          '&:hover': {
            bgcolor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        {darkMode ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
