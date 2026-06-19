import { regionCoordinates } from './config.js';
import { calculateDistance } from './distanceUtils.js';
import { mainContentShown, showMainContent } from './loadingService.js';
import { updateResultsOrder } from './pinService.js';
import { searchYouBike } from './apiYoubike.js';
import { leafletMap, locationMarker, pulsingMarker } from './mapService.js';
import { currentLang } from './language.js';
import { countdownTimer } from './countdown.js';

export let userLocation = null;
export let isFollowingUser = false;
export let isTrackingActive = false;
export let watchId = null;
export let isMapMovingDueToTracking = false;
export let hasObtainedRealLocation = false;
export let lastKnownLocation = null;

export function startTracking() {
    const centralLocationToggle = document.getElementById('centralLocationToggle');
    if (!centralLocationToggle.checked) {
                      stopTracking(); 
        return;
    }
    if (navigator.geolocation) {
            if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }
        isTrackingActive = true;
        watchId = navigator.geolocation.watchPosition(
            handleGeoUpdate,
            handleGeoUpdateError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
        );
    } else {
        showNotification(currentLang === "en" ? "Geolocation not supported." : "您的瀏覽器不支援地理位置功能。");
        stopTracking(); 
        const centralLocationToggle = document.getElementById('centralLocationToggle');
        if (centralLocationToggle) {
            centralLocationToggle.checked = false; 
            localStorage.setItem("useLocation", "false"); 
        }
        hasObtainedRealLocation = false; 
    }
}

export function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        isTrackingActive = false;
    }
}

