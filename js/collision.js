function aabbCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function getEnemyHitbox(enemy) {
    const s = enemy.hitboxScale || 1;
    if (s === 1) return enemy;
    const w = enemy.width * s;
    const h = enemy.height * s;
    return {
        x: enemy.x + (enemy.width - w) / 2,
        y: enemy.y + (enemy.height - h) / 2,
        width: w,
        height: h
    };
}

function resolveVerticalCollision(entity, platform) {
    if (aabbCollision(entity, platform)) {
        const overlapTop = entity.y + entity.height - platform.y;
        const overlapBottom = platform.y + platform.height - entity.y;

        if (overlapTop < overlapBottom && entity.vy >= 0) {
            entity.y = platform.y - entity.height;
            entity.vy = 0;
            entity.grounded = true;
        } else if (overlapBottom < overlapTop && entity.vy < 0) {
            entity.y = platform.y + platform.height;
            entity.vy = 0;
        }
    }
}

function getAttackHitbox(player, facingRight, attackDirection) {
    const hitboxWidth = 40;
    const hitboxHeight = 40;

    if (attackDirection === 'up') {
        return {
            x: player.x + player.width / 2 - hitboxWidth / 2,
            y: player.y - hitboxHeight,
            width: hitboxWidth,
            height: hitboxHeight
        };
    }

    return {
        x: facingRight ? player.x + player.width : player.x - hitboxWidth,
        y: player.y + player.height / 2 - hitboxHeight / 2,
        width: hitboxWidth,
        height: hitboxHeight
    };
}