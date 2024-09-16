const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");
const stats = document.getElementById("stats");

// Constants
const BOT_SIZE = 16;
let FIELD_SIZE = 24;
let BOTS_NUM = 24;
let FOOD_LIMIT = 100;
let POISON_LIMIT = 0;
let FOOD_GENERATION = 200;
let MAX_GENERATIONS = 1;
const DNA_COMMANDS = 32;
const DNA_LENGTH = 32;
const SURVIVORS = 2;
const MUTATION = 1;
const MUTATION_DNA = 2;
const DNA_RUN_LIMIT = 20;
const LOVE = true;

canvas.width = BOT_SIZE * FIELD_SIZE;
canvas.height = BOT_SIZE * FIELD_SIZE;

// Helper functions
function drawCircle(x, y, r, fillColor, strokeColor) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
}

function drawRectangle(x1, y1, x2, y2, fillColor, strokeColor) {
  ctx.fillStyle = fillColor;
  ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  ctx.strokeStyle = strokeColor;
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
}

function drawText(x, y, text, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px Arial`;
  ctx.fillText(text, x, y);
}

// Bot class
class Bot {
  constructor(x, y, dna, color, textColor, index) {
    this.x = x;
    this.y = y;
    this.dna = dna;
    this.color = color;
    this.textColor = textColor;
    this.energy = 99;
    this.index = index;
    this.dead = 0;
    this.dna_cursor = 0;
    this.cannibal = 0;
    this.DNA_run_count = 0;
    this.love = null;
  }

  show() {
    drawRectangle(
      this.x * BOT_SIZE + 1,
      this.y * BOT_SIZE + 1,
      (this.x + 1) * BOT_SIZE - 1,
      (this.y + 1) * BOT_SIZE - 1,
      this.color,
      this.color
    );
    drawText(
      this.x * BOT_SIZE + 8,
      this.y * BOT_SIZE + 12,
      this.energy.toString(),
      8,
      this.textColor
    );
  }

  updateEnergy(x) {
    this.energy += x;
    if (this.energy > 99) this.energy = 99;
    if (this.energy <= 0) this.dead = 1;
  }

  look(task = 0, n = 1) {
    let x = this.x;
    let y = this.y;
    const direction = Math.floor(Math.random() * 8);

    switch (direction) {
      case 0:
        y -= n;
        break;
      case 1:
        y -= n;
        x += n;
        break;
      case 2:
        x += n;
        break;
      case 3:
        x += n;
        y += n;
        break;
      case 4:
        y += n;
        break;
      case 5:
        y += n;
        x -= n;
        break;
      case 6:
        x -= n;
        break;
      case 7:
        y -= n;
        x -= n;
        break;
    }

    x = (x + FIELD_SIZE) % FIELD_SIZE;
    y = (y + FIELD_SIZE) % FIELD_SIZE;

    const key = `${x}:${y}`;
    if (resources[key]) {
      if (task === 1 && resources[key] === 1) {
        this.x = x;
        this.y = y;
        delete resources[key];
        this.updateEnergy(10);
      } else if (task > 1 && task <= 4 && resources[key] === 2) {
        delete resources[key];
        addResource(1, x, y);
        this.x = x;
        this.y = y;
        this.updateEnergy(5);
      }
    } else if (task > 5 && task <= 7) {
      this.x = x;
      this.y = y;
    }

    // Add love logic
    if (task > 4 && task <= 5 && LOVE) {
      const botAtPosition = bots.find(
        b => b.x === x && b.y === y && b !== this
      );
      if (botAtPosition) {
        this.x = x;
        this.y = y;
        this.updateEnergy(5);
        this.love = 1;
        this.mixDNA(botAtPosition.dna);
        this.color = "pink";
        this.textColor = "black";
      }
    }
  }

  mixDNA(otherDNA) {
    for (let i = 0; i < this.dna.length; i++) {
      if (Math.random() < 0.2) {
        this.dna[i] = otherDNA[i];
      }
    }
  }

  runDNA() {
    this.DNA_run_count++;
    if (this.DNA_run_count >= DNA_RUN_LIMIT) {
      this.dna_cursor = 0;
      this.DNA_run_count = 0;
      return;
    }

    this.dna_cursor = (this.dna_cursor + 1) % this.dna.length;
    const command = this.dna[this.dna_cursor];

    if (command < 20) {
      this.updateEnergy(-1);
      const task = this.dna[this.dna_cursor + 1] % 10;
      this.look(task);
    } else if (command === 20) {
      this.dna_cursor = this.dna[this.dna_cursor + 1];
      this.updateEnergy(-1);
    }
  }
}

// Simulation variables
let bots = [];
let resources = {};
let generation = 0;
let timelife = 0;
let generationLifetimes = [];

function addResource(type, x = null, y = null) {
  x = x ?? Math.floor(Math.random() * FIELD_SIZE);
  y = y ?? Math.floor(Math.random() * FIELD_SIZE);
  const key = `${x}:${y}`;
  if (!resources[key]) {
    resources[key] = type;
  }
}

let chart;

function initSimulation() {
  canvas.width = BOT_SIZE * FIELD_SIZE;
  canvas.height = BOT_SIZE * FIELD_SIZE;

  MAX_GENERATIONS = parseInt(document.getElementById("maxGenerations").value);

  bots = [];
  resources = {};
  for (let i = 0; i < BOTS_NUM; i++) {
    bots.push(
      new Bot(
        Math.floor(Math.random() * FIELD_SIZE),
        Math.floor(Math.random() * FIELD_SIZE),
        Array(DNA_LENGTH)
          .fill()
          .map(() => Math.floor(Math.random() * DNA_COMMANDS)),
        "blue",
        "white",
        i
      )
    );
  }
  for (let i = 0; i < FOOD_LIMIT; i++) {
    addResource(1);
  }
  for (let i = 0; i < POISON_LIMIT; i++) {
    addResource(2);
  }
  generation = 0;
  timelife = 0;
  generationLifetimes = [];

  // Initialize the chart
  const ctx = document.getElementById("generationGraph").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Generation Lifetime",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function drawGrid() {
  ctx.strokeStyle = "#333333";
  for (let i = 0; i <= FIELD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * BOT_SIZE);
    ctx.lineTo(canvas.width, i * BOT_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * BOT_SIZE, 0);
    ctx.lineTo(i * BOT_SIZE, canvas.height);
    ctx.stroke();
  }
}

function drawResources() {
  for (const [key, type] of Object.entries(resources)) {
    const [x, y] = key.split(":").map(Number);
    const color = type === 1 ? "#00cc00" : "#cc0000";
    drawCircle(
      x * BOT_SIZE + BOT_SIZE / 2,
      y * BOT_SIZE + BOT_SIZE / 2,
      BOT_SIZE / 2 - 3,
      color,
      color
    );
  }
}

function updateStats() {
  stats.textContent = `Generation: ${generation} | Bots Alive: ${
    bots.filter(b => !b.dead).length
  } | Time: ${timelife}`;
}

function nextGeneration() {
  generationLifetimes.push(timelife);

  // Update the chart
  chart.data.labels.push(generation);
  chart.data.datasets[0].data.push(timelife);
  chart.update();

  const survivors = bots.filter(b => !b.dead).slice(0, SURVIVORS);
  if (survivors.length === 0) {
    initSimulation();
    return;
  }

  const newBots = [];
  for (const survivor of survivors) {
    for (let i = 0; i < Math.floor(BOTS_NUM / SURVIVORS); i++) {
      const newBot = new Bot(
        Math.floor(Math.random() * FIELD_SIZE),
        Math.floor(Math.random() * FIELD_SIZE),
        [...survivor.dna],
        survivor.color,
        survivor.textColor,
        newBots.length
      );
      newBots.push(newBot);
    }
  }

  // Mutations
  for (let i = 0; i < MUTATION; i++) {
    const botIndex = Math.floor(Math.random() * newBots.length);
    newBots[botIndex].color = "yellow";
    newBots[botIndex].textColor = "black";
    for (let j = 0; j < MUTATION_DNA; j++) {
      const geneIndex = Math.floor(Math.random() * DNA_LENGTH);
      newBots[botIndex].dna[geneIndex] = Math.floor(
        Math.random() * DNA_COMMANDS
      );
    }
  }

  bots = newBots;
  generation++;
  timelife = 0;
  resources = {};
  for (let i = 0; i < FOOD_LIMIT; i++) {
    addResource(1);
  }
  for (let i = 0; i < POISON_LIMIT; i++) {
    addResource(2);
  }

  if (generation >= MAX_GENERATIONS) {
    endSimulation();
  }
}

let isSimulationRunning = true;

function updateSimulation() {
  if (!isSimulationRunning) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawResources();

  for (const bot of bots) {
    if (!bot.dead) {
      bot.runDNA();
      bot.show();
    }
  }

  if (Math.random() < 1 / FOOD_GENERATION) {
    addResource(Math.random() < 0.5 ? 1 : 2);
  }

  timelife++;
  updateStats();

  if (bots.filter(b => !b.dead).length <= SURVIVORS) {
    nextGeneration();
  }

  if (generation < MAX_GENERATIONS) {
    animationFrameId = requestAnimationFrame(updateSimulation);
  } else {
    endSimulation();
  }
}

function endSimulation() {
  isSimulationRunning = false;
  cancelAnimationFrame(animationFrameId);
  console.log("Simulation ended after", generation, "generations");

  // Update stats one last time
  updateStats();

  // You might want to add some visual indication that the simulation has ended
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Simulation Ended", canvas.width / 2, canvas.height / 2);
}

// Add event listeners for the input fields
document.getElementById("fieldSize").addEventListener("change", e => {
  FIELD_SIZE = parseInt(e.target.value);
});

document.getElementById("botsNum").addEventListener("change", e => {
  BOTS_NUM = parseInt(e.target.value);
});

document.getElementById("foodLimit").addEventListener("change", e => {
  FOOD_LIMIT = parseInt(e.target.value);
});

document.getElementById("poisonLimit").addEventListener("change", e => {
  POISON_LIMIT = parseInt(e.target.value);
});

document.getElementById("foodGeneration").addEventListener("change", e => {
  FOOD_GENERATION = parseInt(e.target.value);
});

document.getElementById("maxGenerations").addEventListener("change", e => {
  MAX_GENERATIONS = parseInt(e.target.value);
});

// Add event listener for the restart button
document.getElementById("restartBtn").addEventListener("click", () => {
  cancelAnimationFrame(animationFrameId);
  initSimulation();
  animationFrameId = requestAnimationFrame(updateSimulation);
});

initSimulation();
animationFrameId = requestAnimationFrame(updateSimulation);
