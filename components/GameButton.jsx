'use client';
import { useRef } from 'react';

export default function GameButton({ onActivate, immediate = false, children, ...props }) {
  const handledTouch = useRef(false);
  return <button type="button" {...props} onPointerDown={e => {
    handledTouch.current = immediate && e.pointerType !== 'mouse';
    if (handledTouch.current && !props.disabled) { e.preventDefault(); onActivate?.(); }
  }} onClick={e => {
    if (e.detail === 0 || !handledTouch.current) onActivate?.();
    handledTouch.current = false;
  }}>{children}</button>;
}
