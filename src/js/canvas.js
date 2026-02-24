// Canvas и функции отрисовки
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();
}

window.addEventListener('resize', resizeCanvas);

// Главная функция отрисовки
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(state.camera.x, state.camera.y);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    
    drawGrid();
    drawConnections();
    drawPoints();
    
    if (state.mode === 'user') {
        drawUserMarkers();
    }
    
    ctx.restore();
}

function drawGrid() {
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1 / state.camera.zoom;
    
    const gridSize = 50;
    const startX = Math.floor(-state.camera.x / state.camera.zoom / gridSize) * gridSize;
    const startY = Math.floor(-state.camera.y / state.camera.zoom / gridSize) * gridSize;
    const endX = startX + canvas.width / state.camera.zoom + gridSize;
    const endY = startY + canvas.height / state.camera.zoom + gridSize;
    
    for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    
    for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
}

function drawConnections() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    state.connections.forEach(conn => {
        ctx.beginPath();
        ctx.moveTo(conn.from.x, conn.from.y);
        ctx.lineTo(conn.to.x, conn.to.y);
        ctx.stroke();
    });
}

function drawPoints() {
    state.points.forEach(point => {
        const isSelected = (state.editorMode === 'move') && (point === state.selectedPoint);
        const isConnecting = (state.editorMode === 'connect' || state.editorMode === 'disconnect') && (point === state.connectStart);
        
        let size;
        switch(point.size || 'medium') {
            case 'small': size = 40; break;
            case 'medium': size = 50; break;
            case 'large': size = 70; break;
        }
        
        const halfSize = size / 2;
        const x = point.x - halfSize;
        const y = point.y - halfSize;
        
        const pointType = point.type || 'tower';
        const status = point.status || 'free';
        
        const pointColor = status === 'captured' ? '#4CAF50' : '#ffffff';
        
        if (pointType === 'tower') {
            ctx.beginPath();
            ctx.arc(point.x, point.y, halfSize, 0, Math.PI * 2);
            ctx.fillStyle = pointColor;
            ctx.fill();
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            if (isSelected || isConnecting) {
                ctx.strokeStyle = '#4CAF50';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(point.x, point.y, halfSize + 3, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = pointColor;
            ctx.fillRect(x, y, size, size);
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, size, size);
            
            if (isSelected || isConnecting) {
                ctx.strokeStyle = '#4CAF50';
                ctx.lineWidth = 4;
                ctx.strokeRect(x - 3, y - 3, size + 6, size + 6);
            }
        }
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(point.oil, point.x, point.y);
        
        ctx.fillStyle = status === 'captured' ? '#4CAF50' : '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(status === 'captured' ? 'Захвачено' : 'Свободно', point.x, point.y - halfSize - 8);
        
        if (point.unlockDay > 0) {
            ctx.fillStyle = 'yellow';
            ctx.font = '10px Arial';
            ctx.fillText('День ' + point.unlockDay, point.x, point.y + halfSize + 12);
        }
    });
}

function drawUserMarkers() {
    state.userMarkers.forEach(marker => {
        const point = marker.point;
        
        let size;
        switch(point.size || 'medium') {
            case 'small': size = 40; break;
            case 'medium': size = 50; break;
            case 'large': size = 70; break;
        }
        const halfSize = size / 2;
        
        ctx.save();
        
        const markerWidth = 140;
        const markerHeight = 25;
        const markerX = point.x - markerWidth / 2;
        const markerY = point.y - halfSize - markerHeight - 5;
        
        let bgColor;
        let text;
        switch(marker.type) {
            case 'attack':
                bgColor = 'rgba(244, 67, 54, 0.9)';
                text = '⚔️ Атаковать';
                break;
            case 'noattack':
                bgColor = 'rgba(158, 158, 158, 0.9)';
                text = '🚫 Не атаковать';
                break;
            case 'observe':
                bgColor = 'rgba(33, 150, 243, 0.9)';
                text = '👁️ Наблюдаем';
                break;
            case 'capture':
                bgColor = 'rgba(255, 193, 7, 0.9)';
                text = '🎯 Захват остатками';
                break;
            case 'center':
                bgColor = 'rgba(255, 152, 0, 0.9)';
                text = '🎖️ Набиться в центр';
                break;
            case 'whale':
                bgColor = 'rgba(156, 39, 176, 0.9)';
                text = '🐋 Охота на кита';
                break;
        }
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(markerX, markerY, markerWidth, markerHeight);
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(markerX, markerY, markerWidth, markerHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, point.x, markerY + markerHeight / 2);
        
        ctx.restore();
    });
}
