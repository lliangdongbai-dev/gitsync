import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import {
  SyncAlt,
  Dashboard,
  Assignment,
  History,
  Settings,
} from '@mui/icons-material';

/** Navigation items configuration */
const navItems = [
  { label: '仪表盘', icon: <Dashboard />, path: '/' },
  { label: '任务列表', icon: <Assignment />, path: '/tasks' },
  { label: '同步日志', icon: <History />, path: '/logs' },
  { label: '系统设置', icon: <Settings />, path: '/settings' },
];

interface SidebarProps {
  open?: boolean;
  onNavigate?: () => void;
}

/** Sidebar navigation component */
const Sidebar: React.FC<SidebarProps> = ({ open = true, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        width: 240,
        height: '100vh',
        bgcolor: theme.palette.mode === 'dark' ? '#0D1321' : '#1E293B',
        color: '#F1F5F9',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1200,
        borderRight: theme.palette.mode === 'dark'
          ? '1px solid rgba(255,255,255,0.06)'
          : 'none',
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Logo area */}
      <Box
        sx={{
          px: 3,
          py: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SyncAlt sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #818CF8 0%, #22D3EE 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            GitSync
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}
          >
            Git 仓库定时同步
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

      {/* Navigation items */}
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  px: 2,
                  bgcolor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive
                      ? 'rgba(99, 102, 241, 0.25)'
                      : 'rgba(255, 255, 255, 0.06)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive ? '#818CF8' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#C7D2FE' : 'rgba(255,255,255,0.7)',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer */}
      <Box sx={{ px: 3, py: 2 }}>
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}
        >
          GitSync v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;