export async function getLocation() {
    const centralLocationToggle = document.getElementById('centralLocationToggle');
    const isLocationServiceOn = centralLocationToggle?.checked;
    let locationSet = false; 
    if (isLocationServiceOn) {
        try {
            const position = await new Promise((resolve, reject) => {
                                      navigator.geolocation.getCurrentPosition(resolve, reject, {
                                              enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            locationSet = true;
                              isFollowingUser = true; 
            hasObtainedRealLocation = true; 
            startTracking(); 
        } catch (e) {
            let shouldDisableToggle = false;
            if (e.code === GeolocationPositionError.PERMISSION_DENIED || e.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
                  showNotification(currentLang === "en"
                  ? "Location permission denied or unavailable. Using default region."
                  : "位置權限被拒絕或無法使用。使用預設地區。");
                  shouldDisableToggle = true;
                  centralLocationToggle.checked = false; 
                  localStorage.setItem("useLocation", "false"); 
            } else {
                showNotification(currentLang === "en"
                  ? "Failed to get location. Using default region."
                  : "無法取得位置。使用預設地區。");
            }
            const selectedRegion = document.getElementById('centralRegionSelect').value;
            const coords = regionCoordinates[selectedRegion];
            userLocation = { latitude: coords.lat, longitude: coords.lng };
            locationSet = true;
            isFollowingUser = false; 
            hasObtainedRealLocation = false; 
            if (centralLocationToggle.checked) {
                startTracking(); 
            } else {
                stopTracking();
            }
        }
    } else {
        stopTracking(); 
        const selectedRegion = document.getElementById('centralRegionSelect').value;
        const coords = regionCoordinates[selectedRegion];
        userLocation = { latitude: coords.lat, longitude: coords.lng };
        locationSet = true;
        isFollowingUser = false; 
        hasObtainedRealLocation = false; 
    }
    if (locationSet && leafletMap) {
        if (!locationMarker) {
            locationMarker = L.circleMarker([userLocation.latitude, userLocation.longitude], {
                radius: 10,
                fillColor: '#2196F3', 
                fillOpacity: 0.8,
                color: '#ffffff', 
                weight: 3,
                pane: 'markerPane' 
            }).addTo(leafletMap);
            const pulsingIcon = L.divIcon({
                className: 'pulsing-icon',
                html: '<div class="pulse"></div>',
                iconSize: [20, 20]
            });
            pulsingMarker = L.marker([userLocation.latitude, userLocation.longitude], {
                icon: pulsingIcon,
                pane: 'markerPane' 
            }).addTo(leafletMap);
        } else {
            locationMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
            if (pulsingMarker) pulsingMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
        }
        isMapMovingDueToTracking = true;
        leafletMap.setView([userLocation.latitude, userLocation.longitude], leafletMap.getZoom() ||  18, { animate: true, duration: 0.5 }); 
        setTimeout(() => { isMapMovingDueToTracking = false; }, 600); 
    }
    if (locationSet) {
        await searchYouBike(true, false); 
        updateResultsOrder();
        showMainContent(); 
    } else {
        showNotification(currentLang === "en" ? "Could not determine location. Please check settings." : "無法確定位置，請檢查設定。");
        if (!mainContentShown) {
              showMainContent(); 
        }
    }
}

export function handleGeoUpdate(position) {
    const newLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
    if (!hasObtainedRealLocation) {
        hasObtainedRealLocation = true;
        userLocation = newLocation;
        if (locationMarker) {
            locationMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
        }
        if (pulsingMarker) {
            pulsingMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
        }
        if (leafletMap) {
            isMapMovingDueToTracking = true; 
            leafletMap.setView([userLocation.latitude, userLocation.longitude], leafletMap.getZoom() || 18, { animate: true, duration: 0.5 }); 
            setTimeout(() => { isMapMovingDueToTracking = false; }, 600); 
        }
        searchYouBike(true, false);
        isFollowingUser = true; 
        updateLocateButtonTitle(); 
        return; 
    }
    let movedSignificantly = false;
    if (lastKnownLocation) {
      const distance = calculateDistance(
        lastKnownLocation.latitude,
        lastKnownLocation.longitude,
        newLocation.latitude,
        newLocation.longitude
      );
      if (distance * 1000 > 500) { 
        movedSignificantly = true;
        if (leafletMap) {
          isMapMovingDueToTracking = true; 
          leafletMap.setView([newLocation.latitude, newLocation.longitude], leafletMap.getZoom(), { animate: true, duration: 0.5 }); 
          setTimeout(() => { isMapMovingDueToTracking = false; }, 600); 
        }
      }
    }
    lastKnownLocation = newLocation; 
    userLocation = newLocation; 
    if (locationMarker) {
      locationMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
    }
    if (pulsingMarker) {
      pulsingMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
    }
    if (isFollowingUser && leafletMap) {
      isMapMovingDueToTracking = true; 
      leafletMap.setView([userLocation.latitude, userLocation.longitude], leafletMap.getZoom(), { animate: true, duration: 0.5 }); 
      setTimeout(() => { isMapMovingDueToTracking = false; }, 600); 
    }
    if (movedSignificantly) {
        const updateButton = document.getElementById('updateCountdown');
        if (updateButton) {
          countdownTimer.update(); 
        }
    } else {
        updateCardDistances(); 
        updateResultsOrder(); 
              }
}

export function handleGeoUpdateError(error) {
    isFollowingUser = false; 
              updateLocateButtonTitle(); 
    if (isTrackingActive || error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
        let errorMessage = currentLang === "en"
          ? "Unable to update location, continuing with last known position"
          : "無法更新位置，將繼續使用上次的定位";
        if (error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
            errorMessage = currentLang === "en"
              ? "Location services unavailable, stopping tracking."
              : "定位服務無法使用，已停止追蹤。";
            stopTracking(); 
            if (!hasObtainedRealLocation) {
                hasObtainedRealLocation = false;
            }
        } else if (error.code === GeolocationPositionError.TIMEOUT) {
              errorMessage = currentLang === "en"
              ? "Location update timed out."
              : "定位更新逾時。";
        }
        const notification = document.getElementById('locationNotification');
        notification.textContent = errorMessage;
        notification.classList.add('show');
        setTimeout(() => {
          notification.classList.add('hide'); 
          setTimeout(() => {
            notification.classList.remove('show', 'hide'); 
          }, 300); 
        }, 3000); 
    }
}

export function toggleTracking() {
    const centralLocationToggle = document.getElementById('centralLocationToggle');
    const isLocationServiceOn = centralLocationToggle.checked;
    const locateButton = document.getElementById('locateButton');
    if (!isLocationServiceOn) {
        showNotification(currentLang === "en" ? "Location service is off (using default region)." : "位置服務已關閉 (使用預設地區)。");
        isFollowingUser = false; 
        stopTracking(); 
        hasObtainedRealLocation = false; 
        const selectedRegion = document.getElementById('centralRegionSelect').value;
        const coords = regionCoordinates[selectedRegion];
        userLocation = { latitude: coords.lat, longitude: coords.lng };
        if (leafletMap) {
            isMapMovingDueToTracking = true; 
            leafletMap.setView([userLocation.latitude, userLocation.longitude], leafletMap.getZoom() || 18, { animate: true, duration: 0.5 }); 
            setTimeout(() => { isMapMovingDueToTracking = false; }, 600); 
        }
        if (locationMarker) {
            locationMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
        }
        if (pulsingMarker) {
            pulsingMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
        }
        updateCardDistances(); 
        updateVehicleData(); 
        updateResultsOrder(); 
    } else {
        isFollowingUser = true; 
        showNotification(currentLang === "en" ? "Location tracking enabled." : "已開啟位置追蹤功能。");
        startTracking(); 
        if (leafletMap && userLocation && hasObtainedRealLocation) {
              isMapMovingDueToTracking = true; 
              leafletMap.setView([userLocation.latitude, userLocation.longitude], leafletMap.getZoom() || 18, { animate: true, duration: 0.5 }); 
              setTimeout(() => { isMapMovingDueToTracking = false; }, 600); 
          } else if (leafletMap) {
              navigator.geolocation.getCurrentPosition(
                  (position) => {
                  },
                  (error) => {
                      showNotification(currentLang === "en" ? "Failed to get immediate location." : "無法立即取得目前位置。");
                      if (!hasObtainedRealLocation && leafletMap) {
                          const selectedRegion = document.getElementById('centralRegionSelect').value;
                          const coords = regionCoordinates[selectedRegion];
                          userLocation = { latitude: coords.lat, longitude: coords.lng };
                          isMapMovingDueToTracking = true; 
                          leafletMap.setView([userLocation.latitude, userLocation.longitude], leafletMap.getZoom() || 18, { animate: true, duration: 0.5 }); 
                          setTimeout(() => { isMapMovingDueToTracking = false; }, 600); 
                          if (locationMarker) {
                              locationMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
                              if (pulsingMarker) pulsingMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
                          }
                          updateCardDistances();
                          updateVehicleData();
                          updateResultsOrder();
                      }
                  },
                  { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
              );
          }
    }
    updateLocateButtonTitle(); 
}

export function updateLocateButtonTitle() {
    const locateButton = document.getElementById('locateButton');
    if (locateButton) {
        const centralLocationToggle = document.getElementById('centralLocationToggle');
        const isLocationServiceOn = centralLocationToggle?.checked; 
        if (!isLocationServiceOn) {
            locateButton.title = currentLang === "en" ? "Location service off (using default region)" : "定位服務已關閉 (使用預設地區)";
            locateButton.style.color = '#666'; 
        } else if (isFollowingUser) {
            locateButton.title = currentLang === "en" ? "Following your location" : "正在跟隨您的位置";
            locateButton.style.color = '#007BFF'; 
        } else {
            locateButton.title = currentLang === "en" ? "Go to my location" : "定位到我目前位置";
            locateButton.style.color = '#333'; 
        }
    }
}