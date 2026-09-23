const DEFAULT_CONTROLS = {
    moveLeft: 'a',
    moveRight: 'd',
    jump: ' ',
    attackUp: 'k',
    attackSide: 'l',
    shield: 's'
};

const DIFFICULTY_LEVELS = ['Normal', 'Facil', 'Dificil', 'Insano'];
const DIFFICULTY_MODIFIERS = {
    'Normal': { enemySpeed: 1, projectileSpeed: 1, playerLives: 3 },
    'Facil': { enemySpeed: 0.8, projectileSpeed: 0.8, playerLives: 5 },
    'Dificil': { enemySpeed: 1.2, projectileSpeed: 1.1, playerLives: 2 },
    'Insano': { enemySpeed: 2, projectileSpeed: 1.1, playerLives: 1 }
};

const DEFAULT_SETTINGS = {
    controls: { ...DEFAULT_CONTROLS },
    menuMusicOn: true,
    gameMusicOn: true,
    sfxOn: true,
    musicVolume: 1,
    sfxVolume: 1,
    difficulty: 'Normal'
};

function loadSettings() {
    try {
        const saved = localStorage.getItem('breakingSystems_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            const savedControls = parsed.controls || {};
            const normalizedControls = {};
            for (const [k, v] of Object.entries({ ...DEFAULT_SETTINGS.controls, ...savedControls })) {
                normalizedControls[k] = typeof v === 'string' && v.length === 1 ? v.toLowerCase() : v;
            }
            return {
                controls: normalizedControls,
                menuMusicOn: parsed.menuMusicOn !== undefined ? parsed.menuMusicOn : true,
                gameMusicOn: parsed.gameMusicOn !== undefined ? parsed.gameMusicOn : true,
                sfxOn: parsed.sfxOn !== undefined ? parsed.sfxOn : true,
                musicVolume: parsed.musicVolume !== undefined ? parsed.musicVolume : 1,
                sfxVolume: parsed.sfxVolume !== undefined ? parsed.sfxVolume : 1,
                difficulty: parsed.difficulty || 'Normal'
            };
        }
    } catch (e) {}
    return { ...DEFAULT_SETTINGS, controls: { ...DEFAULT_SETTINGS.controls } };
}

function saveSettings(settings) {
    try {
        localStorage.setItem('breakingSystems_settings', JSON.stringify(settings));
    } catch (e) {}
}

let gameSettings = loadSettings();

function isKeyUsed(action, key) {
    const normalized = typeof key === 'string' && key.length === 1 ? key.toLowerCase() : key;
    for (const [k, v] of Object.entries(gameSettings.controls)) {
        if (k !== action) {
            const vNorm = typeof v === 'string' && v.length === 1 ? v.toLowerCase() : v;
            if (vNorm === normalized) return true;
        }
    }
    return false;
}
