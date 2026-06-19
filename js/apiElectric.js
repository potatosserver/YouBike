import { overlay, modal } from './domElements.js';
import { routeModal, routeDetailsDiv, routeModalTitle } from './apiRoute.js';
import { currentLang } from './language.js';

export async function showElectricBikeDetailsModal(stationId, stationName) {
    if (!navigator.onLine) {
        showNotification(currentLang === "en" ? "Offline: Cannot get electric bike details." : "離線狀態：無法取得電輔車詳細資訊。");
        return;
    }
    const bikeListUrl = `https://apis.youbike.com.tw/api/front/bike/lists?station_no=${stationId}`;
    routeModalTitle.textContent = window.langStrings.electricBikeDetailsTitle[currentLang] + stationName;
    routeDetailsDiv.innerHTML = window.langStrings.gettingBikeData[currentLang];
    routeModal.style.display = 'block';
    routeModal.classList.remove('modal-close'); 
    routeModal.classList.add('modal-open'); 
    overlay.classList.add('show');
    history.pushState({ modalOpen: true, type: 'electric' }, 'Electric Bikes', '#electric'); 
    try {
        const response = await fetch(bikeListUrl, {
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'zh-TW,zh;q=0.9',
                'Origin': 'https://www.youbike.com.tw', 
                'Referer': 'https://www.youbike.com.tw/' 
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.retCode === 1 && data.retVal && data.retVal.length > 0) {
            data.retVal.sort((a, b) => b.battery_power - a.battery_power);
            let bikeListHtml = '<ul>';
            data.retVal.forEach(bike => {
                bikeListHtml += `
                    <li class="bike-item">
                        <p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">directions_bike</span>${window.langStrings.bikeNumberLabel[currentLang]}${bike.bike_no}</p>
                        <p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">location_on</span>${window.langStrings.pillarNumberLabel[currentLang]}${bike.pillar_no}</p>
                        <p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">battery_charging_full</span>${window.langStrings.batteryPowerLabel[currentLang]}${bike.battery_power}%</p>
                    </li>
                `;
            });
            bikeListHtml += '</ul>';
            routeDetailsDiv.innerHTML = bikeListHtml;
        } else {
            routeDetailsDiv.innerHTML = `<p>${window.langStrings.noElectricBikes[currentLang]}</p>`;
        }
    } catch (error) {
        console.error("Error fetching electric bike data:", error);
        routeDetailsDiv.innerHTML = `<p>${window.langStrings.failedToGetBikeData[currentLang]}</p>`;
    }
}