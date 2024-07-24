const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageBox = document.getElementById('messageBox');

const GRAVITY = 0.3;
const JUMP_POWER = -10;
const PLAYER_SPEED = 2;

let collectedCoins = 0;
let playerLives = 3;

let keys = {};

document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
});

document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

let spacePressed = false;

document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'Space' && !spacePressed) {
        spacePressed = true;
        if (player.onGround) {
            player.velocityY = JUMP_POWER;
            player.onGround = false;
        }
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
    if (event.code === 'Space') {
        spacePressed = false;
    }
});

document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyE' && player.nearPlatform && player.platformMessage) {
        messageBox.innerHTML = `<pre><code class="language-js">${player.platformMessage.message}</code></pre>`;
        Prism.highlightAll();
    }
});

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.nearPlatform = false;
        this.platformMessage = null;
    }

    update(platforms, coins, enemies) {
        this.velocityY += GRAVITY;
        this.x += this.velocityX;
        this.y += this.velocityY;

        this.onGround = false;
        this.nearPlatform = false;
        this.platformMessage = null;

        for (let platform of platforms) {
            // Check collision with the top of the platform
            if (this.y + this.height > platform.y && this.y + this.height < platform.y + platform.height && this.x + this.width > platform.x && this.x < platform.x + platform.width) {
                if (!platform.isTrapped) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                } else if (platform.isTrapped && !platform.triggerFall) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                    platform.triggerFall = true;
                }
            }
            // Check collision with the bottom of the platform
            else if (this.y < platform.y + platform.height && this.y > platform.y && this.x + this.width > platform.x && this.x < platform.x + platform.width) {
                this.y = platform.y + platform.height;
                this.velocityY = GRAVITY;
            }

            // Check if player is near the platform
            if (Math.abs(this.x + this.width / 2 - (platform.x + platform.width / 2)) < platform.width / 2 + 50 &&
                Math.abs(this.y + this.height / 2 - (platform.y + platform.height / 2)) < platform.height / 2 + 50) {
                this.nearPlatform = true;
                this.platformMessage = platform;
            }
        }

        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.velocityY = 0;
            this.onGround = true;
        }

        if (keys['ArrowLeft']) {
            this.velocityX = -PLAYER_SPEED;
        } else if (keys['ArrowRight']) {
            this.velocityX = PLAYER_SPEED;
        } else {
            this.velocityX = 0;
        }

        this.collectCoins(coins);
        this.checkEnemyCollisions(enemies);

        this.draw();
    }

    collectCoins(coins) {
        for (let i = coins.length - 1; i >= 0; i--) {
            let coin = coins[i];
            if (this.x < coin.x + coin.radius &&
                this.x + this.width > coin.x - coin.radius &&
                this.y < coin.y + coin.radius &&
                this.y + this.height > coin.y - coin.radius) {
                coins.splice(i, 1);
                collectedCoins++;
            }
        }
    }

    checkEnemyCollisions(enemies) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            let enemy = enemies[i];
            if (this.x < enemy.x + enemy.width &&
                this.x + this.width > enemy.x &&
                this.y < enemy.y + enemy.height &&
                this.y + this.height > enemy.y) {
                
                if (this.velocityY > 0 && this.y + this.height - this.velocityY < enemy.y) {
                    // Bounce on the enemy
                    this.velocityY = JUMP_POWER;
                    enemies.splice(i, 1);
                } else {
                    // Take damage
                    playerLives--;
                    if (playerLives <= 0) {
                        alert("Game Over!");
                        // Reset game or handle game over logic
                    }
                    // Knockback effect
                    this.velocityX = this.x < enemy.x ? -PLAYER_SPEED : PLAYER_SPEED;
                    this.velocityY = JUMP_POWER / 2;
                }
            }
        }
    }

    draw() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.direction = 1;
    }

    update() {
        this.x += this.speed * this.direction;

        if (this.x <= 0 || this.x + this.width >= canvas.width) {
            this.direction *= -1;
        }

        this.draw();
    }

    draw() {
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Platform {
    constructor(x, y, width, height, message, isTrapped = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.message = message;
        this.isTrapped = isTrapped;
        this.fallSpeed = 0;
        this.triggerFall = false;
    }

    update() {
        if (this.isTrapped && this.triggerFall) {
            this.y += this.fallSpeed;
            this.fallSpeed += GRAVITY;
//             this.message = `
// if (playerY < platformY) {
//     while (platformY <= canvas.height) {
//         platformY++;
//     }
// }`;
        // } else if (this.isTrapped) {
        //     this.message = "This platform will fall if you land on it.";
        // } else {
        //     this.message = "This is a stable platform.";
        // }
        }
        this.draw();
    }

    draw() {
        ctx.fillStyle = 'brown';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Coin {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    draw() {
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
}

const player = new Player(100, 300);
const enemies = [new Enemy(300, 350, 50, 50, 2)];
const platforms = [
    new Platform(200, 300, 100, 20, `if (playerY < platformY) {
    while (platformY <= canvas.height) {
        platformY++;
    }
}`, true), // Plateforme piégée
    new Platform(400, 250, 100, 20, 'This is a stable platform.')
];

const coins = [new Coin(250, 270, 10)];

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update(platforms, coins, enemies);
    enemies.forEach(enemy => enemy.update());
    platforms.forEach(platform => platform.update(player)); // Pass player instance to update
    coins.forEach(coin => coin.draw());

    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Coins: ${collectedCoins}`, canvas.width - 100, 30);

    ctx.fillStyle = 'black';
    ctx.fillText(`Lives: ${playerLives}`, 10, 30);

    if (player.nearPlatform && player.platformMessage) {
        ctx.fillStyle = 'black';
        ctx.fillText('E', player.platformMessage.x + player.platformMessage.width / 2, player.platformMessage.y - 10);
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
