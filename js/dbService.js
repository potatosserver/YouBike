import { regionCoordinates, defaultRegion } from './config.js';

export let youbikeDataCache = null;
export let allStations = [];

export function openYoubikeDB() {
  return new Promise((resolve, reject) => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(isPersisted => {
      });
    }
    const request = indexedDB.open('YouBikeDB', 1); 
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      db.onerror = function(event) {
      };
      if (!db.objectStoreNames.contains('youbikeData')) {
        const youbikeStore = db.createObjectStore('youbikeData', { keyPath: 'id' });
        youbikeStore.createIndex('timestamp', 'timestamp'); 
      }
      if (!db.objectStoreNames.contains('mapTiles')) {
        const tileStore = db.createObjectStore('mapTiles', { keyPath: 'url' });
        tileStore.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('regionData')) {
        const regionStore = db.createObjectStore('regionData', { keyPath: 'region' });
        regionStore.createIndex('timestamp', 'timestamp');
      }
    };
    request.onsuccess = function(event) {
      const db = event.target.result;
      db.onerror = function(event) {
      };
      setInterval(() => {
        backupData(db);
      }, 24 * 60 * 60 * 1000); 
      resolve(db);
    };
    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

export async function backupData(db) {
  try {
    const tx = db.transaction(['youbikeData', 'regionData'], 'readonly');
    const youbikeStore = tx.objectStore('youbikeData');
    const regionStore = tx.objectStore('regionData');
    const youbikeData = await getAllData(youbikeStore);
    const regionData = await getAllData(regionStore);
    try {
      localStorage.setItem('youbikeData_backup', JSON.stringify(youbikeData));
      localStorage.setItem('regionData_backup', JSON.stringify(regionData));
      localStorage.setItem('backup_timestamp', Date.now().toString());
    } catch (e) {
    }
  } catch (error) {
  }
}

export function getAllData(store) {
  return new Promise((resolve, reject) => {
    const data = [];
    store.openCursor().onsuccess = function(event) {
      const cursor = event.target.result;
      if (cursor) {
        data.push(cursor.value.value); 
        cursor.continue();
      } else {
        resolve(data);
      }
    };
  });
}

export async function saveYoubikeDataToDB(dataArray) {
  const db = await openYoubikeDB();
  const tx = db.transaction('youbikeData', 'readwrite');
  const store = tx.objectStore('youbikeData');
  await store.clear();
  for (const [idx, item] of dataArray.entries()) {
    await store.put({
      id: idx, 
      value: item,
      timestamp: Date.now()
    });
  }
  const regionTx = db.transaction('regionData', 'readwrite');
  const regionStore = regionTx.objectStore('regionData');
  await regionStore.put({
    region: defaultRegion,
    coordinates: regionCoordinates[defaultRegion],
    timestamp: Date.now()
  });
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

export function getYoubikeDataFromDB() {
  return openYoubikeDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('youbikeData', 'readonly');
      const store = tx.objectStore('youbikeData');
      const data = [];
      const req = store.openCursor();
      req.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
          data.push(cursor.value.value);
          cursor.continue();
        } else {
          resolve(data);
        }
      };
      req.onerror = (e) => reject(e.target.error);
    });
  });
}