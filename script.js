const gameArea = document.getElementById("gameArea");
const basket = document.getElementById("basket");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");
const livesDisplay = document.getElementById("lives");
const gameOverText = document.getElementById("gameOver");
const highScoreMsg = document.getElementById("highScoreMsg");
const highScoreValue = document.getElementById("highScoreValue");
const startOverlay = document.getElementById("startOverlay");
const playAgainBtn = document.getElementById("playAgainBtn");
const touchSlider = document.getElementById("touchSlider");

let basketX = gameArea.clientWidth / 2 - 40;
let score = 0;
let time = 0;
let lives = 5;
let level = 1;
let fallSpeed = 3;
let gameRunning = false;
let movingLeft = false;
let movingRight = false;
let slowed = false;
let paused = false;
let allIntervals = [];

let windDirection = "none";
let windActive = false;
let suddenDeath = false;
let savedLives = lives;
let wallActive = false;
let wallElement = null;

let highScore = localStorage.getItem("highScore") || 0;
let usingSlider = false;

// Controls
document.getElementById("pauseBtn").addEventListener("click", () => {
  paused = !paused;
  document.getElementById("pauseBtn").innerText = paused ? "▶️ Resume" : "⏸️ Pause";
});
document.getElementById("restartBtn").addEventListener("click", () => window.location.reload());
playAgainBtn.addEventListener("click", () => window.location.reload());

// Keyboard control
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") movingLeft = true;
  if (e.key === "ArrowRight") movingRight = true;
});
document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") movingLeft = false;
  if (e.key === "ArrowRight") movingRight = false;
});

// Slider control
if (touchSlider) {
  touchSlider.addEventListener("input", () => {
    usingSlider = true;
    const percent = parseInt(touchSlider.value);
    const maxX = gameArea.clientWidth - 50;
    basketX = (percent / 100) * maxX;
  });
  touchSlider.addEventListener("change", () => usingSlider = false);
}

// Basket movement
function moveBasket() {
  if (!gameRunning || paused) {
    requestAnimationFrame(moveBasket);
    return;
  }

  if (!usingSlider) {
    if (movingLeft && basketX > 0) basketX -= 5;
    if (movingRight && basketX < gameArea.clientWidth - 50) basketX += 5;
  }

  basket.style.left = basketX + "px";
  requestAnimationFrame(moveBasket);
}
moveBasket();

// Start screen
function showStartOverlay() {
  startOverlay.style.display = "block";
  startOverlay.innerText = "Ready...";
  setTimeout(() => {
    startOverlay.innerText = "Set...";
    setTimeout(() => {
      startOverlay.innerText = "Go!";
      setTimeout(() => {
        startOverlay.style.display = "none";
        gameRunning = true;
      }, 1000);
    }, 1000);
  }, 1000);
}
showStartOverlay();

// Timer & level progression
allIntervals.push(setInterval(() => {
  if (!gameRunning || paused) return;
  time++;
  timerDisplay.innerText = time;

  if (time % 8 === 0 && fallSpeed < 25) {
    level++;
    if (level <= 10) fallSpeed += 0.5;
    else if (level <= 15) fallSpeed += 1;
    else fallSpeed += 1.5;
  }
}, 1000));

// Natural multi-ball drop with delays and spacing
allIntervals.push(setInterval(() => {
  if (!gameRunning || paused) return;

  let ballsToDrop = 1;
  if (level >= 5 && level < 10) ballsToDrop = 2;
  else if (level >= 10 && level < 15) ballsToDrop = 3;
  else if (level >= 15 && level < 20) ballsToDrop = 2;
  else if (level >= 20) ballsToDrop = 1;

  const usedX = [];

  for (let i = 0; i < ballsToDrop; i++) {
    setTimeout(() => {
      let maxX = gameArea.clientWidth - 40;
      let x;
      do {
        x = 5 + Math.random() * (maxX - 10); // avoid edges
      } while (usedX.some(pos => Math.abs(pos - x) < 45));
      usedX.push(x);
      dropObject(x);
    }, i * (200 + Math.random() * 300));
  }
}, 1300));

// Wind system
setInterval(() => {
  if (!gameRunning || level < 8 || paused) return;
  const directions = ["left", "right", "none"];
  windDirection = directions[Math.floor(Math.random() * directions.length)];
  windActive = windDirection !== "none";
}, 12000);

// Sudden Death
setInterval(() => {
  if (!gameRunning || paused || level < 10 || suddenDeath) return;

  const alert = document.getElementById("deathAlert");
  alert.style.display = "block";

  setTimeout(() => {
    alert.style.display = "none";
    suddenDeath = true;
    savedLives = lives;
    lives = 1;
    livesDisplay.innerText = lives;

    setTimeout(() => {
      suddenDeath = false;
      lives = savedLives;
      livesDisplay.innerText = lives;
    }, 5000);
  }, 3000);
}, 25000);

// Drop object
function dropObject(posX = null) {
  const obj = document.createElement("div");
  obj.classList.add("ball");

  let type = "ball";
  const rand = Math.random();

  if (rand < 0.04) type = "heart";
  else if (rand < 0.08) type = "clock";
  else {
    let bombChance = 0;
    if (fallSpeed >= 6) bombChance = 0.15;
    if (fallSpeed >= 8) bombChance = 0.25;
    if (fallSpeed >= 10) bombChance = 0.35;
    if (rand < bombChance) type = "bomb";
  }

  obj.innerText = type === "heart" ? "❤️" : type === "clock" ? "⏰" : type === "bomb" ? "💣" : "🏀";
  obj.setAttribute("data-type", type);
  obj.dataset.bounce = "none";

  const maxX = gameArea.clientWidth - 40;
  obj.style.left = `${Math.max(5, Math.min(posX || Math.random() * maxX, maxX))}px`;
  gameArea.appendChild(obj);

  let ballY = 0;
  const fall = setInterval(() => {
    if (!gameRunning || paused) {
      clearInterval(fall);
      obj.remove();
      return;
    }

    ballY += fallSpeed;
    obj.style.top = ballY + "px";

    // Wind effect
    if (windActive && !obj.dataset.bounce) {
      let x = parseFloat(obj.style.left);
      if (windDirection === "left") obj.style.left = Math.max(0, x - 1.5) + "px";
      else if (windDirection === "right") obj.style.left = Math.min(maxX, x + 1.5) + "px";
    }

    // Wall bounce
    if (wallElement) {
      const wallTop = 200;
      const wallLeft = parseFloat(wallElement.style.left);
      const wallRight = wallLeft + 60;
      const objLeft = parseFloat(obj.style.left);
      const objRight = objLeft + 40;

      if (ballY >= wallTop - 10 && ballY <= wallTop + 20) {
        if (objRight >= wallLeft && objLeft <= wallRight) {
          if (obj.dataset.bounce === "none") {
            obj.dataset.bounce = Math.random() > 0.5 ? "left" : "right";
          }
        }
      }
    }

    // Apply bounce direction
    let dir = obj.dataset.bounce;
    if (dir === "left") obj.style.left = Math.max(0, parseFloat(obj.style.left) - 2) + "px";
    if (dir === "right") obj.style.left = Math.min(maxX, parseFloat(obj.style.left) + 2) + "px";

    // Collision with basket
    const basketRect = basket.getBoundingClientRect();
    const objRect = obj.getBoundingClientRect();
    const ballCenter = objRect.left + objRect.width / 2;

    if (
      objRect.bottom >= basketRect.top &&
      ballCenter >= basketRect.left &&
      ballCenter <= basketRect.right
    ) {
      const type = obj.getAttribute("data-type");
      if (type === "ball") score++;
      else if (type === "heart" && lives < 5) lives++;
      else if (type === "clock" && !slowed) {
        slowed = true;
        const originalSpeed = fallSpeed;
        fallSpeed = Math.max(2, fallSpeed - 2);
        setTimeout(() => {
          fallSpeed = originalSpeed;
          slowed = false;
        }, 5000);
      } else if (type === "bomb") {
        lives -= 2;
        lives = Math.max(0, lives);
      }

      scoreDisplay.innerText = score;
      livesDisplay.innerText = lives;
      obj.remove();
      clearInterval(fall);

      if (lives <= 0) endGame();
    } else if (ballY > gameArea.clientHeight - 10) {
      if (type === "ball") {
        lives--;
        livesDisplay.innerText = lives;
        if (lives <= 0) endGame();
      }
      obj.remove();
      clearInterval(fall);
    }
  }, 20);

  if (Math.random() < 0.1 && level >= 5) spawnBrickWall();
}

// Brick Wall
function spawnBrickWall() {
  if (wallActive) return;

  wallActive = true;
  wallElement = document.createElement("div");
  wallElement.classList.add("wall");

  const wallX = Math.random() * (gameArea.clientWidth - 60);
  wallElement.style.left = wallX + "px";
  gameArea.appendChild(wallElement);

  setTimeout(() => {
    wallElement.remove();
    wallElement = null;
    wallActive = false;
  }, 7000);
}

// Game Over
function endGame() {
  gameRunning = false;
  gameOverText.style.display = "block";
  playAgainBtn.style.display = "inline-block";

  if (score > highScore) {
    localStorage.setItem("highScore", score);
    highScoreValue.innerText = score;
    highScoreMsg.style.display = "block";
  }
}
