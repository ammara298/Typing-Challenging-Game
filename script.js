// ---------- COMMON FUNCTIONS ----------
const $ = id => document.getElementById(id);

function showMode(mode) {
  $("homeScreen").classList.add("hidden");
  $("bubbleScreen").classList.toggle("hidden", mode !== "bubbles");
  $("magnetScreen").classList.toggle("hidden", mode !== "magnet");

  if (mode === "bubbles") resetBubbles();
  else resetMagnet();
}

function goHome() {
  stopBubbles();
  stopMagnet();

  $("bubbleScreen").classList.add("hidden");
  $("magnetScreen").classList.add("hidden");
  $("homeScreen").classList.remove("hidden");
}


// ---------- MODE A: BUBBLE POP ----------
let bubbles = [];
let bubbleScore = 0;
let bubbleMisses = 0;
let bubbleWrong = 0;
let bubbleRunning = false;
let bubbleSpawnTimer;
let bubbleGameTimer;
let bubbleCountdown;          // now a global, so it can be cleared properly
let bubbleStartTime = 0;
let bubbleSpeed = 1;
let bubbleTime = 30;

const bubbleSettings = {
  easy: { spawn: 1200, speed: 1, limit: 10 },
  medium: { spawn: 900, speed: 1.5, limit: 7 },
  hard: { spawn: 650, speed: 2, limit: 5 }
};

function updateBubbleStats() {
  $("bubbleScore").textContent = bubbleScore;
  $("bubbleMisses").textContent = bubbleMisses;
  $("bubbleWrong").textContent = bubbleWrong;
}

function stopBubbles() {
  bubbleRunning = false;
  clearInterval(bubbleSpawnTimer);
  clearInterval(bubbleGameTimer);
  clearInterval(bubbleCountdown);   // FIX: stops the old countdown on restart
}

function resetBubbles() {
  stopBubbles();
  bubbles = [];
  bubbleScore = 0;
  bubbleMisses = 0;
  bubbleWrong = 0;
  bubbleSpeed = 1;
  bubbleTime = 30;

  $("bubbleTime").textContent = bubbleTime;
  $("bubbleArea").innerHTML =
    '<p class="hint">Press Start Game to begin!</p>';
  $("bubbleStatus").textContent = "Ready";
  $("bubbleResult").classList.add("hidden");

  updateBubbleStats();
}

function startBubbles() {
  resetBubbles();

  const difficulty = $("bubbleDifficulty").value;
  const settings = bubbleSettings[difficulty];

  bubbleSpeed = settings.speed;
  bubbleRunning = true;
  bubbleStartTime = Date.now();

  $("bubbleStatus").textContent = "Playing";
  $("bubbleArea").innerHTML = "";

  bubbleSpawnTimer = setInterval(createBubble, settings.spawn);
  bubbleGameTimer = setInterval(moveBubbles, 40);

  bubbleCountdown = setInterval(() => {
    bubbleTime--;
    $("bubbleTime").textContent = bubbleTime;

    if (bubbleTime <= 0) endBubbles();
  }, 1000);
}

function createBubble() {
  if (!bubbleRunning) return;

  const area = $("bubbleArea");
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const bubble = document.createElement("div");

  bubble.className = "bubble";
  bubble.textContent = letter;
  // random colour (used by the CSS --hue variable)
  bubble.style.setProperty("--hue", Math.floor(Math.random() * 360));

  // bubbles now start at the BOTTOM of the area and rise upward
  const startY = area.clientHeight;
  const maxLeft = Math.max(0, area.clientWidth - 50);
  bubble.style.left = Math.random() * maxLeft + "px";
  bubble.style.top = startY + "px";

  area.appendChild(bubble);
  bubbles.push({ element: bubble, letter: letter, y: startY });
}

function moveBubbles() {
  if (!bubbleRunning) return;

  // Difficulty increases as time passes.
  const elapsed = (Date.now() - bubbleStartTime) / 10000;
  const speed = bubbleSpeed + elapsed * 0.12;

  bubbles.forEach(bubble => {
    bubble.y -= speed;                       // move UP
    bubble.element.style.top = bubble.y + "px";
  });

  // a bubble that reaches the top is a miss
  const missed = bubbles.filter(bubble => bubble.y < 0);

  missed.forEach(bubble => {
    bubble.element.remove();
    bubbleMisses++;
  });

  bubbles = bubbles.filter(bubble => bubble.y >= 0);

  updateBubbleStats();

  const limit = bubbleSettings[$("bubbleDifficulty").value].limit;

  if (bubbleMisses >= limit) endBubbles();
}

function endBubbles() {
  stopBubbles();

  bubbles.forEach(bubble => bubble.element.remove());
  bubbles = [];

  $("bubbleStatus").textContent = "Game Over";
  $("bubbleResult").classList.remove("hidden");
  $("bubbleResult").innerHTML =
    `<h3>Game Over!</h3>
     <p>Final Score: ${bubbleScore}</p>
     <p>Misses: ${bubbleMisses}</p>
     <p>Wrong Keys: ${bubbleWrong}</p>`;
}

function handleBubbleKey(letter) {
  if (!bubbleRunning) return;

  const index = bubbles.findIndex(bubble => bubble.letter === letter);

  if (index !== -1) {
    bubbles[index].element.remove();
    bubbles.splice(index, 1);
    bubbleScore += 10;
    $("bubbleStatus").textContent = "Correct!";
  } else {
    bubbleWrong++;
    bubbleScore = Math.max(0, bubbleScore - 2);
    $("bubbleStatus").textContent = "Wrong Key!";
  }

  updateBubbleStats();
}


// ---------- MODE B: KEYMAGNET ----------
const keySets = {
  home: "ASDFJKL",
  middle: "QWERTYUIOPASDFJKL",
  all: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
};

const magnetSettings = {
  easy: 30,
  medium: 25,
  hard: 20
};

let magnetRunning = false;
let magnetTimer;
let magnetTime = 30;
let magnetCorrect = 0;
let magnetWrong = 0;
let magnetTotalResponse = 0;
let magnetRoundStart = 0;
let targetLetter = "A";

function updateMagnetStats() {
  $("magnetTime").textContent = magnetTime;
  $("magnetCorrect").textContent = magnetCorrect;
  $("magnetWrong").textContent = magnetWrong;

  const total = magnetCorrect + magnetWrong;
  const accuracy = total
    ? Math.round((magnetCorrect / total) * 100)
    : 0;

  $("magnetAccuracy").textContent = accuracy + "%";

  const average = magnetCorrect
    ? Math.round(magnetTotalResponse / magnetCorrect)
    : 0;

  $("responseTime").textContent = average + " ms";
}

function buildKeyboard() {
  const keyboard = $("keyboard");
  keyboard.innerHTML = "";

  const selectedSet = keySets[$("keySet").value];

  selectedSet.split("").forEach(letter => {
    const key = document.createElement("div");
    key.className = "key";
    key.id = "key-" + letter;
    key.textContent = letter;
    keyboard.appendChild(key);
  });
}

function chooseTarget() {
  const letters = keySets[$("keySet").value];
  targetLetter = letters[Math.floor(Math.random() * letters.length)];

  $("targetKey").textContent = targetLetter;

  document.querySelectorAll(".key").forEach(key => {
    key.classList.remove("active");
  });

  const target = $("key-" + targetLetter);
  if (target) target.classList.add("active");

  magnetRoundStart = Date.now();
}

function stopMagnet() {
  magnetRunning = false;
  clearInterval(magnetTimer);
}

function resetMagnet() {
  stopMagnet();

  magnetTime = magnetSettings[$("magnetDifficulty").value];
  magnetCorrect = 0;
  magnetWrong = 0;
  magnetTotalResponse = 0;

  $("magnetResult").classList.add("hidden");
  $("magnetStatus").textContent = "Press Start Game to begin!";
  $("targetKey").textContent = "-";

  buildKeyboard();
  updateMagnetStats();
}

function startMagnet() {
  resetMagnet();

  magnetRunning = true;
  $("magnetStatus").textContent = "Game Started!";

  chooseTarget();

  magnetTimer = setInterval(() => {
    magnetTime--;
    updateMagnetStats();

    if (magnetTime <= 0) endMagnet();
  }, 1000);
}

function handleMagnetKey(letter) {
  if (!magnetRunning) return;

  if (!keySets[$("keySet").value].includes(letter)) return;

  if (letter === targetLetter) {
    magnetCorrect++;
    magnetTotalResponse += Date.now() - magnetRoundStart;
    $("magnetStatus").textContent = "Correct!";
    chooseTarget();
  } else {
    magnetWrong++;
    $("magnetStatus").textContent = "Wrong Key! Try Again.";
  }

  updateMagnetStats();
}

function endMagnet() {
  stopMagnet();

  $("magnetTime").textContent = "0";
  $("magnetStatus").textContent = "Time's Up!";

  const total = magnetCorrect + magnetWrong;
  const accuracy = total
    ? Math.round((magnetCorrect / total) * 100)
    : 0;

  const average = magnetCorrect
    ? Math.round(magnetTotalResponse / magnetCorrect)
    : 0;

  $("magnetResult").classList.remove("hidden");
  $("magnetResult").innerHTML =
    `<h3>Game Completed!</h3>
     <p>Correct Keys: ${magnetCorrect}</p>
     <p>Wrong Keys: ${magnetWrong}</p>
     <p>Accuracy: ${accuracy}%</p>
     <p>Average Response: ${average} ms</p>`;
}


// ---------- KEYBOARD INPUT ----------
document.addEventListener("keydown", event => {
  if (event.repeat) return;

  const letter = event.key.toUpperCase();

  if (!/^[A-Z]$/.test(letter)) return;

  handleBubbleKey(letter);
  handleMagnetKey(letter);
});


// ---------- BUTTON EVENTS ----------
$("bubbleStart").addEventListener("click", startBubbles);
$("bubbleRestart").addEventListener("click", startBubbles);
$("bubbleReset").addEventListener("click", resetBubbles);

$("magnetStart").addEventListener("click", startMagnet);
$("magnetRestart").addEventListener("click", startMagnet);
$("magnetReset").addEventListener("click", resetMagnet);

$("keySet").addEventListener("change", () => {
  resetMagnet();
});

$("magnetDifficulty").addEventListener("change", () => {
  resetMagnet();
});