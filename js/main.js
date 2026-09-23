const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const keys = {};
const keysJustPressed = {};
const gamepadKeys = {};
const gamepadKeysJustPressed = {};
const assets = { player: {}, audio: {} };

const gamepadState = { left: false, right: false, up: false, down: false, jump: false, attackSide: false, attackUp: false, shield: false, pause: false, confirm: false };
const gamepadPrev = {};
const GAMEPAD_DEADZONE = 0.15;

let gameState = createGameState();
let player;
let enemies = [];
let currentPhase;
let item = null;
let barrier = null;
let explosionTimer = 0;
let explosionActive = false;
let currentPhaseNum = 1;
let boss = null;
let projectiles = [];
let gameTime = 0;
let menuOption = 0;
let testMode = false;
let showHitboxes = false;
let phaseFadeIn = 0;
let phaseFadeInActive = false;
let victorySlideY = CANVAS_HEIGHT + 100;
let victorySlideActive = false;
let confetti = [];
let confettiActive = false;
let settingsOption = 0;
let settingsMenuOptions = ['Teclado', 'Controle', 'Áudio', 'Voltar'];
let settingsSubmenu = null;
let settingsSubmenuOptions = ['Música do Menu', 'Música do Jogo', 'Efeitos Sonoros', 'Volume da Música', 'Volume dos Efeitos', 'Voltar'];
let settingsControllerInfo = [
    { label: 'Controle', action: 'A (Bola)', desc: 'Pular / Confirmar' },
    { label: 'Controle', action: 'B (Xis)', desc: 'Atacar Lado' },
    { label: 'Controle', action: 'X (PlayStation)', desc: 'Atacar Cima' },
    { label: 'Controle', action: 'Y (Triângulo)', desc: 'Escudo' },
    { label: 'Controle', action: 'D-Pad / Analógico', desc: 'Mover / Navegar' },
    { label: 'Controle', action: 'Start', desc: 'Pausar' },
    { label: 'Controle', action: 'B (Xis)', desc: 'Voltar' },
];
let controlsOption = 0;
let controlsActions = ['moveLeft', 'moveRight', 'jump', 'attackUp', 'attackSide', 'shield'];
let controlsLabels = ['Mover Esquerda', 'Mover Direita', 'Pular', 'Atacar Cima', 'Atacar Lado', 'Escudo'];
let rebindingAction = null;
let rebindingMessage = '';
let settingsOpenedFromPause = false;

const TICK_MS = 1000 / 132;
const MAX_TICKS_PER_FRAME = 10;
let tickAccumulator = 0;
let lastTickTimestamp = 0;

const extraction = {
    active: false,
    completed: false,
    animTime: 0,
    completeTime: 0,
    shimmerPos: 0,
    showPopup: false,
    popupTime: 0,
    fadeOut: false,
    fadeAlpha: 0
};

const usbIntro = {
    phase: 'moving',
    pendriveX: CANVAS_WIDTH + 50,
    pendriveY: CANVAS_HEIGHT / 2 + 30,
    targetX: CANVAS_WIDTH / 2 + 160,
    targetY: CANVAS_HEIGHT / 2 + 30,
    speed: 350,
    loadingProgress: 0,
    loadingSpeed: 0.4,
    startTime: 0,
    minimumTime: 3000,
    lastTimestamp: 0,
    started: false
};

const binaryRain = {
    columns: [],
    lastTime: 0,
    initialized: false,
    fontSize: 14,
    chars: ['0', '1'],
    color: 'rgba(0, 255, 0, 0.3)',
    brightColor: 'rgba(0, 255, 0, 0.6)',

    init() {
        if (this.initialized) return;
        this.columns = [];
        const numColumns = Math.floor(CANVAS_WIDTH / (this.fontSize * 1.2));
        for (let i = 0; i < numColumns; i++) {
            this.columns.push({
                x: i * (this.fontSize * 1.2) + this.fontSize * 0.6,
                y: Math.random() * CANVAS_HEIGHT,
                speed: 30 + Math.random() * 50,
                chars: [],
                length: 5 + Math.floor(Math.random() * 15),
                nextCharTime: 0
            });
            for (let j = 0; j < this.columns[i].length; j++) {
                this.columns[i].chars.push({
                    char: this.chars[Math.floor(Math.random() * this.chars.length)],
                    brightness: Math.random()
                });
            }
        }
        this.initialized = true;
    },

    reset() {
        this.initialized = false;
        this.columns = [];
    },

    update(deltaTime) {
        for (const col of this.columns) {
            col.y += col.speed * deltaTime;
            if (col.y > CANVAS_HEIGHT + col.length * this.fontSize) {
                col.y = -col.length * this.fontSize;
                col.speed = 30 + Math.random() * 50;
                for (let j = 0; j < col.length; j++) {
                    col.chars[j] = {
                        char: this.chars[Math.floor(Math.random() * this.chars.length)],
                        brightness: Math.random()
                    };
                }
            }
        }
    },

    draw(ctx) {
        ctx.font = this.fontSize + 'px Courier New';
        for (const col of this.columns) {
            for (let j = 0; j < col.chars.length; j++) {
                const y = col.y + j * this.fontSize;
                if (y < -this.fontSize || y > CANVAS_HEIGHT) continue;
                const charData = col.chars[j];
                if (j === 0) {
                    ctx.fillStyle = this.brightColor;
                } else {
                    const alpha = 0.3 - (j / col.length) * 0.25;
                    ctx.fillStyle = `rgba(0, 255, 0, ${Math.max(0.05, alpha)})`;
                }
                ctx.fillText(charData.char, col.x, y);
            }
        }
    }
};

const bossIntro = {
    active: false,
    phase: 0,
    portraitX: 0,
    portraitTargetX: 0,
    overlayAlpha: 0,
    dialogueName: '',
    dialogueText: '',
    waitingForEnter: false,
    charIndex: 0,
    charTimer: 0,
    charSpeed: 0.07
};

function initBossIntro() {
    bossIntro.active = true;
    bossIntro.phase = 0;
    bossIntro.portraitX = CANVAS_WIDTH + 300;
    bossIntro.portraitTargetX = CANVAS_WIDTH - 320;
    bossIntro.overlayAlpha = 0;
    bossIntro.dialogueName = '';
    bossIntro.dialogueText = '';
    bossIntro.waitingForEnter = false;
    bossIntro.charIndex = 0;
    bossIntro.charTimer = 0;
}

function updateBossIntro(deltaTime) {
    if (!bossIntro.active) return;

    if (bossIntro.dialogueText && bossIntro.charIndex < bossIntro.dialogueText.length) {
        bossIntro.charTimer += deltaTime;
        while (bossIntro.charTimer >= bossIntro.charSpeed && bossIntro.charIndex < bossIntro.dialogueText.length) {
            bossIntro.charTimer -= bossIntro.charSpeed;
            bossIntro.charIndex++;
        }
        if (bossIntro.charIndex >= bossIntro.dialogueText.length) {
            bossIntro.waitingForEnter = true;
        }
    }

    const fadeSpeed = 2.5;

    switch (bossIntro.phase) {
        case 0: {
            bossIntro.portraitX += (bossIntro.portraitTargetX - bossIntro.portraitX) * (1 - Math.pow(0.005, deltaTime));
            bossIntro.overlayAlpha = Math.min(1, bossIntro.overlayAlpha + fadeSpeed * deltaTime);
            if (Math.abs(bossIntro.portraitX - bossIntro.portraitTargetX) < 2) {
                bossIntro.portraitX = bossIntro.portraitTargetX;
                bossIntro.overlayAlpha = 1;
                bossIntro.phase = 1;
                bossIntro.dialogueName = 'BIOS';
                bossIntro.dialogueText = 'Voce nao chegará a raiz do sistema,\nvou destruir voce antes';
                bossIntro.charIndex = 0;
                bossIntro.charTimer = 0;
                bossIntro.waitingForEnter = false;
            }
            break;
        }
        case 1: {
            if (bossIntro.charIndex >= bossIntro.dialogueText.length && !bossIntro.waitingForEnter) {
                bossIntro.phase = 2;
                bossIntro.portraitTargetX = CANVAS_WIDTH + 300;
                bossIntro.dialogueName = '';
                bossIntro.dialogueText = '';
            }
            break;
        }
        case 2: {
            bossIntro.portraitX += (bossIntro.portraitTargetX - bossIntro.portraitX) * (1 - Math.pow(0.005, deltaTime));
            if (Math.abs(bossIntro.portraitX - bossIntro.portraitTargetX) < 2) {
                bossIntro.portraitX = -300;
                bossIntro.portraitTargetX = 60;
                bossIntro.phase = 3;
            }
            break;
        }
        case 3: {
            bossIntro.portraitX += (bossIntro.portraitTargetX - bossIntro.portraitX) * (1 - Math.pow(0.005, deltaTime));
            if (Math.abs(bossIntro.portraitX - bossIntro.portraitTargetX) < 2) {
                bossIntro.portraitX = bossIntro.portraitTargetX;
                bossIntro.phase = 4;
                bossIntro.dialogueName = 'PENDRIVE';
                bossIntro.dialogueText = '0101010101011000101010101';
                bossIntro.charIndex = 0;
                bossIntro.charTimer = 0;
                bossIntro.waitingForEnter = false;
            }
            break;
        }
        case 4: {
            if (bossIntro.charIndex >= bossIntro.dialogueText.length && !bossIntro.waitingForEnter) {
                bossIntro.phase = 5;
                bossIntro.portraitTargetX = -300;
                bossIntro.dialogueName = '';
                bossIntro.dialogueText = '';
            }
            break;
        }
        case 5: {
            bossIntro.portraitX += (bossIntro.portraitTargetX - bossIntro.portraitX) * (1 - Math.pow(0.005, deltaTime));
            if (Math.abs(bossIntro.portraitX - bossIntro.portraitTargetX) < 2) {
                bossIntro.portraitX = CANVAS_WIDTH + 300;
                bossIntro.portraitTargetX = CANVAS_WIDTH - 320;
                bossIntro.phase = 6;
            }
            break;
        }
        case 6: {
            bossIntro.portraitX += (bossIntro.portraitTargetX - bossIntro.portraitX) * (1 - Math.pow(0.005, deltaTime));
            if (Math.abs(bossIntro.portraitX - bossIntro.portraitTargetX) < 2) {
                bossIntro.portraitX = bossIntro.portraitTargetX;
                bossIntro.phase = 7;
                bossIntro.dialogueName = 'BIOS';
                bossIntro.dialogueText = 'Insolente, voce será apagado';
                bossIntro.charIndex = 0;
                bossIntro.charTimer = 0;
                bossIntro.waitingForEnter = false;
            }
            break;
        }
        case 7: {
            if (bossIntro.charIndex >= bossIntro.dialogueText.length && !bossIntro.waitingForEnter) {
                bossIntro.phase = 8;
                bossIntro.portraitTargetX = CANVAS_WIDTH + 300;
                bossIntro.dialogueName = '';
                bossIntro.dialogueText = '';
            }
            break;
        }
        case 8: {
            bossIntro.portraitX += (bossIntro.portraitTargetX - bossIntro.portraitX) * (1 - Math.pow(0.005, deltaTime));
            bossIntro.overlayAlpha = Math.max(0, bossIntro.overlayAlpha - fadeSpeed * deltaTime);
            if (Math.abs(bossIntro.portraitX - bossIntro.portraitTargetX) < 2 && bossIntro.overlayAlpha <= 0) {
                bossIntro.overlayAlpha = 0;
                bossIntro.active = false;
                gameState.current = GameStates.PLAYING;
                if (assets.sfx && assets.sfx.bossChat) { assets.sfx.bossChat.pause(); assets.sfx.bossChat.currentTime = 0; }
                if (assets.sfx && assets.sfx.playerChat) { assets.sfx.playerChat.pause(); assets.sfx.playerChat.currentTime = 0; }
            }
            break;
        }
    }

    const isTyping = bossIntro.dialogueText && bossIntro.charIndex < bossIntro.dialogueText.length;
    const bossChat = assets.sfx && assets.sfx.bossChat;
    const playerChat = assets.sfx && assets.sfx.playerChat;

    if (isTyping && gameSettings.sfxOn) {
        if (bossIntro.dialogueName === 'BIOS') {
            if (playerChat) { playerChat.pause(); playerChat.currentTime = 0; }
            if (bossChat && bossChat.paused) { bossChat.volume = Math.min(1, gameSettings.sfxVolume * 1.5); bossChat.play().catch(() => {}); }
        } else if (bossIntro.dialogueName === 'PENDRIVE') {
            if (bossChat) { bossChat.pause(); bossChat.currentTime = 0; }
            if (playerChat && playerChat.paused) { playerChat.volume = Math.min(1, gameSettings.sfxVolume * 2); playerChat.play().catch(() => {}); }
        }
    } else {
        if (bossChat && !bossChat.paused) { bossChat.pause(); bossChat.currentTime = 0; }
        if (playerChat && !playerChat.paused) { playerChat.pause(); playerChat.currentTime = 0; }
    }
}

function advanceBossIntro() {
    if (!bossIntro.active) return;
    if (bossIntro.dialogueText && bossIntro.charIndex < bossIntro.dialogueText.length) {
        bossIntro.charIndex = bossIntro.dialogueText.length;
        bossIntro.waitingForEnter = true;
        playSfx('select');
    } else if (bossIntro.waitingForEnter) {
        bossIntro.waitingForEnter = false;
        playSfx('select');
    }
}

