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
    PREDATOR_SPAWN_RATE: 0.005, // 捕食者の出現頻度
    PREDATOR_DESPAWN_MARGIN: 100, // 捕食者が消える画面外の距離
    BOID_SPAWN_MARGIN: 50, // 魚が生まれる画面外の距離

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
        CUTLASS: {
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
            color: 'rgba(150, 50, 150, 0.8)',
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

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        if (scalar === 0) return new Vector(0, 0);
        return new Vector(this.x / scalar, this.y / scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const m = this.magnitude();
        return m > 0 ? this.divide(m) : new Vector();
    }

    limit(max) {
        if (this.magnitude() > max) {
            return this.normalize().multiply(max);
        }
        return this;
    }

    // 修正点: dotメソッドを追加
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    // 修正点: dotメソッドを使うように変更
    angleBetween(v) {
        if (this.magnitude() === 0 || v.magnitude() === 0) return 0;
        return Math.acos(Math.max(-1, Math.min(1, this.dot(v) / (this.magnitude() * v.magnitude()))));
    }

    heading() {
        return Math.atan2(this.y, this.x);
    }
}

// ==========================================================
// 2. Boidクラス
// ==========================================================

class Boid {
    constructor(type, x = Math.random() * canvas.width, y = Math.random() * canvas.height) {
        this.type = type;
        this.config = CONFIG.FISH_TYPES?.[type] || CONFIG.FISH_TYPES.SMALL;
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

    update() {
        if (this.isEaten) {
            this.blinkTimer++;
            this.shrinkFactor *= 0.95;
            this.alpha = 0.5 + 0.5 * Math.sin(this.blinkTimer * 0.3);
            if (this.shrinkFactor < 0.1 || this.alpha < 0.05) {
                this.alpha = 0;
            }
            return;
        }

        const desiredVelocity = this.velocity.add(this.acceleration).limit(this.config.maxSpeed);
        const currentVelocity = this.velocity;

        let angle = currentVelocity.angleBetween(desiredVelocity);

        if (angle > CONFIG.MAX_TURN_ANGLE * this.config.turnFactor) {
            const cross = currentVelocity.x * desiredVelocity.y - currentVelocity.y * desiredVelocity.x;
            const rotation = cross > 0 ? CONFIG.MAX_TURN_ANGLE * this.config.turnFactor : -CONFIG.MAX_TURN_ANGLE * this.config.turnFactor;
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            this.velocity = new Vector(
                currentVelocity.x * cos - currentVelocity.y * sin,
                currentVelocity.x * sin + currentVelocity.y * cos
            ).normalize().multiply(currentVelocity.magnitude());
        } else {
            this.velocity = desiredVelocity;
        }

        this.position = this.position.add(this.velocity);
        this.acceleration = new Vector();

        // 壁で跳ね返る処理
        if (this.position.x < 0) {
            this.position.x = 0;
            this.velocity.x *= -1;
        }
        if (this.position.x > canvas.width) {
            this.position.x = canvas.width;
            this.velocity.x *= -1;
        }
        if (this.position.y < 0) {
            this.position.y = 0;
            this.velocity.y *= -1;
        }
        if (this.position.y > canvas.height) {
            this.position.y = canvas.height;
            this.velocity.y *= -1;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.velocity.heading());
        ctx.globalAlpha = this.alpha;

        ctx.shadowColor = this.config.color.replace('0.7', '0.4');
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.config.color;

        ctx.beginPath();
        ctx.moveTo(this.config.size * this.shrinkFactor, 0);
        ctx.quadraticCurveTo(-this.config.size * this.shrinkFactor / 2, this.config.size * this.shrinkFactor / 2, -this.config.size * this.shrinkFactor, 0);
        ctx.quadraticCurveTo(-this.config.size * this.shrinkFactor / 2, -this.config.size * this.shrinkFactor / 2, this.config.size * this.shrinkFactor, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-this.config.size * this.shrinkFactor, 0);
        ctx.lineTo(-this.config.size * this.shrinkFactor * 1.5, this.config.size * this.shrinkFactor * 0.4);
        ctx.lineTo(-this.config.size * this.shrinkFactor * 1.5, -this.config.size * this.shrinkFactor * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    eat(amount = 1) {
    }
}

// ==========================================================
// 3. 捕食者クラス
// ==========================================================

class Predator extends Boid {
    constructor(x, y, vx, vy) {
        super('PREDATOR', x, y);
        this.config = CONFIG.FISH_TYPES.PREDATOR;
        this.lifespan = this.config.lifespan;
        this.eatCooldownTimer = 0;
        this.velocity = new Vector(vx, vy);
    }

    update() {
        if (this.alpha <= 0) return;

        const desiredVelocity = this.velocity.add(this.acceleration).limit(this.config.maxSpeed);
        const currentVelocity = this.velocity;

        let angle = currentVelocity.angleBetween(desiredVelocity);

        if (angle > CONFIG.MAX_TURN_ANGLE * this.config.turnFactor) {
            const cross = currentVelocity.x * desiredVelocity.y - currentVelocity.y * desiredVelocity.x;
            const rotation = cross > 0 ? CONFIG.MAX_TURN_ANGLE * this.config.turnFactor : -CONFIG.MAX_TURN_ANGLE * this.config.turnFactor;
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            this.velocity = new Vector(
                currentVelocity.x * cos - currentVelocity.y * sin,
                currentVelocity.x * sin + currentVelocity.y * cos
            ).normalize().multiply(currentVelocity.magnitude());
        } else {
            this.velocity = desiredVelocity;
        }

        this.position = this.position.add(this.velocity);
        this.acceleration = new Vector();

        this.lifespan--;
        if (this.eatCooldownTimer > 0) {
            this.eatCooldownTimer--;
        }

        if (this.lifespan <= 0 && this.alpha > 0) {
            const center = new Vector(canvas.width / 2, canvas.height / 2);
            let direction = this.position.subtract(center).normalize();
            this.applyForce(direction.multiply(0.5));
            this.alpha -= 0.01;
        }

        // ワープ処理
        if (this.position.x < -this.config.size) this.position.x = canvas.width + this.config.size;
        if (this.position.x > canvas.width + this.config.size) this.position.x = -this.config.size;
        if (this.position.y < -this.config.size) this.position.y = canvas.height + this.config.size;
        if (this.position.y > canvas.height + this.config.size) this.position.y = -this.config.size;
    }

    draw() {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.velocity.heading());
        ctx.globalAlpha = this.alpha;

        ctx.shadowColor = this.config.color.replace('0.8', '0.5');
        ctx.shadowBlur = 12;
        ctx.fillStyle = this.config.color;

        ctx.beginPath();
        ctx.moveTo(this.config.size, 0);
        ctx.quadraticCurveTo(-this.config.size / 2, this.config.size / 2, -this.config.size, 0);
        ctx.quadraticCurveTo(-this.config.size / 2, -this.config.size / 2, this.config.size, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-this.config.size, 0);
        ctx.lineTo(-this.config.size * 1.5, this.config.size * 0.4);
        ctx.lineTo(-this.config.size * 1.5, -this.config.size * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    canEat() {
        return this.eatCooldownTimer === 0 && this.lifespan > 0;
    }

    resetEatCooldown() {
        this.eatCooldownTimer = this.config.eatCooldown;
        this.lifespan -= this.config.eatDamage;
    }
}

// ==========================================================
// 4. 単独行動クラス (タチウオ)
// ==========================================================

class SolitaryBoid extends Boid {
    constructor(type, x = Math.random() * canvas.width, y = Math.random() * canvas.height) {
        super(type, x, y);
        this.config = CONFIG.FISH_TYPES.CUTLASS;
    }

    update() {
        if (this.isEaten) {
            this.blinkTimer++;
            this.shrinkFactor *= 0.95;
            this.alpha = 0.5 + 0.5 * Math.sin(this.blinkTimer * 0.3);
            if (this.shrinkFactor < 0.1 || this.alpha < 0.05) {
                this.alpha = 0;
            }
            return;
        }

        let force = new Vector();
        let foodAttraction = flock.seekPlankton(this);
        let fleeForce = flock.flee(this, flock.predators);
        let separateForce = flock.separateSolitary(this, flock.solitary);

        force = force.add(foodAttraction.multiply(2.0)).add(fleeForce.multiply(3.0)).add(separateForce.multiply(this.config.separationWeight));

        this.applyForce(force.limit(CONFIG.MAX_FORCE));

        const desiredVelocity = this.velocity.add(this.acceleration).limit(this.config.maxSpeed);
        this.velocity = desiredVelocity;
        this.position = this.position.add(this.velocity);
        this.acceleration = new Vector();

        // 壁で跳ね返る処理
        if (this.position.x < 0) {
            this.position.x = 0;
            this.velocity.x *= -1;
        }
        if (this.position.x > canvas.width) {
            this.position.x = canvas.width;
            this.velocity.x *= -1;
        }
        if (this.position.y < 0) {
            this.position.y = 0;
            this.velocity.y *= -1;
        }
        if (this.position.y > canvas.height) {
            this.position.y = canvas.height;
            this.velocity.y *= -1;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.velocity.heading());
        ctx.globalAlpha = this.alpha;

        ctx.shadowColor = this.config.color.replace('0.6', '0.3');
        ctx.shadowBlur = 6;
        ctx.fillStyle = this.config.color;

        ctx.beginPath();
        ctx.moveTo(this.config.size * this.shrinkFactor, 0);
        ctx.quadraticCurveTo(-this.config.size * this.shrinkFactor / 2, this.config.size * this.shrinkFactor / 2, -this.config.size * this.shrinkFactor, 0);
        ctx.quadraticCurveTo(-this.config.size * this.shrinkFactor / 2, -this.config.size * this.shrinkFactor / 2, this.config.size * this.shrinkFactor, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-this.config.size * this.shrinkFactor, 0);
        ctx.lineTo(-this.config.size * this.shrinkFactor * 1.5, this.config.size * this.shrinkFactor * 0.4);
        ctx.lineTo(-this.config.size * this.shrinkFactor * 1.5, -this.config.size * this.shrinkFactor * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
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
        this.wanderStrength = CONFIG.PLANKTON_WANDER_STRENGTH;
    }

    update() {
        if (this.size < this.maxSize) {
            this.size += CONFIG.PLANKTON_GROWTH_RATE;
        }
        this.wanderAngle += (Math.random() - 0.5) * this.wanderStrength;
        this.position.x += Math.cos(this.wanderAngle) * 0.1;
        this.position.y += Math.sin(this.wanderAngle) * 0.1;

        if (this.position.x < 0) {
            this.position.x = 0;
        }
        if (this.position.x > canvas.width) {
            this.position.x = canvas.width;
        }
        if (this.position.y < 0) {
            this.position.y = 0;
        }
        if (this.position.y > canvas.height) {
            this.position.y = canvas.height;
        }
    }

    draw() {
        ctx.fillStyle = CONFIG.PLANKTON_COLOR;
        ctx.shadowColor = CONFIG.PLANKTON_COLOR;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==========================================================
// 6. Flockクラス
// ==========================================================

class Flock {
    constructor() {
        this.boids = [];
        this.predators = [];
        this.solitary = [];
        this.plankton = [];
        this.init();
    }

    init() {
        for (let i = 0; i < CONFIG.FISH_TYPES.SMALL.count; i++) {
            this.boids.push(new Boid('SMALL'));
        }
        for (let i = 0; i < CONFIG.FISH_TYPES.MEDIUM.count; i++) {
            this.boids.push(new Boid('MEDIUM'));
        }
        for (let i = 0; i < CONFIG.FISH_TYPES.LARGE.count; i++) {
            this.boids.push(new Boid('LARGE'));
        }
        for (let i = 0; i < CONFIG.SOLITARY_COUNT; i++) {
            this.solitary.push(new SolitaryBoid('CUTLASS'));
        }
        for (let i = 0; i < CONFIG.PLANKTON_COUNT; i++) {
            this.plankton.push(new Plankton());
        }
    }

    spawnPredator() {
        if (this.predators.length >= CONFIG.MAX_PREDATOR_COUNT) return;
        const spawnSide = Math.floor(Math.random() * 4);
        let x, y, vx, vy;
        const margin = CONFIG.PREDATOR_DESPAWN_MARGIN;
        const speed = CONFIG.FISH_TYPES.PREDATOR.maxSpeed;

        switch (spawnSide) {
            case 0:
                x = Math.random() * canvas.width;
                y = -margin;
                vx = (Math.random() - 0.5) * speed;
                vy = Math.random() * speed / 2 + speed / 2;
                break;
            case 1:
                x = canvas.width + margin;
                y = Math.random() * canvas.height;
                vx = -(Math.random() * speed / 2 + speed / 2);
                vy = (Math.random() - 0.5) * speed;
                break;
            case 2:
                x = Math.random() * canvas.width;
                y = canvas.height + margin;
                vx = (Math.random() - 0.5) * speed;
                vy = -(Math.random() * speed / 2 + speed / 2);
                break;
            case 3:
                x = -margin;
                y = Math.random() * canvas.height;
                vx = Math.random() * speed / 2 + speed / 2;
                vy = (Math.random() - 0.5) * speed;
                break;
        }
        this.predators.push(new Predator(x, y, vx, vy));
    }

    checkBoidCounts() {
        const currentCounts = { SMALL: 0, MEDIUM: 0, LARGE: 0 };
        this.boids.forEach(b => {
            if (b.alpha > 0) {
                currentCounts[(b.type)]++;
            }
        });

        Object.keys(currentCounts).forEach(type => {
            const config = CONFIG.FISH_TYPES?.[type];
            if (config && currentCounts[(type)] < config.count && Math.random() < 0.05) {
                let x, y;
                const margin = CONFIG.BOID_SPAWN_MARGIN;
                const side = Math.floor(Math.random() * 4);
                if (side === 0) { x = Math.random() * canvas.width; y = -margin; }
                else if (side === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
                else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; }
                else { x = -margin; y = Math.random() * canvas.height; }
                this.boids.push(new Boid(type, x, y));
            }
        });
    }

    update() {
        if (this.predators.length < CONFIG.MAX_PREDATOR_COUNT && Math.random() < CONFIG.PREDATOR_SPAWN_RATE) {
            this.spawnPredator();
        }
        this.checkBoidCounts();

        for (let plankton of this.plankton) {
            plankton.update();
            plankton.draw();
        }

        for (let boid of this.boids) {
            if (boid.alpha <= 0) continue;
            this.flock(boid, this.boids.filter(other => other !== boid && other.alpha > 0));
            boid.update();
            boid.draw();
            this.eatPlankton(boid);
        }

        for (let solitary of this.solitary) {
            if (solitary.alpha <= 0) continue;
            this.solitaryBehavior(solitary);
            solitary.update();
            solitary.draw();
            this.eatPlankton(solitary);
        }

        for (let predator of this.predators) {
            if (predator.alpha <= 0) continue;
            this.predatorBehavior(predator);
            predator.update();
            predator.draw();
        }

        this.predators = this.predators.filter(p => p.alpha > 0);
        this.boids = this.boids.filter(b => b.alpha > 0);
        this.solitary = this.solitary.filter(s => s.alpha > 0);
    }

    eatPlankton(boid) {
        for (let i = this.plankton.length - 1; i >= 0; i--) {
            const plankton = this.plankton[i];
            if (!plankton) continue;
            const d = boid.position.subtract(plankton.position).magnitude();
            if (d < boid.config.eatRadius) {
                this.plankton.splice(i, 1);
                this.plankton.push(new Plankton());
            }
        }
    }

    flock(boid, nearby) {
        let alignment = this.align(boid, nearby);
        let cohesion = this.cohese(boid, nearby);
        let separation = this.separate(boid, nearby);
        let avoidPredators = this.flee(boid, this.predators);

        alignment = alignment.multiply(boid.config.alignmentWeight);
        cohesion = cohesion.multiply(boid.config.cohesionWeight);
        separation = separation.multiply(boid.config.separationWeight);
        avoidPredators = avoidPredators.multiply(2.5);

        boid.applyForce(alignment);
        boid.applyForce(cohesion);
        boid.applyForce(separation);
        boid.applyForce(avoidPredators);
    }

    align(boid, nearby) {
        let sum = new Vector();
        let count = 0;
        for (let other of nearby) {
            if (other.type === boid.type && other.alpha > 0) {
                sum = sum.add(other.velocity);
                count++;
            }
        }
        if (count > 0) {
            sum = sum.divide(count).normalize().multiply(boid.config.maxSpeed);
            return sum.subtract(boid.velocity).limit(CONFIG.MAX_FORCE);
        } else {
            return new Vector();
        }
    }

    cohese(boid, nearby) {
        let sum = new Vector();
        let count = 0;
        for (let other of nearby) {
            if (other.type === boid.type && other.alpha > 0) {
                sum = sum.add(other.position);
                count++;
            }
        }
        if (count > 0) {
            sum = sum.divide(count);
            return this.seek(boid, sum);
        } else {
            return new Vector();
        }
    }

    separate(boid, nearby) {
        let steer = new Vector();
        for (let other of nearby) {
            if (other.type === boid.type && other.alpha > 0) {
                let d = boid.position.subtract(other.position).magnitude();
                if (d < CONFIG.AVOID_RADIUS) {
                    let diff = boid.position.subtract(other.position).normalize().divide(d);
                    steer = steer.add(diff);
                }
            }
        }
        if (steer.magnitude() > 0) {
            steer = steer.normalize().multiply(boid.config.maxSpeed).subtract(boid.velocity).limit(CONFIG.MAX_FORCE);
        }
        return steer;
    }

    seek(boid, target) {
        let desired = target.subtract(boid.position);
        desired = desired.normalize().multiply(boid.config.maxSpeed);
        return desired.subtract(boid.velocity).limit(CONFIG.MAX_FORCE);
    }

    flee(boid, threats) {
        let steer = new Vector();
        for (let threat of threats) {
            if (threat.alpha <= 0) continue;
            let d = boid.position.subtract(threat.position).magnitude();
            if (d < CONFIG.PREDATOR_SEEK_RANGE) {
                let diff = boid.position.subtract(threat.position).normalize().divide(d);
                steer = steer.add(diff);
            }
        }
        if (steer.magnitude() > 0) {
            steer = steer.normalize().multiply(boid.config.maxSpeed).subtract(boid.velocity).limit(CONFIG.MAX_FORCE);
        }
        return steer;
    }

    predatorBehavior(predator) {
        let closestPrey = this.findClosestPrey(predator);
        if (closestPrey && predator.canEat()) {
            let d = predator.position.subtract(closestPrey.position).magnitude();
            // 修正点: dotメソッドが存在しなかった点を修正
            if (d < (predator.config.eatRadius + closestPrey.config.size) && predator.velocity.normalize().dot(closestPrey.position.subtract(predator.position).normalize()) > 0.8) {
                closestPrey.isEaten = true;
                predator.resetEatCooldown();
            } else {
                let seekForce = this.seek(predator, closestPrey.position);
                predator.applyForce(seekForce);
            }
        } else if (predator.lifespan <= 0) {
            let escapeForce = this.seek(predator, new Vector(canvas.width / 2, canvas.height / 2).subtract(predator.velocity.normalize().multiply(1000)));
            predator.applyForce(escapeForce);
            predator.alpha -= 0.01;
        } else {
            predator.applyForce(predator.velocity.multiply(-0.01));
        }
    }
    
    solitaryBehavior(solitary) {
        let foodAttraction = this.seekPlankton(solitary);
        let fleeForce = this.flee(solitary, this.predators);
        let wander = new Vector((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
        let separateForce = this.separateSolitary(solitary, this.solitary);
        solitary.applyForce(foodAttraction.multiply(2.0).add(fleeForce.multiply(3.0)).add(wander).add(separateForce.multiply(solitary.config.separationWeight)));
    }

    separateSolitary(boid, nearby) {
        let steer = new Vector();
        let count = 0;
        for (let other of nearby) {
            if (other === boid || other.alpha <= 0) continue;
            let d = boid.position.subtract(other.position).magnitude();
            if (d < boid.config.size * 2) {
                let diff = boid.position.subtract(other.position).normalize().divide(d);
                steer = steer.add(diff);
                count++;
            }
        }
        if (count > 0) {
            steer = steer.normalize().multiply(boid.config.maxSpeed).subtract(boid.velocity).limit(CONFIG.MAX_FORCE);
        }
        return steer;
    }

    seekPlankton(boid) {
        let closestPlankton = null;
        let minDistance = Infinity;
        for (let plankton of this.plankton) {
            let d = boid.position.subtract(plankton.position).magnitude();
            if (d < minDistance) {
                minDistance = d;
                closestPlankton = plankton;
            }
        }
        if (closestPlankton) {
            return this.seek(boid, closestPlankton.position);
        } else {
            return new Vector();
        }
    }

    findClosestPrey(predator) {
        let closest = null;
        let record = Infinity;
        for (let boid of this.boids.concat(this.solitary)) {
            if (boid.alpha > 0) {
                let d = predator.position.subtract(boid.position).magnitude();
                if (d < record && d < CONFIG.PREDATOR_SEEK_RANGE) {
                    record = d;
                    closest = boid;
                }
            }
        }
        return closest;
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
    ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    flock.update();

    for (let boid of flock.boids) {
        boid.draw();
    }
    for (let predator of flock.predators) {
        predator.draw();
    }
    for (let solitary of flock.solitary) {
        solitary.draw();
    }

    requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});