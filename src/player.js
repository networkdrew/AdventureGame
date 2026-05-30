// src/player.js – Locked speed, weapon tier system, unlockable arsenal
class Player {
    constructor(x, y, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.halfSize = 10;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Stats
        this.hp = 100;
        this.maxHp = 100;
        this.cash = 0;
        this.ammo = 60;

        // PERMANENT SPEED CONFIGURATION
        this.maxSpeed = 450;
        this.acceleration = 6000;
        this.friction = 0.70;

        this.vx = 0;
        this.vy = 0;
        this.angle = 0;

        // Weapon arsenal with tier progression
        this.weapons = {
            'PISTOL': {
                unlocked: true,
                tier: 1,
                baseDamage: 1,
                upgradeCost: 100,
                unlockCost: 0,
                automatic: false,
                fireRateMs: 300,
                ammoCost: 1,
                bulletCount: 1,
                spread: 0,
                color: '#aaffaa',
                name: 'PISTOL'
            },
            'SMG': {
                unlocked: false,
                tier: 1,
                baseDamage: 1,
                upgradeCost: 150,
                unlockCost: 400,
                automatic: true,
                fireRateMs: 100,
                ammoCost: 1,
                bulletCount: 1,
                spread: 0.15,
                color: '#ffffaa',
                name: 'SMG'
            },
            'SHOTGUN': {
                unlocked: false,
                tier: 1,
                baseDamage: 2,
                upgradeCost: 250,
                unlockCost: 750,
                automatic: false,
                fireRateMs: 800,
                ammoCost: 3,
                bulletCount: 5,
                spread: 0.35,
                color: '#ffaa88',
                name: 'SHOTGUN'
            }
        };
        this.currentWeapon = 'PISTOL';
        this.lastShotTime = 0;
    }

    // Helper to get current weapon's damage (based on tier)
    getCurrentDamage() {
        const w = this.weapons[this.currentWeapon];
        return w.baseDamage + (w.tier - 1) * 0.5;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }

    consumeAmmo(amount) {
        if (this.ammo >= amount) {
            this.ammo -= amount;
            return true;
        }
        return false;
    }

    switchWeapon(weaponName) {
        const w = this.weapons[weaponName];
        if (w && w.unlocked) {
            this.currentWeapon = weaponName;
        }
    }

    attemptFire(now, canvasWidth, canvasHeight) {
        const weapon = this.weapons[this.currentWeapon];
        const timeSinceLast = now - this.lastShotTime;
        if (timeSinceLast < weapon.fireRateMs) return [];

        if (!this.consumeAmmo(weapon.ammoCost)) return [];

        this.lastShotTime = now;

        const damage = this.getCurrentDamage();
        const bullets = [];
        const baseAngle = this.angle;

        for (let i = 0; i < weapon.bulletCount; i++) {
            let angleOffset = 0;
            if (weapon.spread > 0) {
                angleOffset = (Math.random() - 0.5) * 2 * weapon.spread;
            }
            const finalAngle = baseAngle + angleOffset;
            bullets.push(new Bullet(
                this.x, this.y,
                finalAngle,
                damage,
                canvasWidth, canvasHeight,
                weapon.color
            ));
        }
        return bullets;
    }

    update(deltaTime, keys, map, mouse) {
        let dx = 0, dy = 0;
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
        if (dx !== 0 && dy !== 0) {
            const invSqrt = 0.70710678118;
            dx *= invSqrt;
            dy *= invSqrt;
        }

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vx += dx * this.acceleration * deltaTime;
        this.vy += dy * this.acceleration * deltaTime;

        let spdSq = this.vx * this.vx + this.vy * this.vy;
        let maxSpdSq = this.maxSpeed * this.maxSpeed;
        if (spdSq > maxSpdSq) {
            const scale = this.maxSpeed / Math.sqrt(spdSq);
            this.vx *= scale;
            this.vy *= scale;
        }

        // Horizontal movement
        this.x += this.vx * deltaTime;
        if (this._collidesWithMap(map)) {
            this.x -= this.vx * deltaTime;
            this.vx = 0;
        }

        // Vertical movement
        this.y += this.vy * deltaTime;
        if (this._collidesWithMap(map)) {
            this.y -= this.vy * deltaTime;
            this.vy = 0;
        }

        this.x = Math.max(this.halfSize, Math.min(this.canvasWidth - this.halfSize, this.x));
        this.y = Math.max(this.halfSize, Math.min(this.canvasHeight - this.halfSize, this.y));

        if (mouse) {
            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        }
    }

    _collidesWithMap(map) {
        const l = this.x - this.halfSize;
        const r = this.x + this.halfSize;
        const t = this.y - this.halfSize;
        const b = this.y + this.halfSize;
        return map.isWallAtPosition(l, t) || map.isWallAtPosition(r, t) ||
               map.isWallAtPosition(l, b) || map.isWallAtPosition(r, b);
    }
}