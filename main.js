// FILE: main.js
const canvas = document.getElementById('boidsCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let flock;
let lastTime = 0;
let animationId;
let loadedImages;

const translationMap = {
    'Global Settings': 'グローバル設定', 'Prey Fish': '被食者', 'Predators': '捕食者',
    'PREDATOR_SPAWN_COOLDOWN': '出現クールダウン', 'OVERPOPULATION_COUNT': '過密発生数 (+)',
    'PREDATOR_TARGET_BONUS': '担当ボーナス', 'maxSpeed': '最高速度', 'separationWeight': '分離',
    'alignmentWeight': '整列', 'cohesionWeight': '結合', 'reproductionCost': '繁殖コスト', 
    'planktonSeekRange': 'プランクトン索敵', 'fleeForceMultiplier': '逃走力', 'planktonSeekMultiplier': 'プランクトン追跡力',
    'planktonFocusMultiplier': '餌への集中度', 'eatCooldown': '食事クールダウン',
    'fleeSpeedMultiplier': '逃走速度倍率', 'wanderForce': '放浪力', 'foodSeekForce': '餌追跡力',
    'turnFactor': '旋回性能', 'lifespan': '寿命', 'eatDamage': '捕食ダメージ', 'maxCount': '最大数', 
    'seekRange': '索敵範囲', 'isFlocking': '群れ形成',
    'minSpeedMultiplier': '最低速度維持率', 'minSpeedForce': '最低速度推進力', 
    'stunRadius': 'スタン半径', 'stunDuration': 'スタン時間', 'stunSeekRange': 'スタン索敵範囲', 
    'stealthDuration': 'ステルス化時間', 'stealthSeekRange': 'ステルス索敵範囲', 
    'ambushForce': '奇襲力', 'brakeForce': 'ブレーキ力', 'turnTorque': '旋回トルク'
};

function translate(key) {
    return translationMap[key] || key;
}

function animate(currentTime) {
    if (lastTime === 0) {
        lastTime = currentTime;
    }
    const deltaTime = (currentTime - lastTime) / 16.67;
    lastTime = currentTime;

    ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (flock) {
        flock.update(deltaTime);
        flock.draw();
    }

    animationId = requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ===== UI & CONTROL LOGIC =====
function populateInfoPanel() {
    const panels = {
        'global-status': { category: 'Global Settings', keys: ['PREDATOR_SPAWN_COOLDOWN', 'OVERPOPULATION_COUNT', 'PREDATOR_TARGET_BONUS'] },
        'prey-status': { category: 'Prey Fish', keys: ['SARDINE', 'MACKEREL', 'BONITO', 'CUTLASS'] },
        'predator-status': { category: 'Predators', keys: ['SHARK', 'MARLIN', 'RAY', 'TUNA'] }
    };
    
    for (const [panelId, data] of Object.entries(panels)) {
        const panel = document.getElementById(panelId);
        let html = '';
        if (data.category === 'Global Settings') {
            data.keys.forEach(key => {
                html += `<div class="info-grid-item-label">${translate(key)}:</div><div class="info-grid-item-value">${CONFIG[key]}</div>`;
            });
        } else {
            data.keys.forEach(type => {
                html += `<div class="info-grid-item-label" style="grid-column: 1 / -1; color: #0af; text-align: left; padding-top: 5px;"><strong>${type}</strong></div>`;
                for(const [key, value] of Object.entries(CONFIG.FISH_TYPES[type])) {
                    if (typeof value !== 'object' && !['count', 'spawnColor', 'eats', 'width', 'height', 'mouthOffset'].includes(key)) {
                         html += `<div class="info-grid-item-label">${translate(key)}:</div><div class="info-grid-item-value">${value}</div>`;
                    }
                }
            });
        }
        panel.innerHTML = html;
    }
}

// シンプルなリセット機能を追加
function resetSimulation() {
    cancelAnimationFrame(animationId);
    lastTime = 0;
    flock = new Flock(loadedImages);
    animate(performance.now());
}

function handleDisplayMode() {
    if (flock) {
        flock.displayMode = (flock.displayMode + 1) % 3; // 0: off, 1: pop, 2: all
    }
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (document.activeElement.tagName.toLowerCase() === 'input') return;

    if (key === 'd') {
        handleDisplayMode();
    }
    // 'r'キーでリセット
    if (key === 'r') {
        console.log("--- Simulation Reset ---");
        resetSimulation();
    }
});

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (flock) {
        flock.clickThreats.push(new ClickThreat(new Vector(x, y)));
        flock.rippleEffects.push(new RippleEffect(new Vector(x, y)));
    }
});

// --- シミュレーション開始処理 ---
console.log("Loading assets...");
loadAssets().then(images => {
    console.log("Assets loaded successfully!");
    loadedImages = images; // ★読み込んだ画像をグローバル変数に保存
    flock = new Flock(loadedImages); // ★画像データを渡してFlockを初期化
    populateInfoPanel();
    animationId = requestAnimationFrame(animate);
}).catch(error => {
    console.error("Could not initialize simulation:", error);
});