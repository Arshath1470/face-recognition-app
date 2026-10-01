import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
// Archivo, self-hosted, with its width axis: expanded for headings, normal for body text.
import '@fontsource-variable/archivo/wdth.css';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { theme } from './theme.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
