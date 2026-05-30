// src/npc.js – Black Market Merchant NPC
class NPC {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.half = 10;
        this.interactRadius = 50;
    }

    // Check if player is within interaction range
    isNear(playerX, playerY) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        return Math.hypot(dx, dy) < this.interactRadius;
    }

    draw(ctx, playerNear) {
        // Merchant body (neon blue)
        ctx.fillStyle = '#00aaff';
        ctx.shadowBlur = 0;
        ctx.fillRect(this.x - this.half, this.y - this.half, this.size, this.size);

        // Interaction prompt if player is near
        if (playerNear) {
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 4;
            ctx.fillText('[E] BLACK MARKET', this.x - 55, this.y - 15);
            ctx.shadowBlur = 0;
        }
    }
}