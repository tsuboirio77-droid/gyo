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
    PREDATOR_SPAWN_RATE: 0.005,
    PREDATOR_DESPAWN_MARGIN: 100,
    BOID_SPAWN_MARGIN: 50,

    // プランクトン設定
    PLANKTON_COUNT: 50,
    PLANKTON_SIZE: 2,
    PLANKTON_COLOR: 'rgba(50, 150, 255, 0.4)',
    PLANKTON_WANDER_STRENGTH: 0.08,
    PLANKTON_GROWTH_RATE: 0.01,

    // 魚種ごとの設定
    FISH_TYPES: {
        SMALL: {
            count: 120,
            maxSpeed: 2,
            separationWeight: 2.0,
            alignmentWeight: 1.0,
            cohesionWeight: 1.0,
            size: 8,
            color: 'rgba(255, 100, 0, 0.7)',
            turnFactor: 1.0,
            eatRadius: 5,
        },
        MEDIUM: {
            count: 80,
            maxSpeed: 1.5,
            separationWeight: 3.0,
            alignmentWeight: 1.5,
            cohesionWeight: 1.2,
            size: 12,
            color: 'rgba(0, 150, 255, 0.7)',
            turnFactor: 0.7,
            eatRadius: 8,
        },
        LARGE: {
            count: 40,
            maxSpeed: 1.5,
            separationWeight: 3.5,
            alignmentWeight: 1.5,
            cohesionWeight: 1.2,
            size: 16,
            color: 'rgba(0, 200, 50, 0.7)',
            turnFactor: 0.7,
            eatRadius: 10,
        },
        CUTLASS: { // SolitaryBoid (タチウオ) 用
            count: 20,
            maxSpeed: 1.3,
            size: 10,
            color: 'rgba(200, 200, 200, 0.6)',
            turnFactor: 0.8,
            eatRadius: 7,
            separationWeight: 4.5
        },
        PREDATOR: {
            count: 0,
            maxSpeed: 4.0,
            separationWeight: 4.0,
            alignmentWeight: 0.8,
            cohesionWeight: 0.8,
            size: 40,
            // 改善点: 色を灰色に変更
            color: 'rgba(150, 150, 150, 0.8)',
            turnFactor: 0.3,
            lifespan: 3000,
            eatCooldown: 20,
            eatDamage: 400,
            eatRadius: 20
        }
    }
};

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    add(v) { return new Vector(this.x + v.x, this.y + v.y); }
    subtract(v) { return new Vector(this.x - v.x, this.y - v.y); }
    multiply(scalar) { return new Vector(this.x * scalar, this.y * scalar); }
    divide(scalar) { return scalar !== 0 ? new Vector(this.x / scalar, this.y / scalar) : new Vector(); }
    magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        const m = this.magnitude();
        return m > 0 ? this.divide(m) : new Vector();
    }
    limit(max) {
        return this.magnitude() > max ? this.normalize().multiply(max) : this;
    }
    dot(v) { return this.x * v.x + this.y * v.y; }
    angleBetween(v) {
        const m1 = this.magnitude();
        const m2 = v.magnitude();
        if (m1 === 0 || m2 === 0) return 0;
        return Math.acos(Math.max(-1, Math.min(1, this.dot(v) / (m1 * m2))));
    }
    heading() { return Math.atan2(this.y, this.x); }
}

// ==========================================================
// 2. パフォーマンス改善: Quadtree関連クラス
// ==========================================================
class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w; // 半分の幅
        this.h = h; // 半分の高さ
    }
    contains(boid) {
        return (
            boid.position.x >= this.x - this.w &&
            boid.position.x <= this.x + this.w &&
            boid.position.y >= this.y - this.h &&
            boid.position.y <= this.y + this.h
        );
    }
    intersects(range) {
        return !(
            range.x - range.w > this.x + this.w ||
            range.x + range.w < this.x - this.w ||
            range.y - range.h > this.y + this.h ||
            range.y + range.h < this.y - this.h
        );
    }
}

