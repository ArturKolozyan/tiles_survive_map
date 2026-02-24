// Главный файл - обработчики мыши и инициализация

// Обработка мыши на canvas
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - state.camera.x) / state.camera.zoom;
    const worldY = (mouseY - state.camera.y) / state.camera.zoom;
    
    if (state.mode === 'editor') {
        if (state.editorMode === 'connect') {
            handleConnecting(worldX, worldY);
        } else if (state.editorMode === 'disconnect') {
            handleDisconnecting(worldX, worldY);
        } else if (state.editorMode === 'move') {
            handleEditorClick(worldX, worldY, e);
        }
    } else if (state.mode === 'user') {
        handleUserClick(worldX, worldY);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (state.draggingPoint && state.mode === 'editor' && state.editorMode === 'move') {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = (mouseX - state.camera.x) / state.camera.zoom;
        const worldY = (mouseY - state.camera.y) / state.camera.zoom;
        
        const gridSize = 50;
        state.draggingPoint.x = Math.round(worldX / gridSize) * gridSize;
        state.draggingPoint.y = Math.round(worldY / gridSize) * gridSize;
        draw();
    } else if (state.dragging) {
        const dx = e.movementX;
        const dy = e.movementY;
        state.camera.x += dx;
        state.camera.y += dy;
        draw();
    }
});

canvas.addEventListener('mouseup', () => {
    if (state.draggingPoint) {
        saveToStorage(); // Сохраняем после перемещения точки
    }
    state.dragging = false;
    state.draggingPoint = null;
    canvas.classList.remove('dragging');
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    state.camera.zoom = Math.max(state.camera.minZoom, 
                                  Math.min(state.camera.maxZoom, state.camera.zoom * delta));
    draw();
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    state.dragging = true;
    canvas.classList.add('dragging');
});

// Обработчики кликов
function handleEditorClick(x, y, e) {
    const clickedPoint = findPointAt(x, y);
    
    if (clickedPoint) {
        if (e.button === 0) {
            state.draggingPoint = clickedPoint;
            state.selectedPoint = clickedPoint;
            showPointSettings(clickedPoint);
            draw();
        }
    } else {
        if (e.button === 0) {
            state.selectedPoint = null;
            document.getElementById('pointSettings').style.display = 'none';
            state.dragging = true;
            canvas.classList.add('dragging');
            draw();
        }
    }
}

function handleConnecting(x, y) {
    const clickedPoint = findPointAt(x, y);
    
    if (clickedPoint) {
        if (!state.connectStart) {
            state.connectStart = clickedPoint;
            showNotification('Выберите вторую точку');
            draw();
        } else if (state.connectStart !== clickedPoint) {
            const exists = state.connections.some(c => 
                (c.from === state.connectStart && c.to === clickedPoint) ||
                (c.from === clickedPoint && c.to === state.connectStart)
            );
            
            if (!exists) {
                state.connections.push({
                    from: state.connectStart,
                    to: clickedPoint
                });
                showNotification('Точки соединены!');
                saveToStorage();
            } else {
                showNotification('Эти точки уже соединены');
            }
            
            state.connectStart = null;
            state.editorMode = 'move';
            document.getElementById('connectPointsBtn').classList.remove('active');
            document.getElementById('cancelConnectionBtn').style.display = 'none';
            draw();
        } else {
            showNotification('Выберите другую точку');
        }
    }
}

function handleDisconnecting(x, y) {
    const clickedPoint = findPointAt(x, y);
    
    if (clickedPoint) {
        if (!state.connectStart) {
            state.connectStart = clickedPoint;
            showNotification('Выберите вторую точку');
            draw();
        } else if (state.connectStart !== clickedPoint) {
            const connectionIndex = state.connections.findIndex(c => 
                (c.from === state.connectStart && c.to === clickedPoint) ||
                (c.from === clickedPoint && c.to === state.connectStart)
            );
            
            if (connectionIndex !== -1) {
                state.connections.splice(connectionIndex, 1);
                showNotification('Связь удалена!');
                saveToStorage();
            } else {
                showNotification('Эти точки не соединены');
            }
            
            state.connectStart = null;
            state.editorMode = 'move';
            document.getElementById('disconnectPointsBtn').classList.remove('active');
            document.getElementById('cancelConnectionBtn').style.display = 'none';
            draw();
        } else {
            showNotification('Выберите другую точку');
        }
    }
}

function handleUserClick(x, y) {
    const clickedPoint = findPointAt(x, y);
    
    if (clickedPoint) {
        const existingMarker = state.userMarkers.find(m => m.point === clickedPoint);
        
        if (state.currentUserMarker === 'none') {
            if (existingMarker) {
                state.userMarkers = state.userMarkers.filter(m => m !== existingMarker);
            }
        } else {
            if (existingMarker) {
                if (existingMarker.type === state.currentUserMarker) {
                    state.userMarkers = state.userMarkers.filter(m => m !== existingMarker);
                } else {
                    existingMarker.type = state.currentUserMarker;
                }
            } else {
                state.userMarkers.push({
                    point: clickedPoint,
                    type: state.currentUserMarker
                });
            }
        }
        
        updateStats();
        draw();
    } else {
        state.dragging = true;
        canvas.classList.add('dragging');
    }
}

function findPointAt(x, y) {
    return state.points.find(p => {
        let size;
        switch(p.size || 'medium') {
            case 'small': size = 40; break;
            case 'medium': size = 50; break;
            case 'large': size = 70; break;
        }
        const halfSize = size / 2;
        
        const pointType = p.type || 'tower';
        
        if (pointType === 'tower') {
            const dx = p.x - x;
            const dy = p.y - y;
            return Math.sqrt(dx * dx + dy * dy) < halfSize;
        } else {
            return x >= p.x - halfSize && x <= p.x + halfSize &&
                   y >= p.y - halfSize && y <= p.y + halfSize;
        }
    });
}

// Инициализация
resizeCanvas();
