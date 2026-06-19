import { mainContent } from './domElements.js';

export let startY = 0;
export let startHeight = 0;
export let isDragging = false;

export function onStart(e) {
  const touch = e.touches ? e.touches[0] : e;
  startY = touch.clientY;
  startHeight = mainContent.offsetHeight;
  isDragging = true;
  e.preventDefault(); 
  mainContent.style.transition = 'none'; 
  document.body.style.cursor = 'ns-resize'; 
  mainContent.style.overflowY = 'hidden'; 
}

export function onMove(e) {
  if (!isDragging) return;
  const touch = e.touches ? e.touches[0] : e;
  const currentY = touch.clientY;
  const deltaY = startY - currentY;
  const newHeight = Math.min(
    Math.max(startHeight + deltaY, 200), 
    window.innerHeight * 0.85 
  );
  mainContent.style.height = `${newHeight}px`;
}

export function onEnd() {
  isDragging = false;
  mainContent.style.transition = 'height 0.2s ease'; 
  document.body.style.cursor = ''; 
  mainContent.style.overflowY = 'auto'; 
}