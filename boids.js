// ==========================================================
// 1. 設定とユーティリティクラス
// ==========================================================

const CONFIG = {
    // 全体設定
    MAX_PREDATOR_COUNT: 2,
    SOLITARY_COUNT: 15,
    MAX_FORCE: 0.05,
    VISUAL_RANGE: 80,
    AVOID_RADIUS: 20,
    PREDATOR_SEEK_RANGE: 200,
    MAX_TURN_ANGLE: 0.1,
    BACKGROUND_COLOR: 'rgba(0, 0, 10, 1)',
    PREDATOR_DESPAWN_MARGIN: 100,
    BOID_SPAWN_MARGIN: 50,
    PREDATOR_SPAWN_COOLDOWN: 500,
    OVERPOPULATION_THRESHOLD: 1.05, // 変更: 120% -> 105%に戻す
    NORMAL_POPULATION_THRESHOLD: 1.0,
    WHALE_SPAWN_INTERVAL: 7200,

    // プランクトン設定
    PLANKTON_COUNT: 50,
    PLANKTON_SIZE: 2,
    PLANKTON_COLOR: 'rgba(50, 150, 255, 0.4)',
    PLANKTON_WANDER_STRENGTH: 0.08,
    PLANKTON_GROWTH_RATE: 0.01,
    PLANKTON_EAT_COUNT_TO_REPRODUCE: 40, // 変更: 20 -> 40 (増える速度が半分に)

    // 魚種ごとの設定
    FISH_TYPES: {
        SMALL: {
            count: 120, maxSpeed: 2, separationWeight: 2.0, alignmentWeight: 1.0, cohesionWeight: 1.0,
            width: 16, height: 8, turnFactor: 1.0, eatRadius: 5,
        },
        MEDIUM: {
            count: 80, maxSpeed: 1.5, separationWeight: 3.0, alignmentWeight: 1.5, cohesionWeight: 1.2,
            width: 24, height: 12, turnFactor: 0.7, eatRadius: 8,
        },
        LARGE: {
            count: 40, maxSpeed: 1.5, separationWeight: 3.5, alignmentWeight: 1.5, cohesionWeight: 1.2,
            width: 32, height: 16, turnFactor: 0.7, eatRadius: 10,
        },
        CUTLASS: {
            count: 20, maxSpeed: 1.3, separationWeight: 0,
            width: 30, height: 5, turnFactor: 0.8, eatRadius: 7,
        },
        SHARK: {
            count: 0, maxSpeed: 3.0, separationWeight: 4.0, alignmentWeight: 0.0, cohesionWeight: 0.0,
            width: 160, height: 80, turnFactor: 0.3, lifespan: 3000, eatCooldown: 20, eatDamage: 400,
            eatRadius: 35, mouthOffset: 0.4, // 口の当たり判定用の設定
        },
        MARLIN: {
            count: 0, maxSpeed: 4.0, separationWeight: 4.0, alignmentWeight: 0.8, cohesionWeight: 0.8,
            width: 180, height: 60, turnFactor: 0.3, lifespan: 3000, eatCooldown: 20, eatDamage: 400,
            eatRadius: 30, mouthOffset: 0.45, // 口の当たり判定用の設定
        },
        WHALE: {
            count: 0, maxSpeed: 2.5, separationWeight: 0.0, alignmentWeight: 0.0, cohesionWeight: 0.0,
            width: 2000, height: 665, turnFactor: 0.1,
            eatRadius: 300, mouthOffset: 0.4, // クジラの巨大な口用の設定
        }
    }
};

