import { state, config } from './config.js';
import { queryVehicleData } from './apiYoubike.js';
import { showNotification } from './loadingService.js';
import { createLocateControl } from './locationTracker.js'; // 引入新的控制項創建函式

let leafletMap, markerClusterGroup, tileLayer;

// 確保有 STATE.anchors
const STATE = state || { anchors: [] };
if (!STATE.anchors) {
    STATE.anchors = [];
}

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
            attribution: ''
        }).addTo(leafletMap);

        applyMapDarkMode();
    } catch (err) {
        showNotification(state.currentLang === "en" ? "Map tiles unavailable." : "地圖圖層無法載入。");
    }

    markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 80,
        disableClusteringAtZoom: 16,
        spiderfyOnMaxZoom: false,
        iconCreateFunction: function(cluster) {
            const childCount = cluster.getChildCount();
            return L.divIcon({
                html: `<div>${childCount}</div>`,
                className: 'marker-cluster marker-cluster-ubike',
                iconSize: [40, 40]
            });
        }
    });
    leafletMap.addLayer(markerClusterGroup);
    state.bikeCluster = markerClusterGroup;

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

function getVisualPosition(lat, lon) {
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    if (isNaN(lat) || isNaN(lon)) return null;
    const THRESHOLD = 0.00009; // 約 10m 級距離閾值（經緯度）
    for (let anchor of STATE.anchors) {
        const dLat = lat - anchor.lat, dLon = lon - anchor.lon;
        const distSq = (dLat * dLat) + (dLon * dLon);
        if (distSq < (THRESHOLD * THRESHOLD)) {
            // 有接近的 anchor，將新圖釘按環狀偏移
            anchor.count++;
            const angle = anchor.count * 2.399;
            const radius = 0.00010 + (anchor.count * 0.00002);
            return { lat: anchor.lat + (radius * Math.cos(angle)), lng: anchor.lon + (radius * Math.sin(angle)) };
        }
    }
    // 沒有接近的 anchor：新增一個 anchor 並回傳原始座標
    STATE.anchors.push({ lat, lon, count: 0 });
    return { lat, lng: lon };
}

function createYoubikeMarker(station) {
    const lat = parseFloat(station.lat);
    const lng = parseFloat(station.lng);
    if (isNaN(lat) || isNaN(lng)) return null;

    const iconHtml = `<span class="material-icons">directions_bike</span>`;
    const bikeIcon = L.divIcon({
        className: 'custom-icon ubike-icon',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });

    const marker = L.marker([lat, lng], { icon: bikeIcon });
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
    return marker;
}

function createBikeMarkersFromData(stations) {
    if (!markerClusterGroup) return;
    markerClusterGroup.clearLayers();
    STATE.anchors = []; // 清空之前的 anchors

    stations.forEach(s => {
        const pos = getVisualPosition(s.lat, s.lng);
        if (!pos) return;
        const pseudoStation = Object.assign({}, s, { lat: pos.lat, lng: pos.lng });
        const m = createYoubikeMarker(pseudoStation);
        if (m) {
            markerClusterGroup.addLayer(m);
        }
    });

    if (!leafletMap.hasLayer(markerClusterGroup)) {
        leafletMap.addLayer(markerClusterGroup);
    }
}

export function renderMarkers(stations) {
    createBikeMarkersFromData(stations);
}

export function updateMapMarkers() {
    // This function can be simplified or removed, as the new markers are styled via CSS
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
