const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");
const stats = document.getElementById("stats");

// Constants
const BOT_SIZE = 16;
const FIELD_SIZE = 24;
const CANVAS_WIDTH = BOT_SIZE * FIELD_SIZE;
const CANVAS_HEIGHT = BOT_SIZE * FIELD_SIZE;
const DNA_COMMANDS = 32;
const FOOD_LIMIT = 100;
const POISON_LIMIT = 0;
const FOOD_GENERATION = 200;
const BOTS_NUM = 8;
const DNA_LENGTH = 32;
const SURVIVORS = 2;
const MUTATION = 1;
const MUTATION_DNA = 2;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

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

  energy(x) {
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
        this.energy(10);
      } else if (task > 1 && task <= 4 && resources[key] === 2) {
        delete resources[key];
        addResource(1, x, y);
        this.x = x;
        this.y = y;
        this.energy(5);
      }
    } else if (task > 5 && task <= 7) {
      this.x = x;
      this.y = y;
    }
  }

  runDNA() {
    this.dna_cursor = (this.dna_cursor + 1) % this.dna.length;
    const command = this.dna[this.dna_cursor];

    if (command < 20) {
      this.energy(-1);
      const task = this.dna[this.dna_cursor + 1] % 10;
      this.look(task);
    } else if (command === 20) {
      this.dna_cursor = this.dna[this.dna_cursor + 1];
      this.energy(-1);
    }
  }
}

// Simulation variables
let bots = [];
let resources = {};
let generation = 0;
let timelife = 0;

function addResource(type, x = null, y = null) {
  x = x ?? Math.floor(Math.random() * FIELD_SIZE);
  y = y ?? Math.floor(Math.random() * FIELD_SIZE);
  const key = `${x}:${y}`;
  if (!resources[key]) {
    resources[key] = type;
  }
}

function initSimulation() {
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
}

function drawGrid() {
  ctx.strokeStyle = "#333333";
  for (let i = 0; i <= FIELD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * BOT_SIZE);
    ctx.lineTo(CANVAS_WIDTH, i * BOT_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * BOT_SIZE, 0);
    ctx.lineTo(i * BOT_SIZE, CANVAS_HEIGHT);
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
}

function updateSimulation() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
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

  requestAnimationFrame(updateSimulation);
}

initSimulation();
updateSimulation();
