import { Navigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../auth.jsx';

export default function RequireAuth({ children }) {
  const { token, checking } = useAuth();
  const location = useLocation();
  if (checking) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 12 }}>
        <CircularProgress color="inherit" aria-label="Loading" />
      </Box>
    );
  }
  if (!token) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return children;
}