function renderBossIntroPortrait() {
    if (!bossIntro.active) return;

    const isBios = bossIntro.phase === 0 || bossIntro.phase === 1 || bossIntro.phase === 2 ||
                   bossIntro.phase === 6 || bossIntro.phase === 7 || bossIntro.phase === 8;
    const isPendrive = bossIntro.phase === 3 || bossIntro.phase === 4 || bossIntro.phase === 5;

    const portraitSize = 300;
    const portraitY = (CANVAS_HEIGHT / 2) - (portraitSize / 2) - 40;

    if (isBios && assets.bossIdle) {
        const facingLeft = bossIntro.portraitX < CANVAS_WIDTH / 2;
        ctx.save();
        if (!facingLeft) {
            ctx.translate(bossIntro.portraitX + portraitSize, portraitY);
            ctx.scale(-1, 1);
            ctx.drawImage(assets.bossIdle, 0, 0, portraitSize, portraitSize);
        } else {
            ctx.drawImage(assets.bossIdle, bossIntro.portraitX, portraitY, portraitSize, portraitSize);
        }
        ctx.restore();
    } else if (isPendrive && assets.pendriveUp) {
        const pendrivePortraitY = CANVAS_HEIGHT - 150 - portraitSize * 0.75;
        ctx.drawImage(assets.pendriveUp, bossIntro.portraitX, pendrivePortraitY, portraitSize, portraitSize);
    }

    if (bossIntro.dialogueName) {
        const boxH = 130;
        const boxY = CANVAS_HEIGHT - boxH - 20;
        const boxX = 30;
        const boxW = CANVAS_WIDTH - 60;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        const nameColor = bossIntro.dialogueName === 'BIOS' ? '#e74c3c' : '#3498db';
        ctx.strokeStyle = nameColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = nameColor;
        ctx.font = 'bold 16px Courier New';
        ctx.fillText(bossIntro.dialogueName, boxX + 16, boxY + 24);

        ctx.fillStyle = '#cccccc';
        ctx.fillRect(boxX + 16, boxY + 32, 120, 2);

        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Courier New';
        const visibleText = bossIntro.dialogueText.substring(0, bossIntro.charIndex);
        const lines = visibleText.split('\n');
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], boxX + 16, boxY + 60 + i * 24);
        }

        if (bossIntro.waitingForEnter) {
            const blink = Math.floor(Date.now() / 500) % 2 === 0;
            if (blink) {
                ctx.fillStyle = '#888888';
                ctx.font = '14px Courier New';
                ctx.fillText('ENTER \u25B6', boxX + boxW - 100, boxY + boxH - 16);
            }
        }
    }
}

const antivirusScanner = {
    waveLength: 200,
    waveHeight: 24,
    waveSpacing: 100,
    speed: 120,
    pixelSize: 8,
    tilt: 2,
    lastTime: 0
};

function drawAntivirusScanner() {
    const s = antivirusScanner;
    const now = performance.now() / 1000;
    if (s.lastTime === 0) s.lastTime = now;
    const dt = now - s.lastTime;
    s.lastTime = now;

    const xOff = (s._xOff || 0) + s.speed * dt;
    s._xOff = xOff % (s.waveSpacing * 10);

    const ps = s.pixelSize;
    const cols = Math.ceil(CANVAS_WIDTH / ps) + 1;
    const rows = Math.ceil(CANVAS_HEIGHT / ps) + 1;
    const halfLen = s.waveLength / 2;
    const halfH = s.waveHeight / 2;

    for (let row = 0; row < rows; row++) {
        const py = row * ps;
        const centerY = py + ps / 2;
        const colOffset = Math.round((centerY % s.waveSpacing) / s.waveSpacing * s.waveSpacing);

        for (let col = 0; col < cols; col++) {
            const px = col * ps;
            const centerX = px + ps / 2 - s._xOff;

            const shiftedX = centerX - colOffset;

            const inWaveBand = shiftedX % s.waveSpacing;
            if (inWaveBand < -halfLen - s.waveSpacing || inWaveBand > halfLen + s.waveSpacing) continue;

            const localX = inWaveBand;
            if (localX < -halfLen || localX > halfLen) continue;

            const localY = ((centerY - s.waveSpacing / 2) % s.waveSpacing + s.waveSpacing) % s.waveSpacing - s.waveSpacing / 2;

            const tiltShift = localX / halfLen * s.tilt * halfH;
            const distFromCenter = Math.abs(localY - tiltShift);

            if (distFromCenter > halfH) continue;

            const fadeX = 1 - (Math.abs(localX) / halfLen);
            const fadeY = 1 - (distFromCenter / halfH);
            const intensity = fadeX * fadeY;
            const smoothIntensity = intensity * intensity * (3 - 2 * intensity);

            if (smoothIntensity < 0.03) continue;

            const alpha = smoothIntensity * 0.3;
            ctx.fillStyle = `rgba(255, 120, 0, ${alpha})`;
            ctx.fillRect(px, py, ps, ps);
        }
    }
}

function renderHitboxes() {
    if (!showHitboxes) return;

    ctx.save();
    ctx.globalAlpha = 0.5;

    if (player && player.hp > 0) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.width, player.height);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const ehb = getEnemyHitbox(enemy);
        const isB = enemy.isBoss;
        ctx.strokeStyle = isB ? '#ff00ff' : '#ff4444';
        ctx.lineWidth = isB ? 3 : 2;
        ctx.strokeRect(ehb.x, ehb.y, ehb.width, ehb.height);
        ctx.fillStyle = isB ? 'rgba(255, 0, 255, 0.15)' : 'rgba(255, 68, 68, 0.15)';
        ctx.fillRect(ehb.x, ehb.y, ehb.width, ehb.height);
    }

    for (const p of projectiles) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
    }

    if (player && player.attackTimer > 0) {
        const hitbox = getAttackHitbox(player, player.facingRight, player.attackDirection);
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
        ctx.fillStyle = 'rgba(255, 136, 0, 0.25)';
        ctx.fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    }

    if (item && currentPhase && !currentPhase.itemCollected && !currentPhase.cursorCollected && !currentPhase.deleteCollected) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x, item.y, item.width, item.height);
    }

    ctx.restore();
}

const WAVE_CONFIGS = [
    [
        { x: 200, y: CANVAS_HEIGHT - 88, type: 'boss_robot', flying: false },
        { x: 400, y: CANVAS_HEIGHT - 88, type: 'boss_robot', flying: false },
        { x: 600, y: CANVAS_HEIGHT - 88, type: 'boss_robot', flying: false }
    ],
    [
        { x: 150, y: 300, type: 'boss_robot', flying: true },
        { x: 500, y: 320, type: 'boss_robot', flying: true },
        { x: 700, y: CANVAS_HEIGHT - 88, type: 'boss_robot', flying: false }
    ],
    [
        { x: 200, y: CANVAS_HEIGHT - 88, type: 'boss_robot', flying: false },
        { x: 400, y: 280, type: 'boss_robot', flying: true, shoots: true },
        { x: 650, y: 300, type: 'boss_robot', flying: true, shoots: true }
    ],
    [
        { x: 150, y: CANVAS_HEIGHT - 88, type: 'boss_robot', flying: false },
        { x: 350, y: CANVAS_HEIGHT - 88, type: 'boss_robot', flying: false, shoots: true },
        { x: 500, y: 300, type: 'boss_robot', flying: true },
        { x: 750, y: 280, type: 'boss_robot', flying: true, shoots: true }
    ]
];

function fadeOutAudio(audio, duration, callback) {
    if (!audio) { if (callback) callback(); return; }
    const startVolume = audio.volume;
    const step = startVolume / (duration / 16);
    const interval = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - step);
        if (audio.volume <= 0) {
            clearInterval(interval);
            audio.pause();
            audio.volume = startVolume;
            audio.currentTime = 0;
            if (callback) callback();
        }
    }, 16);
}

function restoreMenuMusic() {
    if (assets.audio.phase && !assets.audio.phase.paused) {
        assets.audio.phase.pause();
        assets.audio.phase.currentTime = 0;
    }
    if (assets.audio.boss && !assets.audio.boss.paused) {
        assets.audio.boss.pause();
        assets.audio.boss.currentTime = 0;
    }
    if (assets.audio.menu && gameSettings.menuMusicOn) {
        assets.audio.menu.loop = true;
        assets.audio.menu.volume = gameSettings.musicVolume;
        assets.audio.menu.currentTime = 0;
        assets.audio.menu.play();
    }
}

function loadPhase(phaseNum, freshStart = false) {
    currentPhaseNum = phaseNum;
    antivirusScanner.lastTime = 0;
    antivirusScanner._xOff = 0;

    if (assets.audio.menu) {
        assets.audio.menu.pause();
        assets.audio.menu.currentTime = 0;
    }

    if (phaseNum === 1) {
        if (assets.audio.phase && gameSettings.gameMusicOn) {
            assets.audio.phase.loop = true;
            assets.audio.phase.volume = 0;
            assets.audio.phase.currentTime = 0;
            assets.audio.phase.play();
        }
        if (assets.audio.boss) {
            assets.audio.boss.pause();
            assets.audio.boss.currentTime = 0;
        }
        phaseFadeIn = 0;
        phaseFadeInActive = true;
        extraction.active = true;
        extraction.completed = false;
        extraction.animTime = 0;
        extraction.completeTime = 0;
        extraction.shimmerPos = 0;
    } else if (phaseNum === 2) {
        if (assets.audio.phase && assets.audio.phase.paused && gameSettings.gameMusicOn) {
            assets.audio.phase.loop = true;
            assets.audio.phase.volume = gameSettings.musicVolume;
            assets.audio.phase.play();
        }
        if (assets.audio.boss) {
            assets.audio.boss.pause();
            assets.audio.boss.currentTime = 0;
        }
    } else if (phaseNum === 3) {
        if (assets.audio.phase && !assets.audio.phase.paused) {
            fadeOutAudio(assets.audio.phase, 1000, () => {
                if (assets.audio.boss && gameSettings.gameMusicOn) {
                    assets.audio.boss.loop = true;
                    assets.audio.boss.volume = gameSettings.musicVolume;
                    assets.audio.boss.currentTime = 0;
                    assets.audio.boss.play();
                }
            });
        } else {
            if (assets.audio.boss && gameSettings.gameMusicOn) {
                assets.audio.boss.loop = true;
                assets.audio.boss.volume = gameSettings.musicVolume;
                assets.audio.boss.currentTime = 0;
                assets.audio.boss.play();
            }
        }
    }

    if (phaseNum === 1) {
        currentPhase = createPhase1();
    } else if (phaseNum === 2) {
        currentPhase = createPhase2();
    } else if (phaseNum === 3) {
        currentPhase = createPhase3();
    }

    const prevHp = (freshStart || !player || player.hp <= 0) ? DIFFICULTY_MODIFIERS[gameSettings.difficulty].playerLives : player.hp;
    player = createPlayer(currentPhase.playerStart.x, currentPhase.playerStart.y);
    player.hp = prevHp;

    enemies = getEnemies(currentPhase);
    barrier = getBarrier(currentPhase);
    item = null;
    explosionActive = false;
    explosionTimer = 0;
    boss = null;
    projectiles = [];

    for (const e of enemies) {
        if (e.isBoss) {
            boss = e;
            break;
        }
    }

    if (currentPhaseNum === 3) {
        spawnWave(0);
        if (boss) {
            boss.y = 20;
            boss.floating = true;
            boss.shootTimer = 0;
            boss.shotsFired = 0;
            boss.pauseTimer = 0;
        }
    }
}

async function loadAsset(path, placeholder) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(placeholder);
    });
}

function createPlaceholder(width, height, color) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const cx = c.getContext('2d');
    cx.fillStyle = color;
    cx.fillRect(0, 0, width, height);
    return c;
}

async function loadAssets() {
    assets.playerImage = await loadAsset('assets/player/player.png', null);
    assets.pendriveUp = await loadAsset('assets/player/pendriveup.png', null);
    assets.logo = await loadAsset('assets/ui/logo.png', null);
    assets.pc1 = await loadAsset('assets/items/phase1/pc1.png', null);
    assets.bgPhase2 = await loadAsset('assets/backgrounds/phase2/back2.png', null);
    assets.winerror = await loadAsset('assets/ui/error.png', null);
    assets.pendrive = await loadAsset('assets/player/pendrive.png', null);
    assets.notebook = await loadAsset('assets/ui/note.png', null);
    assets.bgPhase1 = await loadAsset('assets/backgrounds/phase1/back1.png', null);
    assets.extracao = await loadAsset('assets/backgrounds/phase1/extracao.png', null);
    assets.bossIdle = await loadAsset('assets/enemies/boss/boss_idle.png', null);
    assets.bossDeath = await loadAsset('assets/enemies/boss/boss_death.png', null);
    assets.cursorImage = await loadAsset('assets/items/phase2/cursor.png', null);
    assets.enemyGround = await loadAsset('assets/enemies/firewall.png', null);
    assets.enemyFlying = await loadAsset('assets/enemies/criptografia.png', null);
    assets.enemyFlyingShooter = await loadAsset('assets/enemies/antivirus.png', null);
    assets.projectileGreen = await loadAsset('assets/enemies/projectile_green.png', null);
    assets.projectileRed = await loadAsset('assets/enemies/projectile_red.png', null);
    assets.timeIcon = await loadAsset('assets/ui/time.png', null);
    assets.cmdIcon = await loadAsset('assets/enemies/cmd.png', null);
    
    const sfx = {};
    const sfxFiles = {
        enemyDamage: 'enemy_damage.mp3',
        enemyDeath: 'enemy_death.wav',
        explosion: 'explosion.mp3',
        erro: 'erro.mp3',
        beep: 'beep.mp3',
        fall: 'fall.wav',
        jump: 'jump.mp3',
        life: 'life.mp3',
        multipleShot: 'multiple_shot.mp3',
        navigate: 'navigate.wav',
        playerDamage: 'player_damage.wav',
        playerDeath: 'player_death.mp3',
        select: 'select.wav',
        singleShoot: 'single_shoot.wav',
        win: 'win.wav',
        export2: 'export2.mp3',
        click: 'click.mp3'
    };
    for (const [key, file] of Object.entries(sfxFiles)) {
        try {
            sfx[key] = new Audio('assets/effects/SFX/' + file);
        } catch (e) {
            sfx[key] = null;
        }
    }

    try {
        assets.audio.menu = new Audio('assets/audio/menusound.mp3');
        assets.audio.phase = new Audio('assets/audio/phase.wav');
        assets.audio.boss = new Audio('assets/audio/boss.mp3');
    } catch (e) {
        assets.audio.menu = null;
        assets.audio.phase = null;
        assets.audio.boss = null;
    }
    assets.sfx = sfx;

    assets.sfx.bossChat = new Audio('assets/effects/SFX/bosschat.wav');
    assets.sfx.bossChat.loop = true;
    assets.sfx.playerChat = new Audio('assets/effects/SFX/playerchat.wav');
    assets.sfx.playerChat.loop = true;
}

