class Player {
    constructor(x, y, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.halfSize = 10;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        this.hp = 100;
        this.maxHp = 100;
        this.cash = 0;

        this.maxSpeed = 450;
        this.acceleration = 6000;
        this.friction = 0.70;

        this.vx = 0;
        this.vy = 0;

        this.crosshairOffsetX = 100;
        this.crosshairOffsetY = 0;
        this.worldMouseX = this.x + this.crosshairOffsetX;
        this.worldMouseY = this.y + this.crosshairOffsetY;

        // Enhanced FX State engine variables
        this.muzzleFlashActive = false;
        this.muzzleFlashTimer = 0;
        this.recoilOffset = 0;

        this.weapons = {
            'PISTOL': {
                unlocked: true, tier: 1, baseDamage: 1, upgradeCost: 100, unlockCost: 0,
                automatic: false, fireRateMs: 300, ammoCost: 1, bulletCount: 1, spread: 0,
                color: '#aaffaa', name: 'PISTOL', barrelLength: 16, barrelWidth: 4,
                barrelColor: '#00ff00', gripColor: '#444', frameColor: '#222', ammo: 60
            },
            'SMG': {
                unlocked: false, tier: 1, baseDamage: 1, upgradeCost: 150, unlockCost: 400,
                automatic: true, fireRateMs: 100, ammoCost: 1, bulletCount: 1, spread: 0.15,
                color: '#ffffaa', name: 'SMG', barrelLength: 14, barrelWidth: 6,
                barrelColor: '#ffff00', gripColor: '#555', frameColor: '#333', ammo: 0
            },
            'SHOTGUN': {
                unlocked: false, tier: 1, baseDamage: 2, upgradeCost: 250, unlockCost: 750,
                automatic: false, fireRateMs: 800, ammoCost: 3, bulletCount: 5, spread: 0.35,
                color: '#ffaa88', name: 'SHOTGUN', barrelLength: 20, barrelWidth: 10,
                barrelColor: '#ff00ff', gripColor: '#662222', frameColor: '#441111', ammo: 0
            }
        };
        this.currentWeapon = 'PISTOL';
        this.lastShotTime = 0;

        this.bobPhase = 0;
        this.bobSpeed = 14;
        this.legSeparation = 0;
    }

    getCurrentDamage() {
        const w = this.weapons[this.currentWeapon];
        return w.baseDamage + (w.tier - 1) * 0.5;
    }

    getCurrentAmmo() {
        return this.weapons[this.currentWeapon].ammo;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }

    consumeAmmo(amount) {
        const weapon = this.weapons[this.currentWeapon];
        if (weapon.ammo >= amount) {
            weapon.ammo -= amount;
            return true;
        }
        return false;
    }

    addAmmo(weaponName, amount) {
        const w = this.weapons[weaponName];
        if (w) w.ammo += amount;
    }

    switchWeapon(weaponName) {
        const w = this.weapons[weaponName];
        if (w && w.unlocked) this.currentWeapon = weaponName;
    }

    attemptFire(now, mapWidth, mapHeight) {
        const weapon = this.weapons[this.currentWeapon];
        if (now - this.lastShotTime < weapon.fireRateMs) return [];
        if (!this.consumeAmmo(weapon.ammoCost)) return [];

        this.lastShotTime = now;
        
        // Trigger visual FX mechanics safely
        this.muzzleFlashActive = true;
        this.muzzleFlashTimer = 0.05; 
        this.recoilOffset = 6; 

        const damage = this.getCurrentDamage();
        const bullets = [];
        const baseAngle = this.angle;

        for (let i = 0; i < weapon.bulletCount; i++) {
            let angleOffset = 0;
            if (weapon.spread > 0) angleOffset = (Math.random() - 0.5) * 2 * weapon.spread;
            const finalAngle = baseAngle + angleOffset;
            bullets.push(new Bullet(this.x, this.y, finalAngle, damage, mapWidth, mapHeight, weapon.color));
        }
        return bullets;
    }

