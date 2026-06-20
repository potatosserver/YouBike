import { dom } from './domElements.js';
import { state } from './config.js';
import { searchYouBike, queryVehicleData } from './apiYoubike.js';
import { getMapInstance } from './mapService.js';

export const countdownTimer = {
    remaining: 60, 
    updateDisplay: function() {
        const countdownTimer = document.getElementById('countdownTimer');
        const countdownSuffix = document.getElementById('countdownSuffix');
        if (!countdownTimer || !countdownSuffix) return;

        countdownTimer.textContent = this.remaining;
        countdownSuffix.textContent = state.currentLang === "en" ? " sec update" : "秒後更新";
    },
    reset: function() {
        if (!dom.updateCountdown) return;
        const icon = dom.updateCountdown.querySelector('.material-icons');
        if (icon) {
            icon.classList.add('spin-update'); 
            setTimeout(() => { icon.classList.remove('spin-update'); }, 500);
        }
        this.remaining = 60;
        this.updateDisplay();
    },
    update: async function() {
        if (!dom.updateCountdown) return;
        const icon = dom.updateCountdown.querySelector('.material-icons');
        if (icon) {
            icon.classList.add('spin-update'); 
            setTimeout(() => { icon.classList.remove('spin-update'); }, 500);
        }
        const keyword = dom.keywordInput.value.trim();
        if (keyword === '') {
            await searchYouBike(true, false, getMapInstance());
        } else {
            await searchYouBike(false, false, getMapInstance()); 
        }
        this.reset(); 
    }
};

export function startCountdown() {
    if (dom.updateCountdown) {
        dom.updateCountdown.addEventListener('click', () => countdownTimer.update());
    }
    
    setInterval(() => {
        if(!navigator.onLine) {
            if(dom.updateCountdown) dom.updateCountdown.style.display = "none"; 
            return;
        }
        if(dom.updateCountdown) {
            dom.updateCountdown.style.display = "flex"; 
        }
        countdownTimer.remaining--;
        if (countdownTimer.remaining <= 0) {
            countdownTimer.update(); 
        }
        countdownTimer.updateDisplay(); 
    }, 1000);
}
