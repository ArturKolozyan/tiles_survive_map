// Глобальное состояние приложения
const state = {
    mode: 'editor',
    points: [],
    connections: [],
    userMarkers: [],
    selectedPoint: null,
    editorMode: 'move',
    connectStart: null,
    currentUserMarker: 'none',
    
    camera: {
        x: 0,
        y: 0,
        zoom: 1,
        minZoom: 0.5,
        maxZoom: 3
    },
    
    dragging: false,
    dragStart: { x: 0, y: 0 },
    draggingPoint: null
};

// Загрузка данных из localStorage
function loadFromStorage() {
    try {
        const saved = localStorage.getItem('mapData');
        if (saved) {
            const data = JSON.parse(saved);
            state.points = data.points || [];
            state.connections = data.connections || [];
            state.userMarkers = data.userMarkers || [];
            console.log('Карта загружена из localStorage');
        }
    } catch (e) {
        console.error('Ошибка загрузки данных:', e);
    }
}

// Сохранение данных в localStorage
function saveToStorage() {
    try {
        const data = {
            points: state.points,
            connections: state.connections,
            userMarkers: state.userMarkers
        };
        localStorage.setItem('mapData', JSON.stringify(data));
    } catch (e) {
        console.error('Ошибка сохранения данных:', e);
    }
}

// Загружаем данные при старте
loadFromStorage();
