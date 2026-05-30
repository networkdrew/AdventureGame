// src/map.js – Tile‑based map with portal doors (tile 2) that are solid for NPCs, plus isDark flag per map
class Map {
    constructor() {
        this.tileSize = 40;
        this.cols = 20;
        this.rows = 15;
        
        // Map definitions with their own properties
        this.overworldGrid = this.buildOverworld();
        this.overworldProps = { isDark: false };
        
        this.interiorGrid = this.buildInterior();
        this.interiorProps = { isDark: false };
        
        // Start with overworld
        this.currentMapName = 'overworld';
        this.grid = this.overworldGrid;
        this.props = this.overworldProps;
    }

    // Overworld (streets, with a building entrance)
    buildOverworld() {
        const grid = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        // Border walls
        for (let c = 0; c < this.cols; c++) {
            grid[0][c] = 1;
            grid[this.rows-1][c] = 1;
        }
        for (let r = 0; r < this.rows; r++) {
            grid[r][0] = 1;
            grid[r][this.cols-1] = 1;
        }
        // Server rack obstacles
        const obstacles = [
            { row: 2, col: 5 }, { row: 2, col: 12 },
            { row: 4, col: 3 }, { row: 4, col: 10 }, { row: 4, col: 16 },
            { row: 6, col: 7 }, { row: 6, col: 13 },
            { row: 8, col: 2 }, { row: 8, col: 8 }, { row: 8, col: 15 },
            { row: 10, col: 5 }, { row: 10, col: 11 }, { row: 10, col: 18 },
            { row: 12, col: 4 }, { row: 12, col: 9 }, { row: 12, col: 14 }
        ];
        for (const pos of obstacles) {
            if (pos.row > 0 && pos.row < this.rows-1 && pos.col > 0 && pos.col < this.cols-1) {
                grid[pos.row][pos.col] = 1;
            }
        }
        // Place a door portal (tile 2) at a specific location
        grid[7][10] = 2;
        return grid;
    }

    // Interior of the building (server room layout)
    buildInterior() {
        const grid = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        // Border walls
        for (let c = 0; c < this.cols; c++) {
            grid[0][c] = 1;
            grid[this.rows-1][c] = 1;
        }
        for (let r = 0; r < this.rows; r++) {
            grid[r][0] = 1;
            grid[r][this.cols-1] = 1;
        }
        // Internal walls – maze‑like server corridors
        for (let c = 3; c < 17; c++) grid[7][c] = 1;
        for (let r = 2; r < 7; r++) {
            grid[r][5] = 1;
            grid[r][14] = 1;
        }
        for (let r = 8; r < 13; r++) {
            grid[r][5] = 1;
            grid[r][14] = 1;
        }
        grid[4][8] = 1;
        grid[4][9] = 1;
        grid[10][8] = 1;
        grid[10][9] = 1;
        // Exit portal (back to overworld)
        grid[7][10] = 2;
        return grid;
    }

    // Switch between maps
    setMap(mapName) {
        if (mapName === 'overworld') {
            this.currentMapName = 'overworld';
            this.grid = this.overworldGrid;
            this.props = this.overworldProps;
        } else if (mapName === 'interior') {
            this.currentMapName = 'interior';
            this.grid = this.interiorGrid;
            this.props = this.interiorProps;
        }
    }

    // Get tile type at pixel position
    getTileAtPosition(x, y) {
        const col = Math.floor(x / this.tileSize);
        const row = Math.floor(y / this.tileSize);
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return 1;
        return this.grid[row][col];
    }

    // Get tile type at grid coordinates
    getTileAt(col, row) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return 1;
        return this.grid[row][col];
    }

    // Check if a pixel position collides with a wall for the player (only tile 1 is solid)
    isWallAtPosition(x, y) {
        const col = Math.floor(x / this.tileSize);
        const row = Math.floor(y / this.tileSize);
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return true;
        return this.grid[row][col] === 1;
    }

    // Check if a pixel position is solid for NPCs (zombies) – tile 1 OR tile 2 (doors)
    isSolidForNPC(x, y) {
        const col = Math.floor(x / this.tileSize);
        const row = Math.floor(y / this.tileSize);
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return true;
        const tile = this.grid[row][col];
        return tile === 1 || tile === 2;
    }

    // Get a list of all empty floor tiles (value 0) – returns array of {col, row, x, y}
    getEmptyTiles() {
        const empty = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.grid[row][col] === 0) {
                    empty.push({
                        col: col,
                        row: row,
                        x: col * this.tileSize + this.tileSize / 2,
                        y: row * this.tileSize + this.tileSize / 2
                    });
                }
            }
        }
        return empty;
    }

    // BFS pathfinding for zombies – treats tile 2 as impassable
    findPath(startCol, startRow, targetCol, targetRow) {
        if (startRow < 0 || startRow >= this.rows || startCol < 0 || startCol >= this.cols ||
            targetRow < 0 || targetRow >= this.rows || targetCol < 0 || targetCol >= this.cols) {
            return [];
        }
        // Start or target on impassable tiles (1 or 2) → no path
        const startTile = this.grid[startRow][startCol];
        const targetTile = this.grid[targetRow][targetCol];
        if (startTile === 1 || startTile === 2 || targetTile === 1 || targetTile === 2) {
            return [];
        }
        const visited = Array.from({ length: this.rows }, () => new Array(this.cols).fill(false));
        const parent = {};
        const queue = [{ col: startCol, row: startRow }];
        visited[startRow][startCol] = true;
        parent[`${startCol},${startRow}`] = null;
        const directions = [
            { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
            { dc: -1, dr: 0 }, { dc: 1, dr: 0 }
        ];
        let found = false;
        while (queue.length > 0 && !found) {
            const current = queue.shift();
            if (current.col === targetCol && current.row === targetRow) {
                found = true;
                break;
            }
            for (const dir of directions) {
                const nc = current.col + dir.dc;
                const nr = current.row + dir.dr;
                if (nc >= 0 && nc < this.cols && nr >= 0 && nr < this.rows &&
                    !visited[nr][nc]) {
                    const tile = this.grid[nr][nc];
                    // impassable for NPC: walls (1) or doors (2)
                    if (tile !== 1 && tile !== 2) {
                        visited[nr][nc] = true;
                        parent[`${nc},${nr}`] = current;
                        queue.push({ col: nc, row: nr });
                    }
                }
            }
        }
        if (!found) return [];
        const path = [];
        let step = { col: targetCol, row: targetRow };
        while (step) {
            path.push(step);
            const key = `${step.col},${step.row}`;
            step = parent[key];
        }
        path.reverse();
        return path;
    }

    draw(ctx) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.cols * this.tileSize, this.rows * this.tileSize);
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const tile = this.grid[row][col];
                if (tile === 1) {
                    ctx.fillStyle = '#00ffff';
                    ctx.fillRect(col * this.tileSize, row * this.tileSize, this.tileSize, this.tileSize);
                } else if (tile === 2) {
                    ctx.fillStyle = '#ff44cc';
                    ctx.fillRect(col * this.tileSize, row * this.tileSize, this.tileSize, this.tileSize);
                    ctx.fillStyle = '#ff88ff';
                    ctx.fillRect(col * this.tileSize + 5, row * this.tileSize + 5, this.tileSize - 10, this.tileSize - 10);
                }
            }
        }
        // Darkness overlay (if map is dark)
        if (this.props.isDark) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, this.cols * this.tileSize, this.rows * this.tileSize);
        }
    }
}