let audioStarted = false;

function playSfx(name) {
    if (!gameSettings.sfxOn) return;
    try {
        const sfx = assets.sfx && assets.sfx[name];
        if (sfx) {
            sfx.volume = gameSettings.sfxVolume;
            sfx.currentTime = 0;
            sfx.play();
        }
    } catch (e) {}
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        if (gameState.current === GameStates.BOOT && gameState.bootReady && e.key === 'Enter') {
            gameState.bootSlideY = 0;
            if (!audioStarted && assets.audio.menu && gameSettings.menuMusicOn) {
                assets.audio.menu.loop = true;
                assets.audio.menu.volume = gameSettings.musicVolume;
                assets.audio.menu.currentTime = 0;
                assets.audio.menu.play();
                audioStarted = true;
            }
        }
        if (gameState.current === GameStates.INTRO_BOSS && e.key === 'Enter') {
            advanceBossIntro();
        }
        if (e.key === 'h' || e.key === 'H') {
            showHitboxes = !showHitboxes;
        }
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (!keys[key]) {
            keysJustPressed[key] = true;
        }
        keys[key] = true;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        if (gameState.current === GameStates.MENU) {
            if (e.key === 'ArrowUp') {
                menuOption = (menuOption - 1 + 4) % 4;
                playSfx('navigate');
            } else if (e.key === 'ArrowDown') {
                menuOption = (menuOption + 1) % 4;
                playSfx('navigate');
            } else if (e.key === 'Enter') {
                playSfx('select');
                if (menuOption === 0) {
                    testMode = false;
                    startUsbIntro();
                } else if (menuOption === 1) {
                    const idx = DIFFICULTY_LEVELS.indexOf(gameSettings.difficulty);
                    gameSettings.difficulty = DIFFICULTY_LEVELS[(idx + 1) % DIFFICULTY_LEVELS.length];
                    saveSettings(gameSettings);
                } else if (menuOption === 2) {
                    settingsOpenedFromPause = false;
                    gameState.current = GameStates.SETTINGS;
                    settingsOption = 0;
                } else if (menuOption === 3) {
                    testMode = true;
                    startUsbIntro();
                }
            }
        } else if (gameState.current === GameStates.SETTINGS) {
            if (settingsSubmenu === 'sound') {
                if (e.key === 'ArrowUp') {
                    settingsOption = (settingsOption - 1 + settingsSubmenuOptions.length) % settingsSubmenuOptions.length;
                    playSfx('navigate');
                } else if (e.key === 'ArrowDown') {
                    settingsOption = (settingsOption + 1) % settingsSubmenuOptions.length;
                    playSfx('navigate');
                } else if (e.key === 'ArrowLeft') {
                    if (settingsOption === 3) {
                        gameSettings.musicVolume = Math.max(0, gameSettings.musicVolume - 0.1);
                        if (assets.audio.menu) assets.audio.menu.volume = gameSettings.musicVolume;
                        if (assets.audio.phase && !assets.audio.phase.paused) assets.audio.phase.volume = gameSettings.musicVolume;
                        if (assets.audio.boss && !assets.audio.boss.paused) assets.audio.boss.volume = gameSettings.musicVolume;
                        saveSettings(gameSettings);
                    } else if (settingsOption === 4) {
                        gameSettings.sfxVolume = Math.max(0, gameSettings.sfxVolume - 0.1);
                        saveSettings(gameSettings);
                    }
                } else if (e.key === 'ArrowRight') {
                    if (settingsOption === 3) {
                        gameSettings.musicVolume = Math.min(1, gameSettings.musicVolume + 0.1);
                        if (assets.audio.menu) assets.audio.menu.volume = gameSettings.musicVolume;
                        if (assets.audio.phase && !assets.audio.phase.paused) assets.audio.phase.volume = gameSettings.musicVolume;
                        if (assets.audio.boss && !assets.audio.boss.paused) assets.audio.boss.volume = gameSettings.musicVolume;
                        saveSettings(gameSettings);
                    } else if (settingsOption === 4) {
                        gameSettings.sfxVolume = Math.min(1, gameSettings.sfxVolume + 0.1);
                        saveSettings(gameSettings);
                    }
                } else if (e.key === 'Enter') {
                    playSfx('select');
                    if (settingsOption === 0) {
                        gameSettings.menuMusicOn = !gameSettings.menuMusicOn;
                        if (gameSettings.menuMusicOn) {
                            if (assets.audio.menu && assets.audio.menu.paused) {
                                assets.audio.menu.loop = true;
                                assets.audio.menu.volume = gameSettings.musicVolume;
                                assets.audio.menu.play();
                            }
                        } else {
                            if (assets.audio.menu && !assets.audio.menu.paused) {
                                assets.audio.menu.pause();
                            }
                        }
                        saveSettings(gameSettings);
                    } else if (settingsOption === 1) {
                        gameSettings.gameMusicOn = !gameSettings.gameMusicOn;
                        if (!gameSettings.gameMusicOn) {
                            if (assets.audio.phase && !assets.audio.phase.paused) assets.audio.phase.pause();
                            if (assets.audio.boss && !assets.audio.boss.paused) assets.audio.boss.pause();
                        } else {
                            if (gameState.current === GameStates.PLAYING || gameState.current === GameStates.PAUSED) {
                                if (currentPhaseNum === 3) {
                                    if (assets.audio.boss) { assets.audio.boss.loop = true; assets.audio.boss.volume = gameSettings.musicVolume; assets.audio.boss.play(); }
                                } else {
                                    if (assets.audio.phase) { assets.audio.phase.loop = true; assets.audio.phase.volume = gameSettings.musicVolume; assets.audio.phase.play(); }
                                }
                            }
                        }
                        saveSettings(gameSettings);
                    } else if (settingsOption === 2) {
                        gameSettings.sfxOn = !gameSettings.sfxOn;
                        saveSettings(gameSettings);
                    } else if (settingsOption === 5) {
                        settingsSubmenu = null;
                        settingsOption = 2;
                    }
                } else if (e.key === 'Escape' || e.key === 'l') {
                    settingsSubmenu = null;
                    settingsOption = 2;
                }
            } else if (settingsSubmenu === 'controller') {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Escape' || e.key === 'l') {
                    settingsSubmenu = null;
                    settingsOption = 1;
                }
            } else {
                if (e.key === 'ArrowUp') {
                    settingsOption = (settingsOption - 1 + settingsMenuOptions.length) % settingsMenuOptions.length;
                    playSfx('navigate');
                } else if (e.key === 'ArrowDown') {
                    settingsOption = (settingsOption + 1) % settingsMenuOptions.length;
                    playSfx('navigate');
                } else if (e.key === 'Enter') {
                    playSfx('select');
                    if (settingsOption === 0) {
                        gameState.current = GameStates.CONTROLS;
                        controlsOption = 0;
                        rebindingAction = null;
                    } else if (settingsOption === 1) {
                        settingsSubmenu = 'controller';
                        settingsOption = 0;
                    } else if (settingsOption === 2) {
                        settingsSubmenu = 'sound';
                        settingsOption = 0;
                    } else if (settingsOption === 3) {
                        settingsSubmenu = null;
                        if (settingsOpenedFromPause) {
                            settingsOpenedFromPause = false;
                            gameState.current = GameStates.PAUSED;
                        } else {
                            settingsOpenedFromPause = false;
                            gameState.current = GameStates.MENU;
                            menuOption = 1;
                        }
                    }
                } else if (e.key === 'Escape' || e.key === 'l') {
                    settingsSubmenu = null;
                    if (settingsOpenedFromPause) {
                        settingsOpenedFromPause = false;
                        gameState.current = GameStates.PAUSED;
                    } else {
                        settingsOpenedFromPause = false;
                        gameState.current = GameStates.MENU;
                        menuOption = 1;
                    }
                }
            }
        } else if (gameState.current === GameStates.CONTROLS) {
            if (rebindingAction) {
                if (e.key === 'Escape' || e.key === 'l') {
                    rebindingAction = null;
                    rebindingMessage = '';
                } else {
                    const normalizedKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
                    if (!isKeyUsed(rebindingAction, normalizedKey)) {
                        gameSettings.controls[rebindingAction] = normalizedKey;
                        saveSettings(gameSettings);
                        rebindingAction = null;
                        rebindingMessage = '';
                    } else {
                        rebindingMessage = 'Tecla ja em uso!';
                    }
                }
            } else {
                if (e.key === 'ArrowUp') {
                    controlsOption = (controlsOption - 1 + controlsActions.length + 2) % (controlsActions.length + 2);
                    playSfx('navigate');
                } else if (e.key === 'ArrowDown') {
                    controlsOption = (controlsOption + 1) % (controlsActions.length + 2);
                    playSfx('navigate');
                } else if (e.key === 'Enter') {
                    playSfx('select');
                    if (controlsOption < controlsActions.length) {
                        rebindingAction = controlsActions[controlsOption];
                        rebindingMessage = 'Pressione uma tecla...';
                    } else if (controlsOption === controlsActions.length) {
                        gameSettings.controls = { ...DEFAULT_CONTROLS };
                        saveSettings(gameSettings);
                    } else {
                        gameState.current = GameStates.SETTINGS;
                        settingsOption = 0;
                    }
                } else if (e.key === 'Escape' || e.key === 'l') {
                    gameState.current = GameStates.SETTINGS;
                    settingsOption = 0;
                }
            }
        } else if (gameState.current === GameStates.PLAYING) {
            if (e.key === 'Escape') {
                gameState.current = GameStates.PAUSED;
                gameState.pauseMenuOption = 0;
            }
        } else if (gameState.current === GameStates.PAUSED) {
            if (e.key === 'Escape') {
                gameState.current = GameStates.PLAYING;
            } else if (e.key === 'ArrowUp') {
                gameState.pauseMenuOption = (gameState.pauseMenuOption - 1 + 4) % 4;
                playSfx('navigate');
            } else if (e.key === 'ArrowDown') {
                gameState.pauseMenuOption = (gameState.pauseMenuOption + 1) % 4;
                playSfx('navigate');
            } else if (e.key === 'Enter') {
                playSfx('select');
                if (gameState.pauseMenuOption === 0) {
                    gameState.current = GameStates.PLAYING;
                } else if (gameState.pauseMenuOption === 1) {
                    gameState.current = GameStates.PLAYING;
                    loadPhase(currentPhaseNum);
                } else if (gameState.pauseMenuOption === 2) {
                    gameState.current = GameStates.MENU;
                    menuOption = 0;
                    restoreMenuMusic();
                } else if (gameState.pauseMenuOption === 3) {
                    settingsOpenedFromPause = true;
                    gameState.current = GameStates.SETTINGS;
                    settingsOption = 0;
                }
            }
        } else if (gameState.current === GameStates.GAME_OVER) {
            if (e.key === 'Enter') {
                playSfx('select');
                gameState.current = GameStates.MENU;
                menuOption = 0;
                restoreMenuMusic();
            }
        } else if (gameState.current === GameStates.VICTORY) {
            if (e.key === 'Enter') {
                playSfx('select');
                gameState.current = GameStates.MENU;
                menuOption = 0;
                restoreMenuMusic();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        keys[key] = false;
    });

    window.addEventListener('blur', () => {
        Object.keys(keys).forEach(key => keys[key] = false);
    });
}

function getGamepad() {
    try {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let standard = null;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i] && gamepads[i].mapping === 'standard') {
                standard = gamepads[i];
            }
        }
        if (standard) return standard;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) return gamepads[i];
        }
    } catch (e) {}
    return null;
}

function readGamepadState() {
    const gp = getGamepad();
    if (!gp) {
        gamepadState.left = false;
        gamepadState.right = false;
        gamepadState.up = false;
        gamepadState.down = false;
        gamepadState.jump = false;
        gamepadState.attackSide = false;
        gamepadState.attackUp = false;
        gamepadState.shield = false;
        gamepadState.pause = false;
        gamepadState.confirm = false;
        return;
    }

    const axX = gp.axes[0] || 0;
    const axY = gp.axes[1] || 0;
    const b = gp.buttons || [];

    gamepadState.left = (axX < -GAMEPAD_DEADZONE) || (b[14] && b[14].pressed);
    gamepadState.right = (axX > GAMEPAD_DEADZONE) || (b[15] && b[15].pressed);
    gamepadState.up = (axY < -GAMEPAD_DEADZONE) || (b[12] && b[12].pressed);
    gamepadState.down = (axY > GAMEPAD_DEADZONE) || (b[13] && b[13].pressed);
    gamepadState.jump = b[0] && b[0].pressed;
    gamepadState.attackSide = b[1] && b[1].pressed;
    gamepadState.attackUp = b[2] && b[2].pressed;
    gamepadState.shield = b[3] && b[3].pressed;
    gamepadState.pause = b[9] && b[9].pressed;
    gamepadState.confirm = b[0] && b[0].pressed;
}

