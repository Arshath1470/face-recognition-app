import { Link as RouterLink, NavLink, Outlet, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useAuth } from '../auth.jsx';
import { colors } from '../theme.js';

const linkSx = {
  color: 'text.secondary',
  textDecoration: 'none',
  fontWeight: 650,
  px: { xs: 0.75, sm: 1.25 },
  py: 0.5,
  whiteSpace: 'nowrap',
  borderBottom: '2px solid transparent',
  '&.active': { color: 'text.primary', borderBottomColor: colors.grease },
  '&:hover': { color: 'text.primary' },
  '&:focus-visible': { outline: `2px solid ${colors.grease}`, outlineOffset: 2 },
};

export default function Layout() {
  const { token, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ bgcolor: 'transparent', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: { xs: 1, sm: 2 } }}>
            <Box
              component={RouterLink}
              to={token ? '/scan' : '/'}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'inherit', textDecoration: 'none', mr: 'auto' }}
            >
              <Box component="img" src="/favicon.svg" alt="" sx={{ width: 28, height: 28 }} />
              <Typography variant="h4" component="span">
                FaceFinder
              </Typography>
            </Box>
            {token ? (
              <>
                <Box component="nav" aria-label="Main" sx={{ display: 'flex' }}>
                  <Box component={NavLink} to="/scan" sx={linkSx}>
                    Scan
                  </Box>
                  <Box component={NavLink} to="/history" sx={linkSx}>
                    History
                  </Box>
                  <Box component={NavLink} to="/profile" sx={linkSx}>
                    Profile
                  </Box>
                </Box>
                <Button
                  color="inherit"
                  onClick={() => {
                    signOut();
                    navigate('/');
                  }}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button component={RouterLink} to="/signin" color="inherit">
                  Sign in
                </Button>
                <Button component={RouterLink} to="/register" variant="contained">
                  Create account
                </Button>
              </>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <Box component="footer" sx={{ py: 3, borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary">
            Uploaded photos are sent to the detector and discarded. Only the face positions are saved to your history.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
