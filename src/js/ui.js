// Обработчики UI и логика взаимодействия

// Переключение режимов
document.getElementById('editorMode').addEventListener('click', () => {
    state.mode = 'editor';
    document.getElementById('editorMode').classList.add('active');
    document.getElementById('userMode').classList.remove('active');
    document.getElementById('statsMode').classList.remove('active');
    document.getElementById('editorPanel').style.display = 'block';
    document.getElementById('userPanel').style.display = 'none';
    document.getElementById('statsPanel').style.display = 'none';
    draw();
});

document.getElementById('userMode').addEventListener('click', () => {
    state.mode = 'user';
    state.selectedPoint = null;
    state.editorMode = 'move';
    state.currentUserMarker = 'none';
    document.getElementById('userMode').classList.add('active');
    document.getElementById('editorMode').classList.remove('active');
    document.getElementById('statsMode').classList.remove('active');
    document.getElementById('userPanel').style.display = 'block';
    document.getElementById('editorPanel').style.display = 'none';
    document.getElementById('statsPanel').style.display = 'none';
    document.getElementById('pointSettings').style.display = 'none';
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('noMarker').classList.add('active');
    updateStats();
    draw();
});

document.getElementById('statsMode').addEventListener('click', () => {
    state.mode = 'stats';
    document.getElementById('statsMode').classList.add('active');
    document.getElementById('editorMode').classList.remove('active');
    document.getElementById('userMode').classList.remove('active');
    document.getElementById('statsPanel').style.display = 'block';
    document.getElementById('editorPanel').style.display = 'none';
    document.getElementById('userPanel').style.display = 'none';
    updateStats();
    draw();
});

// Редактор - добавление точки
document.getElementById('addPointBtn').addEventListener('click', () => {
    const centerX = (canvas.width / 2 - state.camera.x) / state.camera.zoom;
    const centerY = (canvas.height / 2 - state.camera.y) / state.camera.zoom;
    
    const gridSize = 50;
    const snappedX = Math.round(centerX / gridSize) * gridSize;
    const snappedY = Math.round(centerY / gridSize) * gridSize;
    
    const newPoint = {
        x: snappedX,
        y: snappedY,
        oil: 60,
        unlockDay: 0,
        size: 'medium',
        type: 'tower',
        status: 'free'
    };
    
    state.points.push(newPoint);
    state.selectedPoint = newPoint;
    state.editorMode = 'move';
    
    document.getElementById('connectPointsBtn').classList.remove('active');
    document.getElementById('disconnectPointsBtn').classList.remove('active');
    document.getElementById('addPointBtn').classList.remove('active');
    
    showPointSettings(newPoint);
    draw();
    saveToStorage();
});

// Соединение точек
document.getElementById('connectPointsBtn').addEventListener('click', () => {
    state.editorMode = 'connect';
    state.connectStart = null;
    state.selectedPoint = null;
    document.getElementById('connectPointsBtn').classList.add('active');
    document.getElementById('disconnectPointsBtn').classList.remove('active');
    document.getElementById('addPointBtn').classList.remove('active');
    document.getElementById('cancelConnectionBtn').style.display = 'block';
    document.getElementById('pointSettings').style.display = 'none';
    showNotification('Выберите 2 точки для соединения');
    draw();
});

document.getElementById('disconnectPointsBtn').addEventListener('click', () => {
    state.editorMode = 'disconnect';
    state.connectStart = null;
    state.selectedPoint = null;
    document.getElementById('disconnectPointsBtn').classList.add('active');
    document.getElementById('connectPointsBtn').classList.remove('active');
    document.getElementById('addPointBtn').classList.remove('active');
    document.getElementById('cancelConnectionBtn').style.display = 'block';
    document.getElementById('pointSettings').style.display = 'none';
    showNotification('Выберите 2 точки для отсоединения');
    draw();
});

document.getElementById('cancelConnectionBtn').addEventListener('click', () => {
    state.editorMode = 'move';
    state.connectStart = null;
    document.getElementById('connectPointsBtn').classList.remove('active');
    document.getElementById('disconnectPointsBtn').classList.remove('active');
    document.getElementById('cancelConnectionBtn').style.display = 'none';
    showNotification('Отменено');
    draw();
});

// Настройки точки
document.getElementById('oilAmount').addEventListener('input', function() {
    if (state.selectedPoint) {
        state.selectedPoint.oil = parseInt(this.value) || 0;
        draw();
        saveToStorage();
    }
});

document.getElementById('unlockDay').addEventListener('input', function() {
    if (state.selectedPoint) {
        state.selectedPoint.unlockDay = parseInt(this.value) || 0;
        draw();
        saveToStorage();
    }
});

document.getElementById('pointSize').addEventListener('change', function() {
    if (state.selectedPoint) {
        state.selectedPoint.size = this.value;
        draw();
        saveToStorage();
    }
});

document.getElementById('pointType').addEventListener('change', function() {
    if (state.selectedPoint) {
        state.selectedPoint.type = this.value;
        draw();
        saveToStorage();
    }
});

document.getElementById('pointStatus').addEventListener('change', function() {
    if (state.selectedPoint) {
        state.selectedPoint.status = this.value;
        updateStats();
        draw();
        saveToStorage();
    }
});