class Quadtree {
    constructor(boundary, capacity) {
        this.boundary = boundary;
        this.capacity = capacity;
        this.boids = [];
        this.divided = false;
    }
    subdivide() {
        const { x, y, w, h } = this.boundary;
        const hw = w / 2;
        const hh = h / 2;
        this.northwest = new Quadtree(new Rectangle(x - hw, y - hh, hw, hh), this.capacity);
        this.northeast = new Quadtree(new Rectangle(x + hw, y - hh, hw, hh), this.capacity);
        this.southwest = new Quadtree(new Rectangle(x - hw, y + hh, hw, hh), this.capacity);
        this.southeast = new Quadtree(new Rectangle(x + hw, y + hh, hw, hh), this.capacity);
        this.divided = true;
    }
    insert(boid) {
        if (!this.boundary.contains(boid)) return false;
        if (this.boids.length < this.capacity) {
            this.boids.push(boid);
            return true;
        }
        if (!this.divided) this.subdivide();
        return (
            this.northeast.insert(boid) ||
            this.northwest.insert(boid) ||
            this.southeast.insert(boid) ||
            this.southwest.insert(boid)
        );
    }
    query(range, found = []) {
        if (!this.boundary.intersects(range)) return found;
        for (const b of this.boids) {
            if (range.contains(b)) {
                found.push(b);
            }
        }
        if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }
        return found;
    }
}

// ==========================================================
// 3. 基底クラス: Boid (設計改善・DRY原則適用)
// ==========================================================
class Boid {
    constructor(type, x = Math.random() * canvas.width, y = Math.random() * canvas.height) {
        this.type = type;
        this.config = CONFIG.FISH_TYPES[type] || CONFIG.FISH_TYPES.SMALL;
        this.position = new Vector(x, y);
        this.velocity = new Vector((Math.random() - 0.5) * this.config.maxSpeed, (Math.random() - 0.5) * this.config.maxSpeed);
        this.acceleration = new Vector();
        this.size = this.config.size;
        this.isEaten = false;
        this.alpha = 1;
        this.blinkTimer = 0;
        this.shrinkFactor = 1;
    }

    applyForce(force) {
        this.acceleration = this.acceleration.add(force);
    }

    // --- 行動決定ロジック ---
    act(qtree) {
        // 通常のBoidは群行動
        const range = new Rectangle(this.position.x, this.position.y, CONFIG.VISUAL_RANGE, CONFIG.VISUAL_RANGE);
        const neighbors = qtree.query(range);
        this.flock(neighbors);
    }

    flock(neighbors) {
        const alignment = this.calculateAlignment(neighbors).multiply(this.config.alignmentWeight);
        const cohesion = this.calculateCohesion(neighbors).multiply(this.config.cohesionWeight);
        const separation = this.calculateSeparation(neighbors).multiply(this.config.separationWeight);

        this.applyForce(alignment);
        this.applyForce(cohesion);
        this.applyForce(separation);
    }
    
    // --- 更新処理 ---
    update() {
        if (this.isEaten) {
            this.updateEatenAnimation();
            return;
        }

        this.velocity = this.applySteering();
        this.position = this.position.add(this.velocity);
        this.acceleration = new Vector(); // 加速をリセット
        this.handleBoundaries();
    }
    
    updateEatenAnimation() {
        this.blinkTimer++;
        this.shrinkFactor *= 0.95;
        this.alpha = 0.5 + 0.5 * Math.sin(this.blinkTimer * 0.3);
        if (this.shrinkFactor < 0.1 || this.alpha < 0.05) this.alpha = 0;
    }
    
    applySteering() {
        const desiredVelocity = this.velocity.add(this.acceleration).limit(this.config.maxSpeed);
        const angle = this.velocity.angleBetween(desiredVelocity);

        if (angle > CONFIG.MAX_TURN_ANGLE * this.config.turnFactor) {
            const cross = this.velocity.x * desiredVelocity.y - this.velocity.y * desiredVelocity.x;
            const rotation = cross > 0 ? CONFIG.MAX_TURN_ANGLE * this.config.turnFactor : -CONFIG.MAX_TURN_ANGLE * this.config.turnFactor;
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            return new Vector(
                this.velocity.x * cos - this.velocity.y * sin,
                this.velocity.x * sin + this.velocity.y * cos
            ).normalize().multiply(this.velocity.magnitude());
        }
        return desiredVelocity;
    }

    handleBoundaries() {
        if (this.position.x < 0) { this.position.x = 0; this.velocity.x *= -1; }
        if (this.position.x > canvas.width) { this.position.x = canvas.width; this.velocity.x *= -1; }
        if (this.position.y < 0) { this.position.y = 0; this.velocity.y *= -1; }
        if (this.position.y > canvas.height) { this.position.y = canvas.height; this.velocity.y *= -1; }
    }

