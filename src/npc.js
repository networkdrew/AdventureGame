class NPC {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 24;
    }

    isNear(px, py) {
        return Math.hypot(this.x - px, this.y - py) < 80;
    }

    draw(ctx, showPrompt) {
        ctx.fillStyle = '#a855f7'; // Neon Purple Market Vendor
        ctx.fillRect(this.x - 12, this.y - 12, this.size, this.size);
        
        // Technical ring indicators
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 40, 0, Math.PI * 2);
        ctx.stroke();

        if (showPrompt) {
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#00ffcc';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS [E] TO TRADE', this.x, this.y - 20);
        }
    }
}