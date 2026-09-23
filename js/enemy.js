const ENEMY_TYPES = {
    captcha: {
        width: 24,
        height: 24,
        hp: 5,
        speed: 1.2,
        damage: 1,
        color: '#e74c3c',
        score: 10,
        flying: false
    },
    spam: {
        width: 24,
        height: 24,
        hp: 2,
        speed: 1,
        damage: 1,
        color: '#e67e22',
        score: 20,
        flying: true
    },
    spam_shooter: {
        width: 24,
        height: 24,
        hp: 2,
        speed: 1,
        damage: 1,
        color: '#e67e22',
        score: 25,
        flying: true,
        shoots: true,
        shotsPerBurst: 2
    },
    email: {
        width: 24,
        height: 24,
        hp: 5,
        speed: 1.4,
        damage: 1,
        color: '#c0392b',
        score: 15,
        flying: false
    },
    antivirus: {
        width: 28,
        height: 28,
        hp: 5,
        speed: 0.9,
        damage: 2,
        color: '#8e44ad',
        score: 30,
        flying: false
    },
    firewall: {
        width: 28,
        height: 28,
        hp: 5,
        speed: 0.6,
        damage: 2,
        color: '#6c3483',
        score: 40,
        flying: false
    },
    boss_robot: {
        width: 28,
        height: 28,
        hp: 5,
        speed: 1.2,
        damage: 2,
        color: '#c0392b',
        score: 50,
        flying: false
    },
    boss: {
        width: 130,
        height: 130,
        hp: 999,
        speed: 0,
        damage: 3,
        color: '#1504ff',
        score: 0,
        flying: false,
        isBoss: true,
        hitboxScale: 0.7
    }
};

function createEnemy(x, y, typeName) {
    const type = ENEMY_TYPES[typeName] || ENEMY_TYPES.captcha;
    return {
        x,
        y,
        width: type.width,
        height: type.height,
        vx: 0,
        vy: 0,
        hp: type.hp,
        maxHp: type.hp,
        speed: type.speed * DIFFICULTY_MODIFIERS[gameSettings.difficulty].enemySpeed,
        damage: type.damage,
        color: type.color,
        typeName,
        score: type.score,
        flying: type.flying,
        shoots: type.shoots || false,
        hitboxScale: type.hitboxScale || 1,
        shotsPerBurst: type.shotsPerBurst || 3,
        shootTimer: 0,
        shotsFired: 0,
        pauseTimer: 0,
        flyTimer: 0,
        flyBaseY: y,
        flyDirection: Math.random() > 0.5 ? 1 : -1,
        grounded: false,
        alive: true,
        deathTimer: 0,
        idleTimer: 0,
        slowTimer: 0,
        retreatTimer: 0,
        isBoss: type.isBoss || false
    };
}

function checkEnemyCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function resolveEnemyCollision(enemy, other) {
    if (!checkEnemyCollision(enemy, other)) return;

    if (enemy.flying && !enemy.shoots && other === player) return;
    if (other.flying && !other.shoots && enemy === player) return;

    const overlapX = Math.min(enemy.x + enemy.width - other.x, other.x + other.width - enemy.x);
    const overlapY = Math.min(enemy.y + enemy.height - other.y, other.y + other.height - enemy.y);

    if ((enemy.isBoss && other.flying && !other.shoots) || (other.isBoss && enemy.flying && !enemy.shoots)) {
        const flyer = enemy.flying && !enemy.shoots ? enemy : other;
        if (flyer.x < (enemy.isBoss ? enemy : other).x) {
            flyer.vx = -Math.abs(flyer.speed * 1.5);
            flyer.vy = -flyer.speed;
        } else {
            flyer.vx = Math.abs(flyer.speed * 1.5);
            flyer.vy = -flyer.speed;
        }
        return;
    }

    if (overlapX < overlapY) {
        const push = overlapX / 2 + 2;
        if (enemy.x < other.x) {
            enemy.x -= push;
            other.x += push;
        } else {
            enemy.x += push;
            other.x -= push;
        }

        if (enemy.flying && enemy.shoots) {
            enemy.flyDirection = -1;
            enemy.vx = -enemy.speed;
        }
        if (other.flying && other.shoots) {
            other.flyDirection = 1;
            other.vx = other.speed;
        }
    } else {
        const push = overlapY / 2 + 2;
        if (enemy.y < other.y) {
            enemy.y -= push;
            other.y += push;
        } else {
            enemy.y += push;
            other.y -= push;
        }
    }
}