class Vector { constructor(x = 0, y = 0) { this.x = x; this.y = y; } add(v) { return new Vector(this.x + v.x, this.y + v.y); } subtract(v) { return new Vector(this.x - v.x, this.y - v.y); } multiply(scalar) { return new Vector(this.x * scalar, this.y * scalar); } divide(scalar) { return scalar !== 0 ? new Vector(this.x / scalar, this.y / scalar) : new Vector(); } magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); } normalize() { const m = this.magnitude(); return m > 0 ? this.divide(m) : new Vector(); } limit(max) { return this.magnitude() > max ? this.normalize().multiply(max) : this; } dot(v) { return this.x * v.x + this.y * v.y; } angleBetween(v) { const m1 = this.magnitude(); const m2 = v.magnitude(); if (m1 === 0 || m2 === 0) return 0; return Math.acos(Math.max(-1, Math.min(1, this.dot(v) / (m1 * m2)))); } heading() { return Math.atan2(this.y, this.x); } }
class Rectangle { constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; } contains(boid) { return (boid.position.x >= this.x - this.w && boid.position.x <= this.x + this.w && boid.position.y >= this.y - this.h && boid.position.y <= this.y + this.h); } intersects(range) { return !(range.x - range.w > this.x + this.w || range.x + range.w < this.x - this.w || range.y - range.h > this.y + this.h || range.y + range.h < this.y - this.h); } }
class Quadtree { constructor(boundary, capacity) { this.boundary = boundary; this.capacity = capacity; this.boids = []; this.divided = false; } subdivide() { const { x, y, w, h } = this.boundary; const hw = w / 2; const hh = h / 2; this.northwest = new Quadtree(new Rectangle(x - hw, y - hh, hw, hh), this.capacity); this.northeast = new Quadtree(new Rectangle(x + hw, y - hh, hw, hh), this.capacity); this.southwest = new Quadtree(new Rectangle(x - hw, y + hh, hw, hh), this.capacity); this.southeast = new Quadtree(new Rectangle(x + hw, y + hh, hw, hh), this.capacity); this.divided = true; } insert(boid) { if (!this.boundary.contains(boid)) return false; if (this.boids.length < this.capacity) { this.boids.push(boid); return true; } if (!this.divided) this.subdivide(); return (this.northeast.insert(boid) || this.northwest.insert(boid) || this.southeast.insert(boid) || this.southwest.insert(boid)); } query(range, found = []) { if (!this.boundary.intersects(range)) return found; for (const b of this.boids) { if (range.contains(b)) { found.push(b); } } if (this.divided) { this.northwest.query(range, found); this.northeast.query(range, found); this.southwest.query(range, found); this.southeast.query(range, found); } return found; } }

