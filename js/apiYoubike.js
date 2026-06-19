import { dom } from './domElements.js';
import { state, config } from './config.js';
import { saveYoubikeDataToDB, getYoubikeDataFromDB } from './dbService.js';
import { calculateDistance } from './distanceUtils.js';
import { pinnedStations, updateResultsOrder } from './pinService.js';
import { showNotification } from './loadingService.js';
import { getRoute } from './apiRoute.js';
import { showElectricBikeDetailsModal } from './apiElectric.js';
import { updateMapMarkers } from './mapService.js'; // 修正：引入紅標更新

export async function fetchBaseStationData() {
    if (!state.youbikeDataCache || state.youbikeDataCache.length === 0) {
        if (!navigator.onLine) {
            showNotification(state.currentLang === "en" ? "You are offline." : "您已離線。");
            state.youbikeDataCache = await getYoubikeDataFromDB();
            return;
        }
        try {
            const response = await fetch(config.youbikeUrl, {
                headers: { 'accept': '*/*', 'accept-language': 'zh-TW,zh;q=0.9' }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const fetchedData = await response.json();
            state.youbikeDataCache = Array.isArray(fetchedData)
                ? fetchedData.map(item => ({ ...item, lat: parseFloat(item.lat), lng: parseFloat(item.lng) }))
                : [];
            
            await saveYoubikeDataToDB(state.youbikeDataCache); 
        } catch (error) {
            state.youbikeDataCache = await getYoubikeDataFromDB();
            if (!state.youbikeDataCache || state.youbikeDataCache.length === 0) {
                throw new Error("無法從網路或快取載入資料。");
            }
        }
    }
    state.allStations = [...state.youbikeDataCache]; 
}

export async function queryVehicleData(stationIds) {
    if (stationIds.length > 60) stationIds = stationIds.slice(0, 60);
    
    const batchSize = 20; 
    const allVehicleData = {};
    const headers = {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'Origin': 'https://www.youbike.com.tw', 
        'Referer': 'https://www.youbike.com.tw/' 
    };
    
    for (let i = 0; i < stationIds.length; i += batchSize) {
        const stationIdBatch = stationIds.slice(i, i + batchSize);
        const body = JSON.stringify({ station_no: stationIdBatch });
        try {
            const response = await fetch('https://apis.youbike.com.tw/tw2/parkingInfo', {
                method: 'POST', headers, body
            });
            const result = await response.json();
            if (result.retCode === 1 && result.retVal && result.retVal.data) {
                result.retVal.data.forEach(item => {
                    allVehicleData[item.station_no] = {
                        available_2_0: item.available_spaces_detail ? item.available_spaces_detail.yb2 : 0,
                        available_e: item.available_spaces_detail ? item.available_spaces_detail.eyb : 0,
                        empty_spaces: item.empty_spaces || 0
                    };
                });
            }
        } catch (e) {
            console.error(e);
        }
    }
    return allVehicleData;
}

export async function searchYouBike(showLoadingIndicator = true, shouldMoveMap = false, mapInstance = null) {
    const currentScrollTop = dom.mainContent.scrollTop;
    const keyword = dom.keywordInput.value.trim().toLowerCase();
    
    try {
        await fetchBaseStationData();
        
        let youbikeResults = [...state.youbikeDataCache];
        if (keyword) {
            youbikeResults = youbikeResults.filter(station => {
                const nameTw = station.name_tw?.toLowerCase() || '';
                const addrTw = station.address_tw?.toLowerCase() || '';
                const nameEn = station.name_en?.toLowerCase() || '';
                const addrEn = station.address_en?.toLowerCase() || '';
                return nameTw.includes(keyword) || addrTw.includes(keyword) || nameEn.includes(keyword) || addrEn.includes(keyword);
            });
        }
        
        const currentLat = state.userLocation ? state.userLocation.latitude : config.defaultLatitude;
        const currentLng = state.userLocation ? state.userLocation.longitude : config.defaultLongitude;
        
        youbikeResults.sort((a, b) => {
            return calculateDistance(currentLat, currentLng, a.lat, a.lng) - calculateDistance(currentLat, currentLng, b.lat, b.lng);
        });
        
        let limit = keyword ? 50 : 10; 
        const pinned = youbikeResults.filter(s => pinnedStations.has(String(s.station_no)));
        const unpinned = youbikeResults.filter(s => !pinnedStations.has(String(s.station_no)));
        const usedStations = [...pinned, ...unpinned].slice(0, limit);
        
        if (shouldMoveMap && usedStations.length > 0 && mapInstance) {
            state.isMapMovingDueToTracking = true; 
            mapInstance.setView([usedStations[0].lat, usedStations[0].lng], mapInstance.getZoom() || 18, { animate: true, duration: 0.5 }); 
            setTimeout(() => { state.isMapMovingDueToTracking = false; }, 600); 
        }
        
        const stationIdsToQuery = usedStations.map(s => s.station_no);
        let vehicleData = {};
        if (navigator.onLine && stationIdsToQuery.length > 0) {
            try {
                vehicleData = await queryVehicleData(stationIdsToQuery);
            } catch (e) {
                showNotification(state.currentLang === "en" ? "Failed to get real-time data." : "無法取得即時資料。");
            }
        }
        
        dom.resultsDiv.innerHTML = ''; 
        renderStationCards(usedStations, vehicleData, currentLat, currentLng, mapInstance);
        updateResultsOrder(); 
        updateMapMarkers(); // 修正：呼叫紅標更新
        
    } catch (error) {
        dom.resultsDiv.innerHTML = `發生錯誤: ${error.message}`;
    }
    dom.mainContent.scrollTop = currentScrollTop;
}

function renderStationCards(usedStations, vehicleData, currentLat, currentLng, mapInstance) {
    usedStations.forEach(site => {
        const info = {
            id: String(site.station_no),
            name: state.currentLang === "en" ? site.name_en : site.name_tw,
            coords: [site.lat, site.lng],
            address: state.currentLang === "en" ? site.address_en : site.address_tw
        };
        
        const isPinned = pinnedStations.has(info.id);
        const pinHtml = `<span class="material-icons pin-button ${isPinned ? 'pinned' : ''}" data-id="${info.id}">${isPinned ? 'star' : 'star_outline'}</span>`;
        const navHtml = `<button class="navigate-button" data-lat="${info.coords[0]}" data-lng="${info.coords[1]}" data-name="${info.name}"><span class="material-icons">navigation</span></button>`;
        
        const sd = vehicleData[info.id] || {};
        const isUnknown = state.currentLang === "en" ? "Unknown" : "未知";
        const yb2 = sd.available_2_0 !== undefined ? sd.available_2_0 : isUnknown;
        const ybe = sd.available_e !== undefined ? sd.available_e : isUnknown;
        const empty = sd.empty_spaces !== undefined ? sd.empty_spaces : isUnknown;
        
        const electricClass = (ybe !== isUnknown && parseInt(ybe) > 0) ? "show" : "";
        const eleHtml = `<span class="material-symbols-outlined electric-icon ${electricClass}" title="有電輔車" data-id="${info.id}" data-name="${info.name}">offline_bolt</span>`;
        
        const distance = calculateDistance(currentLat, currentLng, info.coords[0], info.coords[1]);
        const distText = distance < 1 ? Math.round(distance * 1000) + (state.currentLang === "en" ? " m" : " 公尺") : distance.toFixed(2) + (state.currentLang === "en" ? " km" : " 公里");
        
        const card = document.createElement('div');
        card.className = 'station';
        card.dataset.id = info.id;
        card.dataset.lat = info.coords[0];
        card.dataset.lng = info.coords[1];
        card.style.width = window.innerWidth < 768 ? (window.innerWidth < 480 ? "100%" : "calc(50% - 10px)") : "calc(33% - 14px)";
        
        card.innerHTML = `
            <div class="header">
                <h3>${info.name}</h3>
                <div class="icon-group">${eleHtml}${pinHtml}${navHtml}</div>
            </div>
            <p class="distance">${state.currentLang === "en" ? "Distance:" : "距離:"} ${distText}</p>
            <p>${state.currentLang === "en" ? "Address:" : "地址:"} ${info.address}</p>
            <p>YouBike 2.0: <span class="vehicle_yb2">${yb2}</span></p>
            <p>YouBike 2.0E: <span class="vehicle_ybe">${ybe}</span></p>
            <p>${state.currentLang === "en" ? "Slots:" : "可停空位數:"} <span class="vehicle_empty">${empty}</span></p>
        `;
        
        card.querySelector('.pin-button').addEventListener('click', (e) => {
            import('./pinService.js').then(module => module.togglePinStation(info.id, e));
        });
        
        card.querySelector('.navigate-button').addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.userLocation) {
                getRoute(state.userLocation.latitude, state.userLocation.longitude, info.coords[0], info.coords[1], info.name);
            } else {
                showNotification(state.currentLang === "en" ? "Location unavailable." : "無法取得您的位置。");
            }
        });
        
        const eleIcon = card.querySelector('.electric-icon');
        if (eleIcon) {
            eleIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                showElectricBikeDetailsModal(info.id, info.name);
            });
        }
        
        card.addEventListener('click', () => {
            if (mapInstance) {
                state.isMapMovingDueToTracking = true;
                mapInstance.setView([info.coords[0], info.coords[1]], 18, { animate: true, duration: 0.5 });
                setTimeout(() => { state.isMapMovingDueToTracking = false; }, 600);
            }
            state.isFollowingUser = false;
        });
        
        dom.resultsDiv.appendChild(card);
    });
}