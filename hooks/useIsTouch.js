'use client';
import { useMediaQuery } from './useMediaQuery';

// True kalau input utamanya layar sentuh (HP / tablet tanpa mouse).
export function useIsTouch() {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}
