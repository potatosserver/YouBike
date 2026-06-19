export const regionCoordinates = {
    taipei: { lat: 25.047924, lng: 121.517081 },
    newTaipei: { lat: 25.0215339197085, lng: 121.4568090197085 },
    taoyuan: { lat: 24.953671, lng: 121.225783 },
    hsinchuCounty: { lat: 24.826917615712, lng: 121.01290295049 },
    hsinchuCity: { lat: 24.801815, lng: 120.971459 },
    sciencePark: { lat: 24.781830, lng: 121.005074 },
    miaoli: { lat: 24.5648599, lng: 120.8185503 },
    taichung: { lat: 24.154712, lng: 120.664265 },
    chiayi: { lat: 23.4797837, lng: 120.4397206 },
    tainan: { lat: 22.99230083082, lng: 120.18509419659 },
    kaohsiung: { lat: 22.631442, lng: 120.301890 },
    pingtung: { lat: 22.683036253664, lng: 120.48790854724 },
    taitung: { lat: 22.755711056126138, lng: 121.15035332587574 }
};

export const config = {
    defaultRegion: 'kaohsiung',
    defaultLatitude: regionCoordinates.kaohsiung.lat,
    defaultLongitude: regionCoordinates.kaohsiung.lng,
    maxResults: 100,
    youbikeUrl: "https://apis.youbike.com.tw/json/station-min-yb2.json",
    graphhopperApiKey: '7cb4eb19-e0f4-40a3-a5e0-f2c039366f32'
};

export const state = {
    userLocation: null,
    isFollowingUser: false,
    isTrackingActive: false,
    watchId: null,
    isMapMovingDueToTracking: false,
    hasObtainedRealLocation: false,
    lastKnownLocation: null,
    mainContentShown: false,
    youbikeDataCache: null,
    allStations: [],
    currentLang: localStorage.getItem("lang") || "zh"
};