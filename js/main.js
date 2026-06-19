import { dom } from './domElements.js';
import { state, config, regionCoordinates } from './config.js';
import { simulateLoadingPercentage, showRandomNotice, showOfflineScreen, showNotification } from './loadingService.js';
import { searchYouBike, fetchBaseStationData } from './apiYoubike.js';
import { initMap, getMapInstance, applyMapDarkMode } from './mapService.js';
import { getLocation, updateLocateButtonTitle } from './locationTracker.js';
import { initUIHandlers } from './uiHandlers.js';
import { startCountdown } from './countdown.js';
import { updateLanguageTexts } from './language.js';

// 初始化執行
window.addEventListener('load', async () => {
    if (!navigator.onLine) {
        showOfflineScreen();
    } else {
        await initializeApp();
    }
});

async function initializeApp() {
    simulateLoadingPercentage();
    showRandomNotice();
    
    try {
        await fetchBaseStationData();
        initMap(state.allStations);
        await getLocation();
        initUIHandlers();
        startCountdown();
    } catch (error) {
        renderInitError(error);
    }
}

function renderInitError(error) {
    dom.loadingContent.innerHTML = ''; 
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    const errorIcon = document.createElement('span');
    errorIcon.className = 'material-icons';
    errorIcon.textContent = 'error_outline';
    errorIcon.style.cssText = 'font-size: 80px; color: red; margin-bottom: 20px;';
    
    const errorText = document.createElement('h2');
    errorText.textContent = `初始化失敗: ${error.message}`;
    errorText.style.cssText = 'color: red; font-size: 1.2em;';
    
    const retryBtn = document.createElement('button');
    retryBtn.textContent = '重試';
    retryBtn.style.cssText = `padding: 12px 24px; font-size: 1.1em; font-weight: 500; cursor: pointer; margin-top: 30px; border-radius: 28px; border: none;`;
    retryBtn.style.backgroundColor = isDarkMode ? '#e8def8' : '#ffdacf';
    retryBtn.style.color = isDarkMode ? '#1c1b1f' : '#333';
    retryBtn.onclick = () => location.reload();
    
    dom.loadingContent.appendChild(errorIcon);
    dom.loadingContent.appendChild(errorText);
    dom.loadingContent.appendChild(retryBtn);
}

// 搜尋列事件
dom.keywordInput.addEventListener('input', () => {
    dom.clearTextBtn.style.display = dom.keywordInput.value.trim() ? 'inline-flex' : 'none';
});

dom.clearTextBtn.addEventListener('click', () => {
    dom.keywordInput.value = '';
    dom.clearTextBtn.style.display = 'none';
    if (state.userLocation && getMapInstance()) {
        state.isMapMovingDueToTracking = true;
        getMapInstance().setView([state.userLocation.latitude, state.userLocation.longitude], getMapInstance().getZoom() || 18, { animate: true, duration: 0.5 });
        setTimeout(() => { state.isMapMovingDueToTracking = false; }, 600);
    }
    searchYouBike(true, false, getMapInstance());
    updateLocateButtonTitle();
});

dom.keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        state.isFollowingUser = false;
        updateLocateButtonTitle();
        searchYouBike(true, true, getMapInstance());
    }
});

dom.searchIcon.addEventListener('click', () => {
    state.isFollowingUser = false;
    updateLocateButtonTitle();
    searchYouBike(true, true, getMapInstance());
});

// ==========================================
// 彈窗與系統設定 UI 事件處理 (修正補全)
// ==========================================

function clearUrlHash() {
    if (history.pushState) {
        history.pushState('', document.title, window.location.pathname + window.location.search);
    } else {
        window.location.hash = '';
    }
}

// 點擊右下角設定按鈕
dom.settingsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const settingsIcon = dom.settingsButton.querySelector('.material-icons');
    
    if (dom.centralSettingsPanel.style.display === 'block') {
        closeSettingsPanel(settingsIcon);
    } else {
        if (dom.routeModal.style.display === 'block') {
            closeRouteModal();
            openSettingsPanel(settingsIcon);
        } else {
            openSettingsPanel(settingsIcon);
        }
    }
});

// 點擊設定面板右上角 X
dom.closeCentralSettings.addEventListener('click', () => {
    const settingsIcon = dom.settingsButton.querySelector('.material-icons');
    closeSettingsPanel(settingsIcon);
});

// 點擊路線面板右上角 X
if (dom.closeRouteModalButton) {
    dom.closeRouteModalButton.addEventListener('click', () => {
        closeRouteModal(true);
    });
}

// 點擊半透明背景 (Overlay)
dom.overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dom.routeModal.style.display === 'block') {
        closeRouteModal(true);
    } else if (dom.centralSettingsPanel.style.display === 'block') {
        const settingsIcon = dom.settingsButton.querySelector('.material-icons');
        closeSettingsPanel(settingsIcon);
    }
});

// 點擊文件任處 (外部)
document.addEventListener('click', (e) => {
    if (dom.centralSettingsPanel.style.display === 'block' &&
        !dom.centralSettingsPanel.contains(e.target) &&
        !dom.settingsButton.contains(e.target)) {
        const settingsIcon = dom.settingsButton.querySelector('.material-icons');
        closeSettingsPanel(settingsIcon);
    }
});

