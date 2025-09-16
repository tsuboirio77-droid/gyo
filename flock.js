// FILE: flock.js
class Flock {
    constructor(images) { this.boids = []; this.predators = []; this.solitary = []; this.plankton = []; this.spawnEffects = []; this.clickThreats = []; this.rippleEffects = []; this.qtree = null; this.planktonQtree = null; this.predatorSpawnCooldownTimers = {}; this.initialCounts = {}; this.images = images; this.reproductionProgress = {}; this.currentCounts = {}; this.displayMode = 0; this.init(); }
    init() { for (const type in CONFIG.FISH_TYPES) { if (CONFIG.FISH_TYPES[type].count > 0) { this.initialCounts[type] = CONFIG.FISH_TYPES[type].count; for (let i = 0; i < CONFIG.FISH_TYPES[type].count; i++) { const image = this.images[type]; if (type === 'CUTLASS') { this.solitary.push(new SolitaryBoid(image)); } else { this.boids.push(new Boid(type, image)); } } } } for (const type in this.initialCounts) { this.reproductionProgress[type] = 0; } for (const predatorType of Object.values(predatorTypeMap)) { this.predatorSpawnCooldownTimers[predatorType] = 0; } for (let i = 0; i < (CONFIG.PLANKTON_COUNT || 50); i++) { this.plankton.push(new Plankton()); } }
    update(deltaTime) { this.updateCurrentCounts(); const allPrey = [...this.boids, ...this.solitary]; const boundary = new Rectangle(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2); this.qtree = new Quadtree(boundary, 4); this.planktonQtree = new Quadtree(boundary, 10); const allBoids = [...allPrey, ...this.predators]; for(const boid of allBoids) { if(boid.alpha > 0) this.qtree.insert(boid); } for(const p of this.plankton) { if(p.size > 0) this.planktonQtree.insert(p); } for (const boid of this.boids) { if (boid.alpha > 0) { boid.act(this.qtree, this.predators, this.planktonQtree, this.clickThreats); boid.update(deltaTime); this.eatPlankton(boid); } } for (const s of this.solitary) { if (s.alpha > 0) { s.act(this.qtree, this.predators, this.planktonQtree, this.clickThreats); s.update(deltaTime); this.eatPlankton(s); } } for (const p of this.predators) { if (p.alpha > 0) { p.act(this.qtree, allPrey, this.predators, this.currentCounts); p.update(deltaTime); } } for (const p of this.plankton) { p.update(deltaTime); } this.spawnEffects.forEach(e => e.update(deltaTime)); this.clickThreats.forEach(t => t.update(deltaTime)); this.rippleEffects.forEach(r => r.update(deltaTime)); this.cleanupAndRespawn(); }
    updateCurrentCounts() { this.currentCounts = {}; [...this.boids, ...this.solitary].forEach(p => { if(p.alpha > 0 && !p.isDying) this.currentCounts[p.type] = (this.currentCounts[p.type] || 0) + 1; }); }
    draw() { ctx.shadowBlur = 4; for (const p of this.plankton) p.draw(); ctx.shadowBlur = 0; for (const effect of this.rippleEffects) { effect.draw(); } for (const s of this.solitary) if (s.alpha > 0) s.draw(); for (const b of this.boids) if (b.alpha > 0) b.draw(); for (const p of this.predators) if (p.alpha > 0) p.draw(); for (const effect of this.spawnEffects) { effect.draw(); } this.updateUIVisibility(); this.drawPopulationCount(); if (this.displayMode > 0) this.drawDebugIndicators(); }
    updateUIVisibility() { document.getElementById('population-panel').classList.toggle('visible', this.displayMode > 0); document.getElementById('info-panel').classList.toggle('visible', this.displayMode === 2); }
    drawPopulationCount() {
        const table = document.getElementById('population-table');
        if (!table || this.displayMode === 0) return;
        const preyTypes = ['BONITO', 'MACKEREL', 'CUTLASS', 'SARDINE'];
        const typeNameMap = { 'BONITO': 'カツオ', 'MACKEREL': 'サバ', 'CUTLASS': 'タチウオ', 'SARDINE': 'イワシ' };
        let tableHTML = '<thead><tr><th>魚種</th><th>初期</th><th>現在</th><th>増減</th><th>繁殖</th></tr></thead><tbody>';
        for (const type of preyTypes) {
            if (!this.initialCounts[type]) continue;
            const count = this.currentCounts[type] || 0;
            const initial = this.initialCounts[type] || 0;
            const increase = count - initial;
            const increaseStr = increase > 0 ? `+${increase}` : String(increase);
            const repro = `${String(this.reproductionProgress[type] || 0).padStart(2)}/${CONFIG.FISH_TYPES[type].reproductionCost}`;
            const isOverpopulated = count > initial + CONFIG.OVERPOPULATION_COUNT;
            const highlightStyle = isOverpopulated ? 'style="color: #FF6B6B;"' : '';
            tableHTML += `<tr ${highlightStyle}><td>${typeNameMap[type] || type}</td><td>${initial}</td><td>${count}</td><td>${increaseStr}</td><td>${repro}</td></tr>`;
        }
        tableHTML += '</tbody>';
        table.innerHTML = tableHTML;
    }
    drawDebugIndicators() {
        const predatorColors = { SHARK: '#FF4136', MARLIN: '#0074D9', TUNA: '#FFDC00', RAY: '#B10DC9', WHALE: '#FFFFFF' };
        ctx.font = '12px monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        for (const p of this.predators) {
            if (p.isOffScreen()) {
                const x = Math.max(15, Math.min(canvas.width - 15, p.position.x));
                const y = Math.max(15, Math.min(canvas.height - 15, p.position.y));
                ctx.fillStyle = predatorColors[p.type] || '#7FDBFF';
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.fillText(p.type.slice(0, 1), x, y + 1);
            }
            if (p.currentTarget && p.currentTarget.alpha > 0) {
                const targetPos = p.currentTarget.position;
                const markerSize = 10;
                ctx.strokeStyle = predatorColors[p.type] || '#7FDBFF';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(targetPos.x - markerSize, targetPos.y);
                ctx.lineTo(targetPos.x + markerSize, targetPos.y);
                ctx.moveTo(targetPos.x, targetPos.y - markerSize);
                ctx.lineTo(targetPos.x, targetPos.y + markerSize);
                ctx.stroke();
            }

            if (this.displayMode > 0) {
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.3;

                if (p.config.seekRange) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.beginPath();
                    ctx.arc(p.position.x, p.position.y, p.config.seekRange, 0, Math.PI * 2);
                    ctx.stroke();
                }

                const mouthPos = p.getMouthPosition();
                if (p.config.eatRadius) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.beginPath();
                    ctx.arc(mouthPos.x, mouthPos.y, p.config.eatRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

                // ★★★★★★★★★★★★★★★★★★★★★★★★★
                // 修正点：スタン判定の円を、カジキ専用の先端位置に描画
                // ★★★★★★★★★★★★★★★★★★★★★★★★★
                if (p.config.stunRadius) {
                    const stunPos = (p.type === 'MARLIN') ? p.getBillTipPosition() : mouthPos;
                    ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                    ctx.beginPath();
                    ctx.arc(stunPos.x, stunPos.y, p.config.stunRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            }
        }
    }
    eatPlankton(boid) { if (boid.eatCooldownTimer > 0) return; const eatRange = new Rectangle(boid.position.x, boid.position.y, boid.config.eatRadius, boid.config.eatRadius); const nearbyPlankton = this.planktonQtree.query(eatRange); for (const p of nearbyPlankton) { if (boid.position.subtract(p.position).magnitude() < boid.config.eatRadius) { this.plankton = this.plankton.filter(pl => pl !== p); this.plankton.push(new Plankton()); if (boid.config.eatCooldown) boid.eatCooldownTimer = boid.config.eatCooldown; if (this.reproductionProgress[boid.type] !== undefined) { this.reproductionProgress[boid.type]++; } if (boid.config.reproductionCost && this.reproductionProgress[boid.type] >= boid.config.reproductionCost) { this.respawnBoid(boid.type); this.reproductionProgress[boid.type] -= boid.config.reproductionCost; } return; } } }
    cleanupAndRespawn() { this.boids = this.boids.filter(b => b.alpha > 0); this.solitary = this.solitary.filter(s => s.alpha > 0); this.predators = this.predators.filter(p => p.alpha > 0); this.spawnEffects = this.spawnEffects.filter(e => e.lifespan > 0); this.clickThreats = this.clickThreats.filter(t => t.lifespan > 0); this.rippleEffects = this.rippleEffects.filter(r => r.lifespan > 0); for (const type in this.predatorSpawnCooldownTimers) { this.predatorSpawnCooldownTimers[type] = Math.max(0, this.predatorSpawnCooldownTimers[type] - 1); } this.checkAndSpawnPredators(); }
    checkAndSpawnPredators() { const preyTypes = Object.keys(predatorTypeMap); for (const preyType of preyTypes) { const predatorType = predatorTypeMap[preyType]; const isOverpopulated = (this.currentCounts[preyType] || 0) > (this.initialCounts[preyType] || 0) + CONFIG.OVERPOPULATION_COUNT; const isOffCooldown = this.predatorSpawnCooldownTimers[predatorType] === 0; const currentPredatorCount = this.predators.filter(p => p.type === predatorType).length; const maxPredatorCount = CONFIG.FISH_TYPES[predatorType].maxCount; if (isOverpopulated && isOffCooldown && currentPredatorCount < maxPredatorCount) { this.spawnRegularPredator(preyType); } } let isWhaleTime = false; for (const type in this.initialCounts) { if ((this.currentCounts[type] || 0) > (this.initialCounts[type] || 0) + CONFIG.WHALE_OVERPOPULATION_COUNT) { isWhaleTime = true; break; } } if (isWhaleTime) { this.spawnWhale(); } }
    spawnRegularPredator(overpopulatedType) { const predatorTypeToSpawn = predatorTypeMap[overpopulatedType]; if (!predatorTypeToSpawn) return false; const side = Math.floor(Math.random() * 4); let x, y; const margin = CONFIG.PREDATOR_DESPAWN_MARGIN; switch (side) { case 0: x = Math.random() * canvas.width; y = -margin; break; case 1: x = canvas.width + margin; y = Math.random() * canvas.height; break; case 2: x = Math.random() * canvas.width; y = canvas.height + margin; break; case 3: x = -margin; y = Math.random() * canvas.height; break; } const image = this.images[predatorTypeToSpawn]; const PredatorClass = PredatorClasses[predatorTypeToSpawn]; if (PredatorClass) { this.predators.push(new PredatorClass(image, x, y, 0, 0, overpopulatedType)); this.predatorSpawnCooldownTimers[predatorTypeToSpawn] = CONFIG.PREDATOR_SPAWN_COOLDOWN; return true; } return false; }
    respawnBoid(type) { const margin = CONFIG.BOID_SPAWN_MARGIN; const side = Math.floor(Math.random() * 4); let x, y; switch (side) { case 0: x = Math.random() * canvas.width; y = -margin; break; case 1: x = canvas.width + margin; y = Math.random() * canvas.height; break; case 2: x = Math.random() * canvas.width; y = canvas.height + margin; break; case 3: x = -margin; y = Math.random() * canvas.height; break; } const image = this.images[type]; let newBoid; if (type === 'CUTLASS') { newBoid = new SolitaryBoid(image, x, y); this.solitary.push(newBoid); } else { newBoid = new Boid(type, image, x, y); this.boids.push(newBoid); } const center = new Vector(canvas.width / 2, canvas.height / 2); const dirToCenter = center.subtract(newBoid.position).normalize(); newBoid.velocity = dirToCenter.multiply(newBoid.config.maxSpeed); newBoid.startGlowing(180); const effectPos = new Vector(Math.max(0, Math.min(canvas.width - 1, x)), Math.max(0, Math.min(canvas.height - 1, y))); const color = CONFIG.FISH_TYPES[type].spawnColor || "150, 200, 255"; this.spawnEffects.push(new SpawnEffect(effectPos, color, side)); }
    spawnWhale() { if (this.predators.some(p => p.type === 'WHALE')) return false; const image = this.images.WHALE; const config = CONFIG.FISH_TYPES.WHALE; const margin = config.width / 2; let x, y, vx, vy; y = Math.random() * (canvas.height * 0.6) + (canvas.height * 0.2); vy = 0; if (Math.random() < 0.5) { x = -margin; vx = config.maxSpeed; } else { x = canvas.width + margin; vx = -config.maxSpeed; } this.predators.push(new Whale(image, x, y, vx, vy)); return true; }
}