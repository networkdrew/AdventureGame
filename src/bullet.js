class Bullet {
    constructor(x, y, angle, damage, mapWidth, mapHeight, color = '#ffff00') {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.speed = 750; // Boosted velocity for snappier responses
        this.size = 4;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.isDead = false;
        this.color = color;
    }

    update(deltaTime, map) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Boundary checks against complete world limits
        if (this.x < 0 || this.x > this.mapWidth || this.y < 0 || this.y > this.mapHeight) {
            this.isDead = true;
            return;
        }

        // FIXED: Replaced non-existent isWallAtPosition with verified isWallAtWorldPos
        if (map.isWallAtWorldPos(this.x, this.y)) {
            this.isDead = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y / 2, this.size, this.size);
    }
}