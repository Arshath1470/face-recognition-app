import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAuth } from '../auth.jsx';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { signIn, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFields({});
    setError(null);
    try {
      if (isRegister) await register(form);
      else await signIn(form.email, form.password);
      navigate(location.state?.from ?? '/scan', { replace: true });
    } catch (e) {
      setFields(e.fields ?? {});
      setError(e.fields ? null : e.message);
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 6, md: 10 } }}>
      <Typography variant="h1" sx={{ fontSize: 'clamp(2rem, 6vw, 2.6rem)' }}>
        {isRegister ? 'Create your account' : 'Welcome back'}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        {isRegister ? 'Your scans are private to you.' : 'Sign in to scan photos and see your history.'}
      </Typography>
      <Box component="form" onSubmit={submit} noValidate>
        <Stack spacing={2}>
          {isRegister && (
            <TextField
              label="Name"
              value={form.name}
              onChange={update('name')}
              autoComplete="name"
              error={Boolean(fields.name)}
              helperText={fields.name}
            />
          )}
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
            error={Boolean(fields.email)}
            helperText={fields.email}
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={update('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            error={Boolean(fields.password)}
            helperText={fields.password ?? (isRegister ? 'At least 8 characters' : undefined)}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {busy ? 'One moment…' : isRegister ? 'Create account' : 'Sign in'}
          </Button>
        </Stack>
      </Box>
      <Typography sx={{ mt: 3 }}>
        {isRegister ? 'Already registered? ' : 'New here? '}
        <Link component={RouterLink} to={isRegister ? '/signin' : '/register'} state={location.state} color="inherit" sx={{ fontWeight: 650 }}>
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </Typography>
    </Container>
  );
}
