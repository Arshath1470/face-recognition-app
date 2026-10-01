import { useState } from 'react';
import Box from '@mui/material/Box';
import { boxStyle, formatConfidence } from '../lib/faces.js';
import { colors } from '../theme.js';

const corner = (position) => ({
  position: 'absolute',
  width: 18,
  height: 18,
  borderColor: 'rgba(255,255,255,0.85)',
  borderStyle: 'solid',
  borderWidth: 0,
  pointerEvents: 'none',
  ...position,
});

/** Viewfinder corners framing the light table. */
export function Viewfinder() {
  return (
    <>
      <Box aria-hidden sx={corner({ top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 })} />
      <Box aria-hidden sx={corner({ top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 })} />
      <Box aria-hidden sx={corner({ bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 })} />
      <Box aria-hidden sx={corner({ bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 })} />
    </>
  );
}

/**
 * Draws grease-pencil boxes over an image. Boxes are positioned in percentages, so they
 * stay aligned at any rendered size without measuring the image.
 * Until the image has loaded (or when there is no image, e.g. an upload we didn't keep)
 * an empty frame holds the space so layouts don't collapse.
 */
export default function FaceOverlay({
  src,
  alt = '',
  faces,
  highlighted = null,
  onHighlight,
  onImageError,
  compact = false,
  aspectRatio = '4 / 3',
}) {
  const [loadedSrc, setLoadedSrc] = useState(null);
  const loaded = Boolean(src) && loadedSrc === src;
  const showBoxes = loaded || !src;

  return (
    <Box sx={{ position: 'relative', lineHeight: 0, width: '100%' }}>
      {src && (
        <Box
          component="img"
          src={src}
          alt={alt}
          onLoad={() => setLoadedSrc(src)}
          onError={onImageError}
          sx={
            loaded
              ? { width: '100%', height: 'auto', display: 'block' }
              : { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0 }
          }
        />
      )}
      {!loaded && (
        <Box
          role={src ? undefined : 'img'}
          aria-label={src ? undefined : alt || 'Uploaded photo, not stored'}
          sx={{ width: '100%', aspectRatio, bgcolor: '#2A2E35' }}
        />
      )}
      {showBoxes && faces.map((face, index) => {
        const active = highlighted === index;
        return (
          <Box
            key={index}
            onMouseEnter={onHighlight ? () => onHighlight(index) : undefined}
            onMouseLeave={onHighlight ? () => onHighlight(null) : undefined}
            title={`Face ${index + 1}, ${formatConfidence(face.confidence)}`}
            sx={{
              position: 'absolute',
              ...boxStyle(face.box),
              border: `${compact ? 2 : 3}px solid ${colors.grease}`,
              // slightly uneven radii read as hand-drawn, like a grease pencil on a proof
              borderRadius: '38% 42% 40% 44% / 40% 38% 44% 42%',
              boxShadow: active ? `0 0 0 3px rgba(215, 38, 61, 0.35)` : 'none',
              transition: 'box-shadow .15s',
            }}
          >
            {!compact && (
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  top: -12,
                  left: -12,
                  minWidth: 24,
                  height: 24,
                  px: 0.5,
                  borderRadius: 999,
                  bgcolor: colors.grease,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  lineHeight: '24px',
                  textAlign: 'center',
                }}
              >
                {index + 1}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
