import { createTheme, ThemeOptions } from '@mui/material/styles';

/** Shared theme configuration options */
function getThemeOptions(darkMode: boolean): ThemeOptions {
  return {
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#6366F1',
        light: '#818CF8',
        dark: '#4F46E5',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#06B6D4',
        light: '#22D3EE',
        dark: '#0891B2',
        contrastText: '#FFFFFF',
      },
      background: darkMode
        ? { default: '#0F172A', paper: '#1E293B' }
        : { default: '#F8FAFC', paper: '#FFFFFF' },
      text: darkMode
        ? { primary: '#F1F5F9', secondary: '#94A3B8' }
        : { primary: '#1E293B', secondary: '#64748B' },
      success: { main: '#10B981' },
      error: { main: '#EF4444' },
      warning: { main: '#F59E0B' },
      info: { main: '#3B82F6' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
            padding: '8px 20px',
          },
          contained: {
            boxShadow: darkMode
              ? '0 4px 14px rgba(99, 102, 241, 0.4)'
              : '0 4px 14px rgba(99, 102, 241, 0.3)',
            '&:hover': {
              boxShadow: darkMode
                ? '0 6px 20px rgba(99, 102, 241, 0.5)'
                : '0 6px 20px rgba(99, 102, 241, 0.4)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: darkMode
              ? '0 4px 24px rgba(0, 0, 0, 0.3)'
              : '0 4px 24px rgba(0, 0, 0, 0.06)',
            border: darkMode
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(0, 0, 0, 0.04)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
    },
  };
}

/** Create a light theme */
export const lightTheme = createTheme(getThemeOptions(false));

/** Create a dark theme */
export const darkTheme = createTheme(getThemeOptions(true));

/** Create a theme based on mode */
export function createAppTheme(darkMode: boolean) {
  return createTheme(getThemeOptions(darkMode));
}
