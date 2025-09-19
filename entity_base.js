// FILE: entity_base.js
class Boid {
    constructor(type, image, x = Math.random() * canvas.width, y = Math.random() * canvas.height, vx, vy) {
        this.type = type;
        this.config = CONFIG.FISH_TYPES[type] || CONFIG.FISH_TYPES.SARDINE;
        this.position = new Vector(x, y);
        if (vx !== undefined && vy !== undefined) {
            this.velocity = new Vector(vx, vy);
        } else {
            this.velocity = new Vector((Math.random() - 0.5) * this.config.maxSpeed, (Math.random() - 0.5) * this.config.maxSpeed);
        }
        this.acceleration = new Vector();
        this.image = image;

        // ★▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 修正ブロック ▼▼▼▼▼▼▼▼▼▼▼▼▼▼★
        const scale = CONFIG.DEVICE_SCALES[DEVICE_TYPE] || CONFIG.DEVICE_SCALES.DESKTOP;
        this.width = this.config.width * scale.sizeModifier;
        this.height = this.config.height * scale.sizeModifier;
        
        // オブジェクトの構造を統一するため、fleeRangeプロパティを必ず初期化する
        if (this.config.fleeRange) {
            this.fleeRange = this.config.fleeRange * scale.rangeModifier;
        } else {
            this.fleeRange = null; // 使わない場合はnullで初期化
        }
        // ★▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 修正ブロック ▲▲▲▲▲▲▲▲▲▲▲▲▲▲★

        this.alpha = 1;
        this.isDying = false;
        this.dyingTimer = 0;
        this.maxDyingTime = 30;
        this.isGlowing = false;
        this.glowingTimer = 0;
        this.eatCooldownTimer = 0;
        this.isStunned = false;
        this.stunTimer = 0;
    }
    startDying() { if (!this.isDying) { this.isDying = true; this.dyingTimer = this.maxDyingTime; } }
    startGlowing(durationFrames, color = "255,255,170") { this.isGlowing = true; this.glowingTimer = durationFrames; this.glowColor = color; }
    stun(duration) { this.isStunned = true; this.stunTimer = duration; }
    applyForce(force) { this.acceleration = this.acceleration.add(force); }
    updateTimers(deltaTime) { if (this.isDying) { this.dyingTimer -= deltaTime; if (this.dyingTimer <= 0) this.alpha = 0; return false; } if (this.isStunned) { this.stunTimer -= deltaTime; if (this.stunTimer <= 0) this.isStunned = false; } if (this.isGlowing) { this.glowingTimer = Math.max(0, this.glowingTimer - deltaTime); if (this.glowingTimer <= 0) this.isGlowing = false; } if (this.eatCooldownTimer > 0) { this.eatCooldownTimer = Math.max(0, this.eatCooldownTimer - deltaTime); } return true; }
    act(qtree, predators, planktonQtree, clickThreats) { if (this.isStunned) { this.acceleration = this.velocity.multiply(-0.1); const sway = new Vector(this.velocity.y, -this.velocity.x).normalize().multiply(0.2); this.applyForce(sway.multiply(Math.sin(this.stunTimer * 0.5))); return; } const allThreats = [...predators, ...clickThreats]; const fleeForce = this.flee(allThreats); const range = new Rectangle(this.position.x, this.position.y, CONFIG.VISUAL_RANGE, CONFIG.VISUAL_RANGE); const neighbors = qtree.query(range); const foodAttraction = this.eatCooldownTimer === 0 ? this.seekClosest(planktonQtree, this.config.planktonSeekRange || 40) : new Vector(); if (fleeForce.magnitude() > 0) { this.applyForce(fleeForce.multiply(this.config.fleeForceMultiplier || 2.5)); } else if (foodAttraction.magnitude() > 0 && this.type === 'BONITO') { const focus = this.config.planktonFocusMultiplier || 0.2; this.applyForce(this.calculateAlignment(neighbors).multiply(this.config.alignmentWeight * focus)); this.applyForce(this.calculateCohesion(neighbors).multiply(this.config.cohesionWeight * focus)); this.applyForce(this.calculateSeparation(neighbors).multiply(this.config.separationWeight)); this.applyForce(foodAttraction.multiply(this.config.planktonSeekMultiplier || 1.0)); } else { this.flock(neighbors); if (this.eatCooldownTimer === 0) { this.applyForce(foodAttraction.multiply(this.config.planktonSeekMultiplier || 1.0)); } } }
    flock(neighbors) { this.applyForce(this.calculateAlignment(neighbors).multiply(this.config.alignmentWeight)); this.applyForce(this.calculateCohesion(neighbors).multiply(this.config.cohesionWeight)); this.applyForce(this.calculateSeparation(neighbors).multiply(this.config.separationWeight)); }
    update(deltaTime, speedLimit) { if (!this.updateTimers(deltaTime)) return; const limit = speedLimit !== undefined ? speedLimit : this.config.maxSpeed; this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime)); if (this.isStunned) { this.velocity = this.velocity.limit(limit * 0.5); } else { this.velocity = this.velocity.limit(limit); } this.position = this.position.add(this.velocity.multiply(deltaTime)); this.acceleration = new Vector(); this.applyForce(this.avoidWalls()); this.handleBoundaries(); }
    handleBoundaries() { if (this.position.x < 0) { this.position.x = 0; this.velocity.x *= -1; } if (this.position.x > canvas.width) { this.position.x = canvas.width; this.velocity.x *= -1; } if (this.position.y < 0) { this.position.y = 0; this.velocity.y *= -1; } if (this.position.y > canvas.height) { this.position.y = canvas.height; this.velocity.y *= -1; } }
    avoidWalls() {
        let steer = new Vector();
        const predict = this.velocity.normalize().multiply(25);
        const predictPos = this.position.add(predict);
        if (predictPos.x < CONFIG.WALL_AVOID_DISTANCE) { steer.x = 1; }
        else if (predictPos.x > canvas.width - CONFIG.WALL_AVOID_DISTANCE) { steer.x = -1; }
        if (predictPos.y < CONFIG.WALL_AVOID_DISTANCE) { steer.y = 1; }
        else if (predictPos.y > canvas.height - CONFIG.WALL_AVOID_DISTANCE) { steer.y = -1; }
        return steer.normalize().multiply(CONFIG.WALL_AVOID_FORCE);
    }
    draw() {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.velocity.heading() + Math.PI);
        ctx.globalAlpha = 1;
        if (this.isDying) { if (Math.floor(this.dyingTimer) % 4 < 2) { ctx.restore(); return; } ctx.filter = 'brightness(1.5) drop-shadow(0 0 8px #ff0000)'; const scale = this.dyingTimer / this.maxDyingTime; ctx.scale(scale, scale); }
        else if (this.isStunned) { if (Math.floor(this.stunTimer / 4) % 2 === 0) { ctx.filter = 'brightness(2.5) drop-shadow(0 0 20px #ff0)'; } }
        else if (this.isGlowing) { const color = this.glowColor || "255,255,170"; ctx.filter = `brightness(1.8) drop-shadow(0 0 10px rgba(${color}, 0.8))`; }
        const w = this.width;
        const h = this.height;
        ctx.globalAlpha = (this.isStealthed) ? 0.3 : 0.85;
        ctx.drawImage(this.image, -w / 2, -h / 2, w, h);
        ctx.filter = 'none';
        this.drawEffects(ctx);
        ctx.restore();
    }
    drawEffects(ctx) { }
    seek(target) { const desired = target.subtract(this.position).normalize().multiply(this.config.maxSpeed); const steer = desired.subtract(this.velocity); const multiplier = this.config.seekForceMultiplier || 1.0; return steer.limit(CONFIG.MAX_FORCE * multiplier); }
    seekClosest(qtree, range = Infinity) { let closest = null; let minDistance = range; const searchArea = new Rectangle(this.position.x, this.position.y, range, range); const candidates = qtree.query(searchArea); for (const target of candidates) { const d = this.position.subtract(target.position).magnitude(); if (d < minDistance) { minDistance = d; closest = target; } } return closest ? this.seek(closest.position) : new Vector(); }
    flee(threats) {
        let steer = new Vector();
        for (const threat of threats) {
            if (threat.alpha <= 0 || (threat.type === 'RAY' && threat.isStealthed)) continue;
            const range = threat.config ? (this.fleeRange || CONFIG.VISUAL_RANGE) : CONFIG.CLICK_EFFECT.threatRadius;
            const diff = this.position.subtract(threat.position);
            const d = diff.magnitude();
            if (d < range) {
                steer = steer.add(diff.normalize().divide(d));
            }
        }
        if (steer.magnitude() > 0) {
            return steer.normalize().multiply(this.config.maxSpeed).subtract(this.velocity).limit(CONFIG.MAX_FORCE * 5);
        }
        return steer;
    }
    calculateAlignment(neighbors) { let sum = new Vector(); let count = 0; for (const other of neighbors) { if (other !== this && other.type === this.type && other.alpha > 0) { sum = sum.add(other.velocity); count++; } } if (count > 0) { const desired = sum.divide(count).normalize().multiply(this.config.maxSpeed); return desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE); } return new Vector(); }
    calculateCohesion(neighbors) { let sum = new Vector(); let count = 0; for (const other of neighbors) { if (other !== this && other.type === this.type && other.alpha > 0) { sum = sum.add(other.position); count++; } } if (count > 0) { return this.seek(sum.divide(count)); } return new Vector(); }
    calculateSeparation(neighbors) { let steer = new Vector(); for (const other of neighbors) { if (other === this || other.alpha <= 0) continue; const d = this.position.subtract(other.position).magnitude(); if (d > 0 && d < CONFIG.AVOID_RADIUS) { const diff = this.position.subtract(other.position).normalize().divide(d); steer = steer.add(diff); } } if (steer.magnitude() > 0) { const desired = steer.normalize().multiply(this.config.maxSpeed); return desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE); } return steer; }
}

class Predator extends Boid {
    constructor(type, image, x, y, vx, vy, targetPreyType) {
        super(type, image, x, y, vx, vy);
        this.lifespan = this.config.lifespan;
        this.isLeaving = false;
        this.targetPreyType = targetPreyType;
        this.currentTarget = null;
        
        // ★▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 追加 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼★
        // 捕食者の索敵範囲もスケーリングする
        if (this.config.seekRange) {
            const scale = CONFIG.DEVICE_SCALES[DEVICE_TYPE] || CONFIG.DEVICE_SCALES.DESKTOP;
            this.seekRange = this.config.seekRange * scale.rangeModifier;
        }
        // ★▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 追加 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲★
    }
    isOffScreen() {
        const margin = CONFIG.REPOSITION_MARGIN || 10;
        return this.position.x < -margin || this.position.x > canvas.width + margin ||
               this.position.y < -margin || this.position.y > canvas.height + margin;
    }
    attemptToEat(prey) { if (!prey || !this.canEat()) return false; const mouthPosition = this.getMouthPosition(); const d = mouthPosition.subtract(prey.position).magnitude(); const angleToPrey = this.velocity.normalize().dot(prey.position.subtract(this.position).normalize()); if (d < this.config.eatRadius && angleToPrey > 0.6) { prey.startDying(); this.resetEatCooldown(prey); return true; } return false; }
    act(qtree, allPrey, allPredators, currentCounts) { if (this.config.isFlocking) { const neighbors = qtree.query(new Rectangle(this.position.x, this.position.y, CONFIG.VISUAL_RANGE, CONFIG.VISUAL_RANGE)); this.flock(neighbors); } if (this.isLeaving) { const desired = new Vector(canvas.width / 2, canvas.height / 2).subtract(this.position).normalize().multiply(-this.config.maxSpeed); this.applyForce(desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE)); return; } const targetCount = currentCounts[this.targetPreyType] || 0; const initialCount = flock.initialCounts[this.targetPreyType] || 0; if ((targetCount < initialCount + CONFIG.PREDATOR_LEAVE_COUNT || this.lifespan <= 0) && this.type !== 'WHALE') { this.isLeaving = true; return; }
        if (!this.currentTarget || this.currentTarget.alpha <= 0 || this.currentTarget.isDying) {
            this.currentTarget = this.findBestPrey(allPrey, allPredators, currentCounts, qtree);
        }
        if (this.currentTarget && !this.attemptToEat(this.currentTarget)) { this.applyForce(this.seek(this.currentTarget.position)); }
        else if (!this.currentTarget) { const wander = new Vector((Math.random() - 0.5) * (this.config.wanderForce || 0.1), (Math.random() - 0.5) * (this.config.wanderForce || 0.1)); this.applyForce(wander); }
    }
    getMouthPosition() {
        if (this.velocity.magnitude() === 0) return this.position;
        const dir = this.velocity.normalize();
        const offsetConf = this.config.mouthOffset;
        if (typeof offsetConf === 'object' && offsetConf !== null) {
            const perpendicular = new Vector(dir.y, -dir.x);
            const offsetX = this.width * offsetConf.x;
            const offsetY = this.height * offsetConf.y;
            return this.position.add(dir.multiply(offsetX)).add(perpendicular.multiply(offsetY));
        } else {
            return this.position.add(dir.multiply(this.width * offsetConf));
        }
    }
    findBestPrey(preyList, allPredators, currentCounts, qtree) {
        // ★▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 修正点 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼★
        const seekRange = this.isOffScreen() ? 9999 * 2 : (this.seekRange || this.config.seekRange);
        // ★▲▲▲▲▲▲▲▲▲▲▲▲▲ 修正点 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲★
        const availablePrey = preyList.filter(p => p.alpha > 0 && !p.isDying && this.config.eats.includes(p.type) && this.position.subtract(p.position).magnitude() < seekRange);
        if (availablePrey.length === 0) return null;

        const preyWithPriority = availablePrey.map(p => {
            let score = 0;
            const distance = this.position.subtract(p.position).magnitude();

            if (this.type === 'RAY') { score -= distance * 1.5; } 
            else { score -= distance * (CONFIG.PREDATOR_DISTANCE_WEIGHT || 0.1); }
            
            if (this.type === 'MARLIN') { 
                const densityRadius = CONFIG.DENSITY_CHECK_RADIUS || 100;
                const densityArea = new Rectangle(p.position.x, p.position.y, densityRadius, densityRadius);
                const nearbyFish = qtree.query(densityArea);
                const density = nearbyFish.length;
                score += density * (CONFIG.PREDATOR_DENSITY_WEIGHT || 2.5);
            }
            
            const populationBonus = Math.max(0, (currentCounts[p.type] || 0) - (flock.initialCounts[p.type] || 0));
            score += populationBonus * (CONFIG.PREDATOR_POPULATION_SCORE_WEIGHT || 2.0);
            
            if (p.type === this.targetPreyType) score += CONFIG.PREDATOR_TARGET_BONUS;
            if (p.isStunned && this.type === 'MARLIN') score += CONFIG.PREDATOR_STUNNED_TARGET_BONUS;

            let isTargetedByOther = false;
            for (const otherPredator of allPredators) {
                if (otherPredator !== this && otherPredator.currentTarget === p) {
                    isTargetedByOther = true;
                    break;
                }
            }
            if (!isTargetedByOther) { score += CONFIG.UNTARGETED_PREY_BONUS; }

            return { prey: p, score: score };
        });

        if (preyWithPriority.length === 0) return null;

        preyWithPriority.sort((a, b) => b.score - a.score);
        const topScore = preyWithPriority[0].score;
        
        const threshold = topScore >= 0 ? topScore * 0.9 : topScore * 1.1;
        let topChoices = preyWithPriority.filter(p => p.score >= threshold);
        
        if (topChoices.length === 0) {
            topChoices.push(preyWithPriority[0]);
        }
        
        return topChoices[Math.floor(Math.random() * topChoices.length)].prey;
    }
    update(deltaTime) { if (!this.updateTimers(deltaTime)) return; if (this.lifespan > 0) this.lifespan--; this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime)); this.velocity = this.velocity.limit(this.config.maxSpeed); this.position = this.position.add(this.velocity.multiply(deltaTime)); this.acceleration = new Vector(); this.handleBoundaries(); }
    handleBoundaries() { const margin = CONFIG.PREDATOR_DESPAWN_MARGIN; if (this.isLeaving) { if (this.position.x < -margin || this.position.x > canvas.width + margin || this.position.y < -margin || this.position.y > canvas.height + margin) { this.alpha = 0; } } else if (!this.isOffScreen()) { if (this.position.x < -margin) this.position.x = canvas.width + margin; if (this.position.x > canvas.width + margin) this.position.x = -margin; if (this.position.y < -margin) this.position.y = canvas.height + margin; if (this.position.y > canvas.height + margin) this.position.y = -margin; } }
    canEat() { return this.eatCooldownTimer === 0; }
    resetEatCooldown(eatenPrey) { this.eatCooldownTimer = this.config.eatCooldown; this.lifespan -= this.config.eatDamage; this.startGlowing(15, eatenPrey.config.spawnColor); }
}