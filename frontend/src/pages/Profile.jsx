import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAuth } from '../auth.jsx';
import { when } from '../lib/faces.js';
import { colors } from '../theme.js';

function Stat({ value, label, small = false }) {
  return (
    <Box>
      <Typography
        variant="h1"
        component="p"
        sx={{ fontSize: small ? 'clamp(1.4rem, 3vw, 1.9rem)' : 'clamp(2.4rem, 6vw, 3.6rem)', minHeight: { sm: '1.1em' } }}
      >
        {value}
      </Typography>
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

export default function Profile() {
  const { user, request, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    refreshProfile().catch((e) => setError(e.message));
  }, [refreshProfile]);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  if (!user) return null;
  const stats = user.stats ?? { scans: 0, facesFound: 0, lastScanAt: null };

  const save = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await request('/api/me', { method: 'PUT', body: { name } });
      await refreshProfile();
      setMessage('Name updated.');
    } catch (e) {
      setError(e.fields?.name ?? e.message);
    }
  };

  const deleteAccount = async () => {
    try {
      await request('/api/me', { method: 'DELETE' });
      signOut();
      navigate('/', { replace: true });
    } catch (e) {
      setConfirmOpen(false);
      setError(e.message);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h1">{user.name}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {user.email}, member since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 4, my: 6 }}>
        <Stat value={stats.scans} label={stats.scans === 1 ? 'photo scanned' : 'photos scanned'} />
        <Stat value={stats.facesFound} label={stats.facesFound === 1 ? 'face found' : 'faces found'} />
        <Stat value={stats.lastScanAt ? when(stats.lastScanAt) : 'never'} label="last scan" small />
      </Box>

      <Box component="form" onSubmit={save} sx={{ maxWidth: 420 }}>
        <Typography variant="h3" component="h2" sx={{ mb: 2 }}>
          Your name
        </Typography>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={!name.trim() || name.trim() === user.name}>
          Save name
        </Button>
        {message && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      <Box sx={{ mt: 8, pt: 4, borderTop: 1, borderColor: 'divider', maxWidth: 560 }}>
        <Typography variant="h3" component="h2">
          Delete your account
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          Removes your account and every scan in your history. This cannot be undone.
        </Typography>
        <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)}>
          Delete account
        </Button>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your {stats.scans} {stats.scans === 1 ? 'scan' : 'scans'} will be deleted along with your account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmOpen(false)}>
            Keep my account
          </Button>
          <Button variant="contained" sx={{ bgcolor: colors.grease }} onClick={deleteAccount}>
            Delete account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
