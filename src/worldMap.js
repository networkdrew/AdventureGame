class WorldMap {
    constructor() {
        this.tileSize = 64;
        this.cols = 40;
        this.rows = 30;
        this.grid = this.buildStructuredCity();
    }

    buildStructuredCity() {
        const grid = Array(this.rows).fill().map(() => Array(this.cols).fill(2));
        const streetRows = [4, 5, 14, 15, 24, 25];
        const streetCols = [8, 9, 20, 21, 32, 33];

        for (let r of streetRows) {
            for (let c = 0; c < this.cols; c++) grid[r][c] = 0;
        }
        for (let c of streetCols) {
            for (let r = 0; r < this.rows; r++) grid[r][c] = 0;
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (grid[r][c] === 2) {
                    let nearStreet = false;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            let nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                                if (streetRows.includes(nr) || streetCols.includes(nc)) nearStreet = true;
                            }
                        }
                    }
                    if (nearStreet) grid[r][c] = 1;
                }
            }
        }

        // Structural safehouse bounds
        grid[2][2] = 3; grid[2][3] = 3; grid[3][2] = 3; grid[3][3] = 3; grid[3][4] = 1;
        grid[13][21] = 4; grid[23][9] = 4;

        for (let c = 0; c < this.cols; c++) { grid[0][c] = 2; grid[this.rows-1][c] = 2; }
        for (let r = 0; r < this.rows; r++) { grid[r][0] = 2; grid[r][this.cols-1] = 2; }

        return grid;
    }

    isWallAtWorldPos(worldX, worldY) {
        const c = Math.floor(worldX / this.tileSize);
        const r = Math.floor(worldY / this.tileSize);
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return true;
        return this.grid[r][c] === 2;
    }

    isSolidForNPC(worldX, worldY) {
        const c = Math.floor(worldX / this.tileSize);
        const r = Math.floor(worldY / this.tileSize);
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return true;
        const tile = this.grid[r][c];
        return tile === 2 || tile === 4;
    }

    isDoorAtWorldPos(worldX, worldY) {
        const c = Math.floor(worldX / this.tileSize);
        const r = Math.floor(worldY / this.tileSize);
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false;
        return this.grid[r][c] === 4;
    }

    getWalkableTiles() {
        const tiles = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== 2) {
                    tiles.push({
                        x: c * this.tileSize + this.tileSize / 2,
                        y: r * this.tileSize + this.tileSize / 2,
                        r: r, c: c, type: this.grid[r][c]
                    });
                }
            }
        }
        return tiles;
    }

    draw(ctx, camera) {
        const startCol = Math.max(0, Math.floor((camera.x - ctx.canvas.width / 2) / this.tileSize));
        const endCol = Math.min(this.cols - 1, Math.floor((camera.x + ctx.canvas.width / 2) / this.tileSize));
        const startRow = Math.max(0, Math.floor((camera.y - ctx.canvas.height / 2) / this.tileSize));
        const endRow = Math.min(this.rows - 1, Math.floor((camera.y + ctx.canvas.height / 2) / this.tileSize));

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const x = c * this.tileSize;
                const y = r * this.tileSize;
                const tileType = this.grid[r][c];

                switch (tileType) {
                    case 0:
                        ctx.fillStyle = '#22252a'; ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        ctx.fillStyle = '#444950';
                        if (r % 10 === 5) ctx.fillRect(x + this.tileSize/2 - 4, y + this.tileSize/2 - 2, 8, 4);
                        break;
                    case 1:
                        ctx.fillStyle = '#4b515d'; ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        ctx.strokeStyle = '#3a3f47'; ctx.strokeRect(x, y, this.tileSize, this.tileSize);
                        break;
                    case 2:
                        ctx.fillStyle = '#0d1117'; ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        ctx.fillStyle = '#161b22'; ctx.fillRect(x + 4, y + 4, this.tileSize - 8, this.tileSize - 8);
                        break;
                    case 3:
                        ctx.fillStyle = '#1b2f20'; ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        break;
                    case 4:
                        ctx.fillStyle = '#3a1d5d'; ctx.fillRect(x, y, this.tileSize, this.tileSize);
                        break;
                }
            }
        }
    }

    findPath(startX, startY, endX, endY) {
        const startC = Math.floor(startX / this.tileSize);
        const startR = Math.floor(startY / this.tileSize);
        const endC = Math.floor(endX / this.tileSize);
        const endR = Math.floor(endY / this.tileSize);

        if (startC === endC && startR === endR) return [];
        if (endC < 0 || endC >= this.cols || endR < 0 || endR >= this.rows || this.grid[endR][endC] === 2) return [];

        const queue = [[startR, startC]];
        const visited = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
        const parent = Array(this.rows).fill().map(() => Array(this.cols).fill(null));

        visited[startR][startC] = true;
        let found = false;

        const dr = [-1, 1, 0, 0];
        const dc = [0, 0, -1, 1];

        while (queue.length > 0) {
            const [r, c] = queue.shift();
            if (r === endR && c === endC) { found = true; break; }

            for (let i = 0; i < 4; i++) {
                const nr = r + dr[i]; const nc = c + dc[i];
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    if (!visited[nr][nc] && this.grid[nr][nc] !== 2) {
                        visited[nr][nc] = true; parent[nr][nc] = [r, c];
                        queue.push([nr, nc]);
                    }
                }
            }
        }

        if (!found) return [];
        const path = [];
        let curr = [endR, endC];
        while (curr !== null) {
            path.push({ x: curr[1] * this.tileSize + this.tileSize / 2, y: curr[0] * this.tileSize + this.tileSize / 2 });
            curr = parent[curr[0]][curr[1]];
        }
        path.pop();
        return path.reverse();
    }
}