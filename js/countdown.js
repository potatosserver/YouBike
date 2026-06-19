import { searchYouBike } from './apiYoubike.js';
import { currentLang } from './language.js';

export let countdownTimer = {
  remaining: 60, 
  updateButton: document.getElementById('updateCountdown'), 
  updateDisplay: function() {
      const text = currentLang === "en"
          ? `${this.remaining} sec update`
          : `${this.remaining}秒後更新`;

export let countdownTimer = {
  remaining: 60, 
  updateButton: document.getElementById('updateCountdown'), 
  updateDisplay: function() {
      const text = currentLang === "en"
          ? `${this.remaining} sec update`
          : `${this.remaining}秒後更新`;
      document.getElementById('updateCountdownText').textContent = text;
  },
  reset: function() {
      const icon = this.updateButton.querySelector('.material-icons');
      icon.classList.add('spin-update'); 
      setTimeout(() => {
          icon.classList.remove('spin-update'); 
      }, 500);
      this.remaining = 60;
      this.updateDisplay();
  },
  update: async function() {
      const icon = this.updateButton.querySelector('.material-icons');
      icon.classList.add('spin-update'); 
      setTimeout(() => {
          icon.classList.remove('spin-update'); 
      }, 500);
      const keyword = document.getElementById('keyword').value.trim();
      if (keyword === '') {
          searchYouBike(true, false);
      } else {
          await updateVehicleData();
      }
      this.reset(); 
  }
};