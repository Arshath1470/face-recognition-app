import { Link as RouterLink, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useAuth } from '../auth.jsx';
import FaceOverlay, { Viewfinder } from '../components/FaceOverlay.jsx';
import { colors } from '../theme.js';

// A drawn group portrait for the hero, so the landing page works without stock photos.
const portrait = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#C9CED6"/>
  <rect y="430" width="800" height="170" fill="#AEB5BF"/>
  <g fill="#5E6570">
    <ellipse cx="200" cy="245" rx="62" ry="78"/><path d="M95 470c10-90 60-130 105-130s95 40 105 130z"/>
    <ellipse cx="410" cy="215" rx="70" ry="88"/><path d="M290 470c12-105 70-150 120-150s108 45 120 150z"/>
    <ellipse cx="615" cy="255" rx="58" ry="74"/><path d="M515 470c10-85 55-125 100-125s90 40 100 125z"/>
  </g>
</svg>`)}`;

// Boxes measured from the drawn heads above (ellipse bounds plus a small margin), largest first.
const heroFaces = [
  { box: { top: 0.1983, left: 0.415, bottom: 0.5183, right: 0.61 }, confidence: 0.998 },
  { box: { top: 0.265, left: 0.1625, bottom: 0.5517, right: 0.3375 }, confidence: 0.996 },
  { box: { top: 0.2883, left: 0.6863, bottom: 0.5617, right: 0.8513 }, confidence: 0.993 },
];

export default function Landing() {
  const { token } = useAuth();
  if (token) return <Navigate to="/scan" replace />;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 9 } }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' }, gap: { xs: 5, md: 8 }, alignItems: 'center' }}>
        <Box>
          <Typography variant="h1">Find every face in a photo.</Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2, maxWidth: 460, fontSize: '1.15rem' }}>
            Drop in a picture or paste a link. FaceFinder circles each face, tells you how sure it is, and keeps a
            contact sheet of everything you have scanned.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, mt: 4, flexWrap: 'wrap' }}>
            <Button component={RouterLink} to="/register" variant="contained" size="large">
              Create a free account
            </Button>
            <Button component={RouterLink} to="/signin" size="large" color="inherit">
              Sign in
            </Button>
          </Box>
        </Box>
        <Box sx={{ position: 'relative', bgcolor: colors.lightTable, p: { xs: 2.5, sm: 4 }, borderRadius: 1 }}>
          <Viewfinder />
          <FaceOverlay src={portrait} alt="Illustrated group portrait with three faces circled" faces={heroFaces} />
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', mt: 2, fontSize: '0.9rem', lineHeight: 1.4 }}>
            3 faces, each over 99% confident
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
