import { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAuth } from '../auth.jsx';
import FaceOverlay, { Viewfinder } from '../components/FaceOverlay.jsx';
import { ACCEPTED_TYPES, faceSummary, formatConfidence, validateFile } from '../lib/faces.js';
import { useDetector } from '../lib/useDetector.js';
import { colors } from '../theme.js';

function DropZone({ file, onFile, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  return (
    <Box
      component="label"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
      }}
      sx={{
        display: 'block',
        border: '2px dashed',
        borderColor: dragging ? colors.grease : 'divider',
        bgcolor: dragging ? 'rgba(215,38,61,0.04)' : 'background.paper',
        borderRadius: 1,
        p: 3,
        textAlign: 'center',
        cursor: disabled ? 'default' : 'pointer',
        '&:focus-within': { outline: `2px solid ${colors.grease}`, outlineOffset: 2 },
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        disabled={disabled}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
      <Typography sx={{ fontWeight: 650 }}>{file ? file.name : 'Drop a photo here or click to choose one'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        JPEG, PNG or WebP, up to 5 MB
      </Typography>
    </Box>
  );
}

export default function Scan() {
  const { request } = useAuth();
  const detector = useDetector();
  const [mode, setMode] = useState('url');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [highlighted, setHighlighted] = useState(null);
  const [imageBroken, setImageBroken] = useState(false);

  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => filePreview && URL.revokeObjectURL(filePreview), [filePreview]);

  const reset = () => {
    setResult(null);
    setError(null);
    setFieldError(null);
    setHighlighted(null);
    setImageBroken(false);
  };

  const chooseFile = (chosen) => {
    reset();
    const problem = validateFile(chosen);
    if (problem) {
      setFieldError(problem);
      setFile(null);
      return;
    }
    setFile(chosen);
  };

  const scan = async (event) => {
    event.preventDefault();
    reset();
    let body;
    if (mode === 'url') {
      if (!imageUrl.trim()) {
        setFieldError('Paste a link to an image.');
        return;
      }
      body = { imageUrl: imageUrl.trim() };
      setPreview(imageUrl.trim());
    } else {
      const problem = validateFile(file);
      if (problem) {
        setFieldError(problem);
        return;
      }
      body = new FormData();
      body.append('image', file);
      setPreview(filePreview);
    }
    setBusy(true);
    try {
      setResult(await request('/api/detections', { method: 'POST', body }));
    } catch (e) {
      setError(e.message);
      setFieldError(e.fields?.imageUrl ?? e.fields?.image ?? null);
    } finally {
      setBusy(false);
    }
  };

  const stageSrc = preview ?? (mode === 'upload' ? filePreview : null);
  const faces = result?.faces ?? [];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h1">Scan a photo</Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1, mb: 4, maxWidth: 560 }}>
        Paste a link or upload a picture. Every face found is circled and numbered.
      </Typography>

      {detector === 'mock' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Demo mode: face positions are simulated because the server has no Clarifai key. Set CLARIFAI_PAT for real detection.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: { xs: 3, md: 5 }, alignItems: 'start' }}>
        <Box
          sx={{
            position: 'relative',
            bgcolor: colors.lightTable,
            borderRadius: 1,
            p: { xs: 2, sm: 4 },
            minHeight: { xs: 260, md: 420 },
            display: 'grid',
            placeItems: 'center',
            order: { xs: 2, md: 1 },
          }}
        >
          <Viewfinder />
          {stageSrc && !imageBroken ? (
            <Box sx={{ width: '100%', maxWidth: 720 }}>
              <FaceOverlay
                src={stageSrc}
                alt="Photo being scanned"
                faces={faces}
                highlighted={highlighted}
                onHighlight={setHighlighted}
                onImageError={() => setImageBroken(true)}
              />
            </Box>
          ) : (
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 320 }}>
              {imageBroken
                ? 'This link did not load as an image in your browser. The scan result is still listed on the right.'
                : 'Your photo appears here.'}
            </Typography>
          )}
        </Box>

        <Box sx={{ order: { xs: 1, md: 2 } }}>
          <Tabs
            value={mode}
            onChange={(e, value) => {
              setMode(value);
              reset();
              setPreview(null);
            }}
            textColor="inherit"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', '& .MuiTabs-indicator': { backgroundColor: colors.grease } }}
          >
            <Tab value="url" label="Paste a link" />
            <Tab value="upload" label="Upload a photo" />
          </Tabs>

          <Box component="form" onSubmit={scan} noValidate>
            {mode === 'url' ? (
              <TextField
                label="Image link"
                placeholder="https://…/photo.jpg"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setFieldError(null);
                }}
                error={Boolean(fieldError)}
                helperText={fieldError ?? 'Must be publicly reachable so the detector can download it.'}
              />
            ) : (
              <>
                <DropZone file={file} onFile={chooseFile} disabled={busy} />
                {fieldError && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {fieldError}
                  </Typography>
                )}
              </>
            )}
            <Button type="submit" variant="contained" size="large" fullWidth disabled={busy} sx={{ mt: 2, py: 1.25 }}>
              {busy ? 'Looking for faces…' : 'Find faces'}
            </Button>
          </Box>

          {error && !fieldError && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Box sx={{ mt: 4 }} aria-live="polite">
              <Typography variant="h2" component="h2">
                {faceSummary(result.faceCount)}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Scanned in {result.durationMs} ms and saved to your history.
              </Typography>
              {faces.length === 0 && (
                <Typography color="text.secondary">
                  Try a photo where faces are larger, well lit and facing the camera.
                </Typography>
              )}
              <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {faces.map((face, index) => (
                  <Box
                    component="li"
                    key={index}
                    onMouseEnter={() => setHighlighted(index)}
                    onMouseLeave={() => setHighlighted(null)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      py: 1.25,
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: highlighted === index ? 'rgba(215,38,61,0.05)' : 'transparent',
                    }}
                  >
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        bgcolor: colors.grease,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'grid',
                        placeItems: 'center',
                        flex: 'none',
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Typography sx={{ fontWeight: 650 }}>Face {index + 1}</Typography>
                    <Typography color="text.secondary" sx={{ ml: 'auto' }}>
                      {formatConfidence(face.confidence)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
}
