(function () {
    window.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;

        canvas.style.cursor = 'none';

        const camera = new Camera();
        const worldMap = new WorldMap();
        
        const mapWidth = worldMap.cols * worldMap.tileSize;
        const mapHeight = worldMap.rows * worldMap.tileSize;

        const keys = {};
        const handled = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        window.addEventListener('keydown', (e) => {
            if (handled.includes(e.code)) { e.preventDefault(); keys[e.code] = true; }
            if (e.code === 'Digit1') player.switchWeapon('PISTOL');
            if (e.code === 'Digit2') player.switchWeapon('SMG');
            if (e.code === 'Digit3') player.switchWeapon('SHOTGUN');
            if (e.code === 'KeyE' && !isShopOpen && merchant && merchant.isNear(player.x, player.y)) {
                isShopOpen = true; e.preventDefault();
            }
            if (isShopOpen) {
                if (e.code === 'Digit4') purchaseUpgradePistol();
                if (e.code === 'Digit5') purchaseUnlockOrUpgradeSMG();
                if (e.code === 'Digit6') purchaseUnlockOrUpgradeShotgun();
                if (e.code === 'Digit7') purchasePistolAmmo();
                if (e.code === 'Digit8') purchaseSMGAmmo();
                if (e.code === 'Digit9') purchaseShotgunAmmo();
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => {
            if (handled.includes(e.code)) { e.preventDefault(); keys[e.code] = false; }
            if (e.code === 'Escape' && isShopOpen) { isShopOpen = false; e.preventDefault(); }
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            let screenX = (e.clientX - rect.left) * (w / rect.width);
            let screenY = (e.clientY - rect.top) * (h / rect.height);
            player.crosshairOffsetX = screenX - (w / 2);
            player.crosshairOffsetY = screenY - (h / 2);
        });

        let mouseDown = false;
        canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouseDown = true; e.preventDefault(); } });
        canvas.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        let bullets = [];
        const player = new Player(200, 200, w, h);
        let zombies = [];
        let civilians = [];
        let pickups = [];
        let merchant = null;

        let isShopOpen = false;
        let clearTimer = 0;
        let clearTriggered = false;

        class CivilianPedestrian {
            constructor(startX, startY) {
                this.x = startX; this.y = startY;
                this.size = 24; this.half = 12;
                this.vx = 0; this.vy = 0;
                this.speed = 65; this.acc = 800; this.drag = 0.90;
                this.facingAngle = Math.random() * Math.PI*2;
                this.path = []; this.timer = Math.random()*3;
            }
            update(dt, map) {
                this.timer -= dt;
                if (this.path.length === 0 && this.timer <= 0) {
                    this.timer = Math.random()*5 + 2;
                    const targets = map.getWalkableTiles().filter(t => t.type === 1 || t.type === 0);
                    if (targets.length) {
                        const choice = targets[Math.floor(Math.random()*targets.length)];
                        this.path = map.findPath(this.x, this.y, choice.x, choice.y);
                    }
                }
                if (this.path.length > 0) {
                    const tgt = this.path[0];
                    const dx = tgt.x - this.x, dy = tgt.y - this.y;
                    if (Math.hypot(dx, dy) < 12) { this.path.shift(); } 
                    else {
                        this.facingAngle = Math.atan2(dy, dx);
                        this.vx += Math.cos(this.facingAngle) * this.acc * dt;
                        this.vy += Math.sin(this.facingAngle) * this.acc * dt;
                    }
                }
                const spd = Math.hypot(this.vx, this.vy);
                if (spd > this.speed) { this.vx = (this.vx/spd)*this.speed; this.vy = (this.vy/spd)*this.speed; }
                this.vx *= this.drag; this.vy *= this.drag;
                this.x += this.vx * dt;
                if (map.isSolidForNPC(this.x, this.y)) this.x -= this.vx * dt;
                this.y += this.vy * dt;
                if (map.isSolidForNPC(this.x, this.y)) this.y -= this.vy * dt;
            }
            draw(ctx) {
                ctx.fillStyle = '#5a7b9c'; ctx.fillRect(this.x - this.half, this.y - this.half, this.size, this.size);
                ctx.strokeStyle = '#9bbcd2'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + Math.cos(this.facingAngle)*10, this.y + Math.sin(this.facingAngle)*10);
                ctx.stroke();
            }
        }

        function purchaseUpgradePistol() { const w = player.weapons['PISTOL']; if (w.tier < 10 && player.cash >= w.upgradeCost) { player.cash -= w.upgradeCost; w.tier++; } }
        function purchaseUnlockOrUpgradeSMG() { const w = player.weapons['SMG']; if (!w.unlocked && player.cash >= w.unlockCost) { player.cash -= w.unlockCost; w.unlocked = true; } else if (w.unlocked && w.tier < 10 && player.cash >= w.upgradeCost) { player.cash -= w.upgradeCost; w.tier++; } }
        function purchaseUnlockOrUpgradeShotgun() { const w = player.weapons['SHOTGUN']; if (!w.unlocked && player.cash >= w.unlockCost) { player.cash -= w.unlockCost; w.unlocked = true; } else if (w.unlocked && w.tier < 10 && player.cash >= w.upgradeCost) { player.cash -= w.upgradeCost; w.tier++; } }
        function purchasePistolAmmo() { if (player.cash >= 20) { player.cash -= 20; player.addAmmo('PISTOL', 30); } }
        function purchaseSMGAmmo() { if (player.cash >= 45) { player.cash -= 45; player.addAmmo('SMG', 50); } }
        function purchaseShotgunAmmo() { if (player.cash >= 60) { player.cash -= 60; player.addAmmo('SHOTGUN', 15); } }

        function spawnAllEntities() {
            const walkable = worldMap.getWalkableTiles();
            if (!walkable.length) return;
            const hostileTiles = walkable.filter(t => t.type !== 3);
            const streetTiles = walkable.filter(t => t.type === 0 || t.type === 1);

            const safeSpots = walkable.filter(t => t.type === 3);
            if (safeSpots.length) { player.x = safeSpots[0].x; player.y = safeSpots[0].y; }
            player.vx = player.vy = 0;

            zombies = [];
            for (let i = 0; i < 14; i++) {
                if (hostileTiles.length) {
                    const spot = hostileTiles[Math.floor(Math.random() * hostileTiles.length)];
                    zombies.push(new Zombie(spot.x, spot.y));
                }
            }

            civilians = [];
            for (let i = 0; i < 18; i++) {
                if (streetTiles.length) {
                    const spot = streetTiles[Math.floor(Math.random() * streetTiles.length)];
                    civilians.push(new CivilianPedestrian(spot.x, spot.y));
                }
            }
            pickups = [];
        }

        function resetRoom() { player.hp = player.maxHp; bullets = []; spawnAllEntities(); clearTimer = 0; clearTriggered = false; }
        function placeMerchantNPC() { const walkable = worldMap.getWalkableTiles(); const legalSpots = walkable.filter(t => t.type === 1); if (legalSpots.length) { const target = legalSpots[Math.floor(legalSpots.length / 3)]; merchant = new NPC(target.x, target.y); } }

        spawnAllEntities(); placeMerchantNPC();
        let lastTime = 0;

        function drawCappedLaser() {
            const barrel = player.getBarrelTip();
            const startX = barrel.x; const startY = barrel.y;
            const angle = player.angle;
            const dirX = Math.cos(angle); const dirY = Math.sin(angle);
            const step = 4; const maxSteps = 250;
            let rayX = startX; let rayY = startY;
            let hitWall = false;

            for (let i = 0; i < maxSteps; i++) {
                const nextX = rayX + dirX * step; const nextY = rayY + dirY * step;
                if (worldMap.isWallAtWorldPos(nextX, nextY)) { hitWall = true; rayX = nextX; rayY = nextY; break; }
                rayX = nextX; rayY = nextY;
            }
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(rayX, rayY);
            ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)'; ctx.lineWidth = 1.0; ctx.stroke();
        }

        function update(dt) {
            if (isShopOpen) return;
            player.update(dt, keys, worldMap);

            if (worldMap.isDoorAtWorldPos(player.x, player.y)) { resetRoom(); return; }

            if (mouseDown) {
                const now = performance.now();
                const newBullets = player.attemptFire(now, mapWidth, mapHeight);
                if (newBullets.length) {
                    bullets.push(...newBullets);
                    for (let z of zombies) {
                        if (z && typeof z.alertToSound === 'function') z.alertToSound(player.x, player.y);
                    }
                }
            }

            for (let z of zombies) z.update(dt, player.x, player.y, worldMap);
            for (let c of civilians) c.update(dt, worldMap);
            for (let b of bullets) b.update(dt, worldMap);

            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i]; let hit = false;
                for (let j = 0; j < zombies.length; j++) {
                    const z = zombies[j]; if (z.dead) continue;
                    if (Math.hypot(b.x - z.x, b.y - z.y) < 16) { z.takeDamage(b.damage); hit = true; break; }
                }
                if (hit) bullets.splice(i, 1);
            }

            for (let i = zombies.length - 1; i >= 0; i--) {
                if (zombies[i].dead) {
                    const types = ['cash', 'ammo', 'health'];
                    pickups.push(new Pickup(zombies[i].x, zombies[i].y, types[Math.floor(Math.random() * types.length)]));
                    zombies.splice(i, 1);
                }
            }

            for (let i = pickups.length - 1; i >= 0; i--) {
                const p = pickups[i];
                if (Math.hypot(player.x - p.x, player.y - p.y) < 20) {
                    if (p.type === 'cash') player.cash += p.value;
                    else if (p.type === 'ammo') player.addAmmo(player.currentWeapon, p.value);
                    else if (p.type === 'health') player.hp = Math.min(player.maxHp, player.hp + p.value);
                    pickups.splice(i, 1);
                }
            }

            for (let z of zombies) { if (!z.dead && Math.hypot(player.x - z.x, player.y - z.y) < 22) { player.takeDamage(24 * dt); } }
            if (player.hp <= 0) { resetRoom(); return; }
            bullets = bullets.filter(b => !b.isDead);

            if (zombies.length === 0) { if (!clearTriggered) { clearTriggered = true; clearTimer = 2.0; } } else { clearTriggered = false; }
            if (clearTimer > 0) { clearTimer -= dt; if (clearTimer < 0) clearTimer = 0; }
        }

        function drawShopMenu() {
            ctx.fillStyle = 'rgba(10, 13, 16, 0.95)'; ctx.fillRect(0, 0, w, h);
            ctx.font = 'bold 24px "Courier New", monospace'; ctx.fillStyle = '#00ffcc';
            ctx.fillText('CITY SUPPLY STORE', w/2 - 120, h/2 - 160);
            ctx.font = '16px monospace'; ctx.fillStyle = '#cbd5e1';

            const pistol = player.weapons['PISTOL'];
            ctx.fillText(`[4] Upgrade Pistol (Tier ${pistol.tier}/10)   $${pistol.upgradeCost}`, w/2 - 200, h/2 - 90);
            const smg = player.weapons['SMG'];
            if (!smg.unlocked) ctx.fillText(`[5] Unlock SMG Carbine         $${smg.unlockCost}`, w/2 - 200, h/2 - 50);
            else ctx.fillText(`[5] Upgrade SMG (Tier ${smg.tier}/10)   $${smg.upgradeCost}`, w/2 - 200, h/2 - 50);
            const shotgun = player.weapons['SHOTGUN'];
            if (!shotgun.unlocked) ctx.fillText(`[6] Unlock Tactical Shotgun    $${shotgun.unlockCost}`, w/2 - 200, h/2 - 10);
            else ctx.fillText(`[6] Upgrade Shotgun (Tier ${shotgun.tier}/10) $${shotgun.upgradeCost}`, w/2 - 200, h/2 - 10);
            ctx.fillText(`[7] Pistol Ammo Box (+30)    $20`, w/2 - 200, h/2 + 40);
            ctx.fillText(`[8] SMG Magazine Box (+50)   $45`, w/2 - 200, h/2 + 80);
            ctx.fillText(`[9] Shotgun Shell Pack (+15) $60`, w/2 - 200, h/2 + 120);
            ctx.fillStyle = '#eab308'; ctx.font = 'bold 16px monospace';
            ctx.fillText(`CASH SAVINGS: $${player.cash}`, w/2 - 70, h/2 + 180);
        }

        function draw() {
            camera.update(player.x, player.y, w, h);
            ctx.clearRect(0, 0, w, h);

            ctx.save();
            ctx.translate(-camera.x + w/2, -camera.y + h/2);

            worldMap.draw(ctx, camera);

            if (merchant) merchant.draw(ctx, !isShopOpen && merchant.isNear(player.x, player.y));
            for (let p of pickups) p.draw(ctx);
            for (let c of civilians) c.draw(ctx);
            for (let z of zombies) z.draw(ctx);
            player.draw(ctx);
            for (let b of bullets) b.draw(ctx);
            drawCappedLaser();

            // Reticle rendering
            ctx.beginPath(); ctx.arc(player.x + player.crosshairOffsetX, player.y + player.crosshairOffsetY, 6, 0, Math.PI*2);
            ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 1.5; ctx.stroke();

            ctx.restore();

            // Screen HUD Space
            const hpPercent = player.hp / player.maxHp;
            ctx.fillStyle = '#1e1e24'; ctx.fillRect(20, 20, 200, 18);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(20, 20, 200 * hpPercent, 18);
            ctx.font = 'bold 13px "Courier New", monospace'; ctx.fillStyle = '#fff';
            ctx.fillText(`VITALITY: ${Math.floor(player.hp)}%`, 28, 33);

            ctx.font = 'bold 15px "Courier New", monospace'; ctx.fillStyle = '#eab308';
            ctx.fillText(`WALLET: $${player.cash}`, 20, 62);
            const weaponObj = player.weapons[player.currentWeapon];
            ctx.fillStyle = '#06b6d4'; ctx.fillText(`GUN: ${weaponObj.name} [Tier ${weaponObj.tier}]`, 20, 85);
            ctx.fillStyle = '#22d3ee'; ctx.fillText(`AMMO RESERVES: ${player.getCurrentAmmo()}`, 20, 108);

            if (clearTimer > 0) { ctx.font = 'bold 24px "Courier New", monospace'; ctx.fillStyle = '#22d3ee'; ctx.fillText('PROLOGUE: LOCAL DISTRICT CLEARED', 20, 155); }
            if (isShopOpen) drawShopMenu();
        }

        function gameLoop(now) {
            let dt = (now - lastTime) / 1000;
            if (dt > 0.1) dt = 0.1;
            lastTime = now;
            update(dt); draw();
            requestAnimationFrame(gameLoop);
        }
        requestAnimationFrame(gameLoop);
    });
})();