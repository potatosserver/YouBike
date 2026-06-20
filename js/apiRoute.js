
import { dom } from './domElements.js';
import { state, config } from './config.js';
import { showNotification } from './loadingService.js';

export async function getRoute(startLat, startLng, endLat, endLng, stationName) {
    if (!navigator.onLine) {
        showNotification(state.currentLang === "en" ? "Offline: Cannot get route information." : "離線狀態：無法取得路線資訊");
        return;
    }
    if (!state.userLocation) {
         showNotification(state.currentLang === "en" ? "Your location is not available." : "無法取得您的位置。");
         return;
    }
    
    const profile = 'foot'; 
    const locale = state.currentLang === "en" ? "en" : "zh-TW"; 
    const url = `https://graphhopper.com/api/1/route?profile=${profile}&locale=${locale}&key=${config.graphhopperApiKey}&elevation=false&instructions=true&point=${startLat},${startLng}&point=${endLat},${endLng}`;
    
    dom.routeDetailsDiv.innerHTML = state.currentLang === "en" ? "Calculating route..." : "計算路線中...";
    dom.routeModalTitle.textContent = state.currentLang === "en" ? "Route to " + stationName : "前往 " + stationName + " 的路線";
    
    dom.routeModal.style.display = 'block';
    dom.routeModal.style.opacity = '1'; // 修正：強制設定為不透明，解決因 CSS 動畫未執行而隱形的問題
    dom.routeModal.classList.remove('modal-close'); 
    dom.routeModal.classList.add('modal-open'); 
    dom.overlay.classList.add('show');
    
    history.pushState({ modalOpen: true, type: 'route' }, 'Route', '#route'); 
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${response.status} - ${errorData.message || response.statusText}`);
        }
        const data = await response.json();
        if (data.paths && data.paths.length > 0) {
            displayRouteDetails(data.paths[0], stationName); 
        } else {
            dom.routeDetailsDiv.innerHTML = state.currentLang === "en" ? "No route found." : "找不到路線。";
        }
    } catch (error) {
        console.error("Error fetching route:", error);
        dom.routeDetailsDiv.innerHTML = `${state.currentLang === "en" ? "Failed to get route: " : "取得路線失敗："} ${error.message}`;
    }
}

function displayRouteDetails(routeData, stationName) {
    let html = '';
    const distanceKm = (routeData.distance / 1000).toFixed(2);
    const timeMinutes = Math.round(routeData.time / 60000); 
    
    html += `<p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">directions_walk</span>${state.currentLang === "en" ? "Distance: " : "距離："} ${distanceKm} km</p>`;
    html += `<p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">timer</span>${state.currentLang === "en" ? "Estimated Time: " : "預計時間："} ${timeMinutes} ${state.currentLang === "en" ? "minutes" : "分鐘"}</p>`;
    
    if (routeData.instructions && routeData.instructions.length > 0) {
        html += '<ul>';
        routeData.instructions.forEach(instruction => {
            let iconName = 'arrow_forward'; 
            switch (instruction.sign) {
                case -3: iconName = 'u_turn_left'; break;
                case -2: case -1: case 6: iconName = 'turn_left'; break;
                case 0: iconName = 'arrow_upward'; break;
                case 1: case 2: case 7: iconName = 'turn_right'; break;
                case 3: iconName = 'u_turn_right'; break;
                case 4: case 8: iconName = 'flag'; break;
                case 5: iconName = 'settings_ethernet'; break;
                case -7: iconName = 'roundabout_left'; break;
                case 7: iconName = 'roundabout_right'; break;
                case -8: iconName = 'exit_to_app'; break;
                case -9: iconName = 'location_on'; break;
            }
            html += `
                <li class="bike-item">
                    <p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">${iconName}</span>${instruction.text}</p>
                    <p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">straighten</span>${(instruction.distance / 1000).toFixed(2)} km</p>
                    <p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">schedule</span>${Math.round(instruction.time / 60000)} min</p>
                </li>
            `;
        });
        html += `</ul>`;
    } else {
        html += `<p>${state.currentLang === "en" ? "No detailed instructions available." : "無詳細導航步驟。"}</p>`;
    }
    dom.routeDetailsDiv.innerHTML = html;
}