function processGamepadInput() {
    readGamepadState();

    const gpKeyMap = { 'a': gamepadState.left, 'd': gamepadState.right, ' ': gamepadState.jump, 'k': gamepadState.attackUp, 'l': gamepadState.attackSide, 's': gamepadState.shield };
    for (const [key, pressed] of Object.entries(gpKeyMap)) {
        if (pressed) {
            if (!gamepadKeys[key]) gamepadKeysJustPressed[key] = true;
            gamepadKeys[key] = true;
        } else {
            gamepadKeys[key] = false;
        }
    }

    const gpMenuMap = { 'ArrowUp': gamepadState.up, 'ArrowDown': gamepadState.down, 'ArrowLeft': gamepadState.left, 'ArrowRight': gamepadState.right, 'Enter': gamepadState.confirm, 'l': gamepadState.attackSide };
    for (const [key, pressed] of Object.entries(gpMenuMap)) {
        if (pressed && !gamepadPrev[key]) {
            handleMenuInput(key);
        }
        gamepadPrev[key] = pressed;
    }

    if (gamepadState.pause && !gamepadPrev._pause) {
        if (gameState.current === GameStates.PLAYING) {
            gameState.current = GameStates.PAUSED;
            gameState.pauseMenuOption = 0;
        } else if (gameState.current === GameStates.PAUSED) {
            gameState.current = GameStates.PLAYING;
        }
    }
    gamepadPrev._pause = gamepadState.pause;
}

function getMergedKeys() {
    const merged = {};
    for (const key of new Set([...Object.keys(keys), ...Object.keys(gamepadKeys)])) {
        merged[key] = keys[key] || gamepadKeys[key];
    }
    return merged;
}

function getMergedKeysJustPressed() {
    const merged = {};
    for (const key of new Set([...Object.keys(keysJustPressed), ...Object.keys(gamepadKeysJustPressed)])) {
        merged[key] = keysJustPressed[key] || gamepadKeysJustPressed[key];
    }
    return merged;
}

function handleMenuInput(key) {
    if (gameState.current === GameStates.MENU) {
        if (key === 'ArrowUp') {
            menuOption = (menuOption - 1 + 4) % 4;
            playSfx('navigate');
        } else if (key === 'ArrowDown') {
            menuOption = (menuOption + 1) % 4;
            playSfx('navigate');
        } else if (key === 'Enter') {
            playSfx('select');
            if (menuOption === 0) {
                testMode = false;
                startUsbIntro();
            } else if (menuOption === 1) {
                const idx = DIFFICULTY_LEVELS.indexOf(gameSettings.difficulty);
                gameSettings.difficulty = DIFFICULTY_LEVELS[(idx + 1) % DIFFICULTY_LEVELS.length];
                saveSettings(gameSettings);
            } else if (menuOption === 2) {
                settingsOpenedFromPause = false;
                gameState.current = GameStates.SETTINGS;
                settingsOption = 0;
            } else if (menuOption === 3) {
                testMode = true;
                startUsbIntro();
            }
        }
    } else if (gameState.current === GameStates.SETTINGS) {
        if (settingsSubmenu === 'sound') {
            if (key === 'ArrowUp') {
                settingsOption = (settingsOption - 1 + settingsSubmenuOptions.length) % settingsSubmenuOptions.length;
                playSfx('navigate');
            } else if (key === 'ArrowDown') {
                settingsOption = (settingsOption + 1) % settingsSubmenuOptions.length;
                playSfx('navigate');
            } else if (key === 'ArrowLeft') {
                if (settingsOption === 3) {
                    gameSettings.musicVolume = Math.max(0, gameSettings.musicVolume - 0.1);
                    if (assets.audio.menu) assets.audio.menu.volume = gameSettings.musicVolume;
                    if (assets.audio.phase && !assets.audio.phase.paused) assets.audio.phase.volume = gameSettings.musicVolume;
                    if (assets.audio.boss && !assets.audio.boss.paused) assets.audio.boss.volume = gameSettings.musicVolume;
                    saveSettings(gameSettings);
                } else if (settingsOption === 4) {
                    gameSettings.sfxVolume = Math.max(0, gameSettings.sfxVolume - 0.1);
                    saveSettings(gameSettings);
                }
            } else if (key === 'ArrowRight') {
                if (settingsOption === 3) {
                    gameSettings.musicVolume = Math.min(1, gameSettings.musicVolume + 0.1);
                    if (assets.audio.menu) assets.audio.menu.volume = gameSettings.musicVolume;
                    if (assets.audio.phase && !assets.audio.phase.paused) assets.audio.phase.volume = gameSettings.musicVolume;
                    if (assets.audio.boss && !assets.audio.boss.paused) assets.audio.boss.volume = gameSettings.musicVolume;
                    saveSettings(gameSettings);
                } else if (settingsOption === 4) {
                    gameSettings.sfxVolume = Math.min(1, gameSettings.sfxVolume + 0.1);
                    saveSettings(gameSettings);
                }
            } else if (key === 'Enter') {
                playSfx('select');
                if (settingsOption === 0) {
                    gameSettings.menuMusicOn = !gameSettings.menuMusicOn;
                    if (gameSettings.menuMusicOn) {
                        if (assets.audio.menu && assets.audio.menu.paused) {
                            assets.audio.menu.loop = true;
                            assets.audio.menu.volume = gameSettings.musicVolume;
                            assets.audio.menu.play();
                        }
                    } else {
                        if (assets.audio.menu && !assets.audio.menu.paused) assets.audio.menu.pause();
                    }
                    saveSettings(gameSettings);
                } else if (settingsOption === 1) {
                    gameSettings.gameMusicOn = !gameSettings.gameMusicOn;
                    if (gameSettings.gameMusicOn) {
                        if (assets.audio.phase && assets.audio.phase.paused && gameState.current === GameStates.PLAYING) {
                            assets.audio.phase.volume = gameSettings.musicVolume;
                            assets.audio.phase.play();
                        }
                    } else {
                        if (assets.audio.phase && !assets.audio.phase.paused) assets.audio.phase.pause();
                        if (assets.audio.boss && !assets.audio.boss.paused) assets.audio.boss.pause();
                    }
                    saveSettings(gameSettings);
                } else if (settingsOption === 2) {
                    gameSettings.sfxOn = !gameSettings.sfxOn;
                    saveSettings(gameSettings);
                } else if (settingsOption === 5) {
                    settingsSubmenu = null;
                    settingsOption = 2;
                }
            } else if (key === 'Escape' || key === 'l') {
                settingsSubmenu = null;
                settingsOption = 2;
            }
        } else if (settingsSubmenu === 'controller') {
            if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'Escape' || key === 'l') {
                settingsSubmenu = null;
                settingsOption = 1;
            }
        } else {
            if (key === 'ArrowUp') {
                settingsOption = (settingsOption - 1 + settingsMenuOptions.length) % settingsMenuOptions.length;
                playSfx('navigate');
            } else if (key === 'ArrowDown') {
                settingsOption = (settingsOption + 1) % settingsMenuOptions.length;
                playSfx('navigate');
            } else if (key === 'Enter') {
                playSfx('select');
                if (settingsOption === 0) {
                    gameState.current = GameStates.CONTROLS;
                    controlsOption = 0;
                    rebindingAction = null;
                } else if (settingsOption === 1) {
                    settingsSubmenu = 'controller';
                    settingsOption = 0;
                } else if (settingsOption === 2) {
                    settingsSubmenu = 'sound';
                    settingsOption = 0;
                } else if (settingsOption === 3) {
                    settingsSubmenu = null;
                    if (settingsOpenedFromPause) {
                        settingsOpenedFromPause = false;
                        gameState.current = GameStates.PAUSED;
                    } else {
                        settingsOpenedFromPause = false;
                        gameState.current = GameStates.MENU;
                        menuOption = 1;
                    }
                }
            } else if (key === 'Escape' || key === 'l') {
                settingsSubmenu = null;
                if (settingsOpenedFromPause) {
                    settingsOpenedFromPause = false;
                    gameState.current = GameStates.PAUSED;
                } else {
                    settingsOpenedFromPause = false;
                    gameState.current = GameStates.MENU;
                    menuOption = 1;
                }
            }
        }
    } else if (gameState.current === GameStates.CONTROLS) {
        if (!rebindingAction) {
            if (key === 'ArrowUp') {
                controlsOption = (controlsOption - 1 + controlsActions.length + 2) % (controlsActions.length + 2);
                playSfx('navigate');
            } else if (key === 'ArrowDown') {
                controlsOption = (controlsOption + 1) % (controlsActions.length + 2);
                playSfx('navigate');
            } else if (key === 'Enter') {
                playSfx('select');
                if (controlsOption < controlsActions.length) {
                    rebindingAction = controlsActions[controlsOption];
                    rebindingMessage = 'Pressione uma tecla...';
                } else if (controlsOption === controlsActions.length) {
                    gameSettings.controls = { ...DEFAULT_CONTROLS };
                    saveSettings(gameSettings);
                } else {
                    gameState.current = GameStates.SETTINGS;
                    settingsOption = 0;
                }
            } else if (key === 'Escape' || key === 'l') {
                gameState.current = GameStates.SETTINGS;
                settingsOption = 0;
            }
        }
    } else if (gameState.current === GameStates.PAUSED) {
        if (key === 'ArrowUp') {
            gameState.pauseMenuOption = (gameState.pauseMenuOption - 1 + 4) % 4;
            playSfx('navigate');
        } else if (key === 'ArrowDown') {
            gameState.pauseMenuOption = (gameState.pauseMenuOption + 1) % 4;
            playSfx('navigate');
        } else if (key === 'Enter') {
            playSfx('select');
            if (gameState.pauseMenuOption === 0) {
                gameState.current = GameStates.PLAYING;
            } else if (gameState.pauseMenuOption === 1) {
                gameState.current = GameStates.PLAYING;
                loadPhase(currentPhaseNum);
            } else if (gameState.pauseMenuOption === 2) {
                gameState.current = GameStates.MENU;
                menuOption = 0;
                restoreMenuMusic();
            } else if (gameState.pauseMenuOption === 3) {
                settingsOpenedFromPause = true;
                gameState.current = GameStates.SETTINGS;
                settingsOption = 0;
            }
        }
    } else if (gameState.current === GameStates.GAME_OVER) {
        if (key === 'Enter') {
            playSfx('select');
            gameState.current = GameStates.MENU;
            menuOption = 0;
            restoreMenuMusic();
        }
    } else if (gameState.current === GameStates.VICTORY) {
        if (key === 'Enter') {
            playSfx('select');
            gameState.current = GameStates.MENU;
            menuOption = 0;
            restoreMenuMusic();
        }
    } else if (gameState.current === GameStates.BOOT && gameState.bootReady) {
        if (key === 'Enter') {
            gameState.bootSlideY = 0;
            if (!audioStarted && assets.audio.menu && gameSettings.menuMusicOn) {
                assets.audio.menu.loop = true;
                assets.audio.menu.volume = gameSettings.musicVolume;
                assets.audio.menu.currentTime = 0;
                assets.audio.menu.play();
                audioStarted = true;
            }
        }
    } else if (gameState.current === GameStates.INTRO_BOSS) {
        if (key === 'Enter') {
            advanceBossIntro();
        }
    }
}

function spawnWave(waveIndex) {
    if (waveIndex >= WAVE_CONFIGS.length) return;

    if (waveIndex > 0 && player.hp < player.maxHp) {
        player.hp++;
        playSfx('life');
    }

    const wave = WAVE_CONFIGS[waveIndex];
    for (const config of wave) {
        const robot = createEnemy(config.x, config.y, 'boss_robot');
        robot.flying = config.flying || false;
        robot.shoots = config.shoots || false;
        robot.shootTimer = 0;
        robot.shotsFired = 0;
        robot.pauseTimer = 0;
        robot.shotsPerBurst = config.shoots ? 2 : 3;
        enemies.push(robot);
    }
    currentPhase.currentWave = waveIndex;
}

function checkAttackCollisions() {
    if (player.attackTimer <= 0 || player.attackTimer > player.attackDuration - 2) return;

    const hitbox = getAttackHitbox(player, player.facingRight, player.attackDirection);

    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (player.attackHitEnemies.includes(enemy)) continue;
        const ehb = getEnemyHitbox(enemy);
        if (aabbCollision(hitbox, ehb)) {
            player.attackHitEnemies.push(enemy);
            const dir = player.facingRight ? 1 : -1;
            if (enemy.isBoss) {
                if (currentPhaseNum === 3 && currentPhase.locks <= 0) {
                    enemy.hp -= 1;
                    if (enemy.hp <= 0) {
                        enemy.deathAnimTimer = 60;
                        enemy.alive = false;
                        currentPhase.bossDefeated = true;
                        playSfx('enemyDeath');
                        currentPhase.item = {
                            x: boss.x + boss.width / 2 - 20,
                            y: CANVAS_HEIGHT - 64 - 30,
                            width: 40,
                            height: 30,
                            color: '#e74c3c',
                            label: 'Delete System32'
                        };
                        item = currentPhase.item;
                    }
                }
            } else {
                const killed = damageEnemy(enemy, 1, dir);
                if (killed) {
                    gameState.score += enemy.score;
                    gameState.totalEnemiesDefeated++;
                }
            }
        }
    }
}

function checkEnemyCollisions() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (enemy.shoots) continue;
        const ehb = getEnemyHitbox(enemy);
        if (aabbCollision(player, ehb)) {
            const dir = player.x < enemy.x ? -1 : 1;

            if (player.defending) {
                enemy.x += dir * 30;
                enemy.vx = dir * 5;
                enemy.slowTimer = 60;
            } else {
                damagePlayer(player, dir, testMode);
                if (enemy.flying && !enemy.shoots) {
                    enemy.retreatTimer = 90;
                }
            }
        }
    }
}

