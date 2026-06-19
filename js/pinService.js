import { dom } from './domElements.js';
import { calculateDistance } from './distanceUtils.js';
import { state, config } from './config.js';

export const pinnedStations = new Set(JSON.parse(localStorage.getItem('pinnedStations') || '[]').map(id => String(id)));

/**
 * 切換並儲存該站點的置頂狀態
 */
export function togglePinStation(stationId, event) {
    event.stopPropagation(); 
    const id = String(stationId);
    if (pinnedStations.has(id)) {
        pinnedStations.delete(id);
    } else {
        pinnedStations.add(id);
    }
    
    try {
        localStorage.setItem('pinnedStations', JSON.stringify([...pinnedStations]));
    } catch (e) {
        console.error("無法寫入 localStorage", e);
    }
    
    const pinButton = document.querySelector(`.pin-button[data-id="${id}"]`);
    if (pinButton) {
        const isPinned = pinnedStations.has(id);
        pinButton.classList.toggle('pinned', isPinned);
        pinButton.textContent = isPinned ? 'star' : 'star_outline';
    }
    updateResultsOrder();
}

/**
 * 重新排序搜尋結果列表：被釘選的站點優先，其次以距離近到遠排序
 */
export function updateResultsOrder() {
    if (!dom.resultsDiv) return;
    const cards = Array.from(dom.resultsDiv.querySelectorAll(".station"));
    
    cards.sort((a, b) => {
        const aPinned = pinnedStations.has(a.dataset.id);
        const bPinned = pinnedStations.has(b.dataset.id);
        
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        
        const latA = parseFloat(a.dataset.lat);
        const lngA = parseFloat(a.dataset.lng);
        const latB = parseFloat(b.dataset.lat);
        const lngB = parseFloat(b.dataset.lng);
        
        const currentLat = state.userLocation ? state.userLocation.latitude : config.defaultLatitude;
        const currentLng = state.userLocation ? state.userLocation.longitude : config.defaultLongitude;

        const distanceA = calculateDistance(currentLat, currentLng, latA, lngA);
        const distanceB = calculateDistance(currentLat, currentLng, latB, lngB);
        
        return distanceA - distanceB;
    });
    
    cards.forEach(card => {
        dom.resultsDiv.appendChild(card);
    });
}