import { overlay, modal } from './domElements.js';
import { userLocation } from './locationTracker.js';
import { currentLang } from './language.js';

export const routeModal = document.getElementById('routeModal');
export const routeDetailsDiv = document.getElementById('routeDetails');
export const closeRouteModalButton = document.getElementById('closeRouteModal');
export const routeModalTitle = document.getElementById('routeModalTitle');

export async function getRoute(startLat, startLng, endLat, endLng, stationName) {
    if (!navigator.onLine) {
        showNotification(currentLang === "en" ? "Offline: Cannot get route information." : "離線狀態：無法取得路線資訊");
        return;
    }
    if (!userLocation) {
          showNotification(currentLang === "en" ? "Your location is not available." : "無法取得您的位置。");
          return;
    }
    const apiKey = '7cb4eb19-e0f4-40a3-a5e0-f2c039366f32'; 
    const profile = 'foot'; 
    const locale = currentLang === "en" ? "en" : "zh-TW"; 
    const url = `https://graphhopper.com/api/1/route?profile=${profile}&locale=${locale}&key=${apiKey}&elevation=false&instructions=true&point=${startLat},${startLng}&point=${endLat},${endLng}`;
    routeDetailsDiv.innerHTML = currentLang === "en" ? "Calculating route..." : "計算路線中...";
    routeModalTitle.textContent = currentLang === "en" ? "Route to " + stationName : "前往 " + stationName + " 的路線";
    routeModal.style.display = 'block';
    routeModal.classList.remove('modal-close'); 
    routeModal.classList.add('modal-open'); 
    overlay.classList.add('show');
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
            routeDetailsDiv.innerHTML = currentLang === "en" ? "No route found." : "找不到路線。";
        }
    } catch (error) {
        console.error("Error fetching route:", error);
        routeDetailsDiv.innerHTML = `${currentLang === "en" ? "Failed to get route: " : "取得路線失敗："} ${error.message}`;
    }
}

export function displayRouteDetails(routeData, stationName) {
    let html = `<h4>${currentLang === "en" ? "Route to " : "前往 "}${stationName}</h4>`;
    const distanceKm = (routeData.distance / 1000).toFixed(2);
    const timeMinutes = Math.round(routeData.time / 60000); 
    html += `<p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">directions_walk</span>${currentLang === "en" ? "Distance: " : "距離："} ${distanceKm} km</p>`;
    html += `<p><span class="material-icons" style="font-size: 18px; vertical-align: middle;">timer</span>${currentLang === "en" ? "Estimated Time: " : "預計時間："} ${timeMinutes} ${currentLang === "en" ? "minutes" : "分鐘"}</p>`;
    if (routeData.instructions && routeData.instructions.length > 0) {
        html += `<h4>${currentLang === "en" ? "Instructions:" : "導航步驟："}</h4><ul>`;
        routeData.instructions.forEach(instruction => {
            let iconName = 'arrow_forward'; 
            switch (instruction.sign) {
                case -3: 
                    iconName = 'u_turn_left';
                    break;
                case -2: 
                case -1: 
                case 6:  
                    iconName = 'turn_left';
                    break;
                case 0: 
                    iconName = 'arrow_upward';
                    break;
                case 1: 
                case 2: 
                case 7: 
                    iconName = 'turn_right';
                    break;
                case 3: 
                    iconName = 'u_turn_right';
                    break;
                case 4: 
                    iconName = 'flag';
                    break;
                case 5: 
                    iconName = 'settings_ethernet';
                    break;
                case -7: 
                    iconName = 'roundabout_left';
                    break;
                case 7: 
                    iconName = 'roundabout_right';
                    break;
                case -8: 
                    iconName = 'exit_to_app';
                    break;
                case 8: 
                    iconName = 'flag'; 
                    break;
                case -9: 
                    iconName = 'location_on';
                    break;
                default:
                    iconName = 'arrow_forward';
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
        html += `<p>${currentLang === "en" ? "No detailed instructions available." : "無詳細導航步驟。"}</p>`;
    }
    routeDetailsDiv.innerHTML = html;
}