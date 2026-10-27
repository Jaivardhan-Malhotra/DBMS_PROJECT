import teamColors from '../../../database/team-colors.json';

export const JERSEY_COLORS = teamColors;

export const getJerseyColorHex = (colorName, fallback = '#94a3b8') => (
  JERSEY_COLORS.find(({ name }) => name === colorName)?.hex || fallback
);