function checkBarrierCollision() {
    if (!barrier || currentPhase.barrierUnlocked) return false;
    return aabbCollision(player, barrier);
}

function checkItemCollision() {
    if (!item || currentPhase.itemCollected) return false;
    return aabbCollision(player, item);
}

function spawnItem() {
    if (currentPhaseNum === 3) return;
    if (currentPhase.item.spawnAfterDefeat && !currentPhase.enemiesDefeated) {
        const allDefeated = enemies.every(e => !e.alive || e.isBoss);
        if (allDefeated) {
            currentPhase.enemiesDefeated = true;
            item = getItem(currentPhase);
        }
    }
}

function checkWaveComplete() {
    if (currentPhaseNum !== 3) return;
    if (currentPhase.locks <= 0) return;

    const robots = enemies.filter(e => !e.isBoss);
    const allDead = robots.every(e => !e.alive);

    if (allDead && robots.length > 0) {
        currentPhase.locks--;
        if (currentPhase.locks <= 0) {
            boss.floating = false;
            boss.vy = 2;
            boss.hp = 20;
            boss.maxHp = 20;
        } else {
            const nextWave = currentPhase.currentWave + 1;
            if (nextWave < WAVE_CONFIGS.length) {
                spawnWave(nextWave);
            }
        }
    }
}

function collectItem() {
    if (checkItemCollision()) {
        if (currentPhaseNum === 1) {
            currentPhase.itemCollected = true;
            currentPhase.showTransition = true;
            currentPhase.transitionTimer = 120;
            explosionActive = true;
            explosionTimer = 60;
            playSfx('explosion');
            item = null;
        } else if (currentPhaseNum === 2) {
            currentPhase.cursorCollected = true;
            currentPhase.sequenceActive = true;
            currentPhase.cursorX = 100;
            currentPhase.cursorY = 250;
            currentPhase.cursorTargetX = 560;
            currentPhase.cursorTargetY = 335;
            currentPhase.cursorAnimating = true;
            currentPhase.antivirusShowMessage = true;
            currentPhase.antivirusMessageTimer = 0;
            currentPhase.antivirusClicked = false;
            currentPhase.clickDelay = 0;
            item = null;
        } else if (currentPhaseNum === 3) {
            currentPhase.deleteCollected = true;
            currentPhase.deleteX = item.x;
            currentPhase.deleteY = item.y;
            currentPhase.deleteTargetX = boss.x + boss.width / 2;
            currentPhase.deleteTargetY = boss.y + boss.height / 2;
            currentPhase.deleteAnimating = true;
            item = null;
        }
    }
}

function updateCursorAnimation() {
    if (!currentPhase.cursorAnimating) return;

    const dx = currentPhase.cursorTargetX - currentPhase.cursorX;
    const dy = currentPhase.cursorTargetY - currentPhase.cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 200;

    if (dist > 5) {
        const step = Math.min(speed * (1 / 60), dist);
        currentPhase.cursorX += (dx / dist) * step;
        currentPhase.cursorY += (dy / dist) * step;
    } else {
        currentPhase.cursorX = currentPhase.cursorTargetX;
        currentPhase.cursorY = currentPhase.cursorTargetY;
        currentPhase.cursorAnimating = false;
        currentPhase.clickDelay = 60;
    }
}

function updateAntivirusMessage() {
    if (!currentPhase.antivirusShowMessage) return;

    if (currentPhase.cursorAnimating) return;

    if (currentPhase.clickDelay > 0) {
        currentPhase.clickDelay--;
        if (currentPhase.clickDelay <= 0) {
            currentPhase.antivirusClicked = true;
            currentPhase.antivirusMessageTimer = 90;
            playSfx('click');
        }
        return;
    }

    currentPhase.antivirusMessageTimer--;

    if (currentPhase.antivirusMessageTimer <= 0) {
        currentPhase.antivirusShowMessage = false;
        currentPhase.sequenceActive = false;
        gameState.current = GameStates.TRANSITION;
        gameState.transitioning = true;
        gameState.transitionPhase = currentPhaseNum + 1;
    }
}

function updateDeleteAnimation() {
    if (!currentPhase.deleteAnimating) return;

    const dx = currentPhase.deleteTargetX - currentPhase.deleteX;
    const dy = currentPhase.deleteTargetY - currentPhase.deleteY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
        currentPhase.deleteX += dx * 0.04;
        currentPhase.deleteY += dy * 0.04;
    } else {
        currentPhase.deleteAnimating = false;
        currentPhase.glitchActive = true;
        currentPhase.glitchAudioStarted = false;
    }
}

function updateGlitch() {
    if (!currentPhase.glitchActive) return;

    if (!currentPhase.glitchAudioStarted) {
        currentPhase.glitchAudioStarted = true;
        if (assets.audio.boss && !assets.audio.boss.paused) {
            assets.audio.boss.pause();
            assets.audio.boss.currentTime = 0;
        }
        const beepAudio = assets.sfx && assets.sfx.beep;
        if (beepAudio) {
            beepAudio.currentTime = 0;
            beepAudio.play();
            currentPhase.glitchDuration = beepAudio.duration || 5;
        } else {
            currentPhase.glitchDuration = 5;
        }
        currentPhase.glitchStartTime = Date.now();
    }

    const elapsed = (Date.now() - currentPhase.glitchStartTime) / 1000;
    if (elapsed >= currentPhase.glitchDuration) {
        currentPhase.glitchActive = false;
        currentPhase.glitchAudioStarted = false;
        currentPhase.winerrorPhase = true;
        currentPhase.winerrorStartTime = Date.now();
        const erroAudio = assets.sfx && assets.sfx.erro;
        if (erroAudio) {
            erroAudio.currentTime = 0;
            erroAudio.play();
            currentPhase.winerrorDuration = erroAudio.duration || 3;
        } else {
            currentPhase.winerrorDuration = 3;
        }
    }
}

function updateWinerror() {
    if (!currentPhase.winerrorPhase) return;

    const elapsed = (Date.now() - currentPhase.winerrorStartTime) / 1000;
    if (elapsed >= currentPhase.winerrorDuration) {
        currentPhase.winerrorPhase = false;
        currentPhase.missionComplete = true;
    }
}

function updateTransition() {
    if (currentPhase.showTransition) {
        currentPhase.transitionTimer--;
        if (currentPhaseNum === 1 && currentPhase.transitionTimer <= 60) {
            currentPhase.barrierUnlocked = true;
        }
        if (currentPhase.transitionTimer <= 0) {
            currentPhase.showTransition = false;
        }
    }
}

function updateBoss() {
    if (currentPhaseNum !== 3 || !boss || !boss.alive) return;

    if (boss.floating) {
        return;
    }

    if (!boss.isVulnerable) {
        boss.vy += 0.5;
        boss.y += boss.vy;

        if (boss.y + boss.height > CANVAS_HEIGHT - 44) {
            boss.y = CANVAS_HEIGHT - 44 - boss.height;
            boss.vy = 0;
            boss.grounded = true;
            boss.isVulnerable = true;
            boss.shootTimer = 0;
            boss.shotsFired = 0;
            boss.burstCount = 0;
            boss.rageTimer = 0;
            boss.blinkTimer = 0;
            playSfx('fall');
        }
        return;
    }

    if (boss.rageTimer > 0) {
        boss.rageTimer--;
        if (boss.rageTimer <= 0) {
            boss.burstCount = 0;
            boss.shotsFired = 0;
            boss.shootTimer = 0;
            boss.blinkTimer = 60;
        }
        return;
    }

    if (boss.blinkTimer > 0) {
        boss.blinkTimer--;
        const dx = player.x - boss.x;
        const dist = Math.abs(dx);
        if (dist > 100) {
            const speed = 2;
            if (dx > 0) {
                boss.x += speed;
            } else {
                boss.x -= speed;
            }
        }
        if (boss.x < 0) boss.x = 0;
        if (boss.x + boss.width > CANVAS_WIDTH) boss.x = CANVAS_WIDTH - boss.width;
        return;
    }

    if (!boss.bossMoveDir) boss.bossMoveDir = Math.random() > 0.5 ? 1 : -1;

    boss.x += boss.bossMoveDir * 0.5;

    if (boss.x <= 0) {
        boss.x = 0;
        boss.bossMoveDir = 1;
    } else if (boss.x + boss.width >= CANVAS_WIDTH) {
        boss.x = CANVAS_WIDTH - boss.width;
        boss.bossMoveDir = -1;
    }

    boss.shootTimer++;

    if (boss.shotsFired < 4) {
        if (boss.shootTimer >= 15) {
            boss.shootTimer = 0;
            boss.shotsFired++;

            const dx = player.x + player.width / 2 - (boss.x + boss.width / 2);
            const dy = player.y + player.height / 2 - (boss.y + boss.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 2.7 * DIFFICULTY_MODIFIERS[gameSettings.difficulty].projectileSpeed;
            const vx = dist > 0 ? (dx / dist) * speed : 0;
            const vy = dist > 0 ? (dy / dist) * speed : 0;

            projectiles.push({
                x: boss.x + boss.width / 2,
                y: boss.y + boss.height / 2,
                vx: vx,
                vy: vy,
                width: 10,
                height: 10,
                color: '#e74c3c',
                type: 'boss'
            });
            playSfx('multipleShot');
        }
    } else {
        if (boss.shootTimer >= 180) {
            boss.shootTimer = 0;
            boss.shotsFired = 0;
            boss.burstCount++;

            if (boss.burstCount >= 5) {
                boss.rageTimer = 300;
                boss.burstCount = 0;
            }
        }
    }
}

function updateBossDeath() {
    if (!boss || boss.alive) return;
    if (boss.deathAnimTimer > 0) {
        boss.deathAnimTimer--;
        boss.x -= 0.5;
        if (boss.deathAnimTimer <= 0) {
            boss.deathAnimTimer = 0;
        }
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (aabbCollision(p, player)) {
            damagePlayer(player, p.vx > 0 ? -1 : 1, testMode);
            projectiles.splice(i, 1);
            continue;
        }

        if (p.x < 0 || p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT) {
            projectiles.splice(i, 1);
        }
    }
}

function updateRobotShooting() {
    for (const enemy of enemies) {
        if (!enemy.alive || enemy.isBoss || !enemy.shoots) continue;

        if (enemy.pauseTimer > 0) {
            enemy.pauseTimer--;
            continue;
        }

        enemy.shootTimer++;
        if (enemy.shootTimer >= 20) {
            enemy.shootTimer = 0;
            enemy.shotsFired++;

            const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
            const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 3 * DIFFICULTY_MODIFIERS[gameSettings.difficulty].projectileSpeed;
            const vx = dist > 0 ? (dx / dist) * speed : 0;
            const vy = dist > 0 ? (dy / dist) * speed : 0;

            projectiles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: vx,
                vy: vy,
                width: 8,
                height: 8,
                color: '#f39c12',
                type: 'shooter'
            });
            playSfx('multipleShot');
            if (enemy.shotsFired >= enemy.shotsPerBurst) {
                enemy.shotsFired = 0;
                enemy.pauseTimer = 300;
            }
        }
    }
}

function update() {
    if (!isPlaying(gameState)) return;

    if (player.hp <= 0) {
        gameState.current = GameStates.GAME_OVER;
        if (assets.audio.phase && !assets.audio.phase.paused) {
            assets.audio.phase.pause();
            assets.audio.phase.currentTime = 0;
        }
        if (assets.audio.boss && !assets.audio.boss.paused) {
            assets.audio.boss.pause();
            assets.audio.boss.currentTime = 0;
        }
        return;
    }

    const seqActive = currentPhase && currentPhase.sequenceActive;

    if (!seqActive) {
        updatePlayer(player, getMergedKeys(), getMergedKeysJustPressed(), getPlatforms(currentPhase), CANVAS_WIDTH);

        for (const enemy of enemies) {
            updateEnemy(enemy, player, getPlatforms(currentPhase), enemies, currentPhase);
        }

        checkAttackCollisions();
        checkEnemyCollisions();
    }

    spawnItem();
    collectItem();
    updateCursorAnimation();
    updateAntivirusMessage();
    updateDeleteAnimation();
    updateBossDeath();
    updateGlitch();
    updateWinerror();
    updateTransition();

    if (checkBarrierCollision()) {
        player.x = barrier.x - player.width;
        if (player.vx > 0) player.vx = 0;
    }

    updateRobotShooting();
    updateProjectiles();

    if (currentPhaseNum === 1 && extraction.active && !extraction.completed) {
        const aliveEnemies = enemies.filter(e => e.alive);
        if (aliveEnemies.length === 0) {
            extraction.completed = true;
            extraction.completeTime = performance.now();
            extraction.showPopup = true;
            extraction.popupTime = performance.now();
            item = null;
        }
    }

    if (currentPhaseNum === 1 && extraction.showPopup) {
        const popupElapsed = performance.now() - extraction.popupTime;
        if (popupElapsed >= 2000 && !extraction.fadeOut) {
            extraction.fadeOut = true;
            extraction.fadeAlpha = 0;
        }
        if (extraction.fadeOut) {
            extraction.fadeAlpha += 0.02;
            if (extraction.fadeAlpha >= 1) {
                extraction.showPopup = false;
                extraction.fadeOut = false;
                gameState.current = GameStates.TRANSITION;
                gameState.transitioning = true;
                gameState.transitionPhase = 2;
            }
        }
    }

    if (currentPhaseNum === 3) {
        updateBoss();
        checkWaveComplete();

        if (currentPhase.missionComplete) {
            gameState.current = GameStates.VICTORY;
            victorySlideY = CANVAS_HEIGHT + 100;
            victorySlideActive = true;
            confettiActive = false;
            confetti = [];
            playSfx('win');
            if (assets.audio.boss && !assets.audio.boss.paused) {
                assets.audio.boss.pause();
                assets.audio.boss.currentTime = 0;
            }
        }
    }

    enemies = enemies.filter(e => e.alive || e.deathTimer < 15);

    Object.keys(keysJustPressed).forEach(key => keysJustPressed[key] = false);
    Object.keys(gamepadKeysJustPressed).forEach(key => gamepadKeysJustPressed[key] = false);
}