class Boid { constructor(type, image, x = Math.random() * canvas.width, y = Math.random() * canvas.height) { this.type = type; this.config = CONFIG.FISH_TYPES[type] || CONFIG.FISH_TYPES.SMALL; this.position = new Vector(x, y); this.velocity = new Vector((Math.random() - 0.5) * this.config.maxSpeed, (Math.random() - 0.5) * this.config.maxSpeed); this.acceleration = new Vector(); this.image = image; this.isEaten = false; this.alpha = 1; this.planktonEatenCount = 0; } applyForce(force) { this.acceleration = this.acceleration.add(force); } act(qtree, predators) { const range = new Rectangle(this.position.x, this.position.y, CONFIG.VISUAL_RANGE, CONFIG.VISUAL_RANGE); const neighbors = qtree.query(range); this.flock(neighbors); const fleeForce = this.flee(predators, CONFIG.PREDATOR_SEEK_RANGE); this.applyForce(fleeForce.multiply(2.5)); } flock(neighbors) { const alignment = this.calculateAlignment(neighbors).multiply(this.config.alignmentWeight); const cohesion = this.calculateCohesion(neighbors).multiply(this.config.cohesionWeight); const separation = this.calculateSeparation(neighbors).multiply(this.config.separationWeight); this.applyForce(alignment); this.applyForce(cohesion); this.applyForce(separation); } update(deltaTime) { if (this.isEaten) { this.alpha = 0; return; } const steering = this.applySteering(); this.velocity = this.velocity.add(steering.multiply(deltaTime)); this.velocity = this.velocity.limit(this.config.maxSpeed); this.position = this.position.add(this.velocity.multiply(deltaTime)); this.acceleration = new Vector(); this.handleBoundaries(); } applySteering() { const desiredVelocity = this.velocity.add(this.acceleration).limit(this.config.maxSpeed); const angle = this.velocity.angleBetween(desiredVelocity); if (angle > CONFIG.MAX_TURN_ANGLE * this.config.turnFactor) { const cross = this.velocity.x * desiredVelocity.y - this.velocity.y * desiredVelocity.x; const rotation = cross > 0 ? CONFIG.MAX_TURN_ANGLE * this.config.turnFactor : -CONFIG.MAX_TURN_ANGLE * this.config.turnFactor; const cos = Math.cos(rotation); const sin = Math.sin(rotation); return new Vector(this.velocity.x * cos - this.velocity.y * sin, this.velocity.x * sin + this.velocity.y * cos).normalize().multiply(this.velocity.magnitude()).subtract(this.velocity).limit(CONFIG.MAX_FORCE); } return desiredVelocity.subtract(this.velocity).limit(CONFIG.MAX_FORCE); } handleBoundaries() { if (this.position.x < 0) { this.position.x = 0; this.velocity.x *= -1; } if (this.position.x > canvas.width) { this.position.x = canvas.width; this.velocity.x *= -1; } if (this.position.y < 0) { this.position.y = 0; this.velocity.y *= -1; } if (this.position.y > canvas.height) { this.position.y = canvas.height; this.velocity.y *= -1; } } draw() { ctx.save(); ctx.translate(this.position.x, this.position.y); ctx.rotate(this.velocity.heading() + Math.PI); ctx.globalAlpha = this.alpha * 0.7; const w = this.config.width; const h = this.config.height; ctx.drawImage(this.image, -w / 2, -h / 2, w, h); ctx.restore(); } seek(target) { const desired = target.subtract(this.position).normalize().multiply(this.config.maxSpeed); return desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE); } flee(threats, range) { let steer = new Vector(); for (const threat of threats) { if (threat.alpha <= 0) continue; const d = this.position.subtract(threat.position).magnitude(); if (d < range) { const diff = this.position.subtract(threat.position).normalize().divide(d); steer = steer.add(diff); } } if (steer.magnitude() > 0) { return steer.normalize().multiply(this.config.maxSpeed).subtract(this.velocity).limit(CONFIG.MAX_FORCE * 5); } return steer; } calculateAlignment(neighbors) { let sum = new Vector(); let count = 0; for (const other of neighbors) { if (other !== this && other.type === this.type && other.alpha > 0) { sum = sum.add(other.velocity); count++; } } if (count > 0) { const desired = sum.divide(count).normalize().multiply(this.config.maxSpeed); return desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE); } return new Vector(); } calculateCohesion(neighbors) { let sum = new Vector(); let count = 0; for (const other of neighbors) { if (other !== this && other.type === this.type && other.alpha > 0) { sum = sum.add(other.position); count++; } } if (count > 0) { return this.seek(sum.divide(count)); } return new Vector(); } calculateSeparation(neighbors) { let steer = new Vector(); for (const other of neighbors) { if (other === this || other.alpha <= 0) continue; const d = this.position.subtract(other.position).magnitude(); if (d > 0 && d < CONFIG.AVOID_RADIUS) { const diff = this.position.subtract(other.position).normalize().divide(d); steer = steer.add(diff); } } if (steer.magnitude() > 0) { const desired = steer.normalize().multiply(this.config.maxSpeed); return desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE); } return steer; } }

class Predator extends Boid {
    constructor(type, image, x, y, vx, vy) { super(type, image, x, y); this.velocity = new Vector(vx, vy); this.lifespan = this.config.lifespan; this.eatCooldownTimer = 0; this.isLeaving = false; }
    
    // ★★★ 変更点: 当たり判定を口の位置に ★★★
    act(qtree, allPrey) {
        if (this.isLeaving) { const desired = new Vector(canvas.width / 2, canvas.height / 2).subtract(this.position).normalize().multiply(-this.config.maxSpeed); this.applyForce(desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE)); return; }
        
