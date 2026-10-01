import { Link as RouterLink } from 'react-router-dom';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

export default function NotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Typography variant="h1">Out of frame</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        That page does not exist. The link may be old or mistyped.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Go to FaceFinder
      </Button>
    </Container>
  );
}
