import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useAuth } from '../auth.jsx';
import FaceOverlay from '../components/FaceOverlay.jsx';
import { faceSummary, when } from '../lib/faces.js';
import { colors } from '../theme.js';

const PAGE = 24;

function Frame({ scan, onDelete }) {
  const [broken, setBroken] = useState(false);
  const showImage = scan.imageUrl && !broken;
  return (
    <Box component="figure" sx={{ m: 0 }}>
      <Box sx={{ bgcolor: colors.lightTable, p: 1, borderRadius: 1 }}>
        <FaceOverlay
          src={showImage ? scan.imageUrl : null}
          alt={showImage ? `Scan ${scan.id}` : scan.source === 'upload' ? 'Uploaded photo, not stored' : 'Image link no longer loads'}
          faces={scan.faces}
          compact
          onImageError={() => setBroken(true)}
        />
      </Box>
      <Box component="figcaption" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>
            Frame {scan.id}
            <Box component="span" sx={{ color: scan.faceCount ? colors.grease : 'text.secondary', fontWeight: 650, ml: 1 }}>
              {faceSummary(scan.faceCount)}
            </Box>
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {scan.source === 'upload' ? 'Uploaded photo' : scan.imageUrl}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {when(scan.createdAt)}
          </Typography>
        </Box>
        <IconButton aria-label={`Delete frame ${scan.id}`} onClick={() => onDelete(scan)} size="small" sx={{ ml: 'auto' }}>
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

export default function History() {
  const { request } = useAuth();
  const [items, setItems] = useState(null);
  const [nextBefore, setNextBefore] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (before = null) => {
      const query = new URLSearchParams({ limit: String(PAGE) });
      if (before) query.set('before', String(before));
      const page = await request(`/api/detections?${query}`);
      setItems((current) => (before ? [...(current ?? []), ...page.items] : page.items));
      setNextBefore(page.nextBefore);
    },
    [request],
  );

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async (scan) => {
    try {
      await request(`/api/detections/${scan.id}`, { method: 'DELETE' });
      setItems((current) => current.filter((s) => s.id !== scan.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h1">Contact sheet</Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        Every photo you have scanned, newest first.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {items === null && !error && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 3 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={200} />
          ))}
        </Box>
      )}

      {items?.length === 0 && (
        <Box sx={{ py: 6 }}>
          <Typography variant="h3" component="p">
            No scans yet
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Scan your first photo and it will be filed here.
          </Typography>
          <Button variant="contained" component={RouterLink} to="/scan">
            Scan a photo
          </Button>
        </Box>
      )}

      {items?.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 3 }}>
          {items.map((scan) => (
            <Frame key={scan.id} scan={scan} onDelete={remove} />
          ))}
        </Box>
      )}

      {nextBefore && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            color="inherit"
            disabled={loadingMore}
            onClick={async () => {
              setLoadingMore(true);
              try {
                await load(nextBefore);
              } catch (e) {
                setError(e.message);
              } finally {
                setLoadingMore(false);
              }
            }}
          >
            {loadingMore ? 'Loading…' : 'Show older scans'}
          </Button>
        </Box>
      )}
    </Container>
  );
}
