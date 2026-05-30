// src/pickup.js – Collectible items: cash, ammo, health
class Pickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;   // 'cash', 'ammo', 'health'
        this.size = 12;
        this.isDead = false;

        switch (type) {
            case 'cash':
                this.value = Math.floor(Math.random() * 81) + 20; // 20–100
                this.color = '#00ff00';
                break;
            case 'ammo':
                this.value = 15;
                this.color = '#00ffff';
                break;
            case 'health':
                this.value = 25;
                this.color = '#ff00ff';
                break;
            default:
                this.value = 0;
                this.color = '#ffffff';
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.shadowBlur = 0;
    }
}