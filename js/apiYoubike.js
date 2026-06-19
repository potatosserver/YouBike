import { defaultLatitude, defaultLongitude } from './config.js';
import { resultsDiv, keywordInput, mainContent } from './domElements.js';
import { calculateDistance } from './distanceUtils.js';
import { pinnedStations, togglePinStation, updateResultsOrder } from './pinService.js';
import { youbikeDataCache, allStations, saveYoubikeDataToDB, getYoubikeDataFromDB } from './dbService.js';
import { getRoute } from './apiRoute.js';
import { showElectricBikeDetailsModal } from './apiElectric.js';
import { leafletMap, updateMapMarkers } from './mapService.js';
import { userLocation, isFollowingUser, isMapMovingDueToTracking, updateLocateButtonTitle } from './locationTracker.js';
import { currentLang } from './language.js';
import { countdownTimer } from './countdown.js';

export async function searchYouBike(showLoadingIndicator = true, shouldMoveMap = false) {
  const currentScrollTop = mainContent.scrollTop;
  const keyword = keywordInput.value.trim().toLowerCase();
  try {
    if (!youbikeDataCache || youbikeDataCache.length === 0) {
        if (!navigator.onLine) {
            showNotification(currentLang === "en" ? "You are offline and station data is not available." : "您已離線且無站點資料。");
            return;
        }
        try {
            const youbikeUrl = "https://apis.youbike.com.tw/json/station-min-yb2.json";
            const response = await fetch(youbikeUrl, {
              headers: {
                'accept': '*/*',
                'accept-language': 'zh-TW,zh;q=0.9',
              }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const fetchedData = await response.json();
            youbikeDataCache = Array.isArray(fetchedData)
              ? fetchedData.map(item => ({ ...item, lat: parseFloat(item.lat), lng: parseFloat(item.lng) }))
              : [];
            await saveYoubikeDataToDB(youbikeDataCache); 
        } catch (error) {
            youbikeDataCache = await getYoubikeDataFromDB();
              if (!youbikeDataCache || youbikeDataCache.length === 0) {
                throw new Error("無法從網路或快取載入資料。");
              }
        }
    }
    allStations = [...youbikeDataCache]; 
    let youbikeResults = [...youbikeDataCache];
    if (keyword) {
      youbikeResults = youbikeResults.filter(station => {
        const stationNameTW = station.name_tw ? station.name_tw.toLowerCase() : '';
        const stationAddressTW = station.address_tw ? station.address_tw.toLowerCase() : '';
        const stationNameEN = station.name_en ? station.name_en.toLowerCase() : '';
        const stationAddressEN = station.address_en ? station.address_en.toLowerCase() : '';
        return stationNameTW.includes(keyword) || stationAddressTW.includes(keyword) ||
                stationNameEN.includes(keyword) || stationAddressEN.includes(keyword);
      });
    }
    youbikeResults = youbikeResults.sort((a, b) => {
      const distA = calculateDistance(
        userLocation ? userLocation.latitude : defaultLatitude,
        userLocation ? userLocation.longitude : defaultLongitude,
        a.lat, a.lng
      );
      const distB = calculateDistance(
        userLocation ? userLocation.latitude : defaultLatitude,
        userLocation ? userLocation.longitude : defaultLongitude,
        b.lat, b.lng
      );
      return distA - distB;
    });
    let limit = keyword ? 50 : 10; 
    let usedStations;
    const pinnedFromResults = youbikeResults.filter(station => pinnedStations.has(String(station.station_no)));
    const unpinnedFromResults = youbikeResults.filter(station => !pinnedStations.has(String(station.station_no)));
    usedStations = [...pinnedFromResults, ...unpinnedFromResults].slice(0, limit);
    if (shouldMoveMap && usedStations.length > 0 && leafletMap) {
        const firstStation = usedStations[0];
        const lat = parseFloat(firstStation.lat);
        const lng = parseFloat(firstStation.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            isMapMovingDueToTracking = true; 
            leafletMap.setView([lat, lng], leafletMap.getZoom() || 18, { animate: true, duration: 0.5 }); 
            setTimeout(() => { isMapMovingDueToTracking = false; }, 600); 
        }
    }
    const stationIdsToQuery = usedStations.map(station => station.station_no);
    let vehicleData = {};
    if (navigator.onLine && stationIdsToQuery.length > 0) {
        try {
            vehicleData = await queryVehicleData(stationIdsToQuery);
        } catch (e) {
            showNotification(currentLang === "en" ? "Failed to get real-time data." : "無法取得即時資料。");
        }
    }
    resultsDiv.innerHTML = ''; 
    const unknownValue = currentLang === "en" ? "Unknown" : "未知";
    const addressLabel = currentLang === "en" ? "Address:" : "地址:";
    const slotsLabel = currentLang === "en" ? "Available Slots:" : "可停空位數:";
    const unknownStation = currentLang === "en" ? "Unknown Station" : "未知站點";
    const unknownAddress = currentLang === "en" ? "Unknown Address" : "未知地址";
    const distanceLabel = currentLang === "en" ? "Distance:" : "距離:";
    const navigateButtonText = currentLang === "en" ? "Navigate" : "導航";
    usedStations.forEach(site => {
      const info = {
        id: String(site.station_no),
        name: currentLang === "en" ? site.name_en : site.name_tw,
        coords: [site.lat, site.lng],
        district: currentLang === "en" ? site.district_en : site.district_tw,
        address: currentLang === "en" ? site.address_en : site.address_tw
      };
      const isPinned = pinnedStations.has(String(info.id));
      const pinButtonHtml = `<span
        class="material-icons pin-button ${isPinned ? 'pinned' : ''}"
        data-id="${info.id}"
        onclick="togglePinStation('${info.id}', event)"
      >${isPinned ? 'star' : 'star_outline'}</span>`;
      const navigateButtonHtml = `<button class="navigate-button" data-lat="${info.coords[0]}" data-lng="${info.coords[1]}" data-name="${info.name}">
          <span class="material-icons">navigation</span>
      </button>`;
      const stationVehicleData = vehicleData[info.id];
      const displayAvailable20 = stationVehicleData?.available_2_0 !== undefined ? stationVehicleData.available_2_0 : unknownValue;
      const displayAvailableE = stationVehicleData?.available_e !== undefined ? stationVehicleData.available_e : unknownValue;
      const displayEmptySpaces = stationVehicleData?.empty_spaces !== undefined ? stationVehicleData.empty_spaces : unknownValue;
      const electricIconHtml = (displayAvailableE !== unknownValue && parseInt(displayAvailableE) > 0)
          ? `<span class="material-symbols-outlined electric-icon show" title="${currentLang === "en" ? "Electric Bike Available" : "有電輔車"}" data-station-id="${info.id}" data-station-name="${info.name}">offline_bolt</span>`
          : `<span class="material-symbols-outlined electric-icon" title="${currentLang === "en" ? "Electric Bike Available" : "有電輔車"}" data-station-id="${info.id}" data-station-name="${info.name}">offline_bolt</span>`;
      const distance = calculateDistance(
        userLocation ? userLocation.latitude : defaultLatitude,
        userLocation ? userLocation.longitude : defaultLongitude,
        info.coords[0],
        info.coords[1]
      );
      const displayDistance = distance < 1 ? Math.round(distance * 1000) + (currentLang === "en" ? " m" : " 公尺")
                                        : distance.toFixed(2) + (currentLang === "en" ? " km" : " 公里");
      const isAtDefaultLocation = userLocation && userLocation.latitude === defaultLatitude && userLocation.longitude === defaultLongitude;
      const distanceHTML = !isAtDefaultLocation ? `<p class="distance">${distanceLabel} ${displayDistance}</p>` : "";
      const cardContent = `
                <div class="header">
                    <h3>${info.name || unknownStation}</h3>
                    <div class="icon-group">
                        ${electricIconHtml}
                        ${pinButtonHtml}
                        ${navigateButtonHtml}
                    </div>
                </div>
                ${distanceHTML}
                <p>${addressLabel} ${info.address || unknownAddress}</p>
                <p>YouBike 2.0: <span class="vehicle_yb2">${displayAvailable20}</span></p>
                <p>YouBike 2.0E: <span class="vehicle_ybe">${displayAvailableE}</span></p>
                <p>${slotsLabel} <span class="vehicle_empty">${displayEmptySpaces}</span></p>
                <div class="footer">
                </div>
            `;
      let card = document.createElement('div');
      card.className = 'station';
      card.dataset.id = info.id;
      card.dataset.lat = info.coords[0]; 
      card.dataset.lng = info.coords[1]; 
      card.style.width = window.innerWidth < 768 ? (window.innerWidth < 480 ? "100%" : "calc(50% - 10px)") : "calc(33% - 14px)";
      card.innerHTML = cardContent;
      const navigateButton = card.querySelector('.navigate-button');
      navigateButton.addEventListener('click', (event) => {
          event.stopPropagation(); 
          const button = event.currentTarget;
          const stationLat = parseFloat(button.dataset.lat);
          const stationLng = parseFloat(button.dataset.lng);
          const stationName = button.dataset.name;
          if (userLocation && !isNaN(stationLat) && !isNaN(stationLng)) {
              getRoute(userLocation.latitude, userLocation.longitude, stationLat, stationLng, stationName);
          } else {
              showNotification(currentLang === "en"
                  ? "Your location is not available for navigation."
                  : "無法取得您的位置，無法規劃路線。");
          }
      });
      const electricIcon = card.querySelector('.electric-icon');
      if (electricIcon) {
          electricIcon.addEventListener('click', (event) => {
              event.stopPropagation(); 
              const stationId = event.target.dataset.stationId;
              const stationName = event.target.dataset.stationName;
              if (stationId) {
                  showElectricBikeDetailsModal(stationId, stationName);
              }
          });
      }
      card.addEventListener("click", () => {
        const lat = parseFloat(card.dataset.lat); 
        const lng = parseFloat(card.dataset.lng); 
        if (!isNaN(lat) && !isNaN(lng) && leafletMap) {
          isMapMovingDueToTracking = true; 
          leafletMap.setView([lat, lng], 18, { animate: true, duration: 0.5 }); 
          setTimeout(() => { isMapMovingDueToTracking = false; }, 600); 
        }
        isFollowingUser = false; 
        updateLocateButtonTitle(); 
      });
      resultsDiv.appendChild(card);
    });
    updateResultsOrder(); 
    updateMapMarkers(); 
  } catch (error) {
    resultsDiv.innerHTML = `發生錯誤: ${error.message}`;
  }
  countdownTimer.reset();
  mainContent.scrollTop = currentScrollTop;
}

export async function queryVehicleData(stationIds) {
  if (stationIds.length > 60) { 
    stationIds = stationIds.slice(0, 60);
  }
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
        method: 'POST',
        headers,
        body
      });
      const result = await response.json();
      if (result.retCode === 1 && result.retVal && result.retVal.data) {
        const dataArray = result.retVal.data;
        dataArray.forEach(item => {
          allVehicleData[item.station_no] = {
            available_2_0: item.available_spaces_detail ? item.available_spaces_detail.yb2 : 0,
            available_e: item.available_spaces_detail ? item.available_spaces_detail.eyb : 0,
            empty_spaces: item.empty_spaces || 0
          };
        });
      } else {
      }
    } catch (e) {
    }
  }
  return allVehicleData;
}