        const closestPrey = this.findClosestPrey(allPrey);
        if (closestPrey && this.canEat()) {
            const mouthPosition = this.getMouthPosition();
            const d = mouthPosition.subtract(closestPrey.position).magnitude();

            if (d < this.config.eatRadius && this.velocity.normalize().dot(closestPrey.position.subtract(this.position).normalize()) > 0.6) {
                closestPrey.isEaten = true;
                this.resetEatCooldown();
            } else {
                this.applyForce(this.seek(closestPrey.position));
            }
        } else if (this.lifespan <= 0) {
            this.isLeaving = true;
        } else {
            this.applyForce(this.velocity.multiply(-0.01));
        }
    }

    getMouthPosition() {
        if (this.velocity.magnitude() === 0) return this.position;
        return this.position.add(this.velocity.normalize().multiply(this.config.width * this.config.mouthOffset));
    }
    
    update(deltaTime) { if (this.alpha <= 0) return; this.lifespan--; if (this.eatCooldownTimer > 0) this.eatCooldownTimer--; super.update(deltaTime); }
    handleBoundaries() { const margin = CONFIG.PREDATOR_DESPAWN_MARGIN; if (this.isLeaving) { if (this.position.x < -margin || this.position.x > canvas.width + margin || this.position.y < -margin || this.position.y > canvas.height + margin) { this.alpha = 0; } } else { if (this.position.x < -margin) this.position.x = canvas.width + margin; if (this.position.x > canvas.width + margin) this.position.x = -margin; if (this.position.y < -margin) this.position.y = canvas.height + margin; if (this.position.y > canvas.height + margin) this.position.y = -margin; } }
    findClosestPrey(preyList) { let closest = null; let record = CONFIG.PREDATOR_SEEK_RANGE; for (const prey of preyList) { if (prey.alpha > 0) { const d = this.position.subtract(prey.position).magnitude(); if (d < record) { record = d; closest = prey; } } } return closest; }
    canEat() { return this.eatCooldownTimer === 0 && this.lifespan > 0; }
    resetEatCooldown() { this.eatCooldownTimer = this.config.eatCooldown; this.lifespan -= this.config.eatDamage; }
}

class Shark extends Predator { constructor(image, x, y, vx, vy) { super('SHARK', image, x, y, vx, vy); } }
class Marlin extends Predator { constructor(image, x, y, vx, vy) { super('MARLIN', image, x, y, vx, vy); } act(qtree, allPrey) { const neighbors = qtree.query(new Rectangle(this.position.x, this.position.y, CONFIG.VISUAL_RANGE, CONFIG.VISUAL_RANGE)); this.flock(neighbors); super.act(qtree, allPrey); } }
class SolitaryBoid extends Boid { constructor(image, x, y) { super('CUTLASS', image, x, y); } act(qtree, predators, plankton) { const foodAttraction = this.seekClosest(plankton).multiply(2.0); const fleeForce = this.flee(predators, CONFIG.PREDATOR_SEEK_RANGE).multiply(3.0); const wander = new Vector((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1); const range = new Rectangle(this.position.x, this.position.y, CONFIG.AVOID_RADIUS, CONFIG.AVOID_RADIUS); const neighbors = qtree.query(range); const separationForce = this.calculateSeparation(neighbors).multiply(3.5); this.applyForce(foodAttraction); this.applyForce(fleeForce); this.applyForce(wander); this.applyForce(separationForce); } seekClosest(targets) { let closest = null; let minDistance = Infinity; for (const target of targets) { const d = this.position.subtract(target.position).magnitude(); if (d < minDistance) { minDistance = d; closest = target; } } return closest ? this.seek(closest.position) : new Vector(); } }
class Plankton { constructor(x = Math.random() * canvas.width, y = Math.random() * canvas.height) { this.position = new Vector(x, y); this.size = 0; this.maxSize = CONFIG.PLANKTON_SIZE; this.wanderAngle = Math.random() * Math.PI * 2; } update(deltaTime) { if (this.size < this.maxSize) this.size += CONFIG.PLANKTON_GROWTH_RATE; this.wanderAngle += (Math.random() - 0.5) * CONFIG.PLANKTON_WANDER_STRENGTH; this.position.x += Math.cos(this.wanderAngle) * 0.1; this.position.y += Math.sin(this.wanderAngle) * 0.1; if (this.position.x < 0) this.position.x = 0; if (this.position.x > canvas.width) this.position.x = canvas.width; if (this.position.y < 0) this.position.y = 0; if (this.position.y > canvas.height) this.position.y = canvas.height; } draw() { ctx.fillStyle = CONFIG.PLANKTON_COLOR; ctx.shadowColor = CONFIG.PLANKTON_COLOR; ctx.shadowBlur = 5; ctx.beginPath(); ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; } }

// ★★★ 変更点: クジラの捕食ロジックを実装 ★★★
class Whale extends Predator {
    constructor(image, x, y, vx, vy) { super('WHALE', image, x, y, vx, vy); }

