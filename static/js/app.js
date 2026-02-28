// State
const GRID_SIZE = 100; // Grid cell size

const state = {
    mode: 'dev',
    currentMapId: null,
    points: [],
    connections: [],
    selectedPoint: null,
    connectMode: false,
    connectFrom: null,
    disconnectMode: false,
    markerMode: false,
    selectedMarker: null,
    camera: { x: 0, y: 0, zoom: 1 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    draggingPoint: null,
    dragPointOffset: { x: 0, y: 0 },
    mapSettings: {
        name: '',
        myAllianceStartId: null,
        durationDays: 10,
        startTime: null,
        isRunning: false,
        totalOil: 0,
        lastOilUpdate: null
    },
    pointCounters: {
        alliance_start: 0,
        tower: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        lair: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
    }
};

// Canvas
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    render();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Point management
function getPointName(type, size) {
    if (type === 'alliance_start') {
        state.pointCounters.alliance_start++;
        const num = String(state.pointCounters.alliance_start).padStart(2, '0');
        return `START-${num}`;
    }
    
    state.pointCounters[type][size]++;
    const num = String(state.pointCounters[type][size]).padStart(2, '0');
    return `${size}-${num}`;
}

function snapToGrid(value) {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function addPoint(type, size = 'M', oil = 0) {
    const name = getPointName(type, size);
    const centerX = (canvas.width / 2 - state.camera.x) / state.camera.zoom;
    const centerY = (canvas.height / 2 - state.camera.y) / state.camera.zoom;
    
    const point = {
        x: snapToGrid(centerX),
        y: snapToGrid(centerY),
        name: name,
        type: type,
        size: size,
        oil: oil,
        unlockDay: 0,
        color: 'white', // Default color: white (free)
        marker: ''
    };
    state.points.push(point);
    updateAllianceSelect();
    render();
}

function deletePoint(index) {
    state.connections = state.connections.filter(c => c.from !== index && c.to !== index);
    state.connections = state.connections.map(c => ({
        from: c.from > index ? c.from - 1 : c.from,
        to: c.to > index ? c.to - 1 : c.to
    }));
    state.points.splice(index, 1);
    state.selectedPoint = null;
    document.getElementById('pointEditPanel').style.display = 'none';
    updateAllianceSelect();
    render();
}

function updateAllianceSelect() {
    const select = document.getElementById('myAllianceSelect');
    select.innerHTML = '<option value="">Не выбрана</option>';
    state.points.forEach((point, index) => {
        if (point.type === 'alliance_start') {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = point.name;
            if (state.mapSettings.myAllianceStartId === index) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    });
}

// Rendering
function getMarkerColor(marker) {
    const colors = {
        'Не атаковать': { bg: '#546E7A', text: '#fff' },
        'Атаковать': { bg: '#D32F2F', text: '#fff' },
        'Наблюдаем': { bg: '#1976D2', text: '#fff' },
        'Захват остатками': { bg: '#F57C00', text: '#fff' },
        'Охота на кита': { bg: '#0097A7', text: '#fff' },
        'Набиться для очков': { bg: '#7B1FA2', text: '#fff' }
    };
    return colors[marker] || { bg: '#616161', text: '#fff' };
}

function getMarkerEmoji(marker) {
    const emojis = {
        'Не атаковать': '🚫',
        'Атаковать': '⚔️',
        'Наблюдаем': '👁️',
        'Захват остатками': '🎯',
        'Охота на кита': '🐋',
        'Набиться для очков': '�'
    };
    return emojis[marker] || '';
}

function getPointResources(point) {
    const resources = {
        tower: {
            S: [
                { name: 'Крюк', points: 1, count: 1 },
                { name: 'Бочка', points: 2, count: 1 }
            ],
            M: [
                { name: 'Крюк', points: 1, count: 2 },
                { name: 'Бочка', points: 2, count: 1 }
            ],
            L: [
                { name: 'Крюк', points: 1, count: 2 },
                { name: 'Бочка', points: 2, count: 1 }
            ],
            XL: [
                { name: 'Крюк', points: 1, count: 2 },
                { name: 'Бочка', points: 2, count: 2 }
            ],
            XXL: [
                { name: 'Крюк', points: 1, count: 2 },
                { name: 'Бочка', points: 2, count: 2 }
            ]
        },
        lair: {}
    };
    
    if (point.type === 'alliance_start') {
        return [];
    }
    
    return resources[point.type][point.size] || [];
}

function calculateTotalPoints(resources) {
    let total = 0;
    resources.forEach(res => {
        total += res.points * res.count;
    });
    return total;
}

function showPointInfo(index) {
    const point = state.points[index];
    state.selectedPoint = index;
    
    // Title - Type + Size
    const typeNames = {
        'alliance_start': 'Точка начала',
        'tower': 'Вышка',
        'lair': 'Логово'
    };
    const typeName = typeNames[point.type] || point.type;
    const title = point.type === 'alliance_start' ? point.name : `${typeName} ${point.size}`;
    document.getElementById('infoPointName').textContent = title;
    
    // Resources
    const resources = getPointResources(point);
    const resourcesEl = document.getElementById('infoResources');
    
    if (resources.length > 0) {
        resourcesEl.style.display = 'block';
        resourcesEl.innerHTML = resources.map(res => `
            <div class="resource-item">
                <span class="resource-name">${res.name} - ${res.points} очко${res.points > 1 ? 'в' : ''}/мин</span>
                <span class="resource-value">×${res.count}</span>
            </div>
        `).join('');
        
        const total = calculateTotalPoints(resources);
        document.getElementById('infoTotalPoints').textContent = `${total} очков/мин`;
        document.querySelector('.total-section').style.display = 'flex';
    } else {
        resourcesEl.style.display = 'none';
        document.querySelector('.total-section').style.display = 'none';
    }
    
    // Show edit panel in dev mode
    if (state.mode === 'dev') {
        document.getElementById('pointEditPanel').style.display = 'block';
        document.getElementById('pointUnlockInput').value = point.unlockDay || 0;
    }
    
    // Show card
    document.getElementById('pointInfoCard').classList.add('show');
}

function closePointInfo() {
    document.getElementById('pointInfoCard').classList.remove('show');
    document.getElementById('pointEditPanel').style.display = 'none';
    state.selectedPoint = null;
}

function getPointSize(point) {
    if (point.type === 'lair') return 50;
    if (point.type === 'tower') return 60;
    return 55; // alliance_start
}

function getPointColor(point, index) {
    // Alliance start points
    if (point.type === 'alliance_start') {
        if (!state.mapSettings.isRunning) {
            return '#666'; // Gray in dev mode
        }
        // In game mode
        if (state.mapSettings.myAllianceStartId === index) {
            return '#FFD700'; // Yellow - our start
        } else {
            return '#666'; // Gray - enemy start
        }
    }
    
    if (!state.mapSettings.isRunning) {
        return '#ddd'; // White in dev mode
    }
    
    // Check if point is unlocked
    const currentDay = getCurrentDay();
    if (point.unlockDay > currentDay) {
        return '#444'; // Dark gray - locked
    }
    
    // Use color
    switch (point.color) {
        case 'white': return '#ddd';    // White - free
        case 'green': return '#4CAF50'; // Green - captured
        case 'red': return '#f44336';   // Red - enemy
        default: return '#ddd';         // Default white
    }
}

function getConnectionColor(from, to) {
    if (!state.mapSettings.isRunning) {
        return '#ddd'; // White in dev mode
    }
    
    // Check if either point is locked
    const currentDay = getCurrentDay();
    const fromLocked = from.unlockDay > currentDay;
    const toLocked = to.unlockDay > currentDay;
    
    if (fromLocked || toLocked) {
        return '#444'; // Dark gray if any point is locked
    }
    
    // Get colors, treating our alliance start as green
    let fromColor = from.color;
    let toColor = to.color;
    
    // Treat our alliance start point as green for connection purposes
    if (from.type === 'alliance_start' && state.points.indexOf(from) === state.mapSettings.myAllianceStartId) {
        fromColor = 'green';
    }
    if (to.type === 'alliance_start' && state.points.indexOf(to) === state.mapSettings.myAllianceStartId) {
        toColor = 'green';
    }
    
    // If both same color, use that color
    if (fromColor === toColor) {
        switch (fromColor) {
            case 'white': return '#ddd';
            case 'green': return '#4CAF50';
            case 'red': return '#f44336';
            default: return '#ddd';
        }
    }
    
    // Different colors - use white
    return '#ddd';
}


function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(state.camera.x, state.camera.y);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    
    // Draw grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    
    const startX = Math.floor((-state.camera.x / state.camera.zoom) / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor((-state.camera.y / state.camera.zoom) / GRID_SIZE) * GRID_SIZE;
    const endX = startX + (canvas.width / state.camera.zoom) + GRID_SIZE;
    const endY = startY + (canvas.height / state.camera.zoom) + GRID_SIZE;
    
    for (let x = startX; x < endX; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    
    for (let y = startY; y < endY; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
    
    // Draw connections
    state.connections.forEach(conn => {
        const from = state.points[conn.from];
        const to = state.points[conn.to];
        if (from && to) {
            const connectionColor = getConnectionColor(from, to);
            
            ctx.strokeStyle = connectionColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }
    });
    
    // Draw points
    state.points.forEach((point, index) => {
        const size = getPointSize(point);
        const color = getPointColor(point, index);
        
        const isFirstSelected = (state.connectMode || state.disconnectMode) && state.connectFrom === index;
        
        ctx.fillStyle = color;
        ctx.strokeStyle = state.selectedPoint === index ? '#fff' : (isFirstSelected ? '#00FFFF' : '#222');
        ctx.lineWidth = state.selectedPoint === index ? 3 : (isFirstSelected ? 4 : 1);
        
        if (point.type === 'lair') {
            ctx.fillRect(point.x - size/2, point.y - size/2, size, size);
            ctx.strokeRect(point.x - size/2, point.y - size/2, size, size);
        } else {
            ctx.beginPath();
            ctx.arc(point.x, point.y, size/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        // Draw oil amount INSIDE the point
        if (point.oil > 0) {
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(point.oil, point.x, point.y);
        }
        
        // Draw marker label ABOVE the point - с текстом и фоном
        if (point.marker) {
            ctx.save();
            
            const emoji = getMarkerEmoji(point.marker);
            const markerText = emoji + ' ' + point.marker;
            const markerColors = getMarkerColor(point.marker);
            
            ctx.font = 'bold 12px Arial';
            const metrics = ctx.measureText(markerText);
            const padding = 8;
            const bgWidth = metrics.width + padding * 2;
            const bgHeight = 24;
            const bgX = point.x - bgWidth / 2;
            const bgY = point.y - size/2 - bgHeight - 8;
            
            // Тень
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            
            // Фон метки
            ctx.fillStyle = markerColors.bg;
            ctx.beginPath();
            ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 4);
            ctx.fill();
            
            // Текст метки
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = markerColors.text;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(markerText, point.x, bgY + bgHeight / 2);
            
            ctx.restore();
        }
        
        // Draw name BELOW the point
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        ctx.fillText(point.name, point.x, point.y + size/2 + 5);
        
        // Draw unlock timer BELOW the name - ФОРМАТ: дни:часы:минуты:секунды
        if (state.mapSettings.isRunning) {
            const currentDay = getCurrentDay();
            if (point.unlockDay > currentDay) {
                const start = new Date(state.mapSettings.startTime);
                const unlockTime = new Date(start.getTime() + point.unlockDay * 24 * 60 * 60 * 1000);
                const now = new Date();
                const remaining = unlockTime - now;
                
                if (remaining > 0) {
                    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                    
                    const timerText = `🔒 ${days}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    
                    ctx.fillStyle = '#FFD700';
                    ctx.font = 'bold 11px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(timerText, point.x, point.y + size/2 + 20);
                }
            }
        }
    });
    
    ctx.restore();
}


// Mouse events
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.camera.x) / state.camera.zoom;
    const y = (e.clientY - rect.top - state.camera.y) / state.camera.zoom;
    
    let clickedPoint = null;
    state.points.forEach((point, index) => {
        const size = getPointSize(point);
        const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
        if (dist < size / 2) {
            clickedPoint = index;
        }
    });
    
    if (clickedPoint !== null) {
        if (state.connectMode) {
            if (state.connectFrom === null) {
                state.connectFrom = clickedPoint;
                showNotification('Выберите вторую точку');
            } else {
                if (state.connectFrom !== clickedPoint) {
                    const exists = state.connections.some(c =>
                        (c.from === state.connectFrom && c.to === clickedPoint) ||
                        (c.from === clickedPoint && c.to === state.connectFrom)
                    );
                    if (!exists) {
                        state.connections.push({ from: state.connectFrom, to: clickedPoint });
                        showNotification('Точки соединены');
                    }
                }
                state.connectFrom = null;
            }
        } else if (state.disconnectMode) {
            if (state.connectFrom === null) {
                state.connectFrom = clickedPoint;
                showNotification('Выберите вторую точку');
            } else {
                if (state.connectFrom !== clickedPoint) {
                    state.connections = state.connections.filter(c =>
                        !((c.from === state.connectFrom && c.to === clickedPoint) ||
                          (c.from === clickedPoint && c.to === state.connectFrom))
                    );
                    showNotification('Соединение удалено');
                }
                state.connectFrom = null;
            }
        } else {
            state.selectedPoint = clickedPoint;
            if (state.mode === 'dev') {
                showPointInfo(clickedPoint);
                state.draggingPoint = clickedPoint;
                const point = state.points[clickedPoint];
                state.dragPointOffset = { x: x - point.x, y: y - point.y };
            } else {
                // Game mode
                const point = state.points[clickedPoint];
                const currentDay = getCurrentDay();
                const isUnlocked = currentDay >= point.unlockDay;
                
                // If marker mode is active
                if (state.markerMode && state.selectedMarker !== null) {
                    point.marker = state.selectedMarker;
                    saveMap();
                    render();
                    const markerText = state.selectedMarker === '' ? 'убрана' : state.selectedMarker;
                    showNotification(`Метка "${markerText}" установлена на ${point.name}`);
                }
                // If color is selected and point can be changed
                else if (selectedColor && isUnlocked && point.type !== 'alliance_start') {
                    point.color = selectedColor;
                    saveMap();
                    updateStats();
                    render();
                    showNotification(`Точка ${point.name} → ${selectedColor === 'white' ? 'Белая' : selectedColor === 'green' ? 'Зеленая' : 'Красная'}`);
                }
                // Otherwise show info card
                else {
                    showPointInfo(clickedPoint);
                }
            }
        }
        render();
    } else {
        state.isDragging = true;
        state.dragStart = { x: e.clientX - state.camera.x, y: e.clientY - state.camera.y };
    }
});


canvas.addEventListener('mousemove', (e) => {
    if (state.draggingPoint !== null && state.mode === 'dev') {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - state.camera.x) / state.camera.zoom;
        const y = (e.clientY - rect.top - state.camera.y) / state.camera.zoom;
        
        const point = state.points[state.draggingPoint];
        point.x = snapToGrid(x - state.dragPointOffset.x);
        point.y = snapToGrid(y - state.dragPointOffset.y);
        render();
    } else if (state.isDragging) {
        state.camera.x = e.clientX - state.dragStart.x;
        state.camera.y = e.clientY - state.dragStart.y;
        render();
    }
});

canvas.addEventListener('mouseup', () => {
    state.isDragging = false;
    state.draggingPoint = null;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    state.camera.zoom = Math.max(0.5, Math.min(2, state.camera.zoom * delta));
    render();
});

// UI Handlers

// Point edit panel handlers
document.getElementById('pointUnlockInput').addEventListener('change', (e) => {
    if (state.selectedPoint !== null) {
        state.points[state.selectedPoint].unlockDay = parseInt(e.target.value) || 0;
        render();
    }
});

document.getElementById('deletePointBtn').addEventListener('click', () => {
    if (state.selectedPoint !== null) {
        deletePoint(state.selectedPoint);
        closePointInfo();
    }
});


document.getElementById('connectBtn').addEventListener('click', () => {
    state.connectMode = true;
    state.connectFrom = null;
    document.getElementById('cancelBtn').style.display = 'block';
});

document.getElementById('disconnectBtn').addEventListener('click', () => {
    state.disconnectMode = true;
    document.getElementById('cancelBtn').style.display = 'block';
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    state.connectMode = false;
    state.disconnectMode = false;
    state.connectFrom = null;
    document.getElementById('cancelBtn').style.display = 'none';
    showNotification('Отменено');
    render();
});


document.getElementById('myAllianceSelect').addEventListener('change', (e) => {
    state.mapSettings.myAllianceStartId = e.target.value ? parseInt(e.target.value) : null;
    render();
});

document.getElementById('durationInput').addEventListener('change', (e) => {
    state.mapSettings.durationDays = parseInt(e.target.value) || 10;
});

// Mode switching
document.getElementById('devMode').addEventListener('click', () => {
    state.mode = 'dev';
    document.getElementById('devMode').classList.add('active');
    document.getElementById('gameMode').classList.remove('active');
    document.getElementById('statsMode').classList.remove('active');
    document.getElementById('devPanel').style.display = 'block';
    document.getElementById('gamePanel').style.display = 'none';
    document.getElementById('statsPanel').style.display = 'none';
});

document.getElementById('gameMode').addEventListener('click', () => {
    state.mode = 'game';
    document.getElementById('gameMode').classList.add('active');
    document.getElementById('devMode').classList.remove('active');
    document.getElementById('statsMode').classList.remove('active');
    document.getElementById('gamePanel').style.display = 'block';
    document.getElementById('devPanel').style.display = 'none';
    document.getElementById('statsPanel').style.display = 'none';
    updateStats();
    startTimer();
});

document.getElementById('statsMode').addEventListener('click', () => {
    state.mode = 'stats';
    document.getElementById('statsMode').classList.add('active');
    document.getElementById('devMode').classList.remove('active');
    document.getElementById('gameMode').classList.remove('active');
    document.getElementById('statsPanel').style.display = 'block';
    document.getElementById('devPanel').style.display = 'none';
    document.getElementById('gamePanel').style.display = 'none';
    updateStats();
    startTimer();
});

// Color selection for quick painting
let selectedColor = null;

document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove selection from all buttons
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
        
        // Deactivate marker mode
        state.markerMode = false;
        state.selectedMarker = null;
        document.querySelectorAll('.btn-marker').forEach(b => b.classList.remove('active'));
        document.getElementById('cancelMarkerBtn').style.display = 'none';
        
        // Select this button
        btn.classList.add('selected');
        selectedColor = btn.dataset.color;
        
        // Show cancel button
        document.getElementById('cancelColorBtn').style.display = 'block';
        
        showNotification(`Выбран цвет: ${btn.textContent.trim()}`);
    });
});

document.getElementById('cancelColorBtn').addEventListener('click', () => {
    // Remove selection from all buttons
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    selectedColor = null;
    
    // Hide cancel button
    document.getElementById('cancelColorBtn').style.display = 'none';
    
    showNotification('Режим выбора цвета отменен');
});

// Marker selection
document.querySelectorAll('.btn-marker').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove selection from all marker buttons
        document.querySelectorAll('.btn-marker').forEach(b => b.classList.remove('active'));
        
        // Deactivate color mode
        selectedColor = null;
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('cancelColorBtn').style.display = 'none';
        
        // Select this button
        btn.classList.add('active');
        state.markerMode = true;
        state.selectedMarker = btn.dataset.marker;
        
        // Show cancel button
        document.getElementById('cancelMarkerBtn').style.display = 'block';
        
        const markerText = state.selectedMarker === '' ? 'Убрать метку' : state.selectedMarker;
        showNotification(`Выбрана метка: ${markerText}`);
    });
});

document.getElementById('cancelMarkerBtn').addEventListener('click', () => {
    // Remove selection from all marker buttons
    document.querySelectorAll('.btn-marker').forEach(b => b.classList.remove('active'));
    state.markerMode = false;
    state.selectedMarker = null;
    
    // Hide cancel button
    document.getElementById('cancelMarkerBtn').style.display = 'none';
    
    showNotification('Режим меток отменен');
});

// Map management
document.getElementById('newMapBtn').addEventListener('click', () => {
    if (confirm('Создать новую карту? Несохраненные изменения будут потеряны.')) {
        stopTimer();
        
        state.currentMapId = null;
        state.points = [];
        state.connections = [];
        state.selectedPoint = null;
        state.mapSettings = {
            name: '',
            myAllianceStartId: null,
            durationDays: 10,
            startTime: null,
            isRunning: false,
            totalOil: 0,
            lastOilUpdate: null
        };
        state.pointCounters = {
            alliance_start: 0,
            tower: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
            lair: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
        };
        render();
        showNotification('Новая карта создана');
    }
});

document.getElementById('saveMapBtn').addEventListener('click', () => {
    document.getElementById('saveModal').classList.add('show');
    if (state.mapSettings.name) {
        document.getElementById('mapNameInput').value = state.mapSettings.name;
    }
});

document.getElementById('loadMapBtn').addEventListener('click', async () => {
    await loadMapList();
    document.getElementById('loadModal').classList.add('show');
});


document.getElementById('confirmSave').addEventListener('click', async () => {
    const name = document.getElementById('mapNameInput').value.trim();
    if (!name) {
        showNotification('Введите название карты', true);
        return;
    }
    state.mapSettings.name = name;
    await saveMap(true);
    document.getElementById('saveModal').classList.remove('show');
});

document.getElementById('cancelSave').addEventListener('click', () => {
    document.getElementById('saveModal').classList.remove('show');
});

document.getElementById('cancelLoad').addEventListener('click', () => {
    document.getElementById('loadModal').classList.remove('show');
});

document.getElementById('startMapBtn').addEventListener('click', async () => {
    const dateInput = document.getElementById('startDateInput').value;
    if (!dateInput) {
        showNotification('Выберите дату старта', true);
        return;
    }
    
    if (state.mapSettings.myAllianceStartId === null) {
        showNotification('Выберите свою точку начала', true);
        return;
    }
    
    state.mapSettings.startTime = new Date(dateInput + 'T00:00:00Z').toISOString();
    state.mapSettings.isRunning = true;
    
    // Initialize all points to white
    state.points.forEach(point => {
        if (!point.color) {
            point.color = 'white';
        }
    });
    
    document.getElementById('startMapBtn').style.display = 'none';
    document.getElementById('stopMapBtn').style.display = 'block';
    
    await saveMap();
    render();
    startTimer();
    showNotification('Карта запущена!');
});

document.getElementById('stopMapBtn').addEventListener('click', async () => {
    if (confirm('Остановить карту? Прогресс будет сброшен.')) {
        stopTimer();
        
        state.mapSettings.isRunning = false;
        state.mapSettings.startTime = null;
        state.mapSettings.totalOil = 0;
        state.mapSettings.lastOilUpdate = null;
        
        state.points.forEach(point => {
            point.color = 'white';
        });
        
        document.getElementById('stopMapBtn').style.display = 'none';
        document.getElementById('startMapBtn').style.display = 'block';
        
        await saveMap();
        render();
        showNotification('Карта остановлена');
    }
});


// API calls
async function saveMap(showNotif = false) {
    const data = {
        name: state.mapSettings.name,
        data: {
            points: state.points,
            connections: state.connections
        },
        duration_days: state.mapSettings.durationDays,
        start_time: state.mapSettings.startTime,
        is_running: state.mapSettings.isRunning,
        my_alliance_start_id: state.mapSettings.myAllianceStartId,
        total_oil: state.mapSettings.totalOil,
        last_oil_update: state.mapSettings.lastOilUpdate
    };
    
    try {
        if (state.currentMapId) {
            const response = await fetch(`/api/maps/${state.currentMapId}/update/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok && showNotif) {
                showNotification('Карта сохранена');
            }
        } else {
            const response = await fetch('/api/maps/create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                const result = await response.json();
                state.currentMapId = result.id;
                if (showNotif) {
                    showNotification('Карта создана');
                }
            }
        }
    } catch (error) {
        if (showNotif) {
            showNotification('Ошибка сохранения', true);
        }
    }
}

async function loadMapList() {
    try {
        const response = await fetch('/api/maps/');
        const maps = await response.json();
        
        const listEl = document.getElementById('mapList');
        listEl.innerHTML = '';
        
        maps.forEach(map => {
            const item = document.createElement('div');
            item.className = 'map-item';
            item.innerHTML = `
                <div class="map-item-info">
                    <div class="map-item-name">${map.name}</div>
                    <div class="map-item-date">${new Date(map.updated_at).toLocaleString('ru')}</div>
                </div>
                <button class="map-item-delete" onclick="deleteMapById(${map.id}, event)">🗑️</button>
            `;
            item.addEventListener('click', () => loadMapById(map.id));
            listEl.appendChild(item);
        });
    } catch (error) {
        showNotification('Ошибка загрузки списка', true);
    }
}


async function loadMapById(id) {
    try {
        stopTimer();
        
        const response = await fetch(`/api/maps/${id}/`);
        const map = await response.json();
        
        state.currentMapId = map.id;
        state.points = map.data.points || [];
        state.connections = map.data.connections || [];
        state.mapSettings = {
            name: map.name,
            myAllianceStartId: map.my_alliance_start_id,
            durationDays: map.duration_days,
            startTime: map.start_time,
            isRunning: map.is_running,
            totalOil: map.total_oil || 0,
            lastOilUpdate: map.last_oil_update
        };
        
        // Migrate old data format to new format
        state.points.forEach(point => {
            if (!point.color) {
                // Convert old status/owner to new color system
                if (point.status === 'battle') {
                    point.color = 'blue';
                } else if (point.status === 'captured') {
                    if (point.owner === 'player') {
                        point.color = 'green';
                    } else if (point.owner === 'enemy') {
                        point.color = 'red';
                    } else {
                        point.color = 'white';
                    }
                } else {
                    point.color = 'white';
                }
            }
        });
        
        // Recalculate counters
        state.pointCounters = {
            alliance_start: 0,
            tower: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
            lair: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
        };
        
        state.points.forEach(point => {
            if (point.type === 'alliance_start') {
                const num = parseInt(point.name.split('-')[1]);
                state.pointCounters.alliance_start = Math.max(state.pointCounters.alliance_start, num);
            } else {
                const parts = point.name.split('-');
                const size = parts[0];
                const num = parseInt(parts[1]);
                state.pointCounters[point.type][size] = Math.max(state.pointCounters[point.type][size], num);
            }
        });
        
        document.getElementById('durationInput').value = state.mapSettings.durationDays;
        if (state.mapSettings.startTime) {
            const date = new Date(state.mapSettings.startTime);
            document.getElementById('startDateInput').value = date.toISOString().split('T')[0];
        }
        
        if (state.mapSettings.isRunning) {
            document.getElementById('startMapBtn').style.display = 'none';
            document.getElementById('stopMapBtn').style.display = 'block';
        } else {
            document.getElementById('startMapBtn').style.display = 'block';
            document.getElementById('stopMapBtn').style.display = 'none';
        }
        
        updateAllianceSelect();
        render();
        updateStats();
        
        if (state.mapSettings.isRunning) {
            startTimer();
        }
        
        document.getElementById('loadModal').classList.remove('show');
        showNotification('Карта загружена');
    } catch (error) {
        showNotification('Ошибка загрузки карты', true);
    }
}


async function deleteMapById(id, event) {
    event.stopPropagation();
    if (confirm('Удалить карту?')) {
        try {
            await fetch(`/api/maps/${id}/delete/`, { method: 'DELETE' });
            await loadMapList();
            showNotification('Карта удалена');
        } catch (error) {
            showNotification('Ошибка удаления', true);
        }
    }
}

// Game logic
function getCurrentDay() {
    if (!state.mapSettings.startTime) return 0;
    const start = new Date(state.mapSettings.startTime);
    const now = new Date();
    const diff = now - start;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function updateStats() {
    let dailyOil = 0;
    
    if (state.mapSettings.isRunning) {
        const currentDay = getCurrentDay();
        
        state.points.forEach(point => {
            // Skip locked points
            if (point.unlockDay > currentDay) {
                return;
            }
            
            if (point.color === 'green') {
                dailyOil += point.oil;
            }
        });
    }
    
    document.getElementById('totalOil').textContent = state.mapSettings.totalOil;
    document.getElementById('dailyOil').textContent = dailyOil;
}

let timerInterval = null;

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startTimer() {
    stopTimer();
    
    if (!state.mapSettings.isRunning || !state.mapSettings.startTime) {
        document.getElementById('gameTimer').textContent = 'Карта не запущена';
        return;
    }
    
    const updateTimer = () => {
        const start = new Date(state.mapSettings.startTime);
        const end = new Date(start.getTime() + state.mapSettings.durationDays * 24 * 60 * 60 * 1000);
        const now = new Date();
        const remaining = end - now;
        
        if (remaining <= 0) {
            document.getElementById('gameTimer').textContent = 'Карта завершена';
            stopTimer();
            return;
        }
        
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        document.getElementById('gameTimer').textContent = 
            `${days}д ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const currentDay = getCurrentDay();
        document.getElementById('currentDay').textContent = `День ${currentDay + 1} из ${state.mapSettings.durationDays}`;
    };
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function showNotification(message, isError = false) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = 'notification show' + (isError ? ' error' : '');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// Initialize
render();
