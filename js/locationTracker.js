import { dom } from './domElements.js';
import { state, config, regionCoordinates } from './config.js';
import { calculateDistance } from './distanceUtils.js';
import { showNotification, showMainContent } from './loadingService.js';
import { searchYouBike } from './apiYoubike.js';
import { getMapInstance } from './mapService.js';
import { updateResultsOrder } from './pinService.js';

let locationMarker = null;
let pulsingMarker = null;

export async function getLocation() {
    const isLocationServiceOn = dom.centralLocationToggle?.checked;
    let locationSet = false; 
    
    if (isLocationServiceOn) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 10000, maximumAge: 0
                });
            });
            state.userLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            locationSet = true;
            state.isFollowingUser = true; 
            state.hasObtainedRealLocation = true; 
            startTracking(); 
        } catch (e) {
            if (e.code === GeolocationPositionError.PERMISSION_DENIED || e.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
                showNotification(state.currentLang === "en" ? "Location permission denied or unavailable. Using default region." : "位置權限被拒絕或無法使用。使用預設地區。");
                dom.centralLocationToggle.checked = false; 
                localStorage.setItem("useLocation", "false"); 
            } else {
                showNotification(state.currentLang === "en" ? "Failed to get location. Using default region." : "無法取得位置。使用預設地區。");
            }
            useDefaultLocation();
            locationSet = true;
        }
    } else {
        stopTracking(); 
        useDefaultLocation();
        locationSet = true;
    }

    const mapInstance = getMapInstance();
    if (locationSet && mapInstance) {
        updateLocationMarkersOnMap(mapInstance);
    }

    if (locationSet) {
        await searchYouBike(true, false, mapInstance); 
        updateResultsOrder();
        showMainContent(); 
    } else {
        showNotification(state.currentLang === "en" ? "Could not determine location. Please check settings." : "無法確定位置，請檢查設定。");
        if (!state.mainContentShown) showMainContent(); 
    }
}

function useDefaultLocation() {
    const selectedRegion = dom.centralRegionSelect.value;
    const coords = regionCoordinates[selectedRegion]; 
    state.userLocation = { latitude: coords.lat, longitude: coords.lng };
    state.isFollowingUser = false; 
    state.hasObtainedRealLocation = false; 
}

function updateLocationMarkersOnMap(mapInstance) {
    if (!locationMarker) {
        locationMarker = L.circleMarker([state.userLocation.latitude, state.userLocation.longitude], {
            radius: 10, fillColor: '#2196F3', fillOpacity: 0.8, color: '#ffffff', weight: 3, pane: 'markerPane' 
        }).addTo(mapInstance);
        
        // 修正：回歸 Leaflet 容器最原生乾淨的 <div class="pulse"> 節點，由 css/components.css 對其渲染與產生動畫
        const pulsingIcon = L.divIcon({
            className: 'pulsing-icon', 
            html: '<div class="pulse"></div>', 
            iconSize: [20, 20]
        });
        pulsingMarker = L.marker([state.userLocation.latitude, state.userLocation.longitude], {
            icon: pulsingIcon, pane: 'markerPane' 
        }).addTo(mapInstance);
    } else {
        locationMarker.setLatLng([state.userLocation.latitude, state.userLocation.longitude]);
        if (pulsingMarker) pulsingMarker.setLatLng([state.userLocation.latitude, state.userLocation.longitude]);
    }
    state.isMapMovingDueToTracking = true;
    mapInstance.setView([state.userLocation.latitude, state.userLocation.longitude], mapInstance.getZoom() || 18, { animate: true, duration: 0.5 }); 
    setTimeout(() => { state.isMapMovingDueToTracking = false; }, 600); 
}

export function startTracking() {
    if (!dom.centralLocationToggle.checked) {
        stopTracking(); return;
    }
    if (navigator.geolocation) {
        if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
        state.isTrackingActive = true;
        state.watchId = navigator.geolocation.watchPosition(
            handleGeoUpdate, handleGeoUpdateError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
        );
    } else {
        showNotification(state.currentLang === "en" ? "Geolocation not supported." : "您的瀏覽器不支援地理位置功能。");
        stopTracking(); 
        if (dom.centralLocationToggle) {
            dom.centralLocationToggle.checked = false; 
            localStorage.setItem("useLocation", "false"); 
        }
        state.hasObtainedRealLocation = false; 
    }
}

export function stopTracking() {
    if (state.watchId !== null) {
        navigator.geolocation.clearWatch(state.watchId);
        state.watchId = null;
        state.isTrackingActive = false;
    }
}

