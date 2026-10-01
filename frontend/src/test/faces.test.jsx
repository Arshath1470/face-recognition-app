import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FaceOverlay from '../components/FaceOverlay.jsx';
import { boxStyle, faceSummary, formatConfidence, validateFile, when } from '../lib/faces.js';

describe('boxStyle', () => {
  it('turns normalised boxes into CSS percentages', () => {
    expect(boxStyle({ top: 0.1, left: 0.25, bottom: 0.5, right: 0.4 })).toEqual({
      left: '25.00%',
      top: '10.00%',
      width: '15.00%',
      height: '40.00%',
    });
  });
});

describe('labels', () => {
  it('formats confidence without claiming 100%', () => {
    expect(formatConfidence(0.98765)).toBe('98.8% confident');
    expect(formatConfidence(0.99999)).toBe('99.9% confident');
    expect(formatConfidence(null)).toBe('confidence not reported');
  });

  it('summarises face counts', () => {
    expect(faceSummary(0)).toBe('No faces found');
    expect(faceSummary(1)).toBe('1 face');
    expect(faceSummary(4)).toBe('4 faces');
  });

  it('describes recent times relatively', () => {
    const now = Date.parse('2026-10-01T12:00:00Z');
    expect(when('2026-10-01T11:59:30Z', now)).toBe('just now');
    expect(when('2026-10-01T11:00:00Z', now)).toBe('1 hour ago');
    expect(when('2026-09-30T12:00:00Z', now)).toBe('yesterday');
  });
});

describe('validateFile', () => {
  const file = (type, size) => ({ type, size, name: 'x' });
  it('mirrors the API upload rules', () => {
    expect(validateFile(file('image/png', 1000))).toBeNull();
    expect(validateFile(file('image/gif', 1000))).toMatch(/JPEG, PNG or WebP/);
    expect(validateFile(file('image/jpeg', 6 * 1024 * 1024))).toMatch(/over 5 MB/);
    expect(validateFile(null)).toMatch(/Choose an image/);
  });
});

describe('FaceOverlay', () => {
  const faces = [
    { box: { top: 0.1, left: 0.1, bottom: 0.4, right: 0.3 }, confidence: 0.99 },
    { box: { top: 0.2, left: 0.6, bottom: 0.5, right: 0.8 }, confidence: 0.95 },
  ];

  it('numbers each face and positions it over the image once it loads', () => {
    render(<FaceOverlay src="photo.jpg" alt="Team photo" faces={faces} />);
    const img = screen.getByRole('img', { name: 'Team photo' });
    expect(screen.queryByText('1')).not.toBeInTheDocument(); // no boxes over a blank frame
    fireEvent.load(img);
    expect(screen.getByText('1')).toBeInTheDocument();
    const second = screen.getByTitle('Face 2, 95.0% confident');
    expect(second).toHaveStyle({ left: '60.00%', width: '20.00%' });
  });

  it('draws boxes on an empty frame when the photo was not stored', () => {
    render(<FaceOverlay src={null} faces={faces} compact />);
    expect(screen.getByRole('img', { name: 'Uploaded photo, not stored' })).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
