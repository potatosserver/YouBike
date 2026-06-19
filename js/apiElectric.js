import { dom } from './domElements.js';
import { state } from './config.js';
import { showNotification } from './loadingService.js';
import { langStrings } from './language.js';

export async function showElectricBikeDetailsModal(stationId, stationName) {
    if (!navigator.onLine) {
        showNotification(state.currentLang === "en" ? "Offline: Cannot get electric bike details." : "離線狀態：無法取得電輔車詳細資訊。");
        return;
    }
    
    const bikeListUrl = `https://apis.youbike.com.tw/api/front/bike/lists?station_no=${stationId}`;
    dom.routeModalTitle.textContent = langStrings.electricBikeDetailsTitle[state.currentLang] + stationName;
    dom.routeDetailsDiv.innerHTML = langStrings.gettingBikeData[state.currentLang];
    
    dom.routeModal.style.display = 'block';
    dom.routeModal.style.opacity = '1'; // 修正：強制設定為不透明，解決因 CSS 動畫未執行而隱形的問題
    dom.routeModal.classList.remove('modal-close'); 
    dom.routeModal.classList.add('modal-open'); 
    dom.overlay.classList.add('show');
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (data.retCode === 1 && data.retVal && data.retVal.length > 0) {
            data.retVal.sort((a, b) => b.battery_power - a.battery_power);
            let bikeListHtml = '<ul>';
            data.retVal.forEach(bike => {
                bikeListHtml += `
                    <li class="bike-item">
                        <p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">directions_bike</span>${langStrings.bikeNumberLabel[state.currentLang]}${bike.bike_no}</p>
                        <p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">location_on</span>${langStrings.pillarNumberLabel[state.currentLang]}${bike.pillar_no}</p>
                        <p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">battery_charging_full</span>${langStrings.batteryPowerLabel[state.currentLang]}${bike.battery_power}%</p>
                    </li>
                `;
            });
            bikeListHtml += '</ul>';
            dom.routeDetailsDiv.innerHTML = bikeListHtml;
        } else {
            dom.routeDetailsDiv.innerHTML = `<p>${langStrings.noElectricBikes[state.currentLang]}</p>`;
        }
    } catch (error) {
        console.error("Error fetching electric bike data:", error);
        dom.routeDetailsDiv.innerHTML = `<p>${langStrings.failedToGetBikeData[state.currentLang]}</p>`;
    }
}