function handleGeoUpdate(position) {
    const newLoc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    const mapInstance = getMapInstance();
    
    if (!state.hasObtainedRealLocation) {
        state.hasObtainedRealLocation = true;
        state.userLocation = newLoc;
        updateLocationMarkersOnMap(mapInstance);
        searchYouBike(true, false, mapInstance);
        state.isFollowingUser = true; 
        updateLocateButtonTitle(); 
        return; 
    }
    
    let movedSignificantly = false;
    if (state.lastKnownLocation) {
        const dist = calculateDistance(state.lastKnownLocation.latitude, state.lastKnownLocation.longitude, newLoc.latitude, newLoc.longitude);
        if (dist * 1000 > 500) { 
            movedSignificantly = true;
            if (mapInstance) {
                state.isMapMovingDueToTracking = true; 
                mapInstance.setView([newLoc.latitude, newLoc.longitude], mapInstance.getZoom(), { animate: true, duration: 0.5 }); 
                setTimeout(() => { state.isMapMovingDueToTracking = false; }, 600); 
            }
        }
    }
    state.lastKnownLocation = newLoc; 
    state.userLocation = newLoc; 
    
    if (locationMarker) locationMarker.setLatLng([newLoc.latitude, newLoc.longitude]);
    if (pulsingMarker) pulsingMarker.setLatLng([newLoc.latitude, newLoc.longitude]);
    
    if (state.isFollowingUser && mapInstance) {
        state.isMapMovingDueToTracking = true; 
        mapInstance.setView([newLoc.latitude, newLoc.longitude], mapInstance.getZoom(), { animate: true, duration: 0.5 }); 
        setTimeout(() => { state.isMapMovingDueToTracking = false; }, 600); 
    }
    
    if (movedSignificantly) {
        import('./countdown.js').then(m => m.countdownTimer.update());
    } else {
        updateCardDistances(); 
        updateResultsOrder(); 
    }
}

function handleGeoUpdateError(error) {
    state.isFollowingUser = false; 
    updateLocateButtonTitle(); 
    if (state.isTrackingActive || error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
        let msg = state.currentLang === "en" ? "Unable to update location, continuing with last known position" : "無法更新位置，將繼續使用上次的定位";
        if (error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
            msg = state.currentLang === "en" ? "Location services unavailable, stopping tracking." : "定位服務無法使用，已停止追蹤。";
            stopTracking(); 
            state.hasObtainedRealLocation = false;
        } else if (error.code === GeolocationPositionError.TIMEOUT) {
            msg = state.currentLang === "en" ? "Location update timed out." : "定位更新逾時。";
        }
        showNotification(msg);
    }
}

export function updateLocateButtonTitle() {
    const locateButton = document.getElementById('locateButton');
    if (locateButton) {
        const isLocationServiceOn = dom.centralLocationToggle?.checked; 
        if (!isLocationServiceOn) {
            locateButton.title = state.currentLang === "en" ? "Location service off (using default region)" : "定位服務已關閉 (使用預設地區)";
            locateButton.style.color = '#666'; 
        } else if (state.isFollowingUser) {
            locateButton.title = state.currentLang === "en" ? "Following your location" : "正在跟隨您的位置";
            locateButton.style.color = '#007BFF'; 
        } else {
            locateButton.title = state.currentLang === "en" ? "Go to my location" : "定位到我目前位置";
            locateButton.style.color = '#333'; 
        }
    }
}

export function toggleTracking() {
    if (!dom.centralLocationToggle.checked) {
        showNotification(state.currentLang === "en" ? "Location service is off (using default region)." : "位置服務已關閉 (使用預設地區)。");
        state.isFollowingUser = false; 
        stopTracking(); 
        useDefaultLocation();
        const mapInstance = getMapInstance();
        if (mapInstance) updateLocationMarkersOnMap(mapInstance);
        updateCardDistances(); 
        updateResultsOrder(); 
    } else {
        state.isFollowingUser = true; 
        showNotification(state.currentLang === "en" ? "Location tracking enabled." : "已開啟位置追蹤功能。");
        startTracking(); 
        const mapInstance = getMapInstance();
        if (mapInstance && state.userLocation && state.hasObtainedRealLocation) {
            state.isMapMovingDueToTracking = true; 
            mapInstance.setView([state.userLocation.latitude, state.userLocation.longitude], mapInstance.getZoom() || 18, { animate: true, duration: 0.5 }); 
            setTimeout(() => { state.isMapMovingDueToTracking = false; }, 600); 
        }
    }
    updateLocateButtonTitle(); 
}

function updateCardDistances() {
    const cards = document.querySelectorAll('.station');
    cards.forEach(card => {
        const lat = parseFloat(card.dataset.lat);
        const lng = parseFloat(card.dataset.lng);
        const newDistance = calculateDistance(
            state.userLocation ? state.userLocation.latitude : config.defaultLatitude,
            state.userLocation ? state.userLocation.longitude : config.defaultLongitude,
            lat, lng
        );
        const distanceEl = card.querySelector('.distance');
        if (distanceEl) {
            const isAtDefaultLocation = state.userLocation && state.userLocation.latitude === config.defaultLatitude && state.userLocation.longitude === config.defaultLongitude;
            if (isAtDefaultLocation) {
                distanceEl.textContent = ""; 
            } else {
                const distanceLabel = state.currentLang === "en" ? "Distance:" : "距離：";
                const unit = newDistance < 1 ? (state.currentLang === "en" ? " m" : " 公尺") : (state.currentLang === "en" ? " km" : " 公里");
                const displayDistance = newDistance < 1 ? Math.round(newDistance * 1000) : newDistance.toFixed(2);
                distanceEl.textContent = distanceLabel + " " + displayDistance + unit;
            }
        }
    });
}