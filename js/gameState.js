const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 560;

const GameStates = {
    BOOT: 'BOOT',
    MENU: 'MENU',
    USB_INSERTION: 'USB_INSERTION',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    TRANSITION: 'TRANSITION',
    INTRO_BOSS: 'INTRO_BOSS',
    VICTORY: 'VICTORY',
    GAME_OVER: 'GAME_OVER',
    SETTINGS: 'SETTINGS',
    CONTROLS: 'CONTROLS'
};

function createGameState() {
    return {
        current: GameStates.BOOT,
        score: 0,
        time: 0,
        phase: 1,
        totalEnemiesDefeated: 0,
        transitioning: false,
        transitionPhase: 0,
        pauseMenuOption: 0,
        bootTimer: 0,
        bootLoading: 0
    };
}

function changeState(state, newState) {
    state.current = newState;
}

function isPlaying(state) {
    return state.current === GameStates.PLAYING;
}

function isPaused(state) {
    return state.current === GameStates.PAUSED;
}

function resetGameState(state) {
    state.score = 0;
    state.time = 0;
    state.phase = 1;
    state.totalEnemiesDefeated = 0;
}