const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageBox = document.getElementById('messageBox');

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const GRAVITY = 0.3;
const JUMP_POWER = -8;
const PLAYER_SPEED = 2;

let collectedCoins = 0;
let playerLives = 3;

let isGamePaused = false;

let keys = {};

const platformColors = {
    red : [],
    green : [],
    blue : [],
    pink : [],
    // etc.
}

// 

let jumpKeyPressed = false;

document.addEventListener('keydown', (event) => {
    if (isGamePaused) return; // Prevent actions if the game is paused
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
    if (isGamePaused) return; // Prevent actions if the game is paused
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

class Wall {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    update(entity) {
        this.checkCollision(entity);
        this.draw();
    }

    checkCollision(entity) {
        const entityRight = entity.x + entity.width;
        const entityBottom = entity.y + entity.height;
        const wallRight = this.x + this.width;
        const wallBottom = this.y + this.height;

        // Collision detection logic
        if (entityRight > this.x && entity.x < wallRight &&
            entityBottom > this.y && entity.y < wallBottom) {

            const overlapX = Math.min(wallRight - entity.x, entityRight - this.x);
            const overlapY = Math.min(wallBottom - entity.y, entityBottom - this.y);

            if (overlapX < overlapY) {
                if (entity.x < this.x) {
                    entity.x = this.x - entity.width; // Left collision
                } else {
                    entity.x = wallRight; // Right collision
                }
                entity.velocityX = 0;
            } else {
                if (entity.y < this.y) {
                    entity.y = this.y - entity.height; // Top collision
                    entity.velocityY = 0;
                    entity.onGround = true;
                } else {
                    entity.y = wallBottom; // Bottom collision
                    entity.velocityY = 0;
                }
            }
        }
    }

    draw() {
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}


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

    update(platforms, coins, enemies, walls) {
        this.velocityY += GRAVITY;
        this.x += this.velocityX;
        this.y += this.velocityY;

        this.onGround = false;
        this.nearPlatform = false;
        this.platformMessage = null;

        let closestPlatform = null;
        let closestDistance = Infinity;

        for (let platform of platforms) {
            if (this.y + this.height > platform.y && this.y + this.height < platform.y + platform.height &&
                this.x + this.width > platform.x && this.x < platform.x + platform.width) {
                this.y = platform.y - this.height;
                this.velocityY = 0;
                this.onGround = true;
            }

            const platformCenterX = platform.x + platform.width / 2;
            const platformCenterY = platform.y + platform.height / 2;
            const playerCenterX = this.x + this.width / 2;
            const playerCenterY = this.y + this.height / 2;

            const distance = Math.hypot(playerCenterX - platformCenterX, playerCenterY - platformCenterY);

            if (distance < closestDistance && this.x > platform.x && this.x < platform.x + platform.width &&
                this.y + this.height > platform.y - 100 && this.y < platform.y + platform.height + 100) {
                closestDistance = distance;
                closestPlatform = platform;
            }
        }

        if (closestPlatform) {
            this.nearPlatform = true;
            this.platformMessage = closestPlatform;
            closestPlatform.isDetected = true;
        }

        for (let platform of platforms) {
            if (platform !== closestPlatform) {
                platform.isDetected = false;
            }
            platform.update(this);
        }

        for (let wall of walls) {
            wall.update(this);  // Check collisions with walls
        }

        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.velocityY = 0;
            this.onGround = true;
        }

        if (keys['KeyA']) {
            this.velocityX = -PLAYER_SPEED;
            if(this.x <= 0) { 
                this.x = 0;
            }
        } else if (keys['KeyD']) {
            this.velocityX = PLAYER_SPEED;
            if(this.x >= canvasWidth - this.width) {
                this.x = canvasWidth - this.width;
            }
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
                        resetLevel();
                        return;
                    } else {
                        // Knockback effect
                        this.velocityX = this.x < enemy.x ? -PLAYER_SPEED : PLAYER_SPEED;
                        this.velocityY = JUMP_POWER / 2;
                    }
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
    constructor(x, y, width, height, color = [80,80,80]) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isDetected = false;
        this.isDetectedByActivate = false;
        this.typeChanged = false;
        this.isActivated = false;
        this.color = color
    }

    activate() {
        this.isActivated = true;
    }

    update(player, walls = []) {
        // Vérifier les collisions avec les murs
        for (let wall of walls) {
            wall.checkCollision(this);
        }

        this.draw();
    }

    draw() {
         const opacity = this.isDetected || this.isDetectedByActivate ? 0.2 : 1;  // 0.5 for 50% opacity when detected, 1 for full opacity otherwise
        ctx.fillStyle = `rgba(${this.color[0]},${this.color[1]},${this.color[2]},${opacity})`;  // Adjust color and opacity
        drawRoundedRect(ctx, this.x, this.y, this.width, this.height, 10);  // Draw the rectangle with rounded corners
    
    }

    isPlayerOnPlatform(player) {
        return player.y + player.height === this.y &&
               player.x + player.width > this.x &&
               player.x < this.x + this.width;
    }
}



class TeleportPlatform extends Platform {
    constructor(x, y, width, height, color, distanceX = 0, distanceY = 0) {
        super(x, y, width, height, color, '', false);
        this.distanceX = distanceX;
        this.distanceY = distanceY;
        this.originalX = x; // To remember the original position
        this.originalY = y;
        this.isMoving = false;
        this.canBeActivated = true;
        this.message = 
`action(){
    this.x += ${this.distanceX};
    this.y += ${this.distanceY};
}`; // Message par défaut
    }

    update(player) {
        // Check if the player is on the platform and presses the 'M' key
        if ((((this.isPlayerOnPlatform(player) && keys['Semicolon']) || this.isActivated) && this.canBeActivated)) {
            this.canBeActivated = false;
            
            console.log('move')
            console.log('isActivated : ' + this.isActivated)
            console.log('canBeActivated : ' + this.canBeActivated)
            this.canBeActivated = false;
            const gapX = this.x - player.x;
            const gapY = this.y - player.y;
            this.x = this.originalX + this.distanceX;
            this.y = this.originalY + this.distanceY;

            if(this.y <= 0) {
                this.y = canvasHeight - 50; 
            }
            if(this.y >= canvasHeight) {
                this.y = 50;
            }

            if(!this.isActivated){
                player.x = this.x - gapX; 
                player.y = this.y - gapY; 
                if(player.x <= 0) {
                    player.x = 0;
                }
                if(player.x >= canvasWidth - player.width) {
                    player.x = canvasWidth - player.width;
                }
                
            }

            setTimeout(() => {
                this.originalX = this.x;
                this.originalY = this.y;
                this.isActivated = false;
                this.canBeActivated = true;
            }, 200)
        }

        this.draw();
    }



}

class MovePlatform extends Platform {
    constructor(x, y, width, height, color, distanceX = 0, distanceY = 0) {
        super(x, y, width, height, color, '', false);
        this.distanceX = distanceX;
        this.distanceY = distanceY;
        this.originalX = x; // To remember the original position
        this.isMoving = false;
        this.message = 
`action(){
    this.x += ${this.distanceX};
    this.y += ${this.distanceY};
}`; // Message par défaut
    }

    update(player) {
        // Check if the player is on the platform and presses the 'L' key
        if (((this.isPlayerOnPlatform(player) && keys['Semicolon']) || this.isActivated) && !this.isMoving) {
            this.move();
        }

        if (this.isMoving) {
            this.x += this.distanceX; 
            this.y += this.distanceY; 
            if(this.x >= canvasWidth) {
                this.x = 0 - this.width + 15 ;
            }
            if(!this.isActivated && player.x > 0 && player.x < canvasWidth - player.width){
                player.x += this.distanceX; 
                player.y += this.distanceY; 
            }

            this.isMoving = false; 
            this.isActivated = false;
        }

        this.draw();
    }



    move() {
        this.isMoving = true;
    }
}

class LoopMovePlatform extends Platform {
    constructor(x, y, width, height, color, sequence = []) {
        super(x, y, width, height, color, '', false);
        this.distanceX = 1;
        this.distanceY = 1;
        this.originalX = x; // To remember the original position
        this.isMoving = false;
        this.canBeActivated = true;
        this.isLoopMoving = false;
        // this.sequence = ['right', 'up', 'left', 'down'];
        this.sequence = sequence;
        // this.sequence = ['right', 'right', 'left', 'down'];
        this.sequenceData = [
            // {
            //     targetX : 200,
            //     targetY : 350
            // },
            // {
            //     targetX : 200,
            //     targetY : 300
            // },
            // {
            //     targetX : 0,
            //     targetY : 300
            // },
            // {
            //     targetX : 0,
            //     targetY : 350
            // }
    ];
        this.sequenceIndex = 0;
        this.onTargetX = false;
        this.onTargetY = false;
        this.message = 
`action(){
    const i = 0;
    while(i < 50)){
        this.x++;
    }
}`; // Message par défaut
this.message = this.generateMessage()
    }

    update(player) {
        // Check if the player is on the platform and presses the 'L' key
        if (((this.isPlayerOnPlatform(player) && keys['Semicolon']) || this.isActivated) && !this.isMoving && this.canBeActivated) {
            this.createSequenceData();
            // console.log(this.sequenceData);
            this.canBeActivated = false;
            this.isLoopMoving = true;
            
            // this.move();
        }

        if(this.isLoopMoving) {
            // console.log('index :' + this.sequenceIndex)
            if(this.x < this.sequenceData[this.sequenceIndex].targetX){
                this.onTargetX = false;
                this.x += this.distanceX; 
                player.x += this.distanceX;
            } else if(this.x > this.sequenceData[this.sequenceIndex].targetX){
                this.onTargetX = false;
                this.x -= this.distanceX;
                player.x -= this.distanceX;
            } else {
                this.onTargetX = true;
            }
            // Move on Y axis
            if(this.y < this.sequenceData[this.sequenceIndex].targetY){
                this.onTargetY = false;
                this.y += this.distanceY; 
                player.y += this.distanceY;
            } else if(this.y > this.sequenceData[this.sequenceIndex].targetY){
                this.onTargetY = false;
                this.y -= this.distanceY;
                player.y -= this.distanceY;
            } else {
                this.onTargetY = true;
            }
            // When reaching target, increment index or stop the loop
            if(this.onTargetX && this.onTargetY){
                if(this.sequenceIndex < this.sequenceData.length){
                    this.sequenceIndex++;
                    if(this.sequenceIndex == this.sequenceData.length) {
                        this.sequenceIndex = 0;
                        this.isLoopMoving = false;
                        this.canBeActivated = true;
                    }
                } else {
                    this.sequenceIndex = 0;
                    this.isLoopMoving = false;
                    this.canBeActivated = true;
                }
            }
        }


        this.draw();
    }

    createSequenceData(){
        this.sequenceData = [];

        let baseX = this.x;
        let baseY = this.y;
        let targetX = baseX;
        let targetY = baseY;

        this.sequence.forEach(dir => {
            switch(dir) {
                case 'left':
                    targetX -= 50;
                    baseX = targetX;
                    this.sequenceData.push({targetX, targetY: baseY});
                    break;
                case 'right':
                    targetX += 50;
                    baseX = targetX;
                    this.sequenceData.push({targetX, targetY: baseY});
                    break;
                case 'up':
                    targetY -= 50;
                    baseY = targetY;
                    this.sequenceData.push({targetX : baseX, targetY});
                    break;
                case 'down':
                    targetY += 50;
                    baseY = targetY;
                    this.sequenceData.push({targetX : baseX, targetY});
                    break;
            }
        });
        console.log(this.sequenceData)
    }
    generateMessage() {
        let message = 'action(){\n';
        let suite = 1;
        let lastDir = this.sequence[0]; // Start with the first direction
    
        this.sequence.forEach((dir, i) => {
            if (i === 0) {
                // Skip the first element since we already initialized lastDir with it
                return;
            }
    
            if (dir === lastDir) {
                // If the direction is the same as the last one, increment the suite
                suite++;
            } else {
                // If the direction changes, output the accumulated movement and reset the suite
                switch (lastDir) {
                    case 'right':
                        message += `    for(let i = 0; i < ${suite * 50}; i++) { this.x++; }\n`;
                        break;
                    case 'left':
                        message += `    for(let i = 0; i < ${suite * 50}; i++) { this.x--; }\n`;
                        break;
                    case 'up':
                        message += `    for(let i = 0; i < ${suite * 50}; i++) { this.y--; }\n`;
                        break;
                    case 'down':
                        message += `    for(let i = 0; i < ${suite * 50}; i++) { this.y++; }\n`;
                        break;
                }
                suite = 1; // Reset suite for the new direction
                lastDir = dir; // Update lastDir to the current direction
            }
        });
    
        // Handle the final direction in the sequence
        switch (lastDir) {
            case 'right':
                message += `    for(let i = 0; i < ${suite * 50}; i++) { this.x++; }\n`;
                break;
            case 'left':
                message += `    for(let i = 0; i < ${suite * 50}; i++) { this.x--; }\n`;
                break;
            case 'up':
                message += `    for(let i = 0; i < ${suite * 50}; i++) { this.y--; }\n`;
                break;
            case 'down':
                message += `    for(let i = 0; i < ${suite * 50}; i++) { this.y++; }\n`;
                break;
        }
    
        message += '}';

        return message;
    }
}    


class CountdownLoopPlatform extends Platform {
    constructor(x, y, width, height, color, loopType = 0, sequence = [], door = null) {
        super(x, y, width, height, color);
        this.loopCount = 0;
        this.totalLoopCount = sequence.length;
        this.canNextIteration = true;
        this.isVisible = true;
        this.isActivated = false;
        this.loopType = loopType;
        this.sequence = sequence; 
        this.door = door;
        this.message = this.generateMessage();
    }

    update(player) {
        if (this.isPlayerOnPlatform(player) && !this.isActivated && keys['Semicolon']) {
            this.isActivated = true;
            this.canNextIteration = false;
            this.executeAction(player);
        }
        if (this.isVisible) {
            this.draw();
        }
    }

    executeAction(player) {
        const baseInterval = 500; // Intervalle de temps de base (500ms)
        
        const nextIteration = () => {
            // Vérifie si le joueur est toujours sur la plateforme
            if (!this.isPlayerOnPlatform(player)) {
                // Si le joueur n'est plus sur la plateforme, arrête le processus
                this.loopCount = 0;
                this.isActivated = false;
                this.canNextIteration = true;
                return;
            }
    
            if (this.loopCount < this.totalLoopCount) {
                const action = this.sequence[this.loopCount];
                this.performAction(action, player);
    
                // Définir l'intervalle personnalisé en fonction de l'action
                let interval = baseInterval;
                if (action === 'jump') {
                    interval = 1000;
                } else if (action === '1.5jump') {
                    interval = 1500; // 1000ms pour 1.5jump
                } else if (action === '2jump') {
                    interval = 2000; // 1500ms pour 2jump
                }
    
                this.loopCount++;
                setTimeout(nextIteration, interval);
            } else {
                this.loopCount = 0;
                this.isActivated = false;
                this.canNextIteration = true;
            }
        };
    
        nextIteration();
    }
    

    performAction(action, player) {
        switch (action) {
            case "+x":
                this.x += 50;
                player.x += 50;
                break;
            case "-x":
                this.x -= 50;
                player.x -= 50;
                break;
            case "+y":
                this.y += 50;
                player.y += 50;
                break;
            case "-y":
                this.y -= 50;
                player.y -= 50;
                break;
            case "-health":
                playerLives--;
                if (playerLives <= 0) {
                    resetLevel(); // Vérifie les vies et réinitialise le niveau si nécessaire
                    return;
                }
                break;
            case "+health":
                playerLives++;
                if (playerLives <= 0) {
                    resetLevel(); // Vérifie les vies et réinitialise le niveau si nécessaire
                    return;
                }
                break;
            case "jump":
                player.velocityY = JUMP_POWER;
                break;
            case "1.5jump":
                player.velocityY = 1.5 * JUMP_POWER;
                break;
            case "2jump":
                player.velocityY = 2 * JUMP_POWER;
                break;
            case "hide":
                this.isVisible = false;
                break;
            case "show":
                this.isVisible = true;
                break;
            case "open":
                this.door.open();
                break;
            default:
                console.log(`Unknown action: ${action}`);
        }
    }

    generateMessage() {
        let message = 'action(){\n';
        switch(this.loopType) {
            case 0:
                message += '  for(let i = 0; i < ' + this.totalLoopCount + '; i++) {\n';
                break;
            case 1:
                message += '  let index = 0;\n';
                message += '  while (index < ' + this.totalLoopCount + ') {\n';
                break;
            case 2:
                message += '  let index = 0;\n';
                message += '  do {\n';
                break;
            default:
                console.log('Invalid type of loop : ' + this.loopType);

        }
        message += '    switch(i % ' + this.totalLoopCount + ') {\n';
        
        this.sequence.forEach((action, index) => {
            message += `      case ${index}:\n`;
            switch (action) {
                case "+x":
                    message += '        this.x += 50;\n';
                    message += '        player.x += 50;\n';
                    break;
                case "-x":
                    message += '        this.x -= 50;\n';
                    message += '        player.x -= 50;\n';
                    break;
                case "+y":
                    message += '        this.y += 50;\n';
                    message += '        player.y += 50;\n';
                    break;
                case "-y":
                    message += '        this.y -= 50;\n';
                    message += '        player.y -= 50;\n';
                    break;
                case "-health":
                    message += '        player.health--;\n';
                    break;
                case "+health":
                    message += '        player.health++;\n';
                    break;
                case "open":
                    message += '        this.door.open();\n';
                    break;
                case "jump":
                    message += '        if(this.isPlayerOnPlatform()){ player.velocityY = JUMP_POWER }\n';
                    break;
                case "1.5jump":
                    message += '        if(this.isPlayerOnPlatform()){ player.velocityY = 1.5 * JUMP_POWER }\n';
                    break;
                case "2jump":
                    message += '        if(this.isPlayerOnPlatform()){ player.velocityY = 2 * JUMP_POWER }\n';
                    break;
                case "hide":
                    message += '        this.isVisible = false;\n';
                    break;
                case "show":
                    message += '        this.isVisible = true;\n';
                    break;
                default:
                    message += `        // Unknown action: ${action}\n`;
            }
            message += '        break;\n';
        });

        message += '    }\n';
        switch (this.loopType) {
            case 0 :
                message += '  }\n';
                break;
            case 1 :
                message += '    index++;\n';
                message += '  }\n';
                break;
            case 2 :
                message += '    index++;\n';
                message += `  } while (index < ${this.totalLoopCount})\n`;
                break;
        }
        message += '}';

        return message;
    }
}


class ActivatePlatform extends Platform {
    constructor(x, y, width, height, color, targetPlatform) {
        super(x, y, width, height, color);
        this.targetPlatform = targetPlatform; // Reference to the MovePlatform to activate
        this.message = 
`action(){
    this.targetPlatform.activate();
}`;
    }

    update(player) {
        if(this.isPlayerOnPlatform(player)) {
            this.targetPlatform.isDetectedByActivate = true;

            if(keys['Semicolon']) {
                this.activatePlatform();
            }

        } else {
            this.targetPlatform.isDetectedByActivate = false;
        }

        this.draw();
    }

    activatePlatform() {
        this.targetPlatform.activate(); // Call the activate method on the target platform

    }

    isPlayerOnPlatform(player) {
        return player.y + player.height === this.y &&
               player.x + player.width > this.x &&
               player.x < this.x + this.width;
    }
}


class OpenDoorPlatform extends Platform {
    constructor(x, y, width, height, color, door) {
        super(x, y, width, height, color);
        this.door = door;
        this.message = 
`action(){
    this.door.open();
}`;
    }

    update(player) {
        // Check if the player is on the platform and presses the 'L' key
        if ((this.isPlayerOnPlatform(player) && keys['Semicolon']) || this.isActivated) {
            this.openDoor();
            this.isActivated = false;
        }

        this.draw();
    }

    isPlayerOnPlatform(player) {
        return player.y + player.height === this.y &&
               player.x + player.width > this.x &&
               player.x < this.x + this.width;
    }

    openDoor() {
        this.door.open();
        console.log('Door opened')
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
    constructor(x, y, width, height, color) {
        super(x, y, width, height, color, '', false);
        this.message = 
`action(){
    this.x = this.x;
    this.y = this.y
}`;
 // Message par défaut
    }

    update() {
        super.update(); // Appelle la méthode update de la classe parente Platform
    }
}

class FallingPlatform extends Platform {
    constructor(x, y, width, height, color) {
        super(x, y, width, height, color, '', false);
        this.message = 
`action(){
    while(this.y < canvas.height) {
        this.y++;
    }
}
`; // Message par défaut
        this.fallen = false;
    }

    update(player) {
        // super.update(); // Appelle la méthode update de la classe parente Platform

        // console.log('is player on platform ?')
        // Si le joueur est sur la plateforme et que la touche M est pressée
        if (this.isPlayerOnPlatform(player) && keys['Semicolon'] && !this.triggerFall) {
            this.triggerFall = true; // Déclenche la chute de la plateforme
        }

        // Si la plateforme est en train de tomber
        if (this.triggerFall && !this.fallen) {
            this.y += this.fallSpeed;
            this.fallSpeed += GRAVITY;

            // Si la plateforme atteint le bas de l'écran
            if (this.y > canvas.height) {
                this.fallen = true;
            }
        }

        this.draw(); // Appelle la méthode draw de la classe parente Platform
    }

    isPlayerOnPlatform(player) {
        return player.y + player.height === this.y &&
               player.x + player.width > this.x &&
               player.x < this.x + this.width;
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
    constructor(x, y, size, angle = 'up') {
        this.x = x;
        this.y = y;
        this.size = size; // Use size to keep it consistent for both width and height
        this.spikeHeight = 20; // Height of the spikes (triangles)
        this.angle = angle; // New parameter to determine spike orientation
        this.canInflictDamage = true;

    }

    update(player) {
        console.log('caninflictdamage : ' + this.canInflictDamage)
        if (this.checkCollisionWithPlayer(player)) {
            // Décrémenter la vie du joueur
            if(this.canInflictDamage){
                this.canInflictDamage = false;
                playerLives--;
            
            // Définir le saut en fonction de l'angle du spike
            switch (this.angle) {
                case 'up':
                    player.velocityY = JUMP_POWER; // Saut normal vers le haut
                    break;
                case 'down':
                    player.velocityY = -JUMP_POWER; // Saut vers le bas (peut être utile dans certaines mécaniques)
                    break;
                case 'left':
                    player.velocityX = -80; // Saut vers la gauche
                    player.velocityY = 0; // Annuler le saut vertical pour un mouvement horizontal pur
                    break;
                case 'right':
                    player.velocityX = 80; // Saut vers la droite
                    player.velocityY = 0; // Annuler le saut vertical pour un mouvement horizontal pur
                    break;
            }
            if(playerLives <= 0){
                resetLevel();
                return;
            }
            }

            setTimeout(() => {
                this.canInflictDamage = true;
            }, 1000);
        }

        this.draw();
    }

    checkCollisionWithPlayer(player) {
        let collision = false;

        switch (this.angle) {
            case 'up':
                collision = (
                    player.x < this.x + this.size &&
                    player.x + player.width > this.x &&
                    player.y < this.y &&
                    player.y + player.height > this.y - this.spikeHeight
                );
                break;
            case 'down':
                collision = (
                    player.x < this.x + this.size &&
                    player.x + player.width > this.x &&
                    player.y < this.y + this.spikeHeight + 15 &&
                    player.y > this.y
                );
                break;
            case 'left':
                collision = (
                    player.x < this.x &&
                    player.x + player.width > this.x - this.spikeHeight &&
                    player.y < this.y + this.size &&
                    player.y + player.height > this.y
                );
                break;
            case 'right':
                collision = (
                    player.x < this.x + this.spikeHeight &&
                    player.x + player.width > this.x &&
                    player.y < this.y + this.size &&
                    player.y + player.height > this.y
                );
                break;
        }

        return collision;
    }

    draw() {
        ctx.fillStyle = 'black';

        for (let i = 0; i < this.size; i += this.spikeHeight) {
            ctx.beginPath();
            switch (this.angle) {
                case 'up':
                    ctx.moveTo(this.x + i, this.y);
                    ctx.lineTo(this.x + i + this.spikeHeight / 2, this.y - this.spikeHeight);
                    ctx.lineTo(this.x + i + this.spikeHeight, this.y);
                    break;
                case 'down':
                    ctx.moveTo(this.x + i, this.y + this.spikeHeight);
                    ctx.lineTo(this.x + i + this.spikeHeight / 2, this.y + 2 * this.spikeHeight);
                    ctx.lineTo(this.x + i + this.spikeHeight, this.y + this.spikeHeight);
                    break;
                case 'left':
                    ctx.moveTo(this.x, this.y + i);
                    ctx.lineTo(this.x - this.spikeHeight, this.y + i + this.spikeHeight / 2);
                    ctx.lineTo(this.x, this.y + i + this.spikeHeight);
                    break;
                case 'right':
                    ctx.moveTo(this.x + this.spikeHeight, this.y + i);
                    ctx.lineTo(this.x + 2 * this.spikeHeight, this.y + i + this.spikeHeight / 2);
                    ctx.lineTo(this.x + this.spikeHeight, this.y + i + this.spikeHeight);
                    break;
            }
            ctx.closePath();
            ctx.fill();
        }
    }
}

class Door {
    constructor(x, y, width, height, isOpen) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isOpen = isOpen; // The door is closed by default
    }

    update(player) {
        if (this.isPlayerNear(player) && this.isOpen) {
            this.goToNextLevel();
        }

        this.draw();
    }

    toggleOpen() {
        this.isOpen = !this.isOpen;
    }

    open() {
        this.isOpen = true;
    }

    close() {
        this.isOpen = false;
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
            // All levels are completed
            this.showCompletionMessage();
            cancelAnimationFrame(animationFrameId); // Stop the animation
            messageBox.style.display = 'block'; // Display the message box
            isGamePaused = true; // Pause the game
        }
    }

    showCompletionMessage() {
        messageBox.textContent = 'Congratulations! You have completed all the levels!';
    }

    draw() {
        ctx.fillStyle = this.isOpen ? 'green' : 'grey';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}


// GRID
function drawGrid() {
    ctx.strokeStyle = 'grey';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([5, 5]); // 5 pixels line, 5 pixels space

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

function drawGrid() {
    ctx.strokeStyle = 'lightgrey';
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

// MOUSE

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    checkClickOnBlocks(mouseX, mouseY);
});

function checkClickOnBlocks(mouseX, mouseY) {
    // Vérifier les plateformes
    for (let platform of platforms) {
        if (mouseX >= platform.x && mouseX <= platform.x + platform.width &&
            mouseY >= platform.y && mouseY <= platform.y + platform.height) {
            if (platform.message) {
                messageBox.innerHTML = `<pre><code class="language-js">${platform.message}</code></pre>`;
                Prism.highlightAll();
            }
        }
    }

    // Vérifier les ennemis (si nécessaire)
    for (let enemy of enemies) {
        if (mouseX >= enemy.x && mouseX <= enemy.x + enemy.width &&
            mouseY >= enemy.y && mouseY <= enemy.y + enemy.height) {
            // Affichez le message de l'ennemi si nécessaire
        }
    }

    // Vérifier les murs
    for (let wall of walls) {
        if (mouseX >= wall.x && mouseX <= wall.x + wall.width &&
            mouseY >= wall.y && mouseY <= wall.y + wall.height) {
            // Affichez le message du mur si nécessaire
        }
    }

    // Vérifier d'autres types de blocs si nécessaire
}



const levels = [
    // level 1
    {
        player: { x: 100, y: 250 },
        platforms: [
            { type: 'MovePlatform', x: 50, y: 150, width: 100, height: 20, distanceX: 1, distanceY: 0, color: [0,0,50] },
            { type: 'OpenDoorPlatform', x: 150, y: 250, width: 100, height: 20, color: [0, 0, 50]},
            { type: 'MovePlatform', x: 50, y: 350, width: 100, height: 20, distanceX: 1, distanceY: 0, color: [0,0,50]},
            //door
            { type: 'StablePlatform', x: 550, y: 150, width: 100, height: 20 }
        ],
        enemies: [
            // { x: 300, y: 350, width: 50, height: 50, speed: 2 }
        ],
        coins: [
            { x: 200, y: 225, radius: 10 },
            { x: 100, y: 125, radius: 10 },
            { x: 200, y: 125, radius: 10 },
            { x: 300, y: 125, radius: 10 },
            { x: 400, y: 125, radius: 10 },
            { x: 500, y: 125, radius: 10 },
        ],
        spikes: [
            { x: 550, y: 350, width: 100 }, // Example spike in this level
            { x: 550, y: 250, width: 100 } // Example spike in this level
        ],
        doors: [
            // test pour isOpen
            { x: 580, y: 100, width: 40, height: 50, isOpen: false } // Example Door
        ],
        walls : []
    },
    // level 2
    {
        _player: { x: 280, y: 280 },
        get player() {
            return this._player;
        },
        set player(value) {
            this._player = value;
        },
        platforms: [
            { type: 'MovePlatform', x: 250, y: 350, width: 100, height: 20, distanceX: 1, distanceY: 0, color: [0,0,50], id: 'right-1'},
            // { type: 'MovePlatform', x: 300, y: 350, width: 100, height: 20, distanceX: 1, distanceY: 0, color: [0,0,50]},
            { type: 'TeleportPlatform', x: 550, y: 360, width: 100, height: 20, distanceX: 0, distanceY: -150, color: [0,0,50], id: 'teleport-up-1'},
            { type: 'TeleportPlatform', x: 50, y: 50, width: 100, height: 20, distanceX: 0, distanceY: 150, color: [0,0,50]},
            
            // { type: 'FallingPlatform', x: 50, y: 150, width: 100, height: 20, distanceX: 1, distanceY: 0, color: [250,0,50]},
            // { type: 'OpenDoorPlatform', x: 150, y: 250, width: 100, height: 20, color: [0, 200, 0], id: 'horizontal-1' },
            { type: 'ActivatePlatform', x: 400, y: 200, width: 100, height: 20, distanceX: 1, distanceY: 0, color: [0,0,50], targetId: 'right-1'},
            { type: 'ActivatePlatform', x: 200, y: 200, width: 100, height: 20, distanceX: 1, distanceY: 0, color: [0,0,50], targetId: 'teleport-up-1'},
            //doors
            // { type: 'FallingPlatform', x: 50, y: 350, width: 100, height: 20},
            // { type: 'StablePlatform', x: 550, y: 350, width: 100, height: 20}
        ],
        enemies: [
            // { x: 300, y: 350, width: 50, height: 50, speed: 2 }
        ],
        coins: [
            // Bas
            { x: 100, y: 300, radius: 10 },
            { x: 150, y: 300, radius: 10 },
            { x: 100, y: 350, radius: 10 },
            { x: 150, y: 350, radius: 10 },
            { x: 125, y: 325, radius: 10 },
            // Haut
            { x: 600, y: 60, radius: 10 },
            { x: 500, y: 60, radius: 10 },
            { x: 400, y: 60, radius: 10 },
            { x: 300, y: 60, radius: 10 },
            { x: 200, y: 60, radius: 10 },
        ],
        spikes: [
            { x: 0, y: 410, width: 700 }
        ],
        doors: [
            // test pour isOpen
            { x: 320, y: 160, width: 60, height: 100, isOpen: true } // Example Door
        ],
        walls: [
            { x: 0, y: 250, width: 700, height: 10 }, // Example wall
            { x: 0, y: 100, width: 700, height: 10 }, // Example wall
        ]
    },
    // Level 3
    {
        _player: { x: 625, y: 250 },
        get player() {
            return this._player;
        },
        set player(value) {
            this._player = value;
        },  
        platforms: [
            // door
            { type: 'StablePlatform', x: 0, y: 100, width: 100, height: 20},

            { type: 'OpenDoorPlatform', x: 150, y: 250, width: 100, height: 20, color: [0, 0, 50]},

            // { type: 'LoopMovePlatform', x: 0, y: 350, width: 100, height: 20, color: [0,0,50], sequence: ['up', 'up', 'right', 'down', 'down', 'up', 'left']},
            { type: 'MovePlatform', x: 450, y: 350, width: 100, height: 20, distanceX: -1, distanceY: 0, color: [0,0,50]},
            { type: 'CountdownLoopPlatform', x: 600, y: 300, width: 100, height: 20, color: [0,0,50], loopType: 0, sequence: ['-x', 'jump', '1.5jump', '2jump']},
        ],
        enemies: [
            // { x: 300, y: 350, width: 50, height: 50, speed: 2 }
        ],
        coins: [
            { x: 650, y: 50, radius: 10 },
            { x: 650, y: 100, radius: 10 },
            { x: 650, y: 150, radius: 10 },

            { x: 375, y: 125, radius: 10 },
            { x: 425, y: 125, radius: 10 },
        ],
        spikes: [
            { x: 0, y: -30, width: 700, angle: 'down' },
            { x: 0, y: 415, width: 700, angle: 'up' },
            
        ],
        doors: [
            { x: 25, y: 50, width: 50, height: 50, isOpen: false }
        ],
        walls: [
            { x: 600, y: 0, width: 100, height: 10 }, 
            { x: 350, y: 150, width: 100, height: 50 }, 
        ]
    },
    // Level 4
    {
        _player: { x: 125, y: 50 },
        get player() {
            return this._player;
        },
        set player(value) {
            this._player = value;
        },  
        platforms: [
            // door
            { type: 'CountdownLoopPlatform', x: 150, y: 100, width: 100, height: 20, color: [0,0,50], loopType: 0, sequence: ['+x', '+health', '2jump']},
            { type: 'CountdownLoopPlatform', x: 100, y: 200, width: 100, height: 20, color: [0,0,50], loopType: 1, sequence: ['+x', '-health', 'open']},
            { type: 'CountdownLoopPlatform', x: 50, y: 300, width: 100, height: 20, color: [0,0,50], loopType: 2, sequence: ['-health', '+x','+x', '1.5jump']},
            
            { type: 'MovePlatform', x: 450, y: 350, width: 100, height: 20, distanceX: 1, distanceY: 0, color: [0,0,50]},
            { type: 'CountdownLoopPlatform', x: 600, y: 250, width: 100, height: 20, color: [0,0,50], loopType: 1, sequence: ['-x', '-x', '2jump']},
        ],
        enemies: [
            // { x: 300, y: 350, width: 50, height: 50, speed: 2 }
        ],
        coins: [

            { x: 400, y: 75, radius: 10 },
            { x: 450, y: 75, radius: 10 },
            { x: 500, y: 75, radius: 10 },

            { x: 400, y: 125, radius: 10 },
            { x: 450, y: 125, radius: 10 },
            { x: 500, y: 125, radius: 10 },
        ],
        spikes: [
            { x: 0, y: -30, width: 550, angle: 'down' },
            { x: 0, y: 415, width: 700, angle: 'up' },
            { x: 550, y: 0, width: 300, angle: 'left' }, 

            
        ],
        doors: [
            { x: 625, y: 100, width: 50, height: 50, isOpen: false }
        ],
        walls: [
            // { x: 550, y: 0, width: 10, height: 300 }, 
            // { x: 350, y: 150, width: 100, height: 50 }, 
        ]
    },
    
    // Level 5
    {
        // haut
        // _player: { x: 325, y: 0 },
        // haut à droite
        // _player: { x: 550, y: 0 },
        // bas à droite
        _player: { x: 575, y: 300 },
        get player() {
            return this._player;
        },
        set player(value) {
            this._player = value;
        },
        platforms: [
            { type: 'LoopMovePlatform', x: 300, y: 50, width: 100, height: 20, color: [0,0,50], sequence: ['left', 'left', 'down', 'right', 'right', 'down', 'down', 'up', 'right']},
            { type: 'LoopMovePlatform', x: 550, y: 100, width: 100, height: 20, color: [0,0,50], sequence: ['left', 'down', 'right', 'down', 'down', 'up', 'right']},
            { type: 'LoopMovePlatform', x: 0, y: 350, width: 100, height: 20, color: [0,0,50], sequence: ['up', 'up', 'right', 'down', 'down', 'up', 'left']},
            { type: 'MovePlatform', x: 550, y: 350, width: 100, height: 20, distanceX: -1, distanceY: 0, color: [0,0,50]},
            { type: 'MovePlatform', x: 550, y: 350, width: 100, height: 20, distanceX: 0, distanceY: -1, color: [0,0,50]},
            { type: 'MovePlatform', x: 100, y: 100, width: 100, height: 20, distanceX: 1, distanceY: 0, color: [0,0,50]},
            
        ],
        enemies: [
            // { x: 300, y: 350, width: 50, height: 50, speed: 2 }
        ],
        coins: [
            // { x: 100, y: 300, radius: 10 },
        ],
        spikes: [
            // Bas à gauche
            { x: 100, y: 150, width: 100, angle: 'up' },
            { x: 180, y: 150, width: 100, angle: 'right' },
            { x: 210, y: 250, width: 90, angle: 'up' },

            // Bas
            { x: 0, y: 410, width: 700, angle: 'up' },
            
            // Droite
            { x: 450, y: 200, width: 50, angle: 'up' },
            { x: 450, y: 240, width: 50, angle: 'down' },
            
        ],
        doors: [
            { x: 450, y: 200, width: 50, height: 50, isOpen: true }
        ],
        walls: [
            // sous porte
            { x: 450, y: 250, width: 50, height: 10 }, 
            { x: 500, y: 200, width: 10, height: 60 }, 
        ]
    }
];



const player = new Player(100, 300);
const enemies = [];
const platforms = [];
const coins = [];
const spikes = [];
const doors = [];
const walls = [];

const platformClasses = {
    MovePlatform,
    ActivatePlatform,
    OpenDoorPlatform,
    StablePlatform,
    FallingPlatform,
    TeleportPlatform,
    CountdownLoopPlatform
};


function loadLevel(levelIndex) {
    const levelData = levels[levelIndex];

    // Réinitialiser les objets de jeu
    platforms.length = 0;
    enemies.length = 0;
    coins.length = 0;
    spikes.length = 0;
    doors.length = 0;
    walls.length = 0;

    levelData.doors.forEach(data => {
        doors.push(new Door(data.x, data.y, data.width, data.height, data.isOpen));
    })
    levelData.walls.forEach(data => {
        walls.push(new Wall(data.x, data.y, data.width, data.height));
    });

    // Positionner le joueur
    player.x = levelData.player.x;
    player.y = levelData.player.y;

    const platformMap = {}; // To map platforms by ID


    // Créer les plateformes
    levelData.platforms.forEach(data => {
        let platform;
        let door = doors[0];
        switch(data.type) {
            case 'FallingPlatform':
                platform = new FallingPlatform(data.x, data.y, data.width, data.height, data.color);
                break;
            case 'StablePlatform':
                platform = new StablePlatform(data.x, data.y, data.width, data.height, data.color);
                break;
            case 'MovePlatform':
                platform = new MovePlatform(data.x, data.y, data.width, data.height, data.color, data.distanceX, data.distanceY);
                break;
            case 'LoopMovePlatform':
                platform = new LoopMovePlatform(data.x, data.y, data.width, data.height, data.color, data.sequence);
                break;
            case 'CountdownLoopPlatform':
                // let door = doors[0];
                platform = new CountdownLoopPlatform(data.x, data.y, data.width, data.height, data.color, data.loopType, data.sequence, door);
                break;
            case 'TeleportPlatform':
                platform = new TeleportPlatform(data.x, data.y, data.width, data.height, data.color, data.distanceX, data.distanceY);
                break;
            case 'ActivatePlatform':
                const targetPlatform = platformMap[data.targetId];
                platform = new ActivatePlatform(data.x, data.y, data.width, data.height, data.color, targetPlatform);
                break;
            case 'OpenDoorPlatform':
                // door = doors[0];
                platform = new OpenDoorPlatform(data.x, data.y, data.width, data.height, data.color, door);
                break;
        }
        if (data.id) {
            platformMap[data.id] = platform;
        }
        platforms.push(platform);
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
        spikes.push(new Spike(data.x, data.y, data.width, data.angle));
    });
}



let currentLevel = 0;
loadLevel(currentLevel);


// const platforms = [];
const platformShapes = {
    "square" : { width: 50, height: 50},
}


function resetLevel() {
    playerLives = 3;
    player.velocityY = 0;
    player.velocityX = 0;
    
    collectedCoins = Math.max(0, collectedCoins - 5);
    
    loadLevel(currentLevel);
}

let animationFrameId;

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner la grille
    drawGrid();

    // Mise à jour des portes
    doors.forEach(door => door.update(player));

    // Mise à jour du joueur
    player.update(platforms, coins, enemies, walls);
    
    // Mise à jour des plateformes
    platforms.forEach(platform => platform.update(player, walls));
    
    // Dessiner les pièces
    coins.forEach(coin => coin.draw());
    spikes.forEach(spike => spike.update(player));
    
    // Dessiner les murs
    walls.forEach(wall => wall.draw());

    // Afficher le nombre de pièces collectées et les vies restantes
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Coins: ${collectedCoins}`, canvas.width - 100, 30);
    ctx.fillText(`Lives: ${playerLives}`, 10, 30);

    if(isGamePaused) return;

    // Capturer l'ID de la frame pour pouvoir l'arrêter plus tard
    animationFrameId = requestAnimationFrame(gameLoop);

}


gameLoop();
