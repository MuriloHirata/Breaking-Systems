const PHASE_1 = {
    name: 'PHISHING',
    platforms: [
        { x: 0, y: CANVAS_HEIGHT - 35, width: CANVAS_WIDTH, height: 64, color: 'transparent' },
        { x: 150, y: 450, width: 128, height: 32, color: '#8b4513' },
        { x: 400, y: 410, width: 128, height: 32, color: '#8b4513' },
        { x: 650, y: 450, width: 128, height: 32, color: '#8b4513' }
    ],
    playerStart: { x: 50, y: CANVAS_HEIGHT - 128 },
    enemies: [
        { x: 300, y: CANVAS_HEIGHT - 88, type: 'captcha' },
        { x: 550, y: CANVAS_HEIGHT - 88, type: 'spam' },
        { x: 800, y: CANVAS_HEIGHT - 88, type: 'email' }
    ],
    barrier: null,
    item: {
        x: 500,
        y: CANVAS_HEIGHT - 100,
        width: 32,
        height: 24,
        color: '#f1c40f',
        label: 'FREE_GAME.rar',
        spawnAfterDefeat: true
    }
};

const PHASE_2 = {
    name: 'FIREWALL / ANTIVÍRUS',
    platforms: [
        { x: 0, y: CANVAS_HEIGHT - 35, width: CANVAS_WIDTH, height: 64, color: 'transparent' },
        { x: 150, y: 450, width: 128, height: 32, color: '#e67e22' },
        { x: 400, y: 410, width: 128, height: 32, color: '#e67e22' },
        { x: 650, y: 450, width: 128, height: 32, color: '#e67e22' }
    ],
    playerStart: { x: 50, y: CANVAS_HEIGHT - 128 },
    enemies: [
        { x: 250, y: CANVAS_HEIGHT - 88, type: 'antivirus' },
        { x: 500, y: 340, type: 'spam_shooter', startDelay: 300 },
        { x: 750, y: CANVAS_HEIGHT - 88, type: 'antivirus' }
    ],
    barrier: null,
    item: {
        x: 450,
        y: CANVAS_HEIGHT - 100,
        width: 24,
        height: 24,
        color: '#3498db',
        label: '🖱️ Cursor',
        spawnAfterDefeat: true
    }
};

const PHASE_3 = {
    name: 'BIOS / BOSS',
    platforms: [
        { x: 0, y: CANVAS_HEIGHT - 64, width: CANVAS_WIDTH, height: 64, color: 'transparent' },
        { x: 100, y: 420, width: 128, height: 32, color: '#1a1a2e' },
        { x: 420, y: 400, width: 128, height: 32, color: '#1a1a2e' },
        { x: 750, y: 420, width: 128, height: 32, color: '#1a1a2e' }
    ],
    playerStart: { x: 50, y: CANVAS_HEIGHT - 128 },
    enemies: [
        { x: 440, y: CANVAS_HEIGHT - 164, type: 'boss' },
        { x: 200, y: CANVAS_HEIGHT - 88, type: 'boss_robot' },
        { x: 700, y: CANVAS_HEIGHT - 88, type: 'boss_robot' }
    ],
    barrier: null,
    item: {
        x: 470,
        y: CANVAS_HEIGHT - 100,
        width: 40,
        height: 30,
        color: '#e74c3c',
        label: 'Delete System32',
        spawnAfterDefeat: true
    }
};

function createPhase1() {
    return {
        ...PHASE_1,
        enemiesDefeated: false,
        itemCollected: false,
        barrierUnlocked: false,
        transitionTimer: 0,
        showTransition: false
    };
}

function createPhase2() {
    return {
        ...PHASE_2,
        enemiesDefeated: false,
        itemCollected: false,
        barrierUnlocked: false,
        transitionTimer: 0,
        showTransition: false,
        cursorCollected: false,
        cursorAnimating: false,
        cursorX: 0,
        cursorY: 0,
        cursorTargetX: 0,
        cursorTargetY: 0,
        antivirusShowMessage: false,
        antivirusMessageTimer: 0,
        antivirusClicked: false,
        sequenceActive: false,
        clickDelay: 0
    };
}

function createPhase3() {
    return {
        ...PHASE_3,
        enemiesDefeated: false,
        itemCollected: false,
        barrierUnlocked: true,
        transitionTimer: 0,
        showTransition: false,
        locks: 3,
        bossDefeated: false,
        deleteCollected: false,
        deleteAnimating: false,
        deleteX: 0,
        deleteY: 0,
        deleteTargetX: 0,
        deleteTargetY: 0,
        glitchActive: false,
        glitchTimer: 0,
        winerrorPhase: false,
        winerrorDuration: 0,
        missionComplete: false,
        currentWave: 0
    };
}

function getPlatforms(phase) {
    return phase.platforms;
}

function getEnemies(phase) {
    return phase.enemies.map(e => {
        const enemy = createEnemy(e.x, e.y, e.type);
        if (e.type === 'boss') {
            enemy.hp = 999;
            enemy.maxHp = 999;
        }
        if (e.startDelay) {
            enemy.pauseTimer = e.startDelay;
        }
        return enemy;
    });
}

function getBarrier(phase) {
    return phase.barrier;
}

function getItem(phase) {
    return phase.item;
}