// 手機返回鍵支援
window.addEventListener('popstate', (event) => {
    if (dom.centralSettingsPanel.style.display === 'block') {
        closeSettingsPanel(null, true);
    }
    if (dom.routeModal.style.display === 'block') {
        closeRouteModal(true, true);
    }
});

function openSettingsPanel(icon) {
    dom.centralSettingsPanel.style.display = 'block';
    dom.centralSettingsPanel.classList.remove('panel-close');
    dom.centralSettingsPanel.classList.add('panel-open');
    dom.overlay.classList.add('show');
    history.pushState({ modalOpen: true, type: 'settings' }, 'Settings', '#settings');
    
    if(icon) {
        // 強制重啟動畫：先移除所有旋轉 class，再添加目標 class
        icon.classList.remove('rotate-right', 'rotate-left');
        // 使用 requestAnimationFrame 以確保瀏覽器在下一幀渲染前完成 class 的移除
        requestAnimationFrame(() => {
            icon.classList.add('rotate-right');
        });
    }
}

function closeSettingsPanel(icon, skipHistoryBack = false) {
    if (dom.centralSettingsPanel.style.display !== 'block') return;

    dom.centralSettingsPanel.classList.remove('panel-open');
    dom.centralSettingsPanel.classList.add('panel-close');
    dom.overlay.classList.remove('show');
    
    const animationEndHandler = () => {
        dom.centralSettingsPanel.style.display = 'none';
        dom.centralSettingsPanel.classList.remove('panel-close');
        dom.centralSettingsPanel.removeEventListener('animationend', animationEndHandler);
        if (!skipHistoryBack) clearUrlHash(); 
    };
    dom.centralSettingsPanel.addEventListener('animationend', animationEndHandler);
    
    if(icon) {
        // 強制重啟動畫：先移除所有旋轉 class，再添加目標 class
        icon.classList.remove('rotate-right', 'rotate-left');
        requestAnimationFrame(() => {
            icon.classList.add('rotate-left');
        });
    }
    
    if (!skipHistoryBack && history.state && history.state.type === 'settings') {
        history.back();
    } else {
        clearUrlHash();
    }
}

function closeRouteModal(justClose = false, skipHistoryBack = false) {
    if (dom.routeModal.style.display !== 'block') return;

    dom.routeModal.classList.remove('modal-open');
    dom.routeModal.classList.add('modal-close');
    
    if (justClose) {
        dom.overlay.classList.remove('show');
    }

    const animationEndHandler = () => {
        dom.routeModal.style.display = 'none';
        dom.routeModal.classList.remove('modal-close');
        dom.routeModal.removeEventListener('animationend', animationEndHandler);
        if (!skipHistoryBack) clearUrlHash();
    };
    dom.routeModal.addEventListener('animationend', animationEndHandler);
    
    if (!skipHistoryBack && history.state && (history.state.type === 'route' || history.state.type === 'electric')) {
        history.back();
    } else if (justClose) {
        clearUrlHash();
    }
}

// 系統預設開關初始化
document.addEventListener('DOMContentLoaded', () => {
    const isDarkMode = localStorage.getItem("dark_mode") === "true";
    if (isDarkMode) document.body.classList.add('dark-mode');
    dom.centralDarkModeToggle.checked = isDarkMode;
    
    state.currentLang = localStorage.getItem("lang") || "zh";
    dom.centralLangToggle.checked = state.currentLang === "en";
    updateLanguageTexts();
    
    if (localStorage.getItem("useLocation") === null) localStorage.setItem("useLocation", "true");
    dom.centralLocationToggle.checked = localStorage.getItem("useLocation") === "true";
    
    const savedRegion = localStorage.getItem('selectedRegion') || 'kaohsiung';
    config.defaultRegion = savedRegion;
    config.defaultLatitude = regionCoordinates[savedRegion].lat;
    config.defaultLongitude = regionCoordinates[savedRegion].lng;
    
    if (dom.centralRegionSelect) dom.centralRegionSelect.value = savedRegion;
    
    dom.centralDarkModeToggle.addEventListener('change', () => {
        const isDark = dom.centralDarkModeToggle.checked;
        requestAnimationFrame(() => {
            document.body.classList.toggle('dark-mode', isDark);
            localStorage.setItem("dark_mode", isDark.toString());
            applyMapDarkMode();
        });
    });
    
    dom.centralLangToggle.addEventListener('change', async () => {
        state.currentLang = state.currentLang === "en" ? "zh" : "en";
        localStorage.setItem("lang", state.currentLang);
        updateLanguageTexts();
        await searchYouBike(false, false, getMapInstance());
    });
    
    dom.centralLocationToggle.addEventListener('change', async function() {
        localStorage.setItem("useLocation", this.checked);
        state.hasObtainedRealLocation = false;
        await getLocation();
    });
    
    dom.centralRegionSelect.addEventListener('change', async function() {
        const selectedRegion = this.value;
        config.defaultRegion = selectedRegion;
        localStorage.setItem('selectedRegion', selectedRegion);
        
        config.defaultLatitude = regionCoordinates[selectedRegion].lat;
        config.defaultLongitude = regionCoordinates[selectedRegion].lng;
        
        if (!dom.centralLocationToggle.checked) {
            state.hasObtainedRealLocation = false;
            await getLocation();
        }
    });
});
