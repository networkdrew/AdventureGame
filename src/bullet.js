// src/bullet.js – Projectile with custom damage, color, and trajectory
class Bullet {
    constructor(x, y, angle, damage, canvasWidth, canvasHeight, color = '#ffff00') {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.speed = 600;
        this.size = 4;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.isDead = false;
        this.color = color;
    }

    update(deltaTime, map) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        if (this.x < 0 || this.x > this.canvasWidth ||
            this.y < 0 || this.y > this.canvasHeight) {
            this.isDead = true;
            return;
        }

        if (map.isWallAtPosition(this.x, this.y)) {
            this.isDead = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
}