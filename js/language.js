import { keywordInput, centralSettingsPanel } from './domElements.js';
import { routeModalTitle } from './apiRoute.js';

export let currentLang = localStorage.getItem("lang") || "zh";

export function updateLanguageTexts() {
  document.title = currentLang === "en" ? "YouBike Site Search : A simple, beautiful site search engine" : "YouBike 站點搜尋 : 一個簡單、美觀、低流量的YouBike站點搜尋器";
  const locationSwitchSpan = document.querySelector('#locationSwitchText');
  if (locationSwitchSpan) {
    locationSwitchSpan.textContent = currentLang === "en" ? "Use Location" : "使用定位";
  }
  const heading = document.getElementById('heading');
          if (heading) {
      heading.textContent = currentLang === "en" ? "YouBike Station Search" : "YouBike  站點搜尋";
  }
          const keywordInput = document.getElementById('keyword');
  if (keywordInput) {
    keywordInput.placeholder = currentLang === "en" ? "Please enter station name or address" : "請輸入站點名稱、地址";
  }
          const updateCountdownBtn = document.getElementById('updateCountdownText');
  if (updateCountdownBtn) {
    updateCountdownBtn.textContent = currentLang === "en" ? "60 sec update" : "60秒後更新";
    updateCountdownBtn.parentElement.style.setProperty('--button-width', currentLang === "en" ? "145px" : "125px");
  }
  const settingsPanelTitle = document.getElementById('settingsPanelTitle');
  if (settingsPanelTitle) {
    settingsPanelTitle.textContent = currentLang === "en" ? "System Settings" : "系統設定";
  }
  const settingGroups = document.querySelectorAll('#centralSettingsPanel .settings-group h3');
  if (settingGroups.length >= 2) {
    settingGroups[0].textContent = currentLang === "en" ? "Basic Settings" : "基本設定";
    settingGroups[1].textContent = currentLang === "en" ? "GitHub Repositories" : "GitHub 儲存庫";
  }
  const locationLabel = document.querySelector('#centralSettingsPanel .setting-item label[for="centralLocationToggle"]');
  if (locationLabel) {
    locationLabel.textContent = currentLang === "en" ? "Location Service" : "位置服務";
  }
  const darkModeLabel = document.querySelector('#centralSettingsPanel .setting-item label[for="centralDarkModeToggle"]');
  if (darkModeLabel) {
    darkModeLabel.textContent = currentLang === "en" ? "Dark Mode" : "深色模式";
  }
  const langLabel = document.querySelector('#centralSettingsPanel .setting-item label[for="centralLangToggle"]');
  if (langLabel) {
    langLabel.textContent = currentLang === "en" ? "Chinese/English" : "中文/English";
  }
  const regionNames = {
      taipei: { en: "Taipei City", zh: "台北市" },
      newTaipei: { en: "New Taipei City", zh: "新北市" },
      taoyuan: { en: "Taoyuan City", zh: "桃園市" },
      hsinchuCounty: { en: "Hsinchu County", zh: "新竹縣" },
      hsinchuCity: { en: "Hsinchu City", zh: "新竹市" },
      sciencePark: { en: "Hsinchu Science Park", zh: "新竹科學園區" },
      miaoli: { en: "Miaoli County", zh: "苗栗縣" },
      taichung: { en: "Taichung City", zh: "台中市" },
      chiayi: { en: "Chiayi City", zh: "嘉義市" },
      tainan: { en: "Tainan City", zh: "臺南市" },
      kaohsiung: { en: "Kaohsiung City", zh: "高雄市" },
      pingtung: { en: "Pingtung County", zh: "屏東縣" },
      taitung: { en: "Taitung County", zh: "臺東縣" }
  };
  const select = document.getElementById('centralRegionSelect');
  const options = select.options;
  for (let i = 0; i < options.length; i++) {
      const value = options[i].value;
      options[i].text = regionNames[value][currentLang === "en" ? "en" : "zh"];
  }
  const regionSelectLabel = document.querySelector('label[for="centralRegionSelect"]');
if (regionSelectLabel) {
  regionSelectLabel.textContent = currentLang === "en" ? "Region" : "地區選擇";
}
const routeModalTitle = document.getElementById('routeModalTitle');
if (routeModalTitle) {
}
window.langStrings = {
  ...window.langStrings, 
  electricBikeDetailsTitle: {
      zh: "電輔車列表 - ",
      en: "Electric Bikes - "
  },
  bikeNumberLabel: {
      zh: "車輛編號：",
      en: "Bike No.: "
  },
  pillarNumberLabel: {
      zh: "停車柱編號：",
      en: "Pillar No.: "
  },
  batteryPowerLabel: {
      zh: "電量：",
      en: "Battery: "
  },
  noElectricBikes: {
      zh: "此站點目前沒有可用的電輔車。",
      en: "No electric bikes available at this station."
  },
  failedToGetBikeData: {
      zh: "無法取得電輔車資料。",
      en: "Failed to get electric bike data."
  },
  gettingBikeData: {
      zh: "取得電輔車資料中...",
      en: "Getting electric bike data..."
  }
};
document.querySelectorAll('.navigate-button').forEach(button => {
  button.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
          node.remove();
      }
  });
  if (!button.querySelector('.material-icons')) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-icons';
        iconSpan.textContent = 'navigation'; 
        button.appendChild(iconSpan);
  }
});
}