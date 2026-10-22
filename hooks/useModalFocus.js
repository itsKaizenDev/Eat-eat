'use client';
import { useEffect } from 'react';

export function useModalFocus(ref, open, onClose) {
  useEffect(() => {
    if (!open || !ref.current) return;
    const previous = document.activeElement;
    const root = ref.current;
    const buttons = () => [...root.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')];
    (root.querySelector('[data-autofocus]') || buttons()[0] || root).focus({ preventScroll: true });
    const onKey = e => {
      if (e.key === 'Escape' && onClose) { e.preventDefault(); onClose(); }
      if (e.key !== 'Tab') return;
      const list = buttons(), index = list.indexOf(document.activeElement);
      if (!list.length) { e.preventDefault(); root.focus(); return; }
      if (index < 0 || (e.shiftKey && index === 0) || (!e.shiftKey && index === list.length - 1)) {
        e.preventDefault(); list[e.shiftKey ? list.length - 1 : 0].focus();
      }
    };
    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      requestAnimationFrame(() => { if (!document.querySelector('[aria-modal="true"]') && previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true }); });
    };
  }, [ref, open, onClose]);
}
