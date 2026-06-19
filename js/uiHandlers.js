import { dom } from './domElements.js';
import { getMapInstance } from './mapService.js';

let startY = 0;
let startHeight = 0;
let isDragging = false;

export function initUIHandlers() {
    if (dom.dragHandle && dom.mainContent) {
        dom.dragHandle.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        dom.dragHandle.addEventListener('touchstart', onStart, { passive: false }); 
        document.addEventListener('touchmove', onMove, { passive: true }); 
        document.addEventListener('touchend', onEnd);
        document.addEventListener('touchcancel', onEnd); 
    }
    
    window.addEventListener('resize', () => {
        if (dom.mainContent) {
            dom.mainContent.style.height = '';
            dom.mainContent.style.transform = '';
            dom.mainContent.style.display = ''; 
        }
        const mapInstance = getMapInstance();
        if (mapInstance) {
            setTimeout(() => { mapInstance.invalidateSize(); }, 300);
        }
    });
}

function onStart(e) {
    const touch = e.touches ? e.touches[0] : e;
    startY = touch.clientY;
    startHeight = dom.mainContent.offsetHeight;
    isDragging = true;
    if (e.cancelable) e.preventDefault(); 
    dom.mainContent.style.transition = 'none'; 
    document.body.style.cursor = 'ns-resize'; 
    dom.mainContent.style.overflowY = 'hidden'; 
}

function onMove(e) {
    if (!isDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const currentY = touch.clientY;
    const deltaY = startY - currentY;
    const newHeight = Math.min(
        Math.max(startHeight + deltaY, 200), 
        window.innerHeight * 0.85 
    );
    dom.mainContent.style.height = `${newHeight}px`;
}

function onEnd() {
    isDragging = false;
    if (dom.mainContent) {
        dom.mainContent.style.transition = 'height 0.2s ease'; 
        dom.mainContent.style.overflowY = 'auto'; 
    }
    document.body.style.cursor = ''; 
}