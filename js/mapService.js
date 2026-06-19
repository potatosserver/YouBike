import { defaultLatitude, defaultLongitude } from './config.js';
import { queryVehicleData } from './apiYoubike.js';
import { isFollowingUser, toggleTracking, updateLocateButtonTitle } from './locationTracker.js';
import { currentLang } from './language.js';

export let locationMarker = null;
export let pulsingMarker = null;

export async function initMap(stations) {
  if (leafletMap) {
    return;
  }
  leafletMap = L.map('map', {
    dragging: true,
    tap: true, 
    touchZoom: true,
    doubleClickZoom: true,
    scrollWheelZoom: true,
    zoomControl: true 
  }).setView([defaultLatitude, defaultLongitude], 18); 
  leafletMap.getPanes().popupPane.style.zIndex = "9999";
  try {
      tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(leafletMap);
      const isDarkMode = document.body.classList.contains('dark-mode');
      if (isDarkMode && tileLayer._container) {
          tileLayer._container.style.filter = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
          const attribution = document.querySelector('.leaflet-control-attribution');
          if (attribution) {
              attribution.style.color = '#ccc'; 
          }
      }
  } catch(err) {
      showNotification(currentLang === "en"
          ? "Map tiles unavailable."
          : "地圖圖層無法載入。");
  }
  markerClusterGroup = L.markerClusterGroup();
  if (leafletMap && markerClusterGroup) {
    leafletMap.addLayer(markerClusterGroup);
  }
  let locateControl = L.control({ position: 'topleft' });
  locateControl.onAdd = function(map) {
      let btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
      btn.id = 'locateButton';
      btn.innerHTML = '<i class="material-icons" style="font-size:18px; line-height:30px;">my_location</i>';
      btn.style.width = '30px';
      btn.style.height = '30px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.padding = '0';
      btn.style.cursor = 'pointer';
      btn.title = currentLang === "en" ? "Go to my location" : "定位到我目前位置"; 
      L.DomEvent.on(btn, 'click', function(e) {
          L.DomEvent.stopPropagation(e); 
          L.DomEvent.preventDefault(e); 
          toggleTracking(); 
          updateLocateButtonTitle(); 
      });
      return btn;
  };
  locateControl.addTo(leafletMap);
  function disableFollowingOnManualInteraction() {
      if (isFollowingUser) {
          isFollowingUser = false;
          showNotification(currentLang === "en" ? "Auto-following stopped." : "已停止自動跟隨。");
          updateLocateButtonTitle();
      }
  }
  leafletMap.on('dragstart', disableFollowingOnManualInteraction);
  leafletMap.on('zoomstart', disableFollowingOnManualInteraction);
  try {
    const currentStations = Array.isArray(stations) ? stations : [];
    if (markerClusterGroup) {
      markerClusterGroup.clearLayers();
    }
    currentStations.forEach(station => {
      const lat = parseFloat(station.lat);
      const lng = parseFloat(station.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = L.marker([lat, lng]);
        marker.on('click', async () => {
          try {
            let stationInfo = {};
            if (navigator.onLine) {
              const vehicleData = await queryVehicleData([station.station_no]);
              stationInfo = vehicleData[station.station_no] || {};
            }
            const content = `
              <h4>${currentLang === "en" ? station.name_en : station.name_tw}</h4>
              <p>${currentLang === "en" ? "Address: " : "地址："} ${currentLang === "en" ? station.address_en : station.address_tw}</p>
              ${navigator.onLine ? `
                <p>YouBike 2.0: ${stationInfo.available_2_0 !== undefined ? stationInfo.available_2_0 : (currentLang === "en" ? 'Unknown' : '未知')}</p>
                <p>YouBike 2.0E: ${stationInfo.available_e !== undefined ? stationInfo.available_e : (currentLang === "en" ? 'Unknown' : '未知')}</p>
                <p>${currentLang === "en" ? "Available Slots: " : "可停空位數："} ${stationInfo.empty_spaces !== undefined ? stationInfo.empty_spaces : (currentLang === "en" ? 'Unknown' : '未知')}</p>
              ` : `<p>${currentLang === "en" ? "Offline. Real-time data unavailable." : "離線中，即時資料無法取得。"}</p>`}
            `;
            marker.bindPopup(content).openPopup();
            isFollowingUser = false; 
            updateLocateButtonTitle(); 
          } catch (error) {
            showNotification(currentLang === "en" ? "Failed to get station information." : "無法取得站點資訊。");
          }
        });
        markerClusterGroup.addLayer(marker);
      }
    });
    if (leafletMap && markerClusterGroup) {
        leafletMap.addLayer(markerClusterGroup);
    }
  } catch (error) {
    showNotification(currentLang === "en" ? "Failed to initialize map." : "初始化地圖失敗。");
  }
}

export function updateMapMarkers() {
  if (!markerClusterGroup || !leafletMap) {
    return;
  }
  try {
    markerClusterGroup.eachLayer(marker => {
      marker.setIcon(L.icon({
        iconUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      }));
    });
    const stationCards = document.querySelectorAll('.station');
    stationCards.forEach(card => {
      const lat = parseFloat(card.dataset.lat);
      const lng = parseFloat(card.dataset.lng);
      if (markerClusterGroup && typeof markerClusterGroup.eachLayer === 'function') {
        markerClusterGroup.eachLayer(marker => {
          const markerLatLng = marker.getLatLng();
          if (Math.abs(markerLatLng.lat - lat) < 1e-6 && Math.abs(markerLatLng.lng - lng) < 1e-6) {
            marker.setIcon(L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            }));
          }
        });
      }
    });
  } catch (error) {
  }
}