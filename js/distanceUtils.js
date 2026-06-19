import { regionCoordinates } from './config.js';

/**
 * 計算兩點之間的 Haversine 距離
 * @returns {number} 回傳公里數 (km)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半徑 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

/**
 * 根據使用者給定的經緯度，找出最近的預設行政區
 */
export function findNearestRegion(lat, lng) {
    let nearestRegion = 'kaohsiung'; 
    let minDistance = Infinity;
    for (const [region, coords] of Object.entries(regionCoordinates)) {
        const distance = calculateDistance(lat, lng, coords.lat, coords.lng);
        if (distance < minDistance) {
            minDistance = distance;
            nearestRegion = region;
        }
    }
    return nearestRegion;
}