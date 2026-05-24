import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { createAppTheme } from './theme';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import TaskListPage from './pages/TaskListPage';
import TaskFormPage from './pages/TaskFormPage';
import SyncLogPage from './pages/SyncLogPage';
import SettingsPage from './pages/SettingsPage';

/** Main App component with theme management and routing */
const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gitsync_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const theme = createAppTheme(darkMode);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('gitsync_dark_mode', String(next));
      return next;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Layout darkMode={darkMode} onToggleTheme={toggleTheme}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TaskListPage />} />
            <Route path="/tasks/new" element={<TaskFormPage />} />
            <Route path="/tasks/edit/:id" element={<TaskFormPage />} />
            <Route path="/logs" element={<SyncLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;
