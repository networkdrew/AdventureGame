class Zombie {
    constructor(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.size = 22;
        this.speed = 110;
        this.hp = 3;
        this.dead = false;
        this.facingAngle = Math.random() * Math.PI * 2;
        this.path = [];
        this.pathUpdateCooldown = Math.random() * 0.5;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) this.dead = true;
    }

    alertToSound(soundX, soundY) {
        // Fire weapon alerts drop entities out of passive state directly into tracking mode
        this.facingAngle = Math.atan2(soundY - this.y, soundX - this.x);
        this.speed = 160; // Enrage speed tier boost on audio detection
    }

    update(dt, playerX, playerY, map) {
        if (this.dead) return;

        const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);
        this.pathUpdateCooldown -= dt;

        // Dynamic throttling: recalculate pathfinding arrays periodically to protect tick cycles
        if (this.pathUpdateCooldown <= 0 && distToPlayer < 600) {
            this.pathUpdateCooldown = 0.6 + Math.random() * 0.3;
            this.path = map.findPath(this.x, this.y, playerX, playerY);
        }

        // Execute step vectors based on remaining nodes
        if (this.path && this.path.length > 0) {
            const node = this.path[0];
            const dx = node.x - this.x;
            const dy = node.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 16) {
                this.path.shift();
            } else {
                this.facingAngle = Math.atan2(dy, dx);
                this.x += Math.cos(this.facingAngle) * this.speed * dt;
                this.y += Math.sin(this.facingAngle) * this.speed * dt;
            }
        } else {
            // Fallback tracking logic if standard path arrays are restricted
            if (distToPlayer < 500) {
                this.facingAngle = Math.atan2(playerY - this.y, playerX - this.x);
                let nextX = this.x + Math.cos(this.facingAngle) * this.speed * dt;
                let nextY = this.y + Math.sin(this.facingAngle) * this.speed * dt;
                
                if (!map.isSolidForNPC(nextX, this.y)) this.x = nextX;
                if (!map.isSolidForNPC(this.x, nextY)) this.y = nextY;
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.fillStyle = '#dc2626'; // Hostile Threat Profile
        ctx.fillRect(this.x - 11, this.y - 11, this.size, this.size);
        
        // Operational heading vector overlay
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(this.facingAngle) * 12, this.y + Math.sin(this.facingAngle) * 12);
        ctx.stroke();
    }
}