function updateEnemy(enemy, player, platforms, allEnemies, currentPhase) {
    if (!enemy.alive) {
        enemy.deathTimer++;
        return;
    }

    if (enemy.isBoss) {
        return;
    }

    if (enemy.slowTimer > 0) {
        enemy.slowTimer--;
        enemy.vx *= 0.5;
        enemy.vy *= 0.5;
        return;
    }

    const dx = player.x - enemy.x;
    const dist = Math.abs(dx);

    if (Math.abs(enemy.vx) < 0.5) {
        if (dist < 300) {
            if (dx > 0) {
                enemy.vx = enemy.speed;
            } else {
                enemy.vx = -enemy.speed;
            }
        } else {
            enemy.idleTimer += 0.03;
            enemy.vx = Math.sin(enemy.idleTimer) * enemy.speed * 0.3;
        }
    } else {
        enemy.vx *= 0.85;
    }

    if (enemy.flying) {
        enemy.flyTimer += 0.05;

        if (enemy.shoots) {
            if (enemy.retreatTimer > 0) {
                enemy.retreatTimer--;
                const retreatDir = enemy.x > player.x ? 1 : -1;
                const speed = enemy.speed * 1.5;
                enemy.vx = retreatDir * speed;
                enemy.vy = 0;

                if (enemy.x <= 30) {
                    enemy.vx = Math.abs(enemy.vx);
                } else if (enemy.x >= CANVAS_WIDTH - 30 - enemy.width) {
                    enemy.vx = -Math.abs(enemy.vx);
                }
            } else {
                const speed = enemy.speed * 1.0;
                enemy.vx = enemy.flyDirection * speed;
                enemy.vy = 0;

                for (const other of allEnemies) {
                    if (other === enemy || !other.alive || !other.flying || !other.shoots) continue;
                    const ox = other.x - enemy.x;
                    const dist = Math.abs(ox);
                    if (dist < 100) {
                        if (ox > 0) {
                            enemy.flyDirection = -1;
                        } else {
                            enemy.flyDirection = 1;
                        }
                    }
                }

                if (enemy.x <= 30) {
                    enemy.flyDirection = 1;
                } else if (enemy.x >= CANVAS_WIDTH - 30 - enemy.width) {
                    enemy.flyDirection = -1;
                }
            }
        } else {
            if (enemy.retreatTimer > 0) {
                enemy.retreatTimer--;
                const retreatDx = enemy.x - player.x;
                const retreatDy = enemy.y - player.y;
                const retreatDist = Math.sqrt(retreatDx * retreatDx + retreatDy * retreatDy);
                const speed = enemy.speed * 1.5;
                if (retreatDist < 300) {
                    enemy.vx = (retreatDx / retreatDist) * speed;
                    enemy.vy = (retreatDy / retreatDist) * speed;
                } else {
                    enemy.vx *= 0.9;
                    enemy.vy *= 0.9;
                }
            } else {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const speed = enemy.speed * 1;
                if (dist > 20) {
                    enemy.vx = (dx / dist) * speed;
                    enemy.vy = (dy / dist) * speed;
                } else {
                    enemy.vx *= 0.95;
                    enemy.vy *= 0.95;
                }
            }

            if (enemy.x <= 20) {
                enemy.vx = Math.abs(enemy.vx);
            } else if (enemy.x >= CANVAS_WIDTH - 20 - enemy.width) {
                enemy.vx = -Math.abs(enemy.vx);
            }

            const bobY = Math.sin(enemy.flyTimer) * 0.8;
            enemy.vy += bobY * 0.03;
        }
    } else {
        enemy.vy += 0.4;
    }

    enemy.x += enemy.vx;
    enemy.y += enemy.vy;

    enemy.grounded = false;
    for (const platform of platforms) {
        resolveVerticalCollision(enemy, platform);
    }

    if (enemy.flying) {
        for (const platform of platforms) {
            if (enemy.x + enemy.width > platform.x && enemy.x < platform.x + platform.width) {
                if (enemy.y + enemy.height > platform.y && enemy.y + enemy.height < platform.y + 20 && enemy.vy > 0) {
                    enemy.y = platform.y - enemy.height;
                    enemy.vy = 0;
                }
            }
        }
    }

    if (currentPhase && currentPhase.barrier && !currentPhase.barrierUnlocked) {
        const b = currentPhase.barrier;
        if (enemy.flying && aabbCollision(enemy, b)) {
            if (enemy.vy > 0 && enemy.y + enemy.height - enemy.vy <= b.y + 10) {
                enemy.y = b.y - enemy.height;
                enemy.vy = 0;
            } else if (enemy.vx > 0 && enemy.x + enemy.width - enemy.vx <= b.x + 10) {
                enemy.x = b.x - enemy.width;
                if (enemy.shoots) {
                    enemy.flyDirection = -1;
                } else {
                    enemy.vx = -Math.abs(enemy.vx);
                }
            } else if (enemy.vx < 0 && enemy.x - enemy.vx >= b.x + b.width - 10) {
                enemy.x = b.x + b.width;
                if (enemy.shoots) {
                    enemy.flyDirection = 1;
                } else {
                    enemy.vx = Math.abs(enemy.vx);
                }
            }
        }
    }

    if (allEnemies) {
        for (const other of allEnemies) {
            if (other === enemy || !other.alive) continue;
            resolveEnemyCollision(enemy, other);
        }
    }
}