document.getElementById('deletePoint').addEventListener('click', () => {
    if (state.selectedPoint) {
        state.points = state.points.filter(p => p !== state.selectedPoint);
        state.connections = state.connections.filter(c => 
            c.from !== state.selectedPoint && c.to !== state.selectedPoint
        );
        state.selectedPoint = null;
        document.getElementById('pointSettings').style.display = 'none';
        draw();
        saveToStorage();
    }
});

// Метки пользователя
document.getElementById('noMarker').addEventListener('click', () => {
    state.currentUserMarker = 'none';
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('noMarker').classList.add('active');
});

document.getElementById('attackMarker').addEventListener('click', () => {
    state.currentUserMarker = 'attack';
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('attackMarker').classList.add('active');
});

document.getElementById('noAttackMarker').addEventListener('click', () => {
    state.currentUserMarker = 'noattack';
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('noAttackMarker').classList.add('active');
});

document.getElementById('observeMarker').addEventListener('click', () => {
    state.currentUserMarker = 'observe';
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('observeMarker').classList.add('active');
});

document.getElementById('captureMarker').addEventListener('click', () => {
    state.currentUserMarker = 'capture';
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('captureMarker').classList.add('active');
});

document.getElementById('centerMarker').addEventListener('click', () => {
    state.currentUserMarker = 'center';
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('centerMarker').classList.add('active');
});

document.getElementById('whaleMarker').addEventListener('click', () => {
    state.currentUserMarker = 'whale';
    document.querySelectorAll('.marker-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('whaleMarker').classList.add('active');
});

document.getElementById('clearMarkers').addEventListener('click', () => {
    state.userMarkers = [];
    updateStats();
    draw();
});

// Управление камерой
document.getElementById('zoomIn').addEventListener('click', () => {
    state.camera.zoom = Math.min(state.camera.maxZoom, state.camera.zoom * 1.2);
    draw();
});

document.getElementById('zoomOut').addEventListener('click', () => {
    state.camera.zoom = Math.max(state.camera.minZoom, state.camera.zoom / 1.2);
    draw();
});

document.getElementById('resetView').addEventListener('click', () => {
    state.camera.x = 0;
    state.camera.y = 0;
    state.camera.zoom = 1;
    draw();
});

// Вспомогательные функции
function showPointSettings(point) {
    document.getElementById('pointSettings').style.display = 'block';
    document.getElementById('oilAmount').value = point.oil;
    document.getElementById('unlockDay').value = point.unlockDay;
    document.getElementById('pointSize').value = point.size || 'medium';
    document.getElementById('pointType').value = point.type || 'tower';
    document.getElementById('pointStatus').value = point.status || 'free';
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

function updateStats() {
    const attackCount = state.userMarkers.filter(m => m.type === 'attack').length;
    const noAttackCount = state.userMarkers.filter(m => m.type === 'noattack').length;
    const observeCount = state.userMarkers.filter(m => m.type === 'observe').length;
    const captureCount = state.userMarkers.filter(m => m.type === 'capture').length;
    const centerCount = state.userMarkers.filter(m => m.type === 'center').length;
    const whaleCount = state.userMarkers.filter(m => m.type === 'whale').length;
    
    const totalOil = state.points
        .filter(p => p.status === 'captured')
        .reduce((sum, p) => sum + p.oil, 0);
    
    const capturedPoints = state.points.filter(p => p.status === 'captured').length;
    const freePoints = state.points.filter(p => p.status === 'free').length;
    const totalPoints = state.points.length;
    
    // Обновляем количество меток в режиме пользователя
    document.getElementById('markerCount').innerHTML = `
        ⚔️ Атаковать: ${attackCount}<br>
        🚫 Не атаковать: ${noAttackCount}<br>
        👁️ Наблюдаем: ${observeCount}<br>
        🎯 Захват остатками: ${captureCount}<br>
        🎖️ Набиться в центр: ${centerCount}<br>
        🐋 Охота на кита: ${whaleCount}
    `;
    
    // Обновляем статистику точек
    document.getElementById('pointsStats').innerHTML = `
        Всего точек: ${totalPoints}<br>
        Захвачено: ${capturedPoints}<br>
        Свободно: ${freePoints}<br>
        Связей: ${state.connections.length}
    `;
    
    // Обновляем статистику нефти
    document.getElementById('oilStats').innerHTML = `
        Нефть в день: ${totalOil}<br>
        Средняя нефть на точку: ${totalPoints > 0 ? Math.round(state.points.reduce((sum, p) => sum + p.oil, 0) / totalPoints) : 0}
    `;
    
    // Обновляем статистику меток
    document.getElementById('markersStats').innerHTML = `
        ⚔️ Атаковать: ${attackCount}<br>
        🚫 Не атаковать: ${noAttackCount}<br>
        👁️ Наблюдаем: ${observeCount}<br>
        🎯 Захват остатками: ${captureCount}<br>
        🎖️ Набиться в центр: ${centerCount}<br>
        🐋 Охота на кита: ${whaleCount}<br>
        Всего меток: ${state.userMarkers.length}
    `;
}


// Автосохранение при изменениях
function autoSave() {
    saveToStorage();
}

// Переопределяем функции для автосохранения
const originalUpdateStats = updateStats;
updateStats = function() {
    originalUpdateStats();
    autoSave();
};