    getBarrelTip() {
        const weapon = this.weapons[this.currentWeapon];
        const barrelLen = weapon.barrelLength - this.recoilOffset;
        const tipX = this.x + Math.cos(this.angle) * barrelLen;
        const tipY = this.y + Math.sin(this.angle) * barrelLen;
        return { x: tipX, y: tipY };
    }

    update(deltaTime, keys, map) {
        // Visual cooldown reductions
        if (this.muzzleFlashActive) {
            this.muzzleFlashTimer -= deltaTime;
            if (this.muzzleFlashTimer <= 0) this.muzzleFlashActive = false;
        }
        if (this.recoilOffset > 0) {
            this.recoilOffset *= Math.exp(-25 * deltaTime);
        }

        let dx = 0, dy = 0;
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
        
        if (dx !== 0 && dy !== 0) {
            const invSqrt = 0.70710678118;
            dx *= invSqrt; dy *= invSqrt;
        }

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vx += dx * this.acceleration * deltaTime;
        this.vy += dy * this.acceleration * deltaTime;

        let spdSq = this.vx * this.vx + this.vy * this.vy;
        let maxSpdSq = this.maxSpeed * this.maxSpeed;
        if (spdSq > maxSpdSq) {
            const scale = this.maxSpeed / Math.sqrt(spdSq);
            this.vx *= scale; this.vy *= scale;
        }

        this.x += this.vx * deltaTime;
        if (this._collidesWithMap(map)) { this.x -= this.vx * deltaTime; this.vx = 0; }

        this.y += this.vy * deltaTime;
        if (this._collidesWithMap(map)) { this.y -= this.vy * deltaTime; this.vy = 0; }

        this.x = Math.max(this.halfSize, Math.min(map.cols * map.tileSize - this.halfSize, this.x));
        this.y = Math.max(this.halfSize, Math.min(map.rows * map.tileSize - this.halfSize, this.y));

        this.worldMouseX = this.x + this.crosshairOffsetX;
        this.worldMouseY = this.y + this.crosshairOffsetY;
        this.angle = Math.atan2(this.worldMouseY - this.y, this.worldMouseX - this.x);

        const moving = Math.hypot(this.vx, this.vy) > 5;
        if (moving) {
            this.bobPhase += deltaTime * this.bobSpeed;
            this.legSeparation = Math.sin(this.bobPhase) * 6;
        } else {
            this.bobPhase *= 0.95;
            this.legSeparation *= 0.9;
        }
    }

    _collidesWithMap(map) {
        const l = this.x - this.halfSize;
        const r = this.x + this.halfSize;
        const t = this.y - this.halfSize;
        const b = this.y + this.halfSize;
        return map.isWallAtWorldPos(l, t) || map.isWallAtWorldPos(r, t) ||
               map.isWallAtWorldPos(l, b) || map.isWallAtWorldPos(r, b);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Legs
        ctx.fillStyle = '#2a2a3e';
        ctx.fillRect(-5, -8 + this.legSeparation, 10, 4);
        ctx.fillRect(-5, 4 - this.legSeparation, 10, 4);

        // Core Torso
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-10, -10, 16, 20);

        // High-vis tactical marker
        ctx.fillStyle = '#39ff14';
        ctx.fillRect(-4, -3, 6, 6);

        // Weapon Rendering Matrix Transformation
        ctx.save();
        const weapon = this.weapons[this.currentWeapon];
        const finalBarrelLength = weapon.barrelLength - this.recoilOffset;
        
        ctx.translate(6, 4); // Line up with hand placement coordinates
        ctx.fillStyle = weapon.frameColor;
        ctx.fillRect(0, -weapon.barrelWidth / 2, finalBarrelLength, weapon.barrelWidth);
        
        // Core highlight accents
        ctx.fillStyle = weapon.barrelColor;
        ctx.fillRect(finalBarrelLength - 4, -weapon.barrelWidth / 2 + 1, 4, weapon.barrelWidth - 2);

        // Muzzle Flash Layer Execution
        if (this.muzzleFlashActive) {
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(finalBarrelLength + 6, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(finalBarrelLength + 4, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore(); // weapon UI Context
        ctx.restore(); // global component positions
    }
}