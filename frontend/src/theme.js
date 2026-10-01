import { createTheme } from '@mui/material/styles';

// A photographer's contact sheet: cool proof paper, black ink, and grease-pencil red
// for marking the frames that matter. Red is reserved for detected faces and destructive actions.
export const colors = {
  paper: '#ECEEF1',
  sheet: '#FFFFFF',
  ink: '#15171A',
  muted: '#5E6570',
  rule: '#CDD2D8',
  grease: '#D7263D',
  lightTable: '#1E2126',
};

const family = '"Archivo Variable", "Archivo", system-ui, sans-serif';
const wide = { fontFamily: family, fontStretch: '125%', fontWeight: 800, letterSpacing: '-0.015em' };

export const theme = createTheme({
  palette: {
    primary: { main: colors.ink, contrastText: '#FFFFFF' },
    secondary: { main: colors.grease, contrastText: '#FFFFFF' },
    error: { main: colors.grease },
    background: { default: colors.paper, paper: colors.sheet },
    text: { primary: colors.ink, secondary: colors.muted },
    divider: colors.rule,
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: family,
    h1: { ...wide, fontSize: 'clamp(2.1rem, 5vw, 3.4rem)', lineHeight: 1.02 },
    h2: { ...wide, fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', lineHeight: 1.08 },
    h3: { ...wide, fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.2 },
    h4: { ...wide, fontWeight: 700, fontSize: '1.05rem' },
    subtitle1: { fontSize: '1.05rem', lineHeight: 1.55 },
    body1: { lineHeight: 1.55 },
    button: { textTransform: 'none', fontWeight: 650, letterSpacing: 0 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 650, minHeight: 44 } } },
  },
});