    act(qtree, allPrey) {
        const mouthPosition = this.getMouthPosition();
        for (const prey of allPrey) {
            if (prey.alpha > 0) {
                const d = mouthPosition.subtract(prey.position).magnitude();
                if (d < this.config.eatRadius) {
                    prey.isEaten = true;
                }
            }
        }
    }
    
    handleBoundaries() { const margin = this.config.width; if (this.velocity.x > 0 && this.position.x > canvas.width + margin) { this.alpha = 0; } if (this.velocity.x < 0 && this.position.x < -margin) { this.alpha = 0; } }
}

class Flock { constructor(images) { this.boids = []; this.predators = []; this.solitary = []; this.plankton = []; this.qtree = null; this.predatorSpawnCooldownTimer = 0; this.initialCounts = {}; this.images = images; this.whaleSpawnTimer = CONFIG.WHALE_SPAWN_INTERVAL; this.init(); } init() { for (const type in CONFIG.FISH_TYPES) { if (CONFIG.FISH_TYPES[type].count > 0) { this.initialCounts[type] = CONFIG.FISH_TYPES[type].count; for (let i = 0; i < CONFIG.FISH_TYPES[type].count; i++) { const image = this.images[type]; if (type === 'CUTLASS') { this.solitary.push(new SolitaryBoid(image)); } else { this.boids.push(new Boid(type, image)); } } } } for (let i = 0; i < CONFIG.SOLITARY_COUNT; i++) { this.solitary.push(new SolitaryBoid(this.images.CUTLASS)); } this.initialCounts['CUTLASS'] = CONFIG.SOLITARY_COUNT; for (let i = 0; i < CONFIG.PLANKTON_COUNT; i++) this.plankton.push(new Plankton()); } update(deltaTime) { const boundary = new Rectangle(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2); this.qtree = new Quadtree(boundary, 4); const allBoids = [...this.boids, ...this.solitary, ...this.predators]; for(const boid of allBoids) { if(boid.alpha > 0) this.qtree.insert(boid); } const allPrey = [...this.boids, ...this.solitary]; for (const boid of this.boids) { if (boid.alpha > 0) { boid.act(this.qtree, this.predators); boid.update(deltaTime); this.eatPlankton(boid); } } for (const s of this.solitary) { if (s.alpha > 0) { s.act(this.qtree, this.predators, this.plankton); s.update(deltaTime); this.eatPlankton(s); } } for (const p of this.predators) { if (p.alpha > 0) { p.act(this.qtree, allPrey); p.update(deltaTime); } } for (const p of this.plankton) { p.update(deltaTime); } this.cleanupAndRespawn(); this.whaleSpawnTimer--; if(this.whaleSpawnTimer <= 0) { this.spawnWhale(); this.whaleSpawnTimer = CONFIG.WHALE_SPAWN_INTERVAL; } } draw() { for (const p of this.plankton) p.draw(); for (const s of this.solitary) if (s.alpha > 0) s.draw(); for (const b of this.boids) if (b.alpha > 0) b.draw(); for (const p of this.predators) if (p.alpha > 0) p.draw(); } eatPlankton(boid) { for (let i = this.plankton.length - 1; i >= 0; i--) { const p = this.plankton[i]; if (p && boid.position.subtract(p.position).magnitude() < boid.config.eatRadius) { this.plankton.splice(i, 1); this.plankton.push(new Plankton()); boid.planktonEatenCount++; if (boid.planktonEatenCount >= CONFIG.PLANKTON_EAT_COUNT_TO_REPRODUCE) { this.respawnBoid(boid.type); boid.planktonEatenCount = 0; } } } } cleanupAndRespawn() { this.boids = this.boids.filter(b => b.alpha > 0); this.solitary = this.solitary.filter(s => s.alpha > 0); this.predators = this.predators.filter(p => p.alpha > 0); this.predatorSpawnCooldownTimer = Math.max(0, this.predatorSpawnCooldownTimer - 1); const regularPredators = this.predators.filter(p => p.type !== 'WHALE'); if (regularPredators.length < CONFIG.MAX_PREDATOR_COUNT && this.predatorSpawnCooldownTimer === 0) { let totalBoids = this.boids.length + this.solitary.length; let initialTotal = Object.values(this.initialCounts).reduce((a, b) => a + b, 0); if (totalBoids > initialTotal * CONFIG.OVERPOPULATION_THRESHOLD) { this.spawnPredator(); this.predatorSpawnCooldownTimer = CONFIG.PREDATOR_SPAWN_COOLDOWN; } } } spawnPredator() { const side = Math.floor(Math.random() * 4); let x, y, vx, vy; const margin = CONFIG.PREDATOR_DESPAWN_MARGIN; const predatorType = Math.random() > 0.5 ? 'SHARK' : 'MARLIN'; const speed = CONFIG.FISH_TYPES[predatorType].maxSpeed; switch (side) { case 0: x = Math.random() * canvas.width; y = -margin; vx = (Math.random() - 0.5) * speed; vy = Math.random() * speed / 2 + speed / 2; break; case 1: x = canvas.width + margin; y = Math.random() * canvas.height; vx = -(Math.random() * speed / 2 + speed / 2); vy = (Math.random() - 0.5) * speed; break; case 2: x = Math.random() * canvas.width; y = canvas.height + margin; vx = (Math.random() - 0.5) * speed; vy = -(Math.random() * speed / 2 + speed / 2); break; case 3: x = -margin; y = Math.random() * canvas.height; vx = Math.random() * speed / 2 + speed / 2; vy = (Math.random() - 0.5) * speed; break; } const image = this.images[predatorType]; if (predatorType === 'SHARK') { this.predators.push(new Shark(image, x, y, vx, vy)); } else { this.predators.push(new Marlin(image, x, y, vx, vy)); } } respawnBoid(type) { const margin = CONFIG.BOID_SPAWN_MARGIN; const side = Math.floor(Math.random() * 4); let x, y; if (side === 0) { x = Math.random() * canvas.width; y = -margin; } else if (side === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; } else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; } else { x = -margin; y = Math.random() * canvas.height; } const image = this.images[type]; if (type === 'CUTLASS') { this.solitary.push(new SolitaryBoid(image, x, y)); } else { this.boids.push(new Boid(type, image, x, y)); } } spawnWhale() { const image = this.images.WHALE; const config = CONFIG.FISH_TYPES.WHALE; const margin = config.width / 2; let x, y, vx, vy; y = Math.random() * (canvas.height * 0.6) + (canvas.height * 0.2); vy = 0; if (Math.random() < 0.5) { x = -margin; vx = config.maxSpeed; } else { x = canvas.width + margin; vx = -config.maxSpeed; } this.predators.push(new Whale(image, x, y, vx, vy)); } }

const canvas = document.getElementById('boidsCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let flock;
let lastTime = 0;

function animate(currentTime) { if (lastTime === 0) { lastTime = currentTime; } const deltaTime = (currentTime - lastTime) / 16.67; lastTime = currentTime; ctx.fillStyle = CONFIG.BACKGROUND_COLOR; ctx.fillRect(0, 0, canvas.width, canvas.height); flock.update(deltaTime); flock.draw(); requestAnimationFrame(animate); }

console.log("Loading assets...");
loadAssets().then(images => { console.log("Assets loaded successfully!"); flock = new Flock(images); requestAnimationFrame(animate); }).catch(error => { console.error("Could not initialize simulation:", error); });
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });