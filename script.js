const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageBox = document.getElementById('messageBox');

const GRAVITY = 0.3;
const JUMP_POWER = -8;
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

let jumpKeyPressed = false;

document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'KeyW' && !jumpKeyPressed) {
        jumpKeyPressed = true;
        if (player.onGround) {
            player.velocityY = JUMP_POWER;
            player.onGround = false;
        }
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
    if (event.code === 'KeyW') {
        jumpKeyPressed = false;
    }
});

document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyL' && player.nearPlatform && player.platformMessage) {
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
    
        // Détection de la plateforme la plus proche
        let closestPlatform = null;
        let closestDistance = Infinity;
    
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
    
            // Calcul de la distance au centre de la plateforme
            const platformCenterX = platform.x + platform.width / 2;
            const platformCenterY = platform.y + platform.height / 2;
            const playerCenterX = this.x + this.width / 2;
            const playerCenterY = this.y + this.height / 2;
    
            const distance = Math.hypot(playerCenterX - platformCenterX, playerCenterY - platformCenterY);
    
            // Détecter la plateforme la plus proche à une distance détectable
            if (distance < closestDistance && this.x > platform.x && this.x < platform.x + platform.width &&
                this.y + this.height > platform.y - 100 && this.y < platform.y + platform.height + 100) {
            // if (distance < closestDistance && this.x > platform.x - 50 && this.x < platform.x + platform.width - 50 &&
            //     this.y + this.height > platform.y - 100 && this.y < platform.y + platform.height + 100) {
                closestDistance = distance;
                closestPlatform = platform;
            }
        }
    
        // Si une plateforme proche est trouvée, mettre à jour l'état du joueur
        if (closestPlatform) {
            this.nearPlatform = true;
            this.platformMessage = closestPlatform;
            closestPlatform.isDetected = true;
        }
    
        // Réinitialiser l'état des autres plateformes
        for (let platform of platforms) {
            if (platform !== closestPlatform) {
                platform.isDetected = false;
            }
            platform.update(this);
        }
    
        // Si le joueur tombe en bas de l'écran, le maintenir sur le sol
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.velocityY = 0;
            this.onGround = true;
        }
    
        // Gestion des mouvements horizontaux du joueur
        if (keys['KeyA']) { // Q
            this.velocityX = -PLAYER_SPEED;
        } else if (keys['KeyD']) {
            this.velocityX = PLAYER_SPEED;
        } else {
            this.velocityX = 0;
        }
    
        // Gestion des autres interactions
        this.collectCoins(coins);
        this.checkEnemyCollisions(enemies);
    
        // Dessiner le joueur
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
                        console.log("Game Over!");
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
        ctx.fillStyle = 'lightblue';
        // ctx.fillRect(this.x, this.y, this.width, this.height);
        drawRoundedRect(ctx, this.x, this.y, this.width, this.height, 10);
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
        ctx.fillStyle = 'orange';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// PLATFORMS
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
        this.isDetected = false;
    }

    update() {
        if (this.isTrapped && this.triggerFall) {
            this.y += this.fallSpeed;
            this.fallSpeed += GRAVITY;
        }
        this.draw();
    }

    draw() {
        // ctx.fillStyle = 'black';
        ctx.fillStyle = this.isDetected ? 'rgb(80,80,80)' : 'black'; // Couleur change si détectée
        // ctx.fillRect(this.x, this.y, this.width, this.height);
        drawRoundedRect(ctx, this.x, this.y, this.width, this.height, 10); // Ajout du rayon de 10 pixels pour les coins arrondis

    }
}

class HorizontalPlatform extends Platform {
    constructor(x, y, width, height, distance) {
        super(x, y, width, height, '', false);
        this.message = 'This is a horizontal platform that moves right when you press L.'; // Message par défaut
        this.originalX = x; // To remember the original position
        this.isMoving = false;
        this.distance = distance;
    }

    update(player) {
        // Check if the player is on the platform and presses the 'L' key
        if (this.isPlayerOnPlatform(player) && keys['Semicolon'] && !this.isMoving) {
            this.moveRight();
        }

        if (this.isMoving) {
            this.x += this.distance; 
            player.x += this.distance; 

            if (this.x >= this.originalX + 200) {
                this.isMoving = false; // Stop moving after 200px
            }
        }

        this.draw();
    }

    isPlayerOnPlatform(player) {
        return player.y + player.height === this.y &&
               player.x + player.width > this.x &&
               player.x < this.x + this.width;
    }

    moveRight() {
        this.isMoving = true;
    }
}


function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        radius = {
            tl: radius.tl || 0,
            tr: radius.tr || 0,
            br: radius.br || 0,
            bl: radius.bl || 0
        };
    }

    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.arcTo(x + width, y, x + width, y + radius.tr, radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.arcTo(x + width, y + height, x + width - radius.br, y + height, radius.br);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius.bl, radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.arcTo(x, y, x + radius.tl, y, radius.tl);
    ctx.closePath();
    ctx.fill();
}


class StablePlatform extends Platform {
    constructor(x, y, width, height) {
        super(x, y, width, height, '', false);
        this.message = 'This is a stable platform.'; // Message par défaut
    }

    update() {
        super.update(); // Appelle la méthode update de la classe parente Platform
    }
}

class FallingPlatform extends Platform {
    constructor(x, y, width, height) {
        super(x, y, width, height, '', true);
        this.message = 'This platform will fall if you stand on it.'; // Message par défaut
    }

    update() {
        if (this.triggerFall) {
            this.y += this.fallSpeed;
            this.fallSpeed += GRAVITY;
        }
        this.draw(); // Appelle la méthode draw de la classe parente Platform
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

class Spike {
    constructor(x, y, width) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 0;
        this.spikeHeight = 20; // Height of the spikes (triangles) on top of the spike
    }

    update(player) {
        // Check collision with the player
        if (this.checkCollisionWithPlayer(player)) {
            playerLives--;
            // Add knockback effect to the player
            player.velocityY = JUMP_POWER / 2;
            player.velocityX = player.x < this.x ? -PLAYER_SPEED : PLAYER_SPEED;
        }

        this.draw();
    }

    checkCollisionWithPlayer(player) {
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }

    draw() {
        // Draw the base rectangle of the spike
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw the spikes on top of the spike
        for (let i = 0; i < this.width; i += this.spikeHeight) {
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y); // Bottom left of the triangle
            ctx.lineTo(this.x + i + this.spikeHeight / 2, this.y - this.spikeHeight); // Top of the triangle
            ctx.lineTo(this.x + i + this.spikeHeight, this.y); // Bottom right of the triangle
            ctx.closePath();
            ctx.fill();
        }
    }
}

class Door {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isOpen = true; // La porte est fermée par défaut
    }

    update(player) {
        // Vérifier si le joueur est près de la porte et appuie sur 'E'
        if (this.isPlayerNear(player)) {
            console.log('near');
            
            this.isOpen = true;
            this.goToNextLevel();
        }

        this.draw();
    }

    isPlayerNear(player) {
        return (
            player.x + player.width > this.x &&
            player.x < this.x + this.width &&
            player.y + player.height > this.y &&
            player.y < this.y + this.height
        );
    }

    goToNextLevel() {
        currentLevel++;
        if (currentLevel < levels.length) {
            loadLevel(currentLevel);
        } else {
            console.log("You've completed all levels!");
        }
    }

    draw() {
        ctx.fillStyle = this.isOpen ? 'green' : 'brown';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}


// GRID
function drawGrid() {
    ctx.strokeStyle = 'grey';
    ctx.lineWidth = 0.5;

    // Dessiner les lignes verticales
    for (let x = 0; x <= canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Dessiner les lignes horizontales
    for (let y = 0; y <= canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function createXAxis() {
    const xAxis = document.getElementById('xAxis');
    const canvasWidth = canvas.width;

    for (let i = 0; i < canvasWidth; i += 50) {
        const label = document.createElement('span');
        label.textContent = i/50;
        xAxis.appendChild(label);
    }
}

function createYAxis() {
    const yAxis = document.getElementById('yAxis');
    const canvasHeight = canvas.height;

    for (let i = 0; i < canvasHeight; i += 50) {
        const label = document.createElement('span');
        label.textContent = i/50;
        yAxis.appendChild(label);
    }
}

createXAxis();
createYAxis();

const levels = [
    {
        player: { x: 100, y: 250 },
        platforms: [
            { type: 'HorizontalPlatform', x: 50, y: 350, width: 100, height: 20, distance: 3 },
            { type: 'StablePlatform', x: 150, y: 250, width: 100, height: 20 },
            { type: 'StablePlatform', x: 50, y: 150, width: 100, height: 20 },
            
            { type: 'StablePlatform', x: 550, y: 350, width: 100, height: 20 }
        ],
        enemies: [
            // { x: 300, y: 350, width: 50, height: 50, speed: 2 }
        ],
        coins: [
            { x: 250, y: 270, radius: 10 }
        ],
        spikes: [
            { x: 550, y: 150, width: 100 }, // Example spike in this level
            { x: 550, y: 250, width: 100 } // Example spike in this level
        ],
        doors: [
            { x: 580, y: 300, width: 40, height: 50 } // Example Door
        ]
    },
    {
        player: { x: 100, y: 250 },
        platforms: [
            { type: 'HorizontalPlatform', x: 50, y: 350, width: 100, height: 20, distance: 3 },
            { type: 'StablePlatform', x: 150, y: 250, width: 100, height: 20 },
            { type: 'StablePlatform', x: 50, y: 150, width: 100, height: 20 },
            
            { type: 'StablePlatform', x: 550, y: 350, width: 100, height: 20 }
        ],
        enemies: [
            // { x: 300, y: 350, width: 50, height: 50, speed: 2 }
        ],
        coins: [
            { x: 250, y: 270, radius: 10 }
        ],
        spikes: [
            { x: 550, y: 150, width: 100 }, // Example spike in this level
            { x: 550, y: 250, width: 100 } // Example spike in this level
        ],
        doors: [
            { x: 580, y: 300, width: 40, height: 50 } // Example Door
        ]
    }
    // Ajoutez plus de niveaux ici
];

const player = new Player(100, 300);
const enemies = [];
const platforms = [];
const coins = [];
const spikes = [];
const doors = [];

function loadLevel(levelIndex) {
    const levelData = levels[levelIndex];

    // Réinitialiser les objets de jeu
    platforms.length = 0;
    enemies.length = 0;
    coins.length = 0;
    spikes.length = 0;

    // Positionner le joueur
    player.x = levelData.player.x;
    player.y = levelData.player.y;

    // Créer les plateformes
    levelData.platforms.forEach(data => {
        if (data.type === 'FallingPlatform') {
            platforms.push(new FallingPlatform(data.x, data.y, data.width, data.height));
        } else if (data.type === 'StablePlatform') {
            platforms.push(new StablePlatform(data.x, data.y, data.width, data.height));
        } else if (data.type === 'HorizontalPlatform') {
            platforms.push(new HorizontalPlatform(data.x, data.y, data.width, data.height, data.distance));
        }
    });

    // Créer les ennemis
    levelData.enemies.forEach(data => {
        enemies.push(new Enemy(data.x, data.y, data.width, data.height, data.speed));
    });

    // Créer les pièces
    levelData.coins.forEach(data => {
        coins.push(new Coin(data.x, data.y, data.radius));
    });

    // Créer les piques
    levelData.spikes.forEach(data => {
        spikes.push(new Spike(data.x, data.y, data.width, data.height));
    });

    // Créer les portes
    levelData.doors.forEach(data => {
        doors.push(new Door(data.x, data.y, data.width, data.height));
    });
}


let currentLevel = 0;
loadLevel(currentLevel);


// const platforms = [];
const platformShapes = {
    "square" : { width: 50, height: 50},
}



function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grille
    drawGrid();

    // Joueur, ennemis, plateformes, pièces
    player.update(platforms, coins, enemies);
    enemies.forEach(enemy => enemy.update());
    platforms.forEach(platform => platform.update(player));
    coins.forEach(coin => coin.draw());
    spikes.forEach(spike => spike.update(player));
    doors.forEach(door => door.update(player));

    // Textes
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Coins: ${collectedCoins}`, canvas.width - 100, 30);

    ctx.fillStyle = 'black';
    ctx.fillText(`Lives: ${playerLives}`, 10, 30);

    // Vérifier si le joueur a collecté toutes les pièces pour passer au niveau suivant
    if (coins.length === 0) {
        currentLevel++;
        if (currentLevel < levels.length) {
            loadLevel(currentLevel);
        } else {
            console.log("You've completed all levels!");
        }
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
