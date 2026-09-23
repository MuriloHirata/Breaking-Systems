const PLAYER_CONFIG = {
    width: 32,
    height: 48,
    speed: 2.5,
    jumpForce: -10.5,
    gravity: 0.5,
    color: '#3498db'
};

const STATES = {
    IDLE: 'idle',
    WALK: 'walk',
    JUMP: 'jump',
    ATTACK: 'attack',
    DEFEND: 'defend'
};

function createPlayer(x, y) {
    const lives = DIFFICULTY_MODIFIERS[gameSettings.difficulty].playerLives;
    return {
        x,
        y,
        width: PLAYER_CONFIG.width,
        height: PLAYER_CONFIG.height,
        vx: 0,
        vy: 0,
        grounded: false,
        facingRight: true,
        hp: lives,
        maxHp: lives,
        state: STATES.IDLE,
        attackTimer: 0,
        attackDuration: 15,
        attackHitEnemies: [],
        invincibleTimer: 0,
        attackDirection: 'side',
        defending: false,
        defendDirection: 'right',
        damageFlashTimer: 0,
        shieldTimer: 0,
        shieldUsed: false
    };
}

function updatePlayer(player, keys, keysJustPressed, platforms, canvasWidth) {
    player.vx = 0;

    if (player.attackTimer > 0) {
        player.attackTimer--;
    }

    if (player.invincibleTimer > 0) {
        player.invincibleTimer--;
    }

    if (player.damageFlashTimer > 0) {
        player.damageFlashTimer--;
    }

    if (player.shieldTimer > 0) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) {
            player.defending = false;
            player.shieldUsed = true;
        }
    }

    if (gameSettings.difficulty !== 'Insano' && keys[gameSettings.controls.shield] && !player.shieldUsed && player.shieldTimer === 0) {
        player.defending = true;
        player.shieldTimer = 300;
    }

    if (keys[gameSettings.controls.moveLeft]) {
        player.vx = -PLAYER_CONFIG.speed;
        player.facingRight = false;
        if (player.defending) {
            player.defendDirection = 'left';
        }
    }

    if (keys[gameSettings.controls.moveRight]) {
        player.vx = PLAYER_CONFIG.speed;
        player.facingRight = true;
        if (player.defending) {
            player.defendDirection = 'right';
        }
    }

    if (keysJustPressed[gameSettings.controls.jump] && player.grounded) {
        player.vy = PLAYER_CONFIG.jumpForce;
        player.grounded = false;
        playSfx('jump');
    }

    if (!player.defending) {
        if (keysJustPressed[gameSettings.controls.attackUp] && player.attackTimer === 0) {
            player.attackDirection = 'up';
            player.attackTimer = player.attackDuration;
            player.attackHitEnemies = [];
            playSfx('singleShoot');
        } else if (keysJustPressed[gameSettings.controls.attackSide] && player.attackTimer === 0) {
            player.attackDirection = 'side';
            player.attackTimer = player.attackDuration;
            player.attackHitEnemies = [];
            playSfx('singleShoot');
        }
    }

    player.vy += PLAYER_CONFIG.gravity;

    player.x += player.vx;
    player.y += player.vy;

    player.grounded = false;
    for (const platform of platforms) {
        resolveVerticalCollision(player, platform);
    }

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvasWidth) {
        player.x = canvasWidth - player.width;
    }

    updatePlayerState(player);
}

function updatePlayerState(player) {
    if (player.defending) {
        player.state = STATES.DEFEND;
    } else if (player.attackTimer > 0) {
        player.state = STATES.ATTACK;
    } else if (!player.grounded) {
        player.state = STATES.JUMP;
    } else if (Math.abs(player.vx) > 0) {
        player.state = STATES.WALK;
    } else {
        player.state = STATES.IDLE;
    }
}

function renderPlayer(ctx, player, assets) {
    if (player.invincibleTimer > 0 && player.invincibleTimer % 4 < 2) {
        return;
    }

    const isRed = player.damageFlashTimer > 0;

    if (assets.playerImage) {
        ctx.save();
        if (!player.facingRight) {
            ctx.translate(player.x + player.width, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(assets.playerImage, 0, 0, player.width, player.height);
        } else {
            ctx.drawImage(assets.playerImage, player.x, player.y, player.width, player.height);
        }
        ctx.restore();

        if (isRed) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.5)';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
    } else {
        ctx.fillStyle = isRed ? '#e74c3c' : '#5dade2';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.width, player.height);

        ctx.fillStyle = '#ffffff';
        const eyeX = player.facingRight ? player.x + 22 : player.x + 8;
        ctx.fillRect(eyeX, player.y + 12, 4, 4);

        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(player.x + 8, player.y + 4, 16, 8);
    }

    if (player.defending) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    if (player.attackTimer > 0) {
        const hitbox = getAttackHitbox(player, player.facingRight, player.attackDirection);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    }
}

function damagePlayer(player, knockbackDir, isTestMode) {
    if (player.invincibleTimer > 0) return false;
    if (isTestMode) return false;
    if (player.defending) {
        player.damageFlashTimer = 10;
        return false;
    }
    player.hp--;
    player.invincibleTimer = 60;
    player.damageFlashTimer = 15;
    if (knockbackDir) {
        player.vx = knockbackDir * 5;
        player.vy = -6;
        player.grounded = false;
    }
    if (player.hp <= 0) {
        playSfx('playerDeath');
    } else {
        playSfx('playerDamage');
    }
    return player.hp <= 0;
}