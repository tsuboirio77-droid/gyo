// FILE: effect_entities.js
class Plankton {
    constructor(x, y) {
        const margin = 50;
        const width = canvas.width - margin * 2;
        const height = canvas.height - margin * 2;
        this.position = new Vector(Math.random() * width + margin, Math.random() * height + margin);
        this.size = 0;
        
        // ★▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 修正点 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼★
        const scale = CONFIG.DEVICE_SCALES[DEVICE_TYPE] || CONFIG.DEVICE_SCALES.DESKTOP;
        this.maxSize = CONFIG.PLANKTON_SIZE * scale.sizeModifier;
        // ★▲▲▲▲▲▲▲▲▲▲▲▲▲ 修正点 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲★

        this.wanderAngle = Math.random() * Math.PI * 2;
    }
    update(deltaTime) {
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
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}
class SpawnEffect {
    constructor(position, color, side) {
        this.position = position;
        this.color = color;
        this.side = side;
        this.maxLifespan = 45;
        this.lifespan = this.maxLifespan;
        this.length = 400; // ★ 250 -> 400
        this.width = 4;    // ★ 6 -> 4
    }
    update(deltaTime) { this.lifespan -= deltaTime; }
    draw() {
        const progress = this.lifespan / this.maxLifespan;
        if (progress < 0) return;
        const alpha = 1 - Math.pow(1 - progress, 2);
        const currentWidth = this.width * (1 - progress);
        ctx.save();
        ctx.beginPath();
        let x, y, w, h;
        switch (this.side) {
            case 0: x = this.position.x - this.length / 2; y = 0; w = this.length; h = currentWidth; break;
            case 1: x = canvas.width - currentWidth; y = this.position.y - this.length / 2; w = currentWidth; h = this.length; break;
            case 2: x = this.position.x - this.length / 2; y = canvas.height - currentWidth; w = this.length; h = currentWidth; break;
            case 3: x = 0; y = this.position.y - this.length / 2; w = currentWidth; h = this.length; break;
        }
        x = Math.max(0, Math.min(canvas.width - w, x));
        y = Math.max(0, Math.min(canvas.height - h, y));
        const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
        // ★ グラデーションを白から黒に変更
        gradient.addColorStop(0, `rgba(${this.color}, 0)`);
        gradient.addColorStop(0.2, `rgba(0, 0, 0, ${alpha * 0.7})`);
        gradient.addColorStop(0.5, `rgba(${this.color}, ${alpha})`);
        gradient.addColorStop(0.8, `rgba(0, 0, 0, ${alpha * 0.7})`);
        gradient.addColorStop(1, `rgba(${this.color}, 0)`);
        ctx.fillStyle = gradient;
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.restore();
    }
}
class ClickThreat { constructor(position) { this.position = position; this.lifespan = CONFIG.CLICK_EFFECT.threatDuration; } update(deltaTime) { this.lifespan -= deltaTime; } }
class RippleEffect { constructor(position) { this.position = position; this.maxLifespan = 60; this.lifespan = this.maxLifespan; this.rings = [ { offset: 0, maxRadius: 80, width: 6 }, { offset: 20, maxRadius: 100, width: 4 }, { offset: 40, maxRadius: 120, width: 2 }]; } update(deltaTime) { this.lifespan -= deltaTime; } draw() { if (this.lifespan < 0) return; this.rings.forEach(ring => { const ringLife = this.lifespan - ring.offset; if (ringLife > 0) { const progress = ringLife / (this.maxLifespan - ring.offset); const currentRadius = ring.maxRadius * (1 - progress); const alpha = progress; ctx.strokeStyle = `rgba(150, 200, 255, ${alpha * 0.5})`; ctx.lineWidth = ring.width * progress; ctx.beginPath(); ctx.arc(this.position.x, this.position.y, currentRadius, 0, Math.PI * 2); ctx.stroke(); } }); } }