function damageEnemy(enemy, damage, knockbackDir) {
    if (!enemy.alive) return false;
    if (enemy.isBoss) return false;
    enemy.hp -= damage;
    if (enemy.flying && enemy.shoots) {
        enemy.retreatTimer = 240;
    } else if (enemy.flying && !enemy.shoots) {
        enemy.retreatTimer = 240;
    }
    if (knockbackDir) {
        enemy.vx = knockbackDir * 6;
        enemy.vy = -4;
        enemy.grounded = false;
    }
    if (enemy.hp <= 0) {
        enemy.alive = false;
        enemy.deathTimer = 0;
        playSfx('enemyDeath');
        return true;
    }
    playSfx('enemyDamage');
    return false;
}

function renderEnemy(ctx, enemy) {
    if (!enemy.alive) {
        if (enemy.deathTimer < 15) {
            const alpha = 1 - (enemy.deathTimer / 15);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.globalAlpha = 1;
        }
        return;
    }

    if (enemy.isBoss) {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = '#34495e';
        ctx.fillRect(enemy.x + 10, enemy.y + 10, enemy.width - 20, enemy.height - 20);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(enemy.x + 15, enemy.y + 18, 18, 14);
        ctx.fillRect(enemy.x + 47, enemy.y + 18, 18, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Courier New';
        ctx.fillText('BIOS', enemy.x + 22, enemy.y + 44);
        ctx.fillStyle = '#f39c12';
        ctx.font = '10px Courier New';
        ctx.fillText('BOSS', enemy.x + 22, enemy.y + 44 + 14);
        return;
    }

    let enemyImg = null;
    if (typeof assets !== 'undefined') {
        if (enemy.shoots) {
            enemyImg = assets.enemyFlyingShooter;
        } else if (enemy.flying) {
            enemyImg = assets.enemyFlying;
        } else {
            enemyImg = assets.enemyGround;
        }
    }

    const scale = enemy.flying ? 2.4 : 2.31;
    const dw = enemy.width * scale;
    const dh = enemy.height * scale;
    const dx = enemy.x - (dw - enemy.width) / 2;
    const dy = enemy.flying ? enemy.y - (dh - enemy.height) / 2 : enemy.y - (dh - enemy.height) / 2 - 16;

    if (enemyImg) {
        ctx.drawImage(enemyImg, dx, dy, dw, dh);
    } else {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = '#ffffff';
        const eyeX = enemy.vx > 0 ? enemy.x + enemy.width - 8 : enemy.x + 4;
        ctx.fillRect(eyeX, enemy.y + 6, 4, 4);
    }

    if (enemy.hp > 1) {
        const barW = enemy.width;
        const barH = 4;
        const barX = enemy.x;
        const barY = dy - 8;
        const hpRatio = enemy.hp / enemy.maxHp;
        let barColor;
        if (enemy.shoots) {
            barColor = '#2ecc71';
        } else if (enemy.flying) {
            barColor = '#3498db';
        } else {
            barColor = '#e74c3c';
        }
        const r = 2;
        ctx.beginPath();
        ctx.moveTo(barX + r, barY);
        ctx.lineTo(barX + barW - r, barY);
        ctx.arcTo(barX + barW, barY, barX + barW, barY + r, r);
        ctx.lineTo(barX + barW, barY + barH - r);
        ctx.arcTo(barX + barW, barY + barH, barX + barW - r, barY + barH, r);
        ctx.lineTo(barX + r, barY + barH);
        ctx.arcTo(barX, barY + barH, barX, barY + barH - r, r);
        ctx.lineTo(barX, barY + r);
        ctx.arcTo(barX, barY, barX + r, barY, r);
        ctx.closePath();
        ctx.fillStyle = '#000000';
        ctx.fill();

        const p = 1;
        ctx.beginPath();
        ctx.moveTo(barX + r, barY + p);
        ctx.lineTo(barX + barW - r, barY + p);
        ctx.arcTo(barX + barW, barY + p, barX + barW, barY + p + r, r);
        ctx.lineTo(barX + barW, barY + barH - p - r);
        ctx.arcTo(barX + barW, barY + barH - p, barX + barW - r, barY + barH - p, r);
        ctx.lineTo(barX + r, barY + barH - p);
        ctx.arcTo(barX, barY + barH - p, barX, barY + barH - p - r, r);
        ctx.lineTo(barX, barY + p + r);
        ctx.arcTo(barX, barY + p, barX + r, barY + p, r);
        ctx.closePath();
        ctx.fillStyle = barColor;
        ctx.save();
        ctx.clip();
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
        ctx.restore();
    }
}