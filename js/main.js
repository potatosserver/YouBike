import { dom } from './domElements.js';
import { state, config, regionCoordinates } from './config.js';
import { simulateLoadingPercentage, showRandomNotice, showOfflineScreen, showNotification } from './loadingService.js';
import { searchYouBike, fetchBaseStationData } from './apiYoubike.js';
import { initMap, getMapInstance, applyMapDarkMode } from './mapService.js';
import { getLocation, updateLocateButtonTitle } from './locationTracker.js';
import { initUIHandlers } from './uiHandlers.js';
import { startCountdown } from './countdown.js';
import { updateLanguageTexts } from './language.js';


let currentRatio = null; // To store the user-defined ratio

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


function clearUrlHash() {
    if (history.pushState) {
        history.pushState('', document.title, window.location.pathname + window.location.search);
    } else {
        window.location.hash = '';
    }
}


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


dom.closeCentralSettings.addEventListener('click', () => {
    const settingsIcon = dom.settingsButton.querySelector('.material-icons');
    closeSettingsPanel(settingsIcon);
});


if (dom.closeRouteModalButton) {
    dom.closeRouteModalButton.addEventListener('click', () => {
        closeRouteModal(true);
    });
}


dom.overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dom.routeModal.style.display === 'block') {
        closeRouteModal(true);
    } else if (dom.centralSettingsPanel.style.display === 'block') {
        const settingsIcon = dom.settingsButton.querySelector('.material-icons');
        closeSettingsPanel(settingsIcon);
    }
});


document.addEventListener('click', (e) => {
    if (dom.centralSettingsPanel.style.display === 'block' &&
        !dom.centralSettingsPanel.contains(e.target) &&
        !dom.settingsButton.contains(e.target)) {
        const settingsIcon = dom.settingsButton.querySelector('.material-icons');
        closeSettingsPanel(settingsIcon);
    }
});


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
        icon.classList.remove('rotate-right', 'rotate-left');
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

    const dragHandle = document.getElementById('dragHandle');
    const mapWrapper = document.getElementById('map-wrapper');
    const mainContent = document.getElementById('mainContent');
    const appContainer = document.getElementById('app-container');

    let isDragging = false;
    let throttleTimer = null;

    const startDragging = (e) => {
        if (window.getComputedStyle(appContainer).flexDirection !== 'column') return;

        isDragging = true;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        document.addEventListener('mousemove', onDragging);
        document.addEventListener('touchmove', onDragging, { passive: false });
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('touchend', stopDragging);
    };

    const onDragging = (e) => {
        if (!isDragging) return;
        
        e.preventDefault();

        if (throttleTimer) return;

        throttleTimer = setTimeout(() => {
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            applyLayoutFromY(clientY);
            throttleTimer = null; 
        }, 16); 
    };

    const stopDragging = (e) => {
        if (!isDragging) return;
        isDragging = false;

        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        const containerRect = appContainer.getBoundingClientRect();
        currentRatio = (clientY - containerRect.top) / containerRect.height;

        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';

        document.removeEventListener('mousemove', onDragging);
        document.removeEventListener('touchmove', onDragging);
        document.removeEventListener('mouseup', stopDragging);
        document.removeEventListener('touchend', stopDragging);
        
        const map = getMapInstance();
        if (map) {
            map.invalidateSize({ animate: false });
        }
    };

    function applyLayoutFromY(y) {
        const containerRect = appContainer.getBoundingClientRect();
        const dragHandleHeight = dragHandle.offsetHeight;
        
        let newMapHeight = y - containerRect.top;
        
        const minMapHeight = 100; 
        const minContentHeight = 100;
        const maxMapHeight = containerRect.height - minContentHeight - dragHandleHeight;
        newMapHeight = Math.max(minMapHeight, Math.min(newMapHeight, maxMapHeight));
        
        mapWrapper.style.flexBasis = `${newMapHeight}px`;
        mainContent.style.flexBasis = `${containerRect.height - newMapHeight - dragHandleHeight}px`;
        
        const map = getMapInstance();
        if (map) {
            map.invalidateSize({ animate: false }); 
        }
    }
    
    if (dragHandle) {
        dragHandle.addEventListener('mousedown', startDragging);
        dragHandle.addEventListener('touchstart', startDragging, { passive: false });
    }

    function setVerticalLayout() {
        if (window.getComputedStyle(appContainer).flexDirection !== 'column') return;
        
        const containerRect = appContainer.getBoundingClientRect();
        const ratioToApply = currentRatio !== null ? currentRatio : 0.6; 
        const y = containerRect.top + (containerRect.height * ratioToApply);

        applyLayoutFromY(y);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(setVerticalLayout, 50); 
    });

    setTimeout(() => {
        setVerticalLayout();
    }, 100);
});
