// src/zombie.js – Persistent chase, grid pathfinding with throttle, tile‑center movement
class Zombie {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.size = 30;
        this.half = 15;

        // Smooth movement
        this.vx = 0;
        this.vy = 0;
        this.acc = 1200;
        this.drag = 0.92;

        // State: once CHASE, never back
        this.state = 'WANDER';
        this.wanderTimer = Math.random() * 100;
        this.wanderRadius = 150;
        this.wanderSpd = 90;
        this.chaseSpd = 220;

        this.hasSeen = false;

        // Pathfinding (throttled)
        this.path = [];
        this.pathTimer = 0;
        this.pathDelay = 0.2;   // seconds between recalc
        this.targetX = startX;
        this.targetY = startY;

        this.hp = 3;
        this.maxHp = 3;
        this.dead = false;
    }

    takeDamage(amt) {
        if (this.dead) return;
        this.hp -= amt;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
        }
    }

    _lineOfSight(px, py, map) {
        const step = 12;
        const dx = px - this.x, dy = py - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return true;
        const steps = Math.ceil(dist / step);
        const sx = dx / steps, sy = dy / steps;
        let x = this.x, y = this.y;
        for (let i = 0; i <= steps; i++) {
            if (map.isSolidForNPC(x, y)) return false;
            x += sx;
            y += sy;
        }
        return true;
    }

    _wanderDir() {
        const t = this.wanderTimer;
        const r = this.wanderRadius;
        const tx = this.startX + r * Math.cos(t);
        const ty = this.startY + (r / 2) * Math.sin(2 * t);
        const dx = tx - this.x, dy = ty - this.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.01) return { x: 0, y: 0 };
        return { x: dx / d, y: dy / d };
    }

    _recalcPath(px, py, map) {
        const sc = Math.floor(this.x / map.tileSize);
        const sr = Math.floor(this.y / map.tileSize);
        const tc = Math.floor(px / map.tileSize);
        const tr = Math.floor(py / map.tileSize);
        this.path = map.findPath(sc, sr, tc, tr);
        if (this.path.length && this.path[0].col === sc && this.path[0].row === sr) {
            this.path.shift();
        }
    }

    update(dt, px, py, map) {
        if (this.dead) return;

        // One‑way transition WANDER → CHASE
        if (this.state === 'WANDER') {
            if (this._lineOfSight(px, py, map) || this.hasSeen) {
                this.state = 'CHASE';
                this.hasSeen = true;
                this._recalcPath(px, py, map);
                this.pathTimer = 0;
            }
        }

        let desiredX = 0, desiredY = 0;
        let maxSpd = (this.state === 'CHASE') ? this.chaseSpd : this.wanderSpd;

        if (this.state === 'WANDER') {
            this.wanderTimer += dt * 1.6;
            const w = this._wanderDir();
            desiredX = w.x;
            desiredY = w.y;
        } else {
            // Throttled path refresh
            this.pathTimer += dt;
            if (this.pathTimer >= this.pathDelay) {
                this.pathTimer = 0;
                this._recalcPath(px, py, map);
            }

            if (this.path.length) {
                const node = this.path[0];
                // Tile center
                this.targetX = node.col * map.tileSize + map.tileSize / 2;
                this.targetY = node.row * map.tileSize + map.tileSize / 2;
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const d = Math.hypot(dx, dy);
                if (d < 8) {
                    this.path.shift();
                } else if (d > 0.01) {
                    desiredX = dx / d;
                    desiredY = dy / d;
                }
            } else {
                // Fallback direct chase
                const dx = px - this.x, dy = py - this.y;
                const d = Math.hypot(dx, dy);
                if (d > 0.01) {
                    desiredX = dx / d;
                    desiredY = dy / d;
                }
            }
        }

        // Apply steering
        this.vx += desiredX * this.acc * dt;
        this.vy += desiredY * this.acc * dt;
        this.vx *= this.drag;
        this.vy *= this.drag;

        let spd2 = this.vx * this.vx + this.vy * this.vy;
        if (spd2 > maxSpd * maxSpd) {
            const scale = maxSpd / Math.sqrt(spd2);
            this.vx *= scale;
            this.vy *= scale;
        }

        // Move with collision
        this.x += this.vx * dt;
        if (this._collides(map)) {
            this.x -= this.vx * dt;
            this.vx = 0;
        }
        this.y += this.vy * dt;
        if (this._collides(map)) {
            this.y -= this.vy * dt;
            this.vy = 0;
        }
    }

    _collides(map) {
        const l = this.x - this.half, r = this.x + this.half;
        const t = this.y - this.half, b = this.y + this.half;
        return map.isSolidForNPC(l, t) || map.isSolidForNPC(r, t) ||
               map.isSolidForNPC(l, b) || map.isSolidForNPC(r, b);
    }

    draw(ctx) {
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(this.x - this.half, this.y - this.half, this.size, this.size);
        const barW = this.size, barH = 5;
        const barX = this.x - this.half, barY = this.y - this.half - 8;
        const percent = this.hp / this.maxHp;
        ctx.fillStyle = '#330000';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#ff3366';
        ctx.fillRect(barX, barY, barW * percent, barH);
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.vx = 0;
        this.vy = 0;
        this.hp = this.maxHp;
        this.dead = false;
        this.state = 'WANDER';
        this.hasSeen = false;
        this.wanderTimer = Math.random() * 100;
        this.path = [];
        this.pathTimer = 0;
        this.targetX = this.startX;
        this.targetY = this.startY;
    }
}