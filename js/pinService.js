import { defaultLatitude, defaultLongitude } from './config.js';
import { resultsDiv } from './domElements.js';
import { calculateDistance } from './distanceUtils.js';
import { userLocation } from './locationTracker.js';

export const pinnedStations = new Set(JSON.parse(localStorage.getItem('pinnedStations') || '[]').map(id => String(id)));

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
  }
  const pinButton = document.querySelector(`.pin-button[data-id="${id}"]`);
  if (pinButton) {
    const isPinned = pinnedStations.has(id);
    pinButton.classList.toggle('pinned', isPinned);
    pinButton.textContent = isPinned ? 'star' : 'star_outline';
  }
  updateResultsOrder();
}

export function updateResultsOrder() {
  const cards = Array.from(document.querySelectorAll(".station"));
  cards.sort((a, b) => {
    const aPinned = pinnedStations.has(a.dataset.id);
    const bPinned = pinnedStations.has(b.dataset.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    const distanceA = calculateDistance(
      userLocation ? userLocation.latitude : defaultLatitude,
      userLocation ? userLocation.longitude : defaultLongitude,
      parseFloat(a.dataset.lat),
      parseFloat(a.dataset.lng)
    );
    const distanceB = calculateDistance(
      userLocation ? userLocation.latitude : defaultLatitude,
      userLocation ? userLocation.longitude : defaultLongitude,
      parseFloat(b.dataset.lat),
      parseFloat(b.dataset.lng)
    );
    return distanceA - distanceB;
  });
  cards.forEach(card => {
    resultsDiv.appendChild(card);
  });
}