    // --- 描画処理 ---
    draw() {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.velocity.heading());
        ctx.globalAlpha = this.alpha;
        this.drawBody();
        ctx.restore();
    }

    drawBody() {
        ctx.shadowColor = this.config.color.replace(/, ?\d?\.?\d+\)$/, ', 0.4)');
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.config.color;

        const s = this.config.size * this.shrinkFactor;
        ctx.beginPath();
        ctx.moveTo(s, 0);
        ctx.quadraticCurveTo(-s / 2, s / 2, -s, 0);
        ctx.quadraticCurveTo(-s / 2, -s / 2, s, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.lineTo(-s * 1.5, s * 0.4);
        ctx.lineTo(-s * 1.5, -s * 0.4);
        ctx.closePath();
        ctx.fill();
    }

    // --- 計算ヘルパー ---
    seek(target) {
        const desired = target.subtract(this.position).normalize().multiply(this.config.maxSpeed);
        return desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE);
    }
    
    flee(threats, range) {
        let steer = new Vector();
        for (const threat of threats) {
            if (threat.alpha <= 0) continue;
            const d = this.position.subtract(threat.position).magnitude();
            if (d < range) {
                const diff = this.position.subtract(threat.position).normalize().divide(d);
                steer = steer.add(diff);
            }
        }
        if (steer.magnitude() > 0) {
            return steer.normalize().multiply(this.config.maxSpeed).subtract(this.velocity).limit(CONFIG.MAX_FORCE * 5); // 捕食者からは強く逃げる
        }
        return steer;
    }
    
    calculateAlignment(neighbors) {
        let sum = new Vector();
        let count = 0;
        for (const other of neighbors) {
            if (other !== this && other.type === this.type && other.alpha > 0) {
                sum = sum.add(other.velocity);
                count++;
            }
        }
        if (count > 0) {
            const desired = sum.divide(count).normalize().multiply(this.config.maxSpeed);
            return desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE);
        }
        return new Vector();
    }

    calculateCohesion(neighbors) {
        let sum = new Vector();
        let count = 0;
        for (const other of neighbors) {
            if (other !== this && other.type === this.type && other.alpha > 0) {
                sum = sum.add(other.position);
                count++;
            }
        }
        if (count > 0) {
            return this.seek(sum.divide(count));
        }
        return new Vector();
    }
    
    calculateSeparation(neighbors) {
        let steer = new Vector();
        for (const other of neighbors) {
            if (other === this || other.alpha <= 0) continue;
            const d = this.position.subtract(other.position).magnitude();
            if (d > 0 && d < CONFIG.AVOID_RADIUS) {
                const diff = this.position.subtract(other.position).normalize().divide(d);
                steer = steer.add(diff);
            }
        }
        if (steer.magnitude() > 0) {
            const desired = steer.normalize().multiply(this.config.maxSpeed);
            return desired.subtract(this.velocity).limit(CONFIG.MAX_FORCE);
        }
        return steer;
    }
}

// ==========================================================
// 4. 派生クラス
// ==========================================================

class Predator extends Boid {
    constructor(x, y, vx, vy) {
        super('PREDATOR', x, y);
        this.velocity = new Vector(vx, vy);
        this.lifespan = this.config.lifespan;
        this.eatCooldownTimer = 0;
    }

    act(qtree, allPrey) {
        const closestPrey = this.findClosestPrey(allPrey);
        if (closestPrey && this.canEat()) {
            const d = this.position.subtract(closestPrey.position).magnitude();
            if (d < (this.config.eatRadius + closestPrey.config.size) && this.velocity.normalize().dot(closestPrey.position.subtract(this.position).normalize()) > 0.8) {
                closestPrey.isEaten = true;
                this.resetEatCooldown();
            } else {
                this.applyForce(this.seek(closestPrey.position));
            }
        } else if (this.lifespan <= 0) {
            this.alpha -= 0.01;
        } else {
            // 獲物がいないときは少し減速
            this.applyForce(this.velocity.multiply(-0.01));
        }
    }

    update() {
        if (this.alpha <= 0) return;

        this.lifespan--;
        if (this.eatCooldownTimer > 0) this.eatCooldownTimer--;
        
        super.update(); // 共通の更新ロジックを呼び出す
    }

    handleBoundaries() { // ワープ処理にオーバーライド
        const margin = CONFIG.PREDATOR_DESPAWN_MARGIN;
        if (this.position.x < -margin) this.position.x = canvas.width + margin;
        if (this.position.x > canvas.width + margin) this.position.x = -margin;
        if (this.position.y < -margin) this.position.y = canvas.height + margin;
        if (this.position.y > canvas.height + margin) this.position.y = -margin;
        
        // 寿命が尽きたら画面外へ消える
        if (this.lifespan <= 0 && 
            (this.position.x < -this.config.size || this.position.x > canvas.width + this.config.size ||
             this.position.y < -this.config.size || this.position.y > canvas.height + this.config.size)) {
            this.alpha = 0;
        }
    }

