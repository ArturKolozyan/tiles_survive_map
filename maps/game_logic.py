"""
Game logic for territory expansion and battles
"""
from datetime import datetime, timezone


class GameLogic:
    """Handles game state calculations"""
    
    @staticmethod
    def get_neighbors(point_index, connections):
        """Get all neighbor indices for a point"""
        neighbors = set()
        for conn in connections:
            if conn['from'] == point_index:
                neighbors.add(conn['to'])
            elif conn['to'] == point_index:
                neighbors.add(conn['from'])
        return neighbors
    
    @staticmethod
    def get_current_day(start_time):
        """Calculate current day since start"""
        if not start_time:
            return 0
        
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        delta = now - start_dt
        return max(0, delta.days)
    
    @staticmethod
    def is_point_unlocked(point, current_day):
        """Check if point is unlocked based on current day"""
        unlock_day = point.get('unlockDay', 0)
        return current_day >= unlock_day
    
    @staticmethod
    def expand_territories(points, connections, my_alliance_start_id, current_day):
        """
        Автоматическое расширение территорий
        
        Логика:
        1. Наша точка начала всегда зеленая
        2. Точки начала противника всегда красные
        3. Белые точки которые касаются зеленых → становятся синими (граница)
        4. Белые точки которые касаются нашей точки начала и НЕ касаются синих/зеленых → синие
        5. Если зеленая точка касается красной точки начала врага → зеленая становится синей
        """
        print(f"\n=== EXPAND TERRITORIES ===")
        print(f"my_alliance_start_id: {my_alliance_start_id}")
        
        if my_alliance_start_id is None:
            print("ERROR: my_alliance_start_id is None!")
            return points
        
        # Найти все точки начала
        alliance_starts = []
        for i, point in enumerate(points):
            if point.get('type') == 'alliance_start':
                alliance_starts.append(i)
        
        if not alliance_starts:
            return points
        
        my_alliance = my_alliance_start_id
        enemy_alliances = [idx for idx in alliance_starts if idx != my_alliance]
        
        print(f"My alliance: {my_alliance}")
        print(f"Enemy alliances: {enemy_alliances}")
        
        # Устанавливаем цвет нашей точки начала в зеленый
        points[my_alliance]['color'] = 'green'
        print(f"My alliance start {my_alliance} ({points[my_alliance].get('name')}) -> GREEN")
        
        # Устанавливаем цвет точек начала противника в красный
        for enemy_idx in enemy_alliances:
            points[enemy_idx]['color'] = 'red'
            print(f"Enemy alliance start {enemy_idx} ({points[enemy_idx].get('name')}) -> RED")
        
        # Сначала проверяем зеленые точки - если они касаются красной точки начала врага, они становятся синими
        for i, point in enumerate(points):
            # Пропускаем заблокированные
            if not GameLogic.is_point_unlocked(point, current_day):
                continue
            
            # Пропускаем точки начала
            if point.get('type') == 'alliance_start':
                continue
            
            # Только зеленые точки проверяем
            if point.get('color') != 'green':
                continue
            
            neighbors = GameLogic.get_neighbors(i, connections)
            
            # Проверяем есть ли рядом красная точка начала врага
            has_enemy_start_neighbor = False
            for neighbor_idx in neighbors:
                neighbor = points[neighbor_idx]
                if neighbor.get('type') == 'alliance_start' and neighbor_idx in enemy_alliances:
                    has_enemy_start_neighbor = True
                    break
            
            if has_enemy_start_neighbor:
                point['color'] = 'blue'
                print(f"Point {i} ({point.get('name')}) -> BLUE (green touches enemy start)")
        
        # Теперь проходим по белым точкам и определяем какие должны стать синими
        for i, point in enumerate(points):
            # Пропускаем заблокированные
            if not GameLogic.is_point_unlocked(point, current_day):
                continue
            
            # Пропускаем точки начала
            if point.get('type') == 'alliance_start':
                continue
            
            # Пропускаем уже зеленые и синие точки
            if point.get('color') in ['green', 'blue']:
                continue
            
            # Только белые точки могут стать синими
            if point.get('color') != 'white':
                continue
            
            neighbors = GameLogic.get_neighbors(i, connections)
            
            # Проверяем соседей
            has_green_neighbor = False
            has_blue_neighbor = False
            has_my_start_neighbor = False
            
            for neighbor_idx in neighbors:
                neighbor = points[neighbor_idx]
                neighbor_color = neighbor.get('color')
                
                if neighbor_color == 'green':
                    has_green_neighbor = True
                elif neighbor_color == 'blue':
                    has_blue_neighbor = True
                
                if neighbor.get('type') == 'alliance_start' and neighbor_idx == my_alliance:
                    has_my_start_neighbor = True
            
            # Правило 1: Касается зеленой точки → синяя
            if has_green_neighbor:
                point['color'] = 'blue'
                print(f"Point {i} ({point.get('name')}) -> BLUE (touches green)")
                continue
            
            # Правило 2: Касается нашей точки начала и НЕ касается синих/зеленых → синяя
            if has_my_start_neighbor and not has_blue_neighbor and not has_green_neighbor:
                point['color'] = 'blue'
                print(f"Point {i} ({point.get('name')}) -> BLUE (touches my start, no blue/green)")
                continue
        
        print(f"=== EXPAND COMPLETE ===\n")
        return points
    
    @staticmethod
    def resolve_battles(points, connections, battle_results):
        """
        Разрешение боев за синие точки
        
        battle_results: dict {point_index: 'won' or 'lost'}
        
        Логика:
        - Если выиграли синюю → она становится зеленой
        - Если проиграли синюю → она становится белой (враг отбил)
        - Если проиграли → зеленые точки рядом с ней становятся синими (защита)
        """
        print(f"\n=== RESOLVE BATTLES ===")
        print(f"Battle results: {battle_results}")
        
        for point_idx, result in battle_results.items():
            point_idx = int(point_idx)
            point = points[point_idx]
            
            if result == 'won':
                # Выиграли - синяя становится зеленой
                point['color'] = 'green'
                print(f"Point {point_idx} ({point.get('name')}) -> GREEN (won)")
            
            elif result == 'lost':
                # Проиграли - синяя становится белой (враг отбил)
                point['color'] = 'white'
                print(f"Point {point_idx} ({point.get('name')}) -> WHITE (lost)")
                
                # Зеленые точки рядом становятся синими (защита)
                neighbors = GameLogic.get_neighbors(point_idx, connections)
                for neighbor_idx in neighbors:
                    neighbor = points[neighbor_idx]
                    if neighbor.get('color') == 'green':
                        neighbor['color'] = 'blue'
                        print(f"Point {neighbor_idx} ({neighbor.get('name')}) -> BLUE (defense after loss)")
        
        print(f"=== RESOLVE COMPLETE ===\n")
        return points
    
    @staticmethod
    def calculate_daily_oil(points):
        """Calculate daily oil income from green points"""
        total = 0
        for point in points:
            if point.get('color') == 'green':
                total += point.get('oil', 0)
        return total
