class Pickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'cash', 'ammo', 'health'
        this.size = 12;
        this.bobTimer = Math.random() * Math.PI * 2;
        
        // Match reward balancing values
        this.value = type === 'cash' ? Math.floor(Math.random() * 40) + 20 :
                     type === 'ammo' ? 30 : 25;
    }

    draw(ctx) {
        this.bobTimer += 0.05;
        const pulse = Math.sin(this.bobTimer) * 3;
        
        ctx.save();
        ctx.translate(this.x, this.y + pulse);
        
        switch(this.type) {
            case 'cash':   ctx.fillStyle = '#eab308'; break;
            case 'ammo':   ctx.fillStyle = '#06b6d4'; break;
            case 'health': ctx.fillStyle = '#ef4444'; break;
            default:       ctx.fillStyle = '#ffffff';
        }
        
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }
}