function renderPhase1() {
    if (explosionActive && explosionTimer > 0) {
        const alpha = explosionTimer / 60;
        const size = 80 * (1 - alpha) + 40;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(barrier.x + barrier.width / 2, barrier.y + barrier.height / 2, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(barrier.x + barrier.width / 2, barrier.y + barrier.height / 2, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(barrier.x + barrier.width / 2, barrier.y + barrier.height / 2, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        explosionTimer--;
        if (explosionTimer <= 0) {
            explosionActive = false;
        }
    }

    if (!currentPhase.enemiesDefeated) {
        ctx.fillStyle = '#f1c40f';
        ctx.font = '14px Courier New';
        ctx.fillText('Derrote os inimigos para extrair o arquivo', CANVAS_WIDTH / 2 - 185, 30);
    } else if (!currentPhase.itemCollected) {
        ctx.fillStyle = '#f1c40f';
        ctx.font = '14px Courier New';
        ctx.fillText('>>> Arquivo Extraido com Sucesso <<<', CANVAS_WIDTH / 2 - 150, 30);
    }

    if (currentPhase.showTransition) {
        const alpha = Math.min(1, currentPhase.transitionTimer / 30);
        ctx.fillStyle = 'rgba(0, 0, 0, ' + (alpha * 0.7) + ')';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#2ecc71';
        ctx.font = '24px Courier New';
        ctx.fillText('PHISHING SUCCESSFUL', CANVAS_WIDTH / 2 - 140, CANVAS_HEIGHT / 2 - 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Courier New';
        ctx.fillText('Arquivo executado no sistema...', CANVAS_WIDTH / 2 - 130, CANVAS_HEIGHT / 2 + 20);
    }

    if (currentPhase.barrierUnlocked) {
        const portalX = CANVAS_WIDTH - 80;
        const portalY = CANVAS_HEIGHT - 150;
        const portalRadius = 35;
        ctx.save();
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(portalX, portalY, portalRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        ctx.arc(portalX, portalY, portalRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6c3483';
        ctx.beginPath();
        ctx.arc(portalX, portalY, portalRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Courier New';
        ctx.fillText('PORTAL → FASE 2', portalX - 55, portalY + portalRadius + 20);
    }
}

function renderPhase2() {
    if (currentPhase.enemiesDefeated && !currentPhase.cursorCollected) {
        ctx.fillStyle = '#3498db';
        ctx.font = '14px Courier New';
        ctx.fillText('>>> Colete o Cursor do Mouse <<<', CANVAS_WIDTH / 2 - 130, 30);
    }

    if (currentPhase.antivirusShowMessage) {
        const winX = 300;
        const winY = 170;
        const winW = 400;
        const winH = 210;

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(winX, winY, winW, winH);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(winX, winY, winW, winH);

        ctx.fillStyle = '#333';
        ctx.fillRect(winX, winY, winW, 28);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Courier New';
        ctx.fillText('Aviso de Seguranca', winX + 10, winY + 18);

        ctx.fillStyle = '#c0392b';
        ctx.font = '40px sans-serif';
        ctx.fillText('\u26A0', winX + 20, winY + 80);

        ctx.fillStyle = '#333';
        ctx.font = '14px Courier New';
        ctx.fillText('O sistema impediu a execucao', winX + 70, winY + 65);
        ctx.fillText('deste arquivo.', winX + 70, winY + 85);

        ctx.fillStyle = '#888';
        ctx.font = '11px Courier New';
        ctx.fillText('Arquivo: mouse_driver.exe', winX + 70, winY + 110);

        const cancelX = winX + 100;
        const cancelY = winY + 140;
        const cancelW = 90;
        const cancelH = 32;
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(cancelX, cancelY, cancelW, cancelH);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.strokeRect(cancelX, cancelY, cancelW, cancelH);
        ctx.fillStyle = '#333';
        ctx.font = '12px Courier New';
        ctx.fillText('Cancelar', cancelX + 13, cancelY + 20);

        const execX = winX + 220;
        const execY = winY + 140;
        const execW = 160;
        const execH = 32;
        ctx.fillStyle = currentPhase.antivirusClicked ? '#27ae60' : '#e0e0e0';
        ctx.fillRect(execX, execY, execW, execH);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.strokeRect(execX, execY, execW, execH);
        ctx.fillStyle = currentPhase.antivirusClicked ? '#fff' : '#333';
        ctx.font = '12px Courier New';
        ctx.fillText('Executar mesmo assim', execX + 8, execY + 20);
    }

        if (currentPhase.cursorCollected) {
        const cx = currentPhase.cursorX;
        const cy = currentPhase.cursorY;
        if (assets.cursorImage) {
            ctx.drawImage(assets.cursorImage, cx, cy, 48, 48);
        } else {
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, cy + 16);
            ctx.lineTo(cx + 6, cy + 12);
            ctx.lineTo(cx + 12, cy + 18);
            ctx.lineTo(cx + 14, cy + 16);
            ctx.lineTo(cx + 8, cy + 10);
            ctx.lineTo(cx + 14, cy + 8);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function renderPhase3() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    binaryRain.draw(ctx);

    for (const platform of getPlatforms(currentPhase)) {
        if (platform.color !== 'transparent') {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        }
    }

    if (boss && boss.alive) {
        const isRaging = boss.rageTimer > 0;
        const isBlinking = boss.blinkTimer > 0;
        const blinkVisible = !isBlinking || Math.floor(boss.blinkTimer / 10) % 2 === 0;

        let bossImg = assets.bossIdle;
        if (isRaging) {
            bossImg = assets.bossDeath;
        } else if (isBlinking) {
            bossImg = blinkVisible ? assets.bossDeath : assets.bossIdle;
        }

        if (blinkVisible && bossImg) {
            ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
        } else if (blinkVisible) {
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        }

        if (boss.isVulnerable && boss.maxHp > 0) {
            const barW = boss.width;
            const barH = 10;
            const barX = boss.x;
            const barY = boss.y - 18;
            const radius = 5;
            const hpRatio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, radius);
            ctx.fill();

            if (hpRatio > 0) {
                const fillW = Math.max(radius * 2, barW * hpRatio);
                const hpColor = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
                ctx.fillStyle = hpColor;
                ctx.beginPath();
                ctx.roundRect(barX, barY, fillW, barH, radius);
                ctx.fill();
            }

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, radius);
            ctx.stroke();
        }

        if (!boss.isVulnerable || boss.floating) {
            const lockSize = 20;
            const lockSpacing = 30;
            const startX = boss.x + boss.width / 2 - (currentPhase.locks * lockSpacing) / 2;
            for (let i = 0; i < currentPhase.locks; i++) {
                ctx.fillStyle = '#f39c12';
                ctx.fillRect(startX + i * lockSpacing, boss.y - 30, lockSize, lockSize);
                ctx.fillStyle = '#000000';
                ctx.fillRect(startX + i * lockSpacing + 6, boss.y - 24, 8, 12);
                ctx.fillStyle = '#f39c12';
                ctx.beginPath();
                ctx.arc(startX + i * lockSpacing + 10, boss.y - 20, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            if (boss.floating) {
                ctx.fillStyle = '#f39c12';
                ctx.font = '14px Courier New';
                ctx.fillText('>>> Derrote os robôs para destruir os cadeados! <<<', CANVAS_WIDTH / 2 - 180, 30);
            }
        }

        if (currentPhase.locks <= 0 && boss.isVulnerable) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '14px Courier New';
            ctx.fillText('>>> Boss vulnerável! Ataque-o! <<<', CANVAS_WIDTH / 2 - 140, 30);
        }
    }

    if (boss && !boss.alive && boss.deathAnimTimer > 0) {
        const alpha = boss.deathAnimTimer / 60;
        ctx.globalAlpha = alpha;
        if (assets.bossDeath) {
            ctx.drawImage(assets.bossDeath, boss.x, boss.y, boss.width, boss.height);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        }
        ctx.globalAlpha = 1;
    }

    for (const enemy of enemies) {
        if (enemy.isBoss) continue;
        renderEnemy(ctx, enemy);
    }

    for (const p of projectiles) {
        const img = p.type === 'boss' ? assets.projectileRed : assets.projectileGreen;
        if (img) {
            ctx.drawImage(img, p.x - p.width, p.y - p.height, p.width * 2, p.height * 2);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (item && !currentPhase.itemCollected && !currentPhase.deleteCollected) {
        if (assets.cmdIcon) {
            ctx.drawImage(assets.cmdIcon, item.x, item.y, item.width, item.height);
        } else {
            ctx.fillStyle = item.color;
            ctx.fillRect(item.x, item.y, item.width, item.height);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Courier New';
        ctx.fillText(item.label, item.x - 20, item.y - 5);
    }

    if (currentPhase.deleteAnimating) {
        if (assets.cmdIcon) {
            ctx.drawImage(assets.cmdIcon, currentPhase.deleteX, currentPhase.deleteY, 40, 30);
        } else {
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(currentPhase.deleteX, currentPhase.deleteY, 40, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px Courier New';
            ctx.fillText('DEL', currentPhase.deleteX + 10, currentPhase.deleteY + 18);
        }
    }

    if (currentPhase.glitchActive) {
        for (let i = 0; i < 50; i++) {
            const gx = Math.random() * CANVAS_WIDTH;
            const gy = Math.random() * CANVAS_HEIGHT;
            const gw = Math.random() * 200 + 20;
            const gh = Math.random() * 15 + 2;
            ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.6)`;
            ctx.fillRect(gx, gy, gw, gh);
        }
        for (let i = 0; i < 10; i++) {
            const lx = Math.random() * CANVAS_WIDTH;
            const ly = Math.random() * CANVAS_HEIGHT;
            ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.8)`;
            ctx.lineWidth = Math.random() * 4 + 1;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx + Math.random() * 300 - 150, ly + Math.random() * 100 - 50);
            ctx.stroke();
        }
        if (boss && boss.alive) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '20px Courier New';
            ctx.fillText('ERROR', boss.x + 25, boss.y + 50);
        }
    }

    renderPlayer(ctx, player, assets);

    if (currentPhase.winerrorPhase) {
        if (assets.winerror) {
            ctx.drawImage(assets.winerror, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = '#e74c3c';
            ctx.font = '36px Courier New';
            ctx.fillText('ERROR', CANVAS_WIDTH / 2 - 80, CANVAS_HEIGHT / 2);
        }
    }

    if (currentPhase.missionComplete) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#2ecc71';
        ctx.font = '36px Courier New';
        ctx.fillText('MISSION COMPLETED', CANVAS_WIDTH / 2 - 180, CANVAS_HEIGHT / 2 - 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Courier New';
        ctx.fillText('O sistema foi destruído!', CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT / 2 + 20);
        ctx.fillText('Score: ' + gameState.score, CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT / 2 + 60);
    }

    if (bossIntro.active) {
        ctx.fillStyle = `rgba(0, 0, 0, ${bossIntro.overlayAlpha * 0.7})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderBossIntroPortrait();
    }
}

function render() {
    if (currentPhaseNum === 3) {
        renderPhase3();
        renderHitboxes();
    } else {
        if (currentPhaseNum === 1 && assets.bgPhase1) {
            ctx.drawImage(assets.bgPhase1, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else if (currentPhaseNum === 2 && assets.bgPhase2) {
            ctx.drawImage(assets.bgPhase2, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            ctx.fillStyle = currentPhaseNum === 1 ? '#1e3a5f' : '#1a252f';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        if (currentPhaseNum === 2) drawAntivirusScanner();

        if (currentPhaseNum === 1 && !assets.bgPhase1) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(80, 200, 120, 30);
            ctx.fillRect(100, 185, 80, 25);
            ctx.fillRect(60, 210, 60, 20);

            ctx.fillRect(350, 190, 100, 28);
            ctx.fillRect(370, 175, 60, 22);
            ctx.fillRect(330, 200, 50, 18);

            ctx.fillRect(650, 210, 140, 32);
            ctx.fillRect(680, 195, 90, 26);
            ctx.fillRect(630, 220, 70, 22);

            ctx.fillRect(880, 185, 110, 30);
            ctx.fillRect(900, 170, 70, 24);
            ctx.fillRect(860, 195, 55, 20);
        }

        for (const platform of getPlatforms(currentPhase)) {
            if (platform.color !== 'transparent') {
                if (currentPhaseNum === 1 || currentPhaseNum === 2) {
                    const strokeColor = currentPhaseNum === 2 ? '#ff6600' : '#ffffff';
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

                    const time = performance.now() / 1000;
                    const segments = 8;
                    const segmentW = platform.width / segments;
                    for (let i = 0; i < segments; i++) {
                        const phase = (time * 0.3 + i * 0.3) % 1;
                        const brightness = Math.sin(phase * Math.PI) * 0.5 + 0.5;
                        const c = currentPhaseNum === 2
                            ? `rgba(255, 180, 100, ${brightness * 0.8})`
                            : `rgba(255, 255, 255, ${brightness * 0.8})`;
                        ctx.fillStyle = c;
                        ctx.fillRect(platform.x + i * segmentW + 2, platform.y + 2, segmentW - 4, platform.height - 4);
                    }
                } else {
                    ctx.fillStyle = platform.color;
                    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                    if (currentPhaseNum === 2) {
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
                    }
                }
            }
        }

        for (const enemy of enemies) {
            renderEnemy(ctx, enemy);
        }

        if (item && !currentPhase.itemCollected && !currentPhase.cursorCollected) {
            if (currentPhaseNum === 2 && assets.cursorImage) {
                ctx.drawImage(assets.cursorImage, item.x, item.y, item.width * 2, item.height * 2);
            } else {
                ctx.fillStyle = item.color;
                ctx.fillRect(item.x, item.y, item.width, item.height);
            }
            ctx.fillStyle = '#000000';
            ctx.font = '10px Courier New';
            ctx.fillText(item.label, item.x - 10, item.y - 5);
        }

        if (barrier && !currentPhase.barrierUnlocked) {
            if (currentPhaseNum === 1 && assets.pc1) {
                ctx.drawImage(assets.pc1, barrier.x, barrier.y, barrier.width, barrier.height);
            } else {
                ctx.fillStyle = barrier.color;
                ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Courier New';
            ctx.fillText(barrier.label, barrier.x + 5, barrier.y + 20);

            if (currentPhaseNum === 1) {
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(barrier.x + 20, barrier.y + 40, 24, 24);
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px Courier New';
                ctx.fillText('🔒', barrier.x + 22, barrier.y + 58);
            } else if (currentPhaseNum === 2) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px Courier New';
                ctx.fillText('🛡️', barrier.x + 25, barrier.y + 50);
                ctx.fillText('FIREWALL', barrier.x + 10, barrier.y + 80);
                ctx.fillText('ATIVO', barrier.x + 18, barrier.y + 95);
            }
        }

        for (const p of projectiles) {
            const img = p.type === 'boss' ? assets.projectileRed : assets.projectileGreen;
            if (img) {
                ctx.drawImage(img, p.x - p.width, p.y - p.height, p.width * 2, p.height * 2);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.width / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (currentPhaseNum === 1) {
            renderPhase1();
        } else if (currentPhaseNum === 2) {
            renderPhase2();
        }

        renderPlayer(ctx, player, assets);

        renderHitboxes();

        if (gameState.current === GameStates.TRANSITION) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = '#2ecc71';
            ctx.font = '24px Courier New';
            ctx.fillText('FASE ' + currentPhaseNum + ' COMPLETA!', CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT / 2 - 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Courier New';
            ctx.fillText('Preparando Fase ' + (currentPhaseNum + 1) + '...', CANVAS_WIDTH / 2 - 90, CANVAS_HEIGHT / 2 + 20);
        }
    }
}

function renderBootScreen(slideOffset) {
    slideOffset = slideOffset || 0;
    ctx.save();
    ctx.translate(0, -slideOffset);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, y, CANVAS_WIDTH, 2);
    }

    if (Math.random() < 0.03) {
        const glitchY = Math.random() * CANVAS_HEIGHT;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(0, glitchY, CANVAS_WIDTH, 2);
    }

    ctx.fillStyle = '#33ff33';
    ctx.font = '36px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('BREAKING SYSTEMS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

    ctx.fillStyle = '#33ff33';
    ctx.font = '18px Courier New';
    ctx.fillText('INITIALIZING...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

    const totalBlocks = 8;
    const filledBlocks = Math.floor(gameState.bootLoading);
    let loadingBar = '[';
    for (let i = 0; i < totalBlocks; i++) {
        loadingBar += i < filledBlocks ? '■' : '□';
    }
    loadingBar += ']';

    ctx.fillStyle = '#33ff33';
    ctx.font = '20px Courier New';
    ctx.fillText(loadingBar, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);

    if (gameState.bootReady && !gameState.bootSlideY && gameState.bootSlideY !== 0) {
        ctx.fillStyle = '#33ff33';
        ctx.font = '16px Courier New';
        const blink = Math.floor(Date.now() / 500) % 2 === 0;
        if (blink) {
            ctx.fillText('Aperte ENTER para começar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);
        }
    }

    ctx.textAlign = 'left';
    ctx.restore();
}

function startUsbIntro() {
    usbIntro.phase = 'moving';
    usbIntro.pendriveX = CANVAS_WIDTH + 50;
    usbIntro.pendriveY = CANVAS_HEIGHT / 2 + 30;
    usbIntro.loadingProgress = 0;
    usbIntro.startTime = performance.now();
    usbIntro.lastTimestamp = 0;
    usbIntro.started = true;
    extraction.active = false;
    extraction.completed = false;
    extraction.showPopup = false;
    extraction.fadeOut = false;
    gameState.current = GameStates.USB_INSERTION;
}

function updateUsbIntro(timestamp) {
    if (!usbIntro.started) return;

    const deltaTime = usbIntro.lastTimestamp ? (timestamp - usbIntro.lastTimestamp) / 1000 : 0.016;
    usbIntro.lastTimestamp = timestamp;

    if (usbIntro.phase === 'moving') {
        const dx = usbIntro.targetX - usbIntro.pendriveX;
        const dy = usbIntro.targetY - usbIntro.pendriveY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 2) {
            usbIntro.pendriveX += (dx / dist) * usbIntro.speed * deltaTime;
            usbIntro.pendriveY += (dy / dist) * usbIntro.speed * deltaTime;
        } else {
            usbIntro.pendriveX = usbIntro.targetX;
            usbIntro.pendriveY = usbIntro.targetY;
            usbIntro.phase = 'connected';
        }
    } else if (usbIntro.phase === 'connected') {
        usbIntro.loadingProgress = Math.min(1, usbIntro.loadingProgress + usbIntro.loadingSpeed * deltaTime);

        const elapsed = performance.now() - usbIntro.startTime;
        if (usbIntro.loadingProgress >= 1 && elapsed >= usbIntro.minimumTime) {
            usbIntro.started = false;
            resetGameState(gameState);
            gameState.current = GameStates.PLAYING;
            gameTime = 0;
            loadPhase(1, true);
        }
    }
}

function renderUsbIntro() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const noteW = 550;
    const noteH = 400;
    const noteX = CANVAS_WIDTH / 2 - noteW / 2;
    const noteY = CANVAS_HEIGHT / 2 - noteH / 2 - 40;

    if (assets.pendrive) {
        ctx.drawImage(assets.pendrive, usbIntro.pendriveX, usbIntro.pendriveY, 80, 35);
    } else {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(usbIntro.pendriveX, usbIntro.pendriveY, 80, 35);
    }

    if (assets.notebook) {
        ctx.drawImage(assets.notebook, noteX, noteY, noteW, noteH);
    } else {
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(noteX, noteY, noteW, noteH);
    }

    if (usbIntro.phase === 'connected') {
        const barX = CANVAS_WIDTH / 2 - 150;
        const barY = CANVAS_HEIGHT - 80;
        const barW = 300;
        const barH = 25;

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Courier New';
        ctx.fillText('Carregando...', CANVAS_WIDTH / 2 - 60, barY - 15);

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barW, barH);

        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * usbIntro.loadingProgress, barH - 4);

        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);
    }
}

function renderMenu() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (assets.logo) {
        const logoWidth = 500;
        const logoHeight = 300;
        ctx.drawImage(assets.logo, CANVAS_WIDTH / 2 - logoWidth / 2, CANVAS_HEIGHT / 2 - 250, logoWidth, logoHeight);
    } else {
        ctx.fillStyle = '#2ecc71';
        ctx.font = '48px Courier New';
        ctx.fillText('BREAKING SYSTEMS', CANVAS_WIDTH / 2 - 220, CANVAS_HEIGHT / 2 - 100);
    }

    ctx.fillStyle = menuOption === 0 ? '#2ecc71' : '#ffffff';
    ctx.font = '20px Courier New';
    ctx.fillText('▶ START GAME', CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2 + 20);

    const diffColor = gameSettings.difficulty === 'Facil' ? '#2ecc71' : gameSettings.difficulty === 'Dificil' ? '#e74c3c' : gameSettings.difficulty === 'Insano' ? '#6a0dad' : '#f39c12';
    ctx.fillStyle = menuOption === 1 ? '#ffffff' : diffColor;
    ctx.fillText('▶ DIFICULDADE: ' + gameSettings.difficulty.toUpperCase(), CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT / 2 + 60);
    if (menuOption === 1) {
        ctx.fillStyle = diffColor;
        ctx.fillText('▶ DIFICULDADE: ' + gameSettings.difficulty.toUpperCase(), CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT / 2 + 60);
    }

    ctx.fillStyle = menuOption === 2 ? '#2ecc71' : '#ffffff';
    ctx.fillText('▶ CONFIGURAÇÕES', CANVAS_WIDTH / 2 - 85, CANVAS_HEIGHT / 2 + 100);

    ctx.fillStyle = menuOption === 3 ? '#f39c12' : '#ffffff';
    ctx.fillText('▶ TEST (Invencível)', CANVAS_WIDTH / 2 - 90, CANVAS_HEIGHT / 2 + 140);

    ctx.fillStyle = '#666666';
    ctx.font = '14px Courier New';
    ctx.fillText('A/D Mover  |  ESPAÇO Pular  |  L Atacar  |  K Atacar Cima  |  S Escudo', CANVAS_WIDTH / 2 - 280, CANVAS_HEIGHT / 2 + 190);
}

function renderSettings() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#2ecc71';
    ctx.font = '32px Courier New';

    if (settingsSubmenu === 'sound') {
        ctx.fillText('ÁUDIO', CANVAS_WIDTH / 2 - 55, 80);

        const startY = 140;
        const spacing = 55;
        for (let i = 0; i < settingsSubmenuOptions.length; i++) {
            const y = startY + i * spacing;
            const isSelected = settingsOption === i;
            ctx.fillStyle = isSelected ? '#2ecc71' : '#ffffff';
            ctx.font = '18px Courier New';
            let text = settingsSubmenuOptions[i];
            if (i === 0) {
                text += ': ' + (gameSettings.menuMusicOn ? '[ON]' : '[OFF]');
            } else if (i === 1) {
                text += ': ' + (gameSettings.gameMusicOn ? '[ON]' : '[OFF]');
            } else if (i === 2) {
                text += ': ' + (gameSettings.sfxOn ? '[ON]' : '[OFF]');
            } else if (i === 3) {
                const barLen = 20;
                const filled = Math.round(gameSettings.musicVolume * barLen);
                let bar = '[';
                for (let j = 0; j < barLen; j++) bar += j < filled ? '█' : '░';
                bar += '] ' + Math.round(gameSettings.musicVolume * 100) + '%';
                text += ': ' + bar;
            } else if (i === 4) {
                const barLen = 20;
                const filled = Math.round(gameSettings.sfxVolume * barLen);
                let bar = '[';
                for (let j = 0; j < barLen; j++) bar += j < filled ? '█' : '░';
                bar += '] ' + Math.round(gameSettings.sfxVolume * 100) + '%';
                text += ': ' + bar;
            }
            ctx.fillText((isSelected ? '▶ ' : '  ') + text, CANVAS_WIDTH / 2 - 250, y);
        }
        ctx.fillStyle = '#666666';
        ctx.font = '14px Courier New';
        ctx.fillText('← → Ajustar volume  |  ENTER Selecionar  |  ESC Voltar', CANVAS_WIDTH / 2 - 260, CANVAS_HEIGHT - 40);
    } else if (settingsSubmenu === 'controller') {
        ctx.fillText('CONTROLE', CANVAS_WIDTH / 2 - 85, 80);

        const gp = getGamepad();
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '16px Courier New';
        if (gp) {
            const name = gp.id.length > 50 ? gp.id.substring(0, 50) + '...' : gp.id;
            ctx.fillText('Dispositivo: ' + name, CANVAS_WIDTH / 2 - 250, 130);
            ctx.fillStyle = '#2ecc71';
            ctx.fillText('● Conectado', CANVAS_WIDTH / 2 - 250, 155);
        } else {
            ctx.fillText('Dispositivo: Nenhum controle detectado', CANVAS_WIDTH / 2 - 250, 130);
            ctx.fillStyle = '#e74c3c';
            ctx.fillText('○ Desconectado', CANVAS_WIDTH / 2 - 250, 155);
        }

        ctx.fillStyle = '#2ecc71';
        ctx.font = '20px Courier New';
        ctx.fillText('Comandos do Controle:', CANVAS_WIDTH / 2 - 250, 200);

        const startY = 240;
        const spacing = 38;
        for (let i = 0; i < settingsControllerInfo.length; i++) {
            const y = startY + i * spacing;
            ctx.font = '16px Courier New';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(settingsControllerInfo[i].action, CANVAS_WIDTH / 2 - 250, y);
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText('→  ' + settingsControllerInfo[i].desc, CANVAS_WIDTH / 2 + 40, y);
        }

        ctx.fillStyle = '#666666';
        ctx.font = '14px Courier New';
        ctx.fillText('ESC Voltar', CANVAS_WIDTH / 2 - 40, CANVAS_HEIGHT - 40);
    } else {
        ctx.fillText('CONFIGURAÇÕES', CANVAS_WIDTH / 2 - 130, 80);

        const startY = 140;
        const spacing = 55;
        for (let i = 0; i < settingsMenuOptions.length; i++) {
            const y = startY + i * spacing;
            const isSelected = settingsOption === i;
            ctx.fillStyle = isSelected ? '#2ecc71' : '#ffffff';
            ctx.font = '18px Courier New';
            ctx.fillText((isSelected ? '▶ ' : '  ') + settingsMenuOptions[i], CANVAS_WIDTH / 2 - 250, y);
        }
        ctx.fillStyle = '#666666';
        ctx.font = '14px Courier New';
        ctx.fillText('ENTER Selecionar  |  ESC Voltar', CANVAS_WIDTH / 2 - 140, CANVAS_HEIGHT - 40);
    }
}

function renderControls() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#2ecc71';
    ctx.font = '32px Courier New';
    ctx.fillText('CONTROLES', CANVAS_WIDTH / 2 - 80, 80);

    const startY = 140;
    const spacing = 50;

    for (let i = 0; i < controlsActions.length; i++) {
        const y = startY + i * spacing;
        const isSelected = controlsOption === i;
        const action = controlsActions[i];
        const key = gameSettings.controls[action];
        const displayKey = key === ' ' ? 'ESPAÇO' : key.toUpperCase();

        ctx.fillStyle = isSelected ? '#2ecc71' : '#ffffff';
        ctx.font = '18px Courier New';

        if (rebindingAction === action) {
            ctx.fillStyle = '#f39c12';
            ctx.fillText('▶ ' + controlsLabels[i] + ': [ ' + rebindingMessage + ' ]', CANVAS_WIDTH / 2 - 200, y);
        } else {
            ctx.fillText((isSelected ? '▶ ' : '  ') + controlsLabels[i] + ': [ ' + displayKey + ' ]', CANVAS_WIDTH / 2 - 200, y);
        }
    }

    const restoreY = startY + controlsActions.length * spacing;
    ctx.fillStyle = controlsOption === controlsActions.length ? '#f39c12' : '#ffffff';
    ctx.font = '18px Courier New';
    ctx.fillText((controlsOption === controlsActions.length ? '▶ ' : '  ') + 'Restaurar controles padrão', CANVAS_WIDTH / 2 - 150, restoreY);

    const backY = startY + (controlsActions.length + 1) * spacing;
    ctx.fillStyle = controlsOption === controlsActions.length + 1 ? '#f39c12' : '#ffffff';
    ctx.fillText((controlsOption === controlsActions.length + 1 ? '▶ ' : '  ') + 'Voltar', CANVAS_WIDTH / 2 - 150, backY);

    ctx.fillStyle = '#666666';
    ctx.font = '14px Courier New';
    ctx.fillText('ENTER Alterar  |  ESC Voltar', CANVAS_WIDTH / 2 - 130, CANVAS_HEIGHT - 40);
}

function renderGameOver() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#e74c3c';
    ctx.font = '48px Courier New';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2 - 140, CANVAS_HEIGHT / 2 - 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Courier New';
    ctx.fillText('FILE DELETED', CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2 - 30);

    ctx.fillStyle = '#f39c12';
    ctx.font = '18px Courier New';
    ctx.fillText('Score: ' + gameState.score, CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT / 2 + 20);
    ctx.fillText('Inimigos derrotados: ' + gameState.totalEnemiesDefeated, CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT / 2 + 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Courier New';
    ctx.fillText('Pressione ENTER para voltar ao menu', CANVAS_WIDTH / 2 - 180, CANVAS_HEIGHT / 2 + 100);
}

function renderPause() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#f39c12';
    ctx.font = '48px Courier New';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2 - 110, CANVAS_HEIGHT / 2 - 80);

    ctx.fillStyle = gameState.pauseMenuOption === 0 ? '#2ecc71' : '#ffffff';
    ctx.font = '20px Courier New';
    ctx.fillText('▶ CONTINUAR', CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2 - 20);

    ctx.fillStyle = gameState.pauseMenuOption === 1 ? '#2ecc71' : '#ffffff';
    ctx.fillText('▶ REINICIAR', CANVAS_WIDTH / 2 - 65, CANVAS_HEIGHT / 2 + 20);

    ctx.fillStyle = gameState.pauseMenuOption === 2 ? '#2ecc71' : '#ffffff';
    ctx.fillText('▶ SAIR', CANVAS_WIDTH / 2 - 30, CANVAS_HEIGHT / 2 + 60);

    ctx.fillStyle = gameState.pauseMenuOption === 3 ? '#2ecc71' : '#ffffff';
    ctx.fillText('▶ CONFIGURAÇÕES', CANVAS_WIDTH / 2 - 85, CANVAS_HEIGHT / 2 + 100);

    ctx.fillStyle = '#666666';
    ctx.font = '14px Courier New';
    ctx.fillText('↑↓ Navegar  |  ENTER Selecionar  |  ESC Voltar', CANVAS_WIDTH / 2 - 220, CANVAS_HEIGHT / 2 + 150);
}

function renderVictory() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (victorySlideActive) {
        victorySlideY -= 6;
        if (victorySlideY <= CANVAS_HEIGHT / 2 - 80) {
            victorySlideY = CANVAS_HEIGHT / 2 - 80;
            victorySlideActive = false;
            if (!confettiActive) {
                confettiActive = true;
                for (let i = 0; i < 50; i++) {
                    confetti.push({
                        x: Math.random() * CANVAS_WIDTH,
                        y: -10 - Math.random() * 100,
                        vx: (Math.random() - 0.5) * 4,
                        vy: Math.random() * 3 + 2,
                        color: ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6'][Math.floor(Math.random() * 5)],
                        size: Math.random() * 8 + 4,
                        rotation: Math.random() * Math.PI * 2,
                        rotSpeed: (Math.random() - 0.5) * 0.2
                    });
                }
            }
        }
    }

    if (confettiActive) {
        for (const c of confetti) {
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.05;
            c.rotation += c.rotSpeed;

            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation);
            ctx.fillStyle = c.color;
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size / 2);
            ctx.restore();
        }
        confetti = confetti.filter(c => c.y < CANVAS_HEIGHT + 20);
    }

    ctx.fillStyle = '#2ecc71';
    ctx.font = '48px Courier New';
    ctx.fillText('MISSION COMPLETED', CANVAS_WIDTH / 2 - 220, victorySlideY);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Courier New';
    ctx.fillText('O sistema foi destruído!', CANVAS_WIDTH / 2 - 140, victorySlideY + 50);

    ctx.fillStyle = '#f39c12';
    ctx.font = '18px Courier New';
    ctx.fillText('Score Final: ' + gameState.score, CANVAS_WIDTH / 2 - 80, victorySlideY + 100);
    ctx.fillText('Tempo: ' + Math.floor(gameTime / 60) + 's', CANVAS_WIDTH / 2 - 60, victorySlideY + 130);
    ctx.fillText('Inimigos derrotados: ' + gameState.totalEnemiesDefeated, CANVAS_WIDTH / 2 - 120, victorySlideY + 160);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Courier New';
    ctx.fillText('Pressione ENTER para voltar ao menu', CANVAS_WIDTH / 2 - 180, victorySlideY + 210);
}

function renderExtractionWidget() {
    if (currentPhaseNum !== 1 || !extraction.active) return;

    if (extraction.showPopup) {
        if (assets.extracao) {
            const popupW = 400;
            const popupH = 300;
            const popupX = CANVAS_WIDTH / 2 - popupW / 2;
            const popupY = CANVAS_HEIGHT / 2 - popupH / 2;
            ctx.drawImage(assets.extracao, popupX, popupY, popupW, popupH);
        }

        if (extraction.fadeOut) {
            ctx.fillStyle = `rgba(0, 0, 0, ${extraction.fadeAlpha})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        return;
    }

    if (extraction.completed) return;

    const widgetX = CANVAS_WIDTH - 220;
    const widgetY = CANVAS_HEIGHT / 2 - 100;
    const widgetW = 200;
    const widgetH = 70;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(widgetX, widgetY, widgetW, widgetH);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.strokeRect(widgetX, widgetY, widgetW, widgetH);

    ctx.fillStyle = '#00ff00';
    ctx.font = '12px Courier New';

    if (extraction.completed) {
        ctx.fillText('✓ Extração bem-sucedida!', widgetX + 10, widgetY + 20);
    } else {
        ctx.fillText('Extraindo arquivo...', widgetX + 10, widgetY + 20);
    }

    const barX = widgetX + 10;
    const barY = widgetY + 40;
    const barW = widgetW - 20;
    const barH = 15;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(barX, barY, barW, barH);

    if (extraction.completed) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX + 2, barY + 2, barW - 4, barH - 4);
    } else {
        extraction.shimmerPos = (extraction.shimmerPos + 0.01) % 1;
        const shimmerWidth = barW * 0.3;
        const shimmerX = barX + (extraction.shimmerPos * (barW + shimmerWidth)) - shimmerWidth;

        ctx.fillStyle = '#004400';
        ctx.fillRect(barX + 2, barY + 2, barW - 4, barH - 4);

        ctx.fillStyle = '#00ff00';
        const gradient = ctx.createLinearGradient(shimmerX, 0, shimmerX + shimmerWidth, 0);
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX + 2, barY + 2, barW - 4, barH - 4);
    }

    ctx.strokeStyle = '#00ff00';
    ctx.strokeRect(barX, barY, barW, barH);
}

function renderHUD() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Courier New';
    ctx.fillText('Score: ' + gameState.score, 10, 20);
    if (assets.timeIcon) {
        ctx.drawImage(assets.timeIcon, 10, 28, 20, 20);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Courier New';
    ctx.fillText(Math.floor(gameTime / 60) + 's', 35, 43);

    for (let i = 0; i < player.maxHp; i++) {
        if (i < player.hp) {
            ctx.fillStyle = '#e74c3c';
        } else {
            ctx.fillStyle = '#333333';
        }
        ctx.fillRect(CANVAS_WIDTH - 30 - (i * 25), 10, 20, 20);
    }

    if (gameSettings.difficulty !== 'Insano') {
        const shieldX = CANVAS_WIDTH - 30 - (player.maxHp * 25) - 30;
        if (player.shieldUsed) {
            ctx.fillStyle = '#333333';
        } else if (player.defending) {
            ctx.fillStyle = '#f1c40f';
        } else {
            ctx.fillStyle = '#3498db';
        }
        ctx.fillRect(shieldX, 10, 20, 20);
    }
}

function gameLoop(timestamp) {
    processGamepadInput();

    const deltaTime = binaryRain.lastTime ? (timestamp - binaryRain.lastTime) / 1000 : 0.016;
    binaryRain.lastTime = timestamp;

    if (currentPhaseNum === 3 && (gameState.current === GameStates.PLAYING || gameState.current === GameStates.INTRO_BOSS)) {
        binaryRain.init();
        binaryRain.update(deltaTime);
    } else {
        binaryRain.reset();
    }

    if (gameState.current === GameStates.BOOT) {
        if (!gameState.bootReady) {
            gameState.bootTimer++;
            gameState.bootLoading = (gameState.bootTimer / 150) * 8;
            if (gameState.bootTimer > 150) {
                gameState.bootReady = true;
            }
            renderBootScreen();
        } else if (gameState.bootSlideY !== undefined && gameState.bootSlideY < CANVAS_HEIGHT) {
            gameState.bootSlideY += 8;
            renderMenu();
            renderBootScreen(gameState.bootSlideY);
            if (gameState.bootSlideY >= CANVAS_HEIGHT) {
                gameState.current = GameStates.MENU;
                gameState.menuAnimTimer = 0;
            }
        } else {
            renderBootScreen();
        }
    } else if (gameState.current === GameStates.MENU) {
        gameState.menuAnimTimer = (gameState.menuAnimTimer || 0) + 1;
        renderMenu();
    } else if (gameState.current === GameStates.USB_INSERTION) {
        updateUsbIntro(timestamp);
        renderUsbIntro();
    } else if (gameState.current === GameStates.SETTINGS) {
        renderSettings();
    } else if (gameState.current === GameStates.CONTROLS) {
        renderControls();
    } else if (gameState.current === GameStates.PLAYING) {
        const frameTime = lastTickTimestamp ? timestamp - lastTickTimestamp : TICK_MS;
        lastTickTimestamp = timestamp;
        tickAccumulator += Math.min(frameTime, 250);

        if (phaseFadeInActive) {
            let ticksThisFrame = 0;
            while (tickAccumulator >= TICK_MS) {
                phaseFadeIn++;
                if (assets.audio.phase && gameSettings.gameMusicOn) {
                    assets.audio.phase.volume = Math.min(gameSettings.musicVolume, phaseFadeIn / 120);
                }
                tickAccumulator -= TICK_MS;
                if (phaseFadeIn >= 120) {
                    phaseFadeInActive = false;
                    break;
                }
                ticksThisFrame++;
                if (ticksThisFrame >= MAX_TICKS_PER_FRAME) {
                    tickAccumulator = 0;
                    break;
                }
            }
            render();
            if (!currentPhase.winerrorPhase) {
                renderHUD();
                renderExtractionWidget();
            }
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, 1 - phaseFadeIn / 120)})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            let ticksThisFrame = 0;
            while (tickAccumulator >= TICK_MS) {
                update();
                gameTime++;
                tickAccumulator -= TICK_MS;
                ticksThisFrame++;
                if (ticksThisFrame >= MAX_TICKS_PER_FRAME) {
                    tickAccumulator = 0;
                    break;
                }
            }
            render();
            if (!currentPhase.winerrorPhase) {
                renderHUD();
                renderExtractionWidget();
            }
        }
        lastTickTimestamp = timestamp;
    } else if (gameState.current === GameStates.PAUSED) {
        renderPause();
    } else if (gameState.current === GameStates.GAME_OVER) {
        renderGameOver();
    } else if (gameState.current === GameStates.VICTORY) {
        renderVictory();
    } else if (gameState.current === GameStates.TRANSITION && gameState.transitioning) {
        gameState.transitionTimer = (gameState.transitionTimer || 0) + 1;
        if (gameState.transitionTimer > 120) {
            loadPhase(gameState.transitionPhase);
            if (gameState.transitionPhase === 3) {
                gameState.current = GameStates.INTRO_BOSS;
                initBossIntro();
            } else {
                gameState.current = GameStates.PLAYING;
            }
            gameState.transitioning = false;
            gameState.transitionTimer = 0;
        }
    } else if (gameState.current === GameStates.INTRO_BOSS) {
        updateBossIntro(deltaTime);
        render();
    }

    requestAnimationFrame(gameLoop);
}

async function init() {
    setupInput();
    await loadAssets();
    gameState.current = GameStates.BOOT;
    requestAnimationFrame(gameLoop);
}

init();