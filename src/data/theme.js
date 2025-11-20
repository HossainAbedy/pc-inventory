// src/data/theme.js
import { createTheme } from '@mui/material/styles';

/**
 * SBAC-branded MUI theme (matches the DVR app theme)
 * - Primary: purple (#81488D)
 * - Secondary: accent (#E54014)
 * - Info / highlight: gold (#F8B408)
 * - Windows 11 / SBAC-friendly font stack (falls back to Inter/Roboto/etc.)
 */

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#81488D' },   // SBAC purple
    secondary: { main: '#E54014' }, // SBAC accent
    info: { main: '#F8B408' },      // SBAC gold/highlight
    background: {
      default: '#FFFFFF',
      paper: '#FBFBFB'
    },
    text: {
      primary: '#333333',
      secondary: 'rgba(0,0,0,0.6)'
    }
  },

  // Windows 11 friendly + fallback fonts
  typography: {
    fontFamily: [
      '"Segoe UI Variable"',
      '"Segoe UI"',
      'Inter',
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif'
    ].join(', '),
    button: { textTransform: 'none', fontWeight: 700 },
    h4: { fontWeight: 700, letterSpacing: '0.5px' }
  },

  shape: {
    borderRadius: 10
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    }
  }
});

export default theme;
