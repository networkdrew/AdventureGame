// src/game.js – Full adventure with tiered weapon shop, pickups, portals
(function () {
    window.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;

        // Keyboard
        const keys = {};
        const handled = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        window.addEventListener('keydown', (e) => {
            if (handled.includes(e.code)) { e.preventDefault(); keys[e.code] = true; }
            // Weapon switching (1,2,3) – only if unlocked
            if (e.code === 'Digit1') player.switchWeapon('PISTOL');
            if (e.code === 'Digit2') player.switchWeapon('SMG');
            if (e.code === 'Digit3') player.switchWeapon('SHOTGUN');
            // Shop interaction (E)
            if (e.code === 'KeyE' && !isShopOpen && merchant && merchant.isNear(player.x, player.y)) {
                isShopOpen = true;
                e.preventDefault();
            }
            // Shop purchase keys (4-8)
            if (isShopOpen) {
                if (e.code === 'Digit4') purchaseUpgradePistol();
                if (e.code === 'Digit5') purchaseUnlockOrUpgradeSMG();
                if (e.code === 'Digit6') purchaseUnlockOrUpgradeShotgun();
                if (e.code === 'Digit7') purchaseAmmo();
                if (e.code === 'Digit8') purchaseMedkit();
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => {
            if (handled.includes(e.code)) { e.preventDefault(); keys[e.code] = false; }
            if (e.code === 'Escape' && isShopOpen) {
                isShopOpen = false;
                e.preventDefault();
            }
        });

        // Mouse aim
        const mouse = { x: w/2, y: h/2 };
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const sx = w / rect.width, sy = h / rect.height;
            mouse.x = (e.clientX - rect.left) * sx;
            mouse.y = (e.clientY - rect.top) * sy;
        });

        // Shooting state (automatic fire)
        let mouseDown = false;
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                mouseDown = true;
                e.preventDefault();
            }
        });
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) mouseDown = false;
        });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        let bullets = [];
        const map = new Map();
        const player = new Player(0, 0, w, h);
        let zombies = [];
        let pickups = [];
        let merchant = null;

        let isShopOpen = false;
        let clearTimer = 0;
        let clearTriggered = false;

        // --- Shop purchase handlers ---
        function purchaseUpgradePistol() {
            const weapon = player.weapons['PISTOL'];
            if (weapon.tier < 10 && player.cash >= weapon.upgradeCost) {
                player.cash -= weapon.upgradeCost;
                weapon.tier++;
                // Optional: increase upgrade cost each tier? Could keep static or scale. Static for simplicity.
            }
        }

        function purchaseUnlockOrUpgradeSMG() {
            const weapon = player.weapons['SMG'];
            if (!weapon.unlocked) {
                if (player.cash >= weapon.unlockCost) {
                    player.cash -= weapon.unlockCost;
                    weapon.unlocked = true;
                }
            } else if (weapon.tier < 10 && player.cash >= weapon.upgradeCost) {
                player.cash -= weapon.upgradeCost;
                weapon.tier++;
            }
        }

        function purchaseUnlockOrUpgradeShotgun() {
            const weapon = player.weapons['SHOTGUN'];
            if (!weapon.unlocked) {
                if (player.cash >= weapon.unlockCost) {
                    player.cash -= weapon.unlockCost;
                    weapon.unlocked = true;
                }
            } else if (weapon.tier < 10 && player.cash >= weapon.upgradeCost) {
                player.cash -= weapon.upgradeCost;
                weapon.tier++;
            }
        }

        function purchaseAmmo() {
            const cost = 50;
            if (player.cash >= cost) {
                player.cash -= cost;
                player.ammo += 30;
            }
        }

        function purchaseMedkit() {
            const cost = 75;
            if (player.cash >= cost) {
                player.cash -= cost;
                player.hp = Math.min(player.maxHp, player.hp + 40);
            }
        }

        // --- Safe spawn on empty tiles ---
        function spawnAll() {
            const empty = map.getEmptyTiles();
            if (!empty.length) return;
            const shuffled = [...empty];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            const ps = shuffled[0];
            player.x = ps.x; player.y = ps.y;
            player.vx = player.vy = 0;
            const zCount = (map.currentMapName === 'overworld') ? 3 : 4;
            zombies = [];
            for (let i = 1; i <= zCount && i < shuffled.length; i++) {
                zombies.push(new Zombie(shuffled[i].x, shuffled[i].y));
            }
        }

        function resetRoom() {
            player.hp = player.maxHp;
            bullets = [];
            pickups = [];
            spawnAll();
            clearTimer = 0;
            clearTriggered = false;
        }

        function transitionToMap(name) {
            if (name === map.currentMapName) return;
            map.setMap(name);
            bullets = [];
            pickups = [];
            spawnAll();
            clearTimer = 0;
            clearTriggered = false;
            if (name !== 'overworld') {
                merchant = null;
            } else if (!merchant) {
                const empty = map.getEmptyTiles();
                if (empty.length) {
                    const mid = empty[Math.floor(empty.length/2)];
                    merchant = new NPC(mid.x, mid.y);
                }
            }
        }

        map.setMap('overworld');
        resetRoom();
        const emptyTiles = map.getEmptyTiles();
        if (emptyTiles.length) {
            const mid = emptyTiles[Math.floor(emptyTiles.length/2)];
            merchant = new NPC(mid.x, mid.y);
        }

        let lastTime = 0;

        // --- Update loop (frozen when shop open) ---
        function update(dt) {
            if (isShopOpen) return;

            player.update(dt, keys, map, mouse);

            const tileHere = map.getTileAtPosition(player.x, player.y);
            if (tileHere === 2) {
                if (map.currentMapName === 'overworld') transitionToMap('interior');
                else transitionToMap('overworld');
                return;
            }

            if (mouseDown) {
                const now = performance.now();
                const newBullets = player.attemptFire(now, w, h);
                if (newBullets.length) bullets.push(...newBullets);
            }

            for (let z of zombies) z.update(dt, player.x, player.y, map);
            for (let b of bullets) b.update(dt, map);

            // Bullet vs Zombie
            for (let i = bullets.length-1; i >= 0; i--) {
                const b = bullets[i];
                const bL = b.x-2, bR = b.x+2, bT = b.y-2, bB = b.y+2;
                let hit = false;
                for (let j = 0; j < zombies.length; j++) {
                    const z = zombies[j];
                    if (z.dead) continue;
                    const zL = z.x-15, zR = z.x+15, zT = z.y-15, zB = z.y+15;
                    if (bR > zL && bL < zR && bB > zT && bT < zB) {
                        z.takeDamage(b.damage);
                        hit = true;
                        break;
                    }
                }
                if (hit) bullets.splice(i,1);
            }

            // Dead zombies → pickups
            for (let i = zombies.length-1; i >= 0; i--) {
                if (zombies[i].dead) {
                    const types = ['cash', 'ammo', 'health'];
                    const randType = types[Math.floor(Math.random() * types.length)];
                    pickups.push(new Pickup(zombies[i].x, zombies[i].y, randType));
                    zombies.splice(i,1);
                }
            }

            // Pickup collection
            for (let i = 0; i < pickups.length; i++) {
                const p = pickups[i];
                if (p.isDead) continue;
                const pL = p.x-6, pR = p.x+6, pT = p.y-6, pB = p.y+6;
                const plL = player.x-10, plR = player.x+10, plT = player.y-10, plB = player.y+10;
                if (plR > pL && plL < pR && plB > pT && plT < pB) {
                    if (p.type === 'cash') player.cash += p.value;
                    else if (p.type === 'ammo') player.ammo += p.value;
                    else if (p.type === 'health') player.hp = Math.min(player.maxHp, player.hp + p.value);
                    p.isDead = true;
                }
            }
            pickups = pickups.filter(p => !p.isDead);

            // Zombie damage to player
            for (let z of zombies) {
                if (z.dead) continue;
                const plL = player.x-10, plR = player.x+10, plT = player.y-10, plB = player.y+10;
                const zL = z.x-15, zR = z.x+15, zT = z.y-15, zB = z.y+15;
                if (plR > zL && plL < zR && plB > zT && plT < zB) {
                    player.takeDamage(20 * dt);
                }
            }

            if (player.hp <= 0) {
                resetRoom();
                return;
            }

            bullets = bullets.filter(b => !b.isDead);

            if (zombies.length === 0) {
                if (!clearTriggered) {
                    clearTriggered = true;
                    clearTimer = 2.0;
                }
            } else {
                clearTriggered = false;
            }
            if (clearTimer > 0) {
                clearTimer -= dt;
                if (clearTimer < 0) clearTimer = 0;
            }
        }

        // --- Laser sight ---
        function drawLaser() {
            const step = 4, maxSteps = 200;
            const ang = player.angle;
            const dx = Math.cos(ang), dy = Math.sin(ang);
            let rx = player.x, ry = player.y;
            let hit = false;
            for (let i = 0; i < maxSteps; i++) {
                rx += dx * step;
                ry += dy * step;
                if (rx < 0 || rx > w || ry < 0 || ry > h) break;
                if (map.isWallAtPosition(rx, ry)) { hit = true; break; }
            }
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(rx, ry);
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            if (hit) {
                ctx.fillStyle = '#39ff14';
                ctx.beginPath();
                ctx.arc(rx, ry, 2.5, 0, Math.PI*2);
                ctx.fill();
            }
        }

        // --- Shop menu with tier/unlock info ---
        function drawShopMenu() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, w, h);
            ctx.font = 'bold 28px "Courier New", monospace';
            ctx.fillStyle = '#00aaff';
            ctx.fillText('BLACK MARKET', w/2 - 110, h/2 - 160);
            ctx.font = '18px monospace';
            ctx.fillStyle = '#ffffff';

            const pistol = player.weapons['PISTOL'];
            ctx.fillText(`[4] Upgrade Pistol (Tier ${pistol.tier}/10)   $${pistol.upgradeCost}`, w/2 - 210, h/2 - 80);

            const smg = player.weapons['SMG'];
            if (!smg.unlocked) {
                ctx.fillText(`[5] Buy SMG (Unlock)   $${smg.unlockCost}`, w/2 - 210, h/2 - 40);
            } else {
                ctx.fillText(`[5] Upgrade SMG (Tier ${smg.tier}/10)   $${smg.upgradeCost}`, w/2 - 210, h/2 - 40);
            }

            const shotgun = player.weapons['SHOTGUN'];
            if (!shotgun.unlocked) {
                ctx.fillText(`[6] Buy Shotgun (Unlock)   $${shotgun.unlockCost}`, w/2 - 210, h/2);
            } else {
                ctx.fillText(`[6] Upgrade Shotgun (Tier ${shotgun.tier}/10)   $${shotgun.upgradeCost}`, w/2 - 210, h/2);
            }

            ctx.fillText(`[7] Buy Ammo (+30 rounds)   $50`, w/2 - 210, h/2 + 40);
            ctx.fillText(`[8] Buy Medkit (+40 HP)   $75`, w/2 - 210, h/2 + 80);

            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`CASH: $${player.cash}`, w/2 - 60, h/2 + 140);
            ctx.fillStyle = '#ffaa44';
            ctx.fillText('Press ESC to close', w/2 - 90, h/2 + 190);
        }

        // --- Main draw ---
        function draw() {
            ctx.clearRect(0, 0, w, h);
            map.draw(ctx);
            if (merchant) merchant.draw(ctx, !isShopOpen && merchant.isNear(player.x, player.y));
            for (let p of pickups) p.draw(ctx);
            for (let z of zombies) z.draw(ctx);
            drawLaser();
            ctx.fillStyle = '#39ff14';
            ctx.fillRect(player.x-10, player.y-10, 20, 20);
            for (let b of bullets) b.draw(ctx);

            // Health bar
            const barW = 200, barH = 20;
            const hpPercent = player.hp / player.maxHp;
            ctx.fillStyle = '#330000';
            ctx.fillRect(20, 20, barW, barH);
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(20, 20, barW * hpPercent, barH);
            ctx.strokeStyle = '#ff6699';
            ctx.strokeRect(20, 20, barW, barH);
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText(`HP: ${Math.floor(player.hp)}/${player.maxHp}`, 25, 35);

            // Weapon, Cash, Ammo HUD
            ctx.font = 'bold 16px "Courier New", monospace';
            ctx.fillStyle = '#ffaa44';
            ctx.fillText(`WEAPON: ${player.currentWeapon} (Tier ${player.weapons[player.currentWeapon].tier})`, 25, 65);
            ctx.fillStyle = '#ffff00';
            ctx.fillText(`CASH: $${player.cash}`, 25, 90);
            ctx.fillStyle = '#00ffff';
            ctx.fillText(`AMMO: ${player.ammo}`, 25, 115);

            if (clearTimer > 0) {
                ctx.font = 'bold 28px "Courier New", monospace';
                ctx.fillStyle = '#00ffcc';
                ctx.shadowColor = '#00ffcc';
                ctx.shadowBlur = 6;
                ctx.fillText('AREA CLEANSE: SECTOR CLEAR', 20, 170);
                ctx.shadowBlur = 0;
            }

            if (isShopOpen) drawShopMenu();
        }

        function gameLoop(now) {
            let dt = (now - lastTime) / 1000;
            if (dt > 0.1) dt = 0.1;
            lastTime = now;
            update(dt);
            draw();
            requestAnimationFrame(gameLoop);
        }
        requestAnimationFrame(gameLoop);
    });
})();