// FILE: main.js
const canvas = document.getElementById('boidsCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/**
 * User Agentを元にデバイスの種類を判定します。
 * @returns {string} 'DESKTOP', 'TABLET', or 'MOBILE'
 */
function detectDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'TABLET';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'MOBILE';
    }
    return 'DESKTOP';
}
const DEVICE_TYPE = detectDeviceType();

let flock;
let lastTime = 0;
let animationId;
let loadedImages;

// ===== CLOCK ELEMENTS & VARS =====
const clockContainer = document.getElementById('clock-container');
const dateDisplay = document.getElementById('date-display');
const timeDisplay = document.getElementById('time-display');
const analogClockCanvas = document.getElementById('analog-clock-canvas');
const analogCtx = analogClockCanvas.getContext('2d');

const analogDateDisplay = document.getElementById('analog-date-display');

let currentFontIndex = 0;

const fontStyles = [
    { name: 'CuteFont',     type: 'digital', containerBottom: '-20px', dateMarginBottom: '-40px', dateSize: '28px', timeSize: '120px', dateLetterSpacing: '1px', timeLetterSpacing: '4px', datePaddingRight: '7px' },
    { name: 'BigShoulders', type: 'digital', containerBottom: '7px', dateMarginBottom: '0px', dateSize: '25px', timeSize: '90px', dateLetterSpacing: '2px', timeLetterSpacing: '7px', datePaddingRight: '10px' },
    { name: 'AveriaSerif',  type: 'digital', containerBottom: '5px', dateMarginBottom: '-15px', dateSize: '20px', timeSize: '90px', dateLetterSpacing: '1.5px', timeLetterSpacing: '4px', datePaddingRight: '10px' },
    { name: 'Analog',       type: 'analog',  containerBottom: '0px' }
];


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

// ===== CLOCK LOGIC =====
function updateClock() {
    if (!dateDisplay || !timeDisplay || fontStyles[currentFontIndex].type !== 'digital') return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    dateDisplay.textContent = `${year}/${month}/${date} ${day}`;

    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeDisplay.textContent = `${hours}:${minutes}`;
}

function drawAnalogClock() {
    if (!analogCtx || fontStyles[currentFontIndex].type !== 'analog') return;

    const now = new Date();

    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    analogDateDisplay.textContent = `${month}/${date} ${day}`;

    const radius = analogClockCanvas.width / 2;
    analogCtx.clearRect(0, 0, analogClockCanvas.width, analogClockCanvas.height);

    analogCtx.save();
    analogCtx.translate(radius, radius);

    analogCtx.strokeStyle = 'rgb(0, 170, 255)';

    const rectHeight = radius * 1.8;
    const rectWidth = radius * 1.4; // ★横幅を大きく
    const hh = rectHeight /2;
    const hw = rectWidth / 2;

    const markerPositions = [
        { x: 0,   y: -hh }, { x: hw,  y: -hh }, { x: hw,  y: -hh / 2}, { x: hw,  y: 0 },
        { x: hw,  y: hh / 2 },{ x: hw,  y: hh }, { x: 0,   y: hh }, { x: -hw, y: hh },
        { x: -hw, y: hh / 2 },{ x: -hw, y: 0 }, { x: -hw, y: -hh / 2},{ x: -hw, y: -hh }
    ];

    markerPositions.forEach((pos, i) => {
        const isHourMarker = i % 3 === 0;
        const markerLength = radius * (isHourMarker ? 0.2 : 0.1);
        analogCtx.lineWidth = isHourMarker ? 3 : 2;
        const p = new Vector(pos.x, pos.y);
        const normal = p.normalize();
        const p_outer = p;
        const p_inner = p.subtract(normal.multiply(markerLength));
        analogCtx.beginPath();
        analogCtx.moveTo(p_outer.x, p_outer.y);
        analogCtx.lineTo(p_inner.x, p_inner.y);
        analogCtx.stroke();
    });

    function getAngleForRect(value, totalUnits) {
        const markerFloat = (value / totalUnits) * 12;
        const idx1 = Math.floor(markerFloat) % 12;
        const idx2 = (idx1 + 1) % 12;
        const fraction = markerFloat - Math.floor(markerFloat);
        const pos1 = new Vector(markerPositions[idx1].x, markerPositions[idx1].y);
        const pos2 = new Vector(markerPositions[idx2].x, markerPositions[idx2].y);
        const targetPos = pos1.multiply(1 - fraction).add(pos2.multiply(fraction));
        return Math.atan2(targetPos.y, targetPos.x) + Math.PI / 2;
    }

    const currentHour = (now.getHours() % 12) + now.getMinutes() / 60;
    const currentMinute = now.getMinutes() + now.getSeconds() / 60;
    const currentSecond = now.getSeconds();

    const hourAngle = getAngleForRect(currentHour, 12);
    const minAngle = getAngleForRect(currentMinute, 60);
    const secAngle = getAngleForRect(currentSecond, 60);

    function drawHand(ctx, pos, length, width, color) {
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.moveTo(0,0);
        ctx.rotate(pos);
        ctx.lineTo(0, -length);
        ctx.stroke();
        ctx.rotate(-pos);
    }

    drawHand(analogCtx, hourAngle, radius * 0.35, 5, 'rgb(0, 170, 255)');
    drawHand(analogCtx, minAngle, radius * 0.55, 3, 'rgb(0, 170, 255)');
    drawHand(analogCtx, secAngle, radius * 0.6, 1.5, 'rgb(255, 0, 0)');

    analogCtx.restore();
}