    findClosestPrey(preyList) {
        let closest = null;
        let record = CONFIG.PREDATOR_SEEK_RANGE;
        for (const prey of preyList) {
            if (prey.alpha > 0) {
                const d = this.position.subtract(prey.position).magnitude();
                if (d < record) {
                    record = d;
                    closest = prey;
                }
            }
        }
        return closest;
    }

    canEat() { return this.eatCooldownTimer === 0 && this.lifespan > 0; }
    resetEatCooldown() {
        this.eatCooldownTimer = this.config.eatCooldown;
        this.lifespan -= this.config.eatDamage;
    }
}

class SolitaryBoid extends Boid {
    constructor(x, y) {
        super('CUTLASS', x, y);
    }
    
    act(qtree, predators, plankton) {
        const foodAttraction = this.seekClosest(plankton).multiply(2.0);
        const fleeForce = this.flee(predators, CONFIG.PREDATOR_SEEK_RANGE).multiply(3.0);
        const wander = new Vector((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
        
        const range = new Rectangle(this.position.x, this.position.y, this.config.size * 2, this.config.size * 2);
        const neighbors = qtree.query(range).filter(b => b instanceof SolitaryBoid);
        const separateForce = this.calculateSeparation(neighbors).multiply(this.config.separationWeight);

        this.applyForce(foodAttraction.add(fleeForce).add(wander).add(separateForce));
    }
    
    update() {
        // SolitaryBoidは旋回制限を緩やかにする
        const desiredVelocity = this.velocity.add(this.acceleration).limit(this.config.maxSpeed);
        this.velocity = desiredVelocity;
        this.position = this.position.add(this.velocity);
        this.acceleration = new Vector();
        this.handleBoundaries();
    }

    seekClosest(targets) {
        let closest = null;
        let minDistance = Infinity;
        for (const target of targets) {
            const d = this.position.subtract(target.position).magnitude();
            if (d < minDistance) {
                minDistance = d;
                closest = target;
            }
        }
        return closest ? this.seek(closest.position) : new Vector();
    }
}

// ==========================================================
// 5. プランクトンクラス
// ==========================================================

class Plankton {
    constructor(x = Math.random() * canvas.width, y = Math.random() * canvas.height) {
        this.position = new Vector(x, y);
        this.size = 0;
        this.maxSize = CONFIG.PLANKTON_SIZE;
        this.wanderAngle = Math.random() * Math.PI * 2;
    }
    update() {
        if (this.size < this.maxSize) this.size += CONFIG.PLANKTON_GROWTH_RATE;
        this.wanderAngle += (Math.random() - 0.5) * CONFIG.PLANKTON_WANDER_STRENGTH;
        this.position.x += Math.cos(this.wanderAngle) * 0.1;
        this.position.y += Math.sin(this.wanderAngle) * 0.1;
        
        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x > canvas.width) this.position.x = canvas.width;
        if (this.position.y < 0) this.position.y = 0;
        if (this.position.y > canvas.height) this.position.y = canvas.height;
    }
    draw() {
        ctx.fillStyle = CONFIG.PLANKTON_COLOR;
        ctx.shadowColor = CONFIG.PLANKTON_COLOR;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ==========================================================
// 6. 全体を管理するFlockクラス
// ==========================================================

class Flock {
    constructor() {
        this.boids = [];
        this.predators = [];
        this.solitary = [];
        this.plankton = [];
        this.qtree = null;
        this.init();
    }

    init() {
        for (const type in CONFIG.FISH_TYPES) {
            if (CONFIG.FISH_TYPES[type].count > 0) {
                for (let i = 0; i < CONFIG.FISH_TYPES[type].count; i++) {
                    if (type === 'CUTLASS') {
                        this.solitary.push(new SolitaryBoid());
                    } else {
                        this.boids.push(new Boid(type));
                    }
                }
            }
        }
        for (let i = 0; i < CONFIG.SOLITARY_COUNT; i++) {
             this.solitary.push(new SolitaryBoid());
        }
        for (let i = 0; i < CONFIG.PLANKTON_COUNT; i++) {
            this.plankton.push(new Plankton());
        }
    }

    update() {
        // Quadtreeを毎フレーム再構築
        const boundary = new Rectangle(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2);
        this.qtree = new Quadtree(boundary, 4);
        const allBoids = [...this.boids, ...this.solitary, ...this.predators];
        for(const boid of allBoids) {
            if(boid.alpha > 0) this.qtree.insert(boid);
        }

        // 各エージェントの行動決定と更新
        for (const boid of this.boids) {
            if (boid.alpha > 0) {
                boid.act(this.qtree);
                const fleeForce = boid.flee(this.predators, CONFIG.PREDATOR_SEEK_RANGE);
                boid.applyForce(fleeForce.multiply(2.5));
                boid.update();
                this.eatPlankton(boid);
            }
        }
        for (const s of this.solitary) {
            if (s.alpha > 0) {
                s.act(this.qtree, this.predators, this.plankton);
                s.update();
                this.eatPlankton(s);
            }
        }
        for (const p of this.predators) {
            if (p.alpha > 0) {
                p.act(this.qtree, [...this.boids, ...this.solitary]);
                p.update();
            }
        }
        for (const p of this.plankton) {
            p.update();
        }

        // 状態管理
        this.cleanupAndRespawn();
    }
    
    draw() {
        for (const p of this.plankton) p.draw();
        for (const s of this.solitary) if (s.alpha > 0) s.draw();
        for (const b of this.boids) if (b.alpha > 0) b.draw();
        for (const p of this.predators) if (p.alpha > 0) p.draw();
    }

    eatPlankton(boid) {
        for (let i = this.plankton.length - 1; i >= 0; i--) {
            const p = this.plankton[i];
            if (p && boid.position.subtract(p.position).magnitude() < boid.config.eatRadius) {
                this.plankton.splice(i, 1);
                this.plankton.push(new Plankton());
            }
        }
    }
    
    cleanupAndRespawn() {
        this.boids = this.boids.filter(b => b.alpha > 0);
        this.solitary = this.solitary.filter(s => s.alpha > 0);
        this.predators = this.predators.filter(p => p.alpha > 0);

        // 捕食者のスポーン
        if (this.predators.length < CONFIG.MAX_PREDATOR_COUNT && Math.random() < CONFIG.PREDATOR_SPAWN_RATE) {
            this.spawnPredator();
        }

        // 魚の補充
        this.respawnBoids();
    }
    
    spawnPredator() {
        const side = Math.floor(Math.random() * 4);
        let x, y, vx, vy;
        const margin = CONFIG.PREDATOR_DESPAWN_MARGIN;
        const speed = CONFIG.FISH_TYPES.PREDATOR.maxSpeed;
        switch (side) {
            case 0: x = Math.random() * canvas.width; y = -margin; vx = (Math.random() - 0.5) * speed; vy = Math.random() * speed / 2 + speed / 2; break; // Top
            case 1: x = canvas.width + margin; y = Math.random() * canvas.height; vx = -(Math.random() * speed / 2 + speed / 2); vy = (Math.random() - 0.5) * speed; break; // Right
            case 2: x = Math.random() * canvas.width; y = canvas.height + margin; vx = (Math.random() - 0.5) * speed; vy = -(Math.random() * speed / 2 + speed / 2); break; // Bottom
            case 3: x = -margin; y = Math.random() * canvas.height; vx = Math.random() * speed / 2 + speed / 2; vy = (Math.random() - 0.5) * speed; break; // Left
        }
        this.predators.push(new Predator(x, y, vx, vy));
    }
    
    respawnBoids() {
        const counts = this.boids.reduce((acc, b) => { acc[b.type] = (acc[b.type] || 0) + 1; return acc; }, {});
        
        Object.keys(CONFIG.FISH_TYPES).forEach(type => {
            const config = CONFIG.FISH_TYPES[type];
            if (config.count > 0 && type !== 'PREDATOR' && type !== 'CUTLASS') {
                const currentCount = counts[type] || 0;
                if (currentCount < config.count && Math.random() < 0.05) {
                    const margin = CONFIG.BOID_SPAWN_MARGIN;
                    const side = Math.floor(Math.random() * 4);
                    let x, y;
                    if (side === 0) { x = Math.random() * canvas.width; y = -margin; }
                    else if (side === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
                    else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; }
                    else { x = -margin; y = Math.random() * canvas.height; }
                    this.boids.push(new Boid(type, x, y));
                }
            }
        });
    }
}

// ==========================================================
// 7. 初期化とアニメーションループ
// ==========================================================

const canvas = document.getElementById('boidsCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const flock = new Flock();

function animate() {
    // 1. 計算
    flock.update();

    // 2. 描画
    ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    flock.draw();

    requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});