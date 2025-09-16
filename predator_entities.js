// FILE: predator_entities.js
class Shark extends Predator { constructor(image, x, y, vx, vy, targetPreyType) { super('SHARK', image, x, y, vx, vy, targetPreyType); } }

class Marlin extends Predator {
    constructor(image, x, y, vx, vy, targetPreyType) {
        super('MARLIN', image, x, y, vx, vy, targetPreyType);
        this.stunGlowTimer = 0;
        this.eatAfterStunTimer = 0;
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★
    // 修正点：スタン先端位置の計算を「口の位置からさらに前方」に修正
    // ★★★★★★★★★★★★★★★★★★★★★★★★★
    getBillTipPosition() {
        if (this.velocity.magnitude() === 0) return this.getMouthPosition();
        const dir = this.velocity.normalize();
        const mouthPos = this.getMouthPosition();
        const offset = this.config.width * (this.config.billTipOffset || 0.5);
        return mouthPos.add(dir.multiply(offset));
    }

    act(qtree, allPrey, allPredators, currentCounts) {
        if (this.isLeaving) {
            const desired = new Vector(canvas.width / 2, canvas.height / 2).subtract(this.position).normalize().multiply(-this.config.maxSpeed);
            this.applyForce(desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE));
            return;
        }
        const targetCount = currentCounts[this.targetPreyType] || 0;
        const initialCount = flock.initialCounts[this.targetPreyType] || 0;
        if ((targetCount < initialCount + CONFIG.PREDATOR_LEAVE_COUNT || this.lifespan <= 0)) {
            this.isLeaving = true;
            return;
        }

        if (this.eatAfterStunTimer > 0) {
            const wander = new Vector((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
            this.applyForce(wander);
            this.applyForce(this.velocity.normalize().multiply(0.1));
            this.currentTarget = null;
            return;
        }

        const stunnedPrey = allPrey.filter(p => p.isStunned && !p.isDying && this.config.eats.includes(p.type));
        if (stunnedPrey.length > 0) {
            let closestStunned = null;
            let minDistance = Infinity;
            for (const p of stunnedPrey) {
                const d = this.position.subtract(p.position).magnitude();
                if (d < minDistance) {
                    minDistance = d;
                    closestStunned = p;
                }
            }
            this.currentTarget = closestStunned;
            this.applyForce(this.seek(this.currentTarget.position));
            if (this.attemptToEat(this.currentTarget)) { this.currentTarget = null; }
            return;
        }

        if (!this.currentTarget || this.currentTarget.alpha <= 0 || this.currentTarget.isDying || this.currentTarget.isStunned) {
            const availableToHunt = allPrey.filter(p => !p.isStunned);
            this.currentTarget = this.findBestPrey(availableToHunt, allPredators, currentCounts);
        }
        
        if (this.currentTarget) {
            this.applyForce(this.seek(this.currentTarget.position));
            this.checkForStun(qtree);
        } else {
            const wander = new Vector((Math.random() - 0.5) * (this.config.wanderForce || 0.1), (Math.random() - 0.5) * (this.config.wanderForce || 0.1));
            this.applyForce(wander);
        }
        
        if (this.velocity.magnitude() < this.config.maxSpeed * (this.config.minSpeedMultiplier || 0.9)) {
            this.applyForce(this.velocity.normalize().multiply(this.config.minSpeedForce || 0.3));
        }
    }

    update(deltaTime) {
        if (this.stunGlowTimer > 0) { this.stunGlowTimer = Math.max(0, this.stunGlowTimer - deltaTime); }
        if (this.eatAfterStunTimer > 0) { this.eatAfterStunTimer = Math.max(0, this.eatAfterStunTimer - deltaTime); }
        super.update(deltaTime);
    }

    checkForStun(qtree) {
        const stunPoint = this.getBillTipPosition();
        if (!this.currentTarget || this.currentTarget.position.subtract(stunPoint).magnitude() > this.config.stunRadius * 1.5) {
            return;
        }
        let didStun = false;
        const searchArea = new Rectangle(stunPoint.x, stunPoint.y, this.config.stunRadius, this.config.stunRadius);
        const candidates = qtree.query(searchArea);
        for (const prey of candidates) {
            if (prey instanceof Predator || prey.isDying || prey.isStunned) continue;
            if (this.config.eats.includes(prey.type) && prey.position.subtract(stunPoint).magnitude() < this.config.stunRadius) {
                prey.stun(this.config.stunDuration);
                didStun = true;
            }
        }
        if (didStun) {
            this.stunGlowTimer = 20;
            this.eatAfterStunTimer = 120;
        }
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★
    // 修正点：独自のdraw()メソッドを削除し、親クラスの共通描画に任せる
    // 発光エフェクトのみdrawEffects()で描画
    // ★★★★★★★★★★★★★★★★★★★★★★★★★
    drawEffects(ctx) {
        if (this.stunGlowTimer > 0) {
            const alpha = Math.sin((this.stunGlowTimer / 20) * Math.PI);
            
            // 口の位置から先端までの距離を計算
            const tipOffset = this.config.width * this.config.mouthOffset + this.config.width * (this.config.billTipOffset || 0.5);
            
            // 画像の中心からのオフセットなので、画像の中心から口までの距離をまず計算
            const mouthOffsetDistance = this.config.width * (this.config.mouthOffset - 0.5);
            // そこからさらに先端までの距離を加算
            const tipOffsetDistance = mouthOffsetDistance + this.config.width * (this.config.billTipOffset || 0.5);

            const tipX = -tipOffsetDistance; // 180度回転しているので進行方向はマイナス
            const tipY = 0;

            ctx.save();
            ctx.filter = `blur(6px)`;
            ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

class Ray extends Predator { constructor(image, x, y, vx, vy, targetPreyType) { super('RAY', image, x, y, vx, vy, targetPreyType); this.idleTimer = 0; this.isStealthed = false; }
    act(qtree, allPrey, allPredators, currentCounts) { if (this.isLeaving) { const desired = new Vector(canvas.width / 2, canvas.height / 2).subtract(this.position).normalize().multiply(-this.config.maxSpeed); this.applyForce(desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE)); return; } if (!this.isOffScreen()) { const targetCount = currentCounts[this.targetPreyType] || 0; const initialCount = flock.initialCounts[this.targetPreyType] || 0; if ((targetCount < initialCount + CONFIG.PREDATOR_LEAVE_COUNT || this.lifespan <= 0)) { this.isLeaving = true; return; } if (this.velocity.magnitude() < 0.1) { this.idleTimer++; } else { this.idleTimer = 0; this.isStealthed = false; } if (this.idleTimer >= this.config.stealthDuration) { this.isStealthed = true; } } let closestPrey; if (this.isStealthed) { const preyInRange = allPrey.filter(p => this.position.subtract(p.position).magnitude() < this.config.stealthSeekRange && this.config.eats.includes(p.type)); closestPrey = preyInRange.length > 0 ? this.findBestPrey(preyInRange, allPredators, currentCounts) : null; } else { closestPrey = this.findBestPrey(allPrey, allPredators, currentCounts); } if (!this.attemptToEat(closestPrey)) { if (this.isStealthed) { if (closestPrey) { this.applyForce(this.seek(closestPrey.position).multiply(this.config.ambushForce)); } else { this.applyForce(this.velocity.multiply(-this.config.brakeForce)); const center = new Vector(canvas.width / 2, canvas.height / 2); const dirToCenter = center.subtract(this.position).normalize(); const currentDir = this.velocity.magnitude() > 0 ? this.velocity.normalize() : new Vector(1, 0); const cross = currentDir.x * dirToCenter.y - currentDir.y * dirToCenter.x; if (Math.abs(cross) > 0.1) { const rotation = (cross > 0 ? 1 : -1) * this.config.turnTorque; this.velocity = this.velocity.rotate(rotation); } } } else { if (closestPrey) { this.applyForce(this.seek(closestPrey.position)); } else if (!this.isOffScreen()) { this.applyForce(this.velocity.multiply(-this.config.brakeForce / 2)); } } } }
}

class Tuna extends Predator {
    constructor(image, x, y, vx, vy, targetPreyType) {
        super('TUNA', image, x, y, vx, vy, targetPreyType);
        this.isReadyToHunt = true;
    }
    act(qtree, allPrey, allPredators, currentCounts) {
        const targetCount = currentCounts[this.targetPreyType] || 0;
        const initialCount = flock.initialCounts[this.targetPreyType] || 0;
        if (this.isOffScreen() && (targetCount < initialCount + CONFIG.PREDATOR_LEAVE_COUNT)) { this.alpha = 0; return; }
        if (this.isOffScreen() && this.isReadyToHunt) {
            this.velocity = new Vector(0, 0);
            this.acceleration = new Vector(0,0);
            if(this.velocity.magnitude() === 0) {
                this.reposition(qtree, allPrey, allPredators, currentCounts);
                this.isReadyToHunt = false;
            }
            return;
        }
        if (!this.isOffScreen() && !this.isReadyToHunt) { this.isReadyToHunt = true; }
        super.act(qtree, allPrey, allPredators, currentCounts);
        if (this.velocity.magnitude() < this.config.maxSpeed * (this.config.minSpeedMultiplier || 0.8)) { this.applyForce(this.velocity.normalize().multiply(this.config.minSpeedForce || 0.2)); }
    }
    reposition(qtree, allPrey, allPredators, currentCounts) {
        const newTarget = this.findLongRangePrey(qtree, allPrey, allPredators, currentCounts);
        let targetPosition = newTarget ? newTarget.position : new Vector(canvas.width / 2, canvas.height / 2);
        this.currentTarget = newTarget;
        const margin = CONFIG.PREDATOR_DESPAWN_MARGIN / 2;
        let newX, newY;
        if (this.position.x < canvas.width / 2) { newX = canvas.width + margin; newY = Math.random() * canvas.height; } else { newX = -margin; newY = Math.random() * canvas.height; }
        this.position = new Vector(newX, newY);
        this.velocity = targetPosition.subtract(this.position).normalize().multiply(this.config.maxSpeed);
    }
    findLongRangePrey(qtree, preyList, allPredators, currentCounts) {
        const availablePrey = preyList.filter(p => p.alpha > 0 && !p.isDying && this.config.eats.includes(p.type));
        if (availablePrey.length === 0) return null;
        
        const isOverpopulated = (prey) => (currentCounts[prey.type] || 0) > (flock.initialCounts[prey.type] || 0) + CONFIG.OVERPOPULATION_COUNT;
        const isTarget = (prey) => prey.type === this.targetPreyType;
        let priorityTargets = availablePrey.filter(p => isOverpopulated(p) || isTarget(p));

        if(priorityTargets.length > 1) {
            const untargeted = priorityTargets.filter(p => {
                for(const other of allPredators) {
                    if(other !== this && other.currentTarget === p) return false;
                }
                return true;
            });
            if(untargeted.length > 0) priorityTargets = untargeted;
        }
        
        if (priorityTargets.length > 0) {
            return priorityTargets[Math.floor(Math.random() * priorityTargets.length)];
        } else {
            return availablePrey[Math.floor(Math.random() * availablePrey.length)];
        }
    }
}

class Whale extends Predator {
    constructor(image, x, y, vx, vy) { super('WHALE', image, x, y, vx, vy); }
    findClosestPrey(preyList) {
        let closest = null;
        let minDistance = Infinity;
        for (const prey of preyList) {
            const d = this.position.subtract(prey.position).magnitude();
            if (d < minDistance) {
                minDistance = d;
                closest = prey;
            }
        }
        return closest;
    }
    act(qtree, allPrey, allPredators, currentCounts) { const overpopulatedTypes = []; for(const type in flock.initialCounts) { if ((currentCounts[type] || 0) > (flock.initialCounts[type] || 0) + CONFIG.WHALE_OVERPOPULATION_COUNT) { overpopulatedTypes.push(type); } } if(overpopulatedTypes.length > 0) { const targetPrey = allPrey.filter(p => overpopulatedTypes.includes(p.type)); const closest = this.findClosestPrey(targetPrey); if(closest) this.applyForce(this.seek(closest.position)); } const mouthPosition = this.getMouthPosition(); for (const prey of allPrey) { if (prey.alpha > 0 && !prey.isDying) { const d = mouthPosition.subtract(prey.position).magnitude(); if (d < this.config.eatRadius) { prey.startDying(); } } } } handleBoundaries() { const margin = this.config.width; if ((this.velocity.x > 0 && this.position.x > canvas.width + margin) || (this.velocity.x < 0 && this.position.x < -margin)) { this.alpha = 0; } } }

const PredatorClasses = { SHARK: Shark, MARLIN: Marlin, RAY: Ray, TUNA: Tuna };
const predatorTypeMap = { BONITO: 'SHARK', MACKEREL: 'MARLIN', CUTLASS: 'TUNA', SARDINE: 'RAY' };