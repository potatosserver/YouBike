import { mainContent, settingsButton, centralSettingsPanel } from './domElements.js';
import { showMainContent, simulateLoadingPercentage, showRandomNotice } from './loadingService.js';
import { updateResultsOrder } from './pinService.js';
import { youbikeDataCache, allStations, saveYoubikeDataToDB, getYoubikeDataFromDB } from './dbService.js';
import { initMap } from './mapService.js';
import { getLocation } from './locationTracker.js';
import { onMove, onEnd } from './uiHandlers.js';

export async function initializeApp() {
  const loadingContent = document.getElementById('loadingContent');
  loadingContent.innerHTML = `<h2 id="loadingText">載入中</h2><div id="noticeBox" style="margin-top: 10px; margin-left: 20px; margin-right: 20px; background: #fff; padding: 10px; border: 1px solid #ccc; border-radius: 5px;"></div>`;
  simulateLoadingPercentage();
  showRandomNotice();
  try {
    if (!youbikeDataCache || youbikeDataCache.length === 0) {
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
    await initMap(allStations); 
    await getLocation(); 
    updateResultsOrder(); 
    showMainContent(); 
  } catch (error) {
    const loadingContent = document.getElementById('loadingContent');
    loadingContent.innerHTML = ''; 
    const isDarkMode = document.body.classList.contains('dark-mode');
    const errorIcon = document.createElement('span');
    errorIcon.className = 'material-icons';
    errorIcon.textContent = 'error_outline';
    errorIcon.style.fontSize = '80px';
    errorIcon.style.color = 'red';
    errorIcon.style.marginBottom = '20px';
    const errorText = document.createElement('h2');
    errorText.textContent = `初始化失敗: ${error.message}`;
    errorText.style.color = 'red';
    errorText.style.fontSize = '1.2em';
    const retryButton = document.createElement('button');
    retryButton.textContent = '重試';
    retryButton.style.cssText = `padding: 12px 24px; font-size: 1.1em; font-weight: 500; cursor: pointer; margin-top: 30px; border-radius: 28px; border: none;`;
    if (isDarkMode) {
        retryButton.style.backgroundColor = '#e8def8';
        retryButton.style.color = '#1c1b1f';
    } else {
        retryButton.style.backgroundColor = '#ffdacf';
        retryButton.style.color = '#333';
    }
    retryButton.onclick = attemptReconnect;
    loadingContent.appendChild(errorIcon);
    loadingContent.appendChild(errorText);
    loadingContent.appendChild(retryButton);
  }
}

export function showOfflineScreen() {
    const loadingContent = document.getElementById('loadingContent');
    const isDarkMode = document.body.classList.contains('dark-mode');
    loadingContent.innerHTML = '';
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
        padding: 12px 24px;
        font-size: 1.1em;
        font-weight: 500;
        cursor: pointer;
        margin-top: 30px;
        border-radius: 28px;
        border: none;
        transition: background-color 0.3s, box-shadow 0.3s;
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
    retryButton.onmouseover = () => {
          if (isDarkMode) {
            retryButton.style.backgroundColor = '#d0bcff';
          } else {
            retryButton.style.backgroundColor = '#ffc0a8';
          }
    };
      retryButton.onmouseout = () => {
          if (isDarkMode) {
            retryButton.style.backgroundColor = '#e8def8';
          } else {
            retryButton.style.backgroundColor = '#ffdacf';
          }
    };
    retryButton.onclick = attemptReconnect;
    loadingContent.appendChild(offlineIcon);
    loadingContent.appendChild(loadingText);
    loadingContent.appendChild(retryButton);
}

export async function attemptReconnect() {
    const loadingContent = document.getElementById('loadingContent');
    const isDarkMode = document.body.classList.contains('dark-mode');
    loadingContent.innerHTML = `<h2 style="font-size: 1.8em; color: ${isDarkMode ? '#fff' : '#333'};">測試連線中...</h2>`;
    try {
        const response = await fetch("https://apis.youbike.com.tw/json/station-min-yb2.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error('API 無法存取');
        }
        loadingContent.innerHTML = `<h2 id="loadingText" style="color: ${isDarkMode ? '#fff' : '#333'};">連線成功，重新載入中...</h2>`;
        location.reload(); 
    } catch (error) {
        showOfflineScreen(); 
        const loadingText = loadingContent.querySelector('h2');
        const retryButton = loadingContent.querySelector('button');
        if (loadingText) loadingText.textContent = '仍無法連線，請檢查網路';
        if(retryButton) {
            retryButton.style.animation = 'shake 0.5s'; 
            setTimeout(() => {
                retryButton.style.animation = ''; 
            }, 500);
        }
    }
}


// --- 全局生命週期監聽與入口初始化 ---
window.addEventListener('popstate', (event) => {
  if (centralSettingsPanel.style.display === 'block') {
      centralSettingsPanel.classList.remove('panel-open');

document.addEventListener('click', (e) => {
if (centralSettingsPanel.style.display === 'block' && !centralSettingsPanel.contains(e.target) && e.target !== settingsButton) {
  centralSettingsPanel.classList.remove('panel-open');

window.addEventListener('load', () => {
  if (!navigator.onLine) {
      showOfflineScreen();

window.addEventListener('scroll', () => {
  if (settingsPanel.classList.contains('show')) {
      settingsPanel.classList.add('hiding');

document.addEventListener('click', (e) => {
  const floatingCard = document.getElementById('floatingCard');

document.addEventListener('mousemove', onMove);

document.addEventListener('mouseup', onEnd);

document.addEventListener('touchmove', onMove, { passive: true });

document.addEventListener('touchend', onEnd);

document.addEventListener('touchcancel', onEnd);

document.addEventListener('DOMContentLoaded', () => {
  const centralSettingsPanel = document.getElementById('centralSettingsPanel');

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
        console.log('Tab became visible, updating data...');

window.addEventListener('resize', () => {
    const mainContent = document.getElementById('mainContent');