function applyClockStyle(style) {
    if (clockContainer) {
        clockContainer.style.bottom = style.containerBottom;
    }

    if (style.type === 'analog') {
        dateDisplay.style.display = 'none';
        timeDisplay.style.display = 'none';
        analogClockCanvas.style.display = 'block';
        analogDateDisplay.style.display = 'block';
        clockContainer.classList.add('analog-mode-alignment');
        const size = 150;
        analogClockCanvas.width = size;
        analogClockCanvas.height = size;
        clockContainer.style.opacity = '0.2';
    } else {
        dateDisplay.style.display = 'block';
        timeDisplay.style.display = 'block';
        analogClockCanvas.style.display = 'none';
        analogDateDisplay.style.display = 'none';
        clockContainer.classList.remove('analog-mode-alignment');
        clockContainer.style.opacity = '0.2';
        clockContainer.style.fontFamily = `'${style.name}', sans-serif`;
        if (dateDisplay) {
            dateDisplay.style.marginBottom = style.dateMarginBottom;
            dateDisplay.style.fontSize = style.dateSize;
            dateDisplay.style.letterSpacing = style.dateLetterSpacing;
            dateDisplay.style.paddingRight = style.datePaddingRight;
        }
        if (timeDisplay) {
            timeDisplay.style.fontSize = style.timeSize;
            timeDisplay.style.letterSpacing = style.timeLetterSpacing;
        }
    }
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

    const currentStyle = fontStyles[currentFontIndex];
    if (currentStyle.type === 'analog') {
        drawAnalogClock();
    } else {
        updateClock();
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
    if (key === 'r') {
        console.log("--- Simulation Reset ---");
        resetSimulation();
    }
    // ★▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 削除 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼★
    // 't'キーによる時計切り替え機能を削除
    // ★▲▲▲▲▲▲▲▲▲▲▲▲▲ 削除 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲★
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

// ★▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 追加 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼★
// 時計コンテナがクリックされたときの処理
if (clockContainer) {
    clockContainer.addEventListener('click', () => {
        currentFontIndex = (currentFontIndex + 1) % fontStyles.length;
        applyClockStyle(fontStyles[currentFontIndex]);
    });
}
// ★▲▲▲▲▲▲▲▲▲▲▲▲▲ 追加 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲★


// --- シミュレーション開始処理 ---
console.log("Loading assets...");
loadAssets().then(images => {
    console.log("Assets loaded successfully!");
    loadedImages = images;
    flock = new Flock(loadedImages);
    populateInfoPanel();

    applyClockStyle(fontStyles[0]);

    animationId = requestAnimationFrame(animate);
}).catch(error => {
    console.error("Could not initialize simulation:", error);
});