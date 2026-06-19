import { dom } from './domElements.js';
import { state } from './config.js';

export function simulateLoadingPercentage() {
    let prefix = state.currentLang === "en" ? "Loading:" : "載入中：";
    let progress = 0;
    let lockedProgress = null; 
    let loadingTextInterval = setInterval(() => {
        if (!state.mainContentShown) {
            if (progress < 85) { 
                progress++;
                dom.loadingText.textContent = prefix + progress + "%";
            } else {
                if (lockedProgress === null) {
                    lockedProgress = 85 + Math.floor(Math.random() * 11); 
                }
                dom.loadingText.textContent = prefix + lockedProgress + "%";
            }
        } else {
            clearInterval(loadingTextInterval); 
        }
    }, 50); 
}

export function showRandomNotice() {
    const notices = state.currentLang === "en" ? [
        "❌Do not speed or ride in reverse",
        "❌Do not change lanes arbitrarily on sidewalks",
        "❌Do not use your phone while riding",
        "❌Avoid harsh braking while riding",
        "✔️Remember to adjust the seat to a proper height",
        "✔️Ensure that both front and rear lights are working",
        "✔️Remember to get bicycle accident insurance",
        "✔️Take your belongings from the basket"
    ] : [
        "❌勿超速或逆向騎乘",
        "❌勿隨意變換車道在行人道上騎乘",
        "❌勿在車輛行駛中使用手機",
        "❌騎乘中勿緊急煞車",
        "✔️記得調整座墊至適宜高度",
        "✔️確認前後車燈功能正常",
        "✔️記得投保公共自行車傷害險",
        "✔️記得帶走置物籃內的隨身物品"
    ];
    const randomIndex = Math.floor(Math.random() * notices.length);
    if(dom.noticeBox) dom.noticeBox.textContent = notices[randomIndex];
}

export function showNotification(message) {
    if (!dom.locationNotification) return;
    dom.locationNotification.textContent = message;
    dom.locationNotification.classList.add('show'); 
    setTimeout(() => {
        dom.locationNotification.classList.remove('show'); 
    }, 5000);
}

export function showMainContent() {
    if (!state.mainContentShown) {
        dom.loadingOverlay.classList.add('fade-out'); 
        
        // 修正：改用 CSS 類別控制顯示，不使用 JS 硬寫 display 樣式，完美配合 RWD 媒體查詢
        dom.mainContent.classList.add('visible'); 
        dom.mainContent.offsetHeight; // 強制重繪
        dom.mainContent.classList.add('fade-in'); 
        
        dom.mainContent.style.overflowY = 'auto'; 
        dom.updateCountdown.style.display = navigator.onLine ? "flex" : "none";
        
        setTimeout(() => {
            dom.loadingOverlay.style.display = "none"; 
        }, 500); 
        state.mainContentShown = true;
    }
}

export function showOfflineScreen() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    dom.loadingContent.innerHTML = '';
    const offlineIcon = document.createElement('span');
    offlineIcon.className = 'material-icons';
    offlineIcon.textContent = 'wifi_off';
    offlineIcon.style.fontSize = '80px';
    offlineIcon.style.color = isDarkMode ? '#999' : '#888';
    offlineIcon.style.marginBottom = '20px';
    
    const loadingText = document.createElement('h2');
    loadingText.textContent = '請連接網路後重試';
    loadingText.style.fontSize = '1.8em';
    loadingText.style.color = isDarkMode ? '#fff' : '#333';
    loadingText.style.margin = '0';
    
    const retryButton = document.createElement('button');
    retryButton.textContent = '重整';
    retryButton.style.cssText = `
        padding: 12px 24px; font-size: 1.1em; font-weight: 500; cursor: pointer; margin-top: 30px; border-radius: 28px; border: none; transition: background-color 0.3s, box-shadow 0.3s;
    `;
    if (isDarkMode) {
        retryButton.style.backgroundColor = '#e8def8';
        retryButton.style.color = '#1c1b1f';
        retryButton.style.boxShadow = '0 3px 5px rgba(0,0,0,0.3)';
    } else {
        retryButton.style.backgroundColor = '#ffdacf';
        retryButton.style.color = '#333';
        retryButton.style.boxShadow = '0 3px 5px rgba(0,0,0,0.2)';
    }
    retryButton.onclick = () => location.reload();
    
    dom.loadingContent.appendChild(offlineIcon);
    dom.loadingContent.appendChild(loadingText);
    dom.loadingContent.appendChild(retryButton);
}