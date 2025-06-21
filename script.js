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

let basketX = gameArea.clientWidth / 2 - 40;
let score = 0;
let time = 0;
let lives = 5;
let level = 1;
let fallSpeed = 3;
let gameRunning = false;
let movingLeft = false;
let movingRight = false;
let ballFalling = false;
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

// Controls
document.getElementById("pauseBtn").addEventListener("click", () => {
  paused = !paused;
  document.getElementById("pauseBtn").innerText = paused ? "▶️ Resume" : "⏸️ Pause";
});
document.getElementById("restartBtn").addEventListener("click", () => {
  window.location.reload();
});
playAgainBtn.addEventListener("click", () => {
  window.location.reload();
});

// Touch control
gameArea.addEventListener("touchstart", (e) => {
  const touchX = e.touches[0].clientX;
  const gameRect = gameArea.getBoundingClientRect();
  if (touchX < gameRect.left + gameRect.width / 2) {
    movingLeft = true;
  } else {
    movingRight = true;
  }
});
gameArea.addEventListener("touchend", () => {
  movingLeft = false;
  movingRight = false;
});

// Keyboard control
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") movingLeft = true;
  if (e.key === "ArrowRight") movingRight = true;
});
document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") movingLeft = false;
  if (e.key === "ArrowRight") movingRight = false;
});

// Basket movement
function moveBasket() {
  if (!gameRunning || paused) {
    requestAnimationFrame(moveBasket);
    return;
  }

  if (movingLeft && basketX > 0) basketX -= 5;
  if (movingRight && basketX < gameArea.clientWidth - 50) basketX += 5;

  basket.style.left = basketX + "px";
  requestAnimationFrame(moveBasket);
}
moveBasket();

// Start message
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

// Timers
allIntervals.push(setInterval(() => {
  if (!gameRunning || paused) return;
  time++;
  timerDisplay.innerText = time;
  if (time % 8 === 0 && fallSpeed < 12) {
    level++;
    fallSpeed += 0.5;
  }
}, 1000));

allIntervals.push(setInterval(() => {
  if (!gameRunning || paused) return;
  if (fallSpeed >= 10 && ballFalling) return;
  dropObject();
}, 1000));

// Wind system
setInterval(() => {
  if (!gameRunning || level < 8 || paused) return;
  const directions = ["left", "right", "none"];
  windDirection = directions[Math.floor(Math.random() * directions.length)];
  windActive = windDirection !== "none";
}, 12000);

// Sudden Death system
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
function dropObject() {
  ballFalling = true;
  const obj = document.createElement("div");
  obj.classList.add("ball");

  let type = "ball";
  const rand = Math.random();
  if (rand < 0.04) type = "heart";
  else if (rand < 0.08) type = "clock";
  else if (fallSpeed >= 8 && rand < 0.25) type = "bomb";

  switch (type) {
    case "heart": obj.innerText = "❤️"; break;
    case "clock": obj.innerText = "⏰"; break;
    case "bomb": obj.innerText = "💣"; break;
    default: obj.innerText = "🏀";
  }

  obj.setAttribute("data-type", type);
  obj.dataset.bounce = "none";
  obj.style.left = Math.random() * (gameArea.clientWidth - 40) + "px";
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

    // Wind push
    if (windActive && !obj.dataset.bounce) {
      let x = parseFloat(obj.style.left);
      if (windDirection === "left") {
        obj.style.left = Math.max(0, x - 1.5) + "px";
      } else if (windDirection === "right") {
        obj.style.left = Math.min(gameArea.clientWidth - 40, x + 1.5) + "px";
      }
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

    // Bounce movement
    let direction = obj.dataset.bounce;
    if (direction === "left") {
      let x = parseFloat(obj.style.left);
      obj.style.left = Math.max(0, x - 2) + "px";
    } else if (direction === "right") {
      let x = parseFloat(obj.style.left);
      obj.style.left = Math.min(gameArea.clientWidth - 40, x + 2) + "px";
    }

    // Basket collision
    const basketRect = basket.getBoundingClientRect();
    const objRect = obj.getBoundingClientRect();
    const ballCenter = objRect.left + objRect.width / 2;

    if (
      objRect.bottom >= basketRect.top &&
      ballCenter >= basketRect.left &&
      ballCenter <= basketRect.right
    ) {
      const type = obj.getAttribute("data-type");
      if (type === "ball") {
        score++;
        scoreDisplay.innerText = score;
      } else if (type === "heart" && lives < 5) {
        lives++;
        livesDisplay.innerText = lives;
      } else if (type === "clock" && !slowed) {
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
        livesDisplay.innerText = lives;
      }

      obj.remove();
      clearInterval(fall);
      ballFalling = false;
      if (lives <= 0) endGame();
    } else if (ballY > gameArea.clientHeight - 10) {
      if (type === "ball") {
        lives--;
        livesDisplay.innerText = lives;
        if (lives <= 0) endGame();
      }
      obj.remove();
      clearInterval(fall);
      ballFalling = false;
    }
  }, 20);

  if (Math.random() < 0.1 && level >= 5) {
    spawnBrickWall();
  }
}

// Wall generator
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

// Game over
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
