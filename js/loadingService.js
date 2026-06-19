import { overlay, mainContent } from './domElements.js';

export let mainContentShown = false;

export function showMainContent() {
  if (!mainContentShown) {
    const overlay = document.getElementById("loadingOverlay");
    const mainContent = document.getElementById("mainContent");
    overlay.classList.add('fade-out'); 
    mainContent.style.display = "block"; 
    mainContent.offsetHeight;
    mainContent.classList.add('fade-in'); 
    // 確保在橫向模式下也能正確顯示
    if(window.innerWidth > window.innerHeight) {
          mainContent.style.display = "flex";
    }
    mainContent.style.overflowY = 'auto'; 
    document.getElementById('updateCountdown').style.display = navigator.onLine ? "flex" : "none";
    setTimeout(() => {
      overlay.style.display = "none"; 
    }, 500); 
    mainContentShown = true;
  }
}

export function simulateLoadingPercentage() {
  const loadingText = document.getElementById("loadingText");
  let lang = localStorage.getItem("lang") || "zh";
  let prefix = lang === "en" ? "Loading:" : "載入中：";
  let progress = 0;
  let lockedProgress = null; 
  let loadingTextInterval = setInterval(() => {
    if (!mainContentShown) {
      if (progress < 85) { 
        progress++;
        loadingText.textContent = prefix + progress + "%";
      } else {
        if (lockedProgress === null) {
          lockedProgress = 85 + Math.floor(Math.random() * 11); 
        }
        loadingText.textContent = prefix + lockedProgress + "%";
      }
    } else {
      clearInterval(loadingTextInterval); 
    }
  }, 50); 
}

export function showRandomNotice(){
  let lang = localStorage.getItem("lang") || "zh";
  const notices = lang === "en" ? [
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
  document.getElementById('noticeBox').textContent = notices[randomIndex];
}