import { state, config } from './config.js';
import { queryVehicleData } from './apiYoubike.js';
import { showNotification } from './loadingService.js';
import { createLocateControl } from './locationTracker.js'; // 引入新的控制項創建函式

let leafletMap, markerClusterGroup, tileLayer;

export function getMapInstance() {
    return leafletMap;
}

export function initMap(stations) {
    if (leafletMap) return;
    
    leafletMap = L.map('map', {
        dragging: true, tap: true, touchZoom: true,
        doubleClickZoom: true, scrollWheelZoom: true, zoomControl: true 
    }).setView([config.defaultLatitude, config.defaultLongitude], 18); 
    
    leafletMap.getPanes().popupPane.style.zIndex = "9999";
    
    try {
        tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(leafletMap);
        
        applyMapDarkMode();
    } catch(err) {
        showNotification(state.currentLang === "en" ? "Map tiles unavailable." : "地圖圖層無法載入。");
    }
    
    markerClusterGroup = L.markerClusterGroup();
    leafletMap.addLayer(markerClusterGroup);
    
    // 修正：將定位按鈕的創建和添加，統一到 locationTracker.js 中管理
    const locateControl = createLocateControl();
    locateControl.addTo(leafletMap);
    
    leafletMap.on('dragstart', disableFollowingOnManualInteraction);
    leafletMap.on('zoomstart', disableFollowingOnManualInteraction);
    
    renderMarkers(stations);
}

function disableFollowingOnManualInteraction() {
    if (state.isFollowingUser) {
        state.isFollowingUser = false;
        showNotification(state.currentLang === "en" ? "Auto-following stopped." : "已停止自動跟隨。");
        import('./locationTracker.js').then(m => m.updateLocateButtonTitle());
    }
}

export function renderMarkers(stations) {
    if (!markerClusterGroup) return;
    markerClusterGroup.clearLayers();
    
    stations.forEach(station => {
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
                        <h4>${state.currentLang === "en" ? station.name_en : station.name_tw}</h4>
                        <p>${state.currentLang === "en" ? "Address: " : "地址："} ${state.currentLang === "en" ? station.address_en : station.address_tw}</p>
                        ${navigator.onLine ? `
                            <p>YouBike 2.0: ${stationInfo.available_2_0 !== undefined ? stationInfo.available_2_0 : (state.currentLang === "en" ? 'Unknown' : '未知')}</p>
                            <p>YouBike 2.0E: ${stationInfo.available_e !== undefined ? stationInfo.available_e : (state.currentLang === "en" ? 'Unknown' : '未知')}</p>
                            <p>${state.currentLang === "en" ? "Available Slots: " : "可停空位數："} ${stationInfo.empty_spaces !== undefined ? stationInfo.empty_spaces : (state.currentLang === "en" ? 'Unknown' : '未知')}</p>
                        ` : `<p>${state.currentLang === "en" ? "Offline. Real-time data unavailable." : "離線中，即時資料無法取得。"}</p>`}
                    `;
                    marker.bindPopup(content).openPopup();
                    state.isFollowingUser = false; 
                    import('./locationTracker.js').then(m => m.updateLocateButtonTitle());
                } catch (error) {
                    showNotification(state.currentLang === "en" ? "Failed to get station information." : "無法取得站點資訊。");
                }
            });
            markerClusterGroup.addLayer(marker);
        }
    });
}

// 修正3：補回將前十個站點變更為紅色圖標的函式
export function updateMapMarkers() {
    if (!markerClusterGroup || !leafletMap) return;
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
        });
    } catch (error) {
        console.error("更新紅色地圖標記失敗:", error);
    }
}

export function applyMapDarkMode() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    if (tileLayer && tileLayer._container) {
        if (isDarkMode) {
            tileLayer._container.style.filter = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
        } else {
            tileLayer._container.style.filter = 'none';
        }
        const attribution = document.querySelector('.leaflet-control-attribution');
        if (attribution) attribution.style.color = isDarkMode ? '#ccc' : '#333';
    }
}