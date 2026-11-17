import { scratchPhotos, letterPages } from "./content.js";

const byId = (id) => document.getElementById(id);
const steps = Array.from(document.querySelectorAll(".step"));
const nav = Array.from(document.querySelectorAll("#progress button"));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const grid = byId("scratch-grid");
const prize = byId("prize");
const mode = byId("scratch-mode");
let furthestStep = 0;
let activeStep = 0;
let candleOut = false;
let tapMode = false;
let hasWinner = false;
let openedCount = 0;
let counts = new Map();
let pageIndex = 0;
let letterOpen = false;

function focusTarget(target, scroll = false) {
  target.focus({ preventScroll: true });
  if (scroll) {
    target.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "instant" : "smooth" });
  }
}

function showStep(index) {
  activeStep = index;
  furthestStep = Math.max(index, furthestStep);
  steps.forEach((step, position) => { step.hidden = position !== index; });
  nav.forEach((button, position) => {
    button.disabled = position > furthestStep;
    if (position === index) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "instant" });
  focusTarget(document.getElementById(steps[index].getAttribute("aria-labelledby")));
}

nav.forEach((button) => {
  button.addEventListener("click", () => showStep(Number(button.dataset.step)));
});
document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showStep(Number(button.dataset.go)));
});

function scatterPetals(amount) {
  if (reducedMotion.matches) return;
  const layer = byId("petals");
  const colors = ["#fffdf1", "#eed18a", "#bbcbab", "#fffdf1"];
  for (let index = 0; index < amount; index += 1) {
    const petal = document.createElement("i");
    petal.className = "petal";
    petal.style.setProperty("--x", Math.random() * 100 + "%");
    petal.style.setProperty("--petal-color", colors[index % colors.length]);
    petal.style.setProperty("--duration", 1.4 + Math.random() * 1.25 + "s");
    petal.style.setProperty("--delay", Math.random() * .38 + "s");
    petal.style.setProperty("--drift", Math.random() * 130 - 65 + "px");
    petal.style.setProperty("--spin", Math.random() * 440 - 220 + "deg");
    petal.addEventListener("animationend", () => petal.remove(), { once: true });
    layer.append(petal);
    window.setTimeout(() => petal.remove(), 3200);
  }
}

const candle = byId("candle-button");

function setWishHint(text) {
  byId("wish-hint").firstChild.textContent = text + " ";
}

function blowCandle() {
  if (candleOut) {
    showStep(1);
    return;
  }
  candleOut = true;
  byId("wish").classList.add("is-out");
  candle.disabled = true;
  setWishHint("Dileğin gerçek olsun.");
  scatterPetals(17);
  window.setTimeout(() => {
    candle.disabled = false;
    setWishHint("Muma tıkla");
    if (activeStep === 0) showStep(1);
  }, reducedMotion.matches ? 10 : 1000);
}
candle.addEventListener("click", blowCandle);

function photoElement(photo) {
  const picture = document.createElement("img");
  picture.className = "photo";
  picture.src = photo.src;
  picture.alt = photo.alt;
  if (photo.position) picture.style.setProperty("--photo-position", photo.position);
  return picture;
}

function shuffle(items) {
  for (let position = items.length - 1; position > 0; position -= 1) {
    const target = Math.floor(Math.random() * (position + 1));
    [items[position], items[target]] = [items[target], items[position]];
  }
  return items;
}

function revealCard(button, photoIndex, cardIndex) {
  if (hasWinner || button.classList.contains("revealed")) return;
  button.classList.add("revealed");
  button.firstElementChild.removeAttribute("inert");
  button.setAttribute("aria-label", "Kart " + (cardIndex + 1) + " açıldı, " + scratchPhotos[photoIndex].alt);
  button.setAttribute("aria-disabled", "true");
  openedCount += 1;
  counts.set(photoIndex, (counts.get(photoIndex) ?? 0) + 1);
  byId("game-progress").textContent = openedCount + " / 9 kart açıldı";
  if (counts.get(photoIndex) === 3) {
    hasWinner = true;
    grid.classList.add("has-winner");
    grid.querySelectorAll(".scratch-card").forEach((card) => {
      card.disabled = true;
      card.classList.toggle("winner", Number(card.dataset.photo) === photoIndex);
    });
    byId("game-progress").textContent = "Üç aynı fotoğrafı buldun!";
    mode.hidden = true;
    byId("prize-picture").replaceChildren(photoElement(scratchPhotos[photoIndex]));
    prize.hidden = false;
    scatterPetals(27);
    focusTarget(byId("prize-message"), true);
  }
}

function drawCover(context, width, height) {
  const foil = context.createLinearGradient(0, 0, width, height);
  foil.addColorStop(0, "#f2dfa0");
  foil.addColorStop(.5, "#dfbd62");
  foil.addColorStop(.7, "#f3dfa0");
  foil.addColorStop(1, "#c8a14b");
  context.fillStyle = foil;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#8a6b33aa";
  context.lineWidth = 1.5;
  context.strokeRect(11, 11, width - 22, height - 22);
  context.fillStyle = "#fffbdf89";
  for (let y = 18; y < height - 11; y += 15) {
    for (let x = 18 + (y % 2 ? 5 : 0); x < width - 11; x += 15) {
      context.fillRect(x, y, 1.5, 1.5);
    }
  }
  context.fillStyle = "#77571d";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "38px Georgia";
  context.fillText("✿", width / 2, height / 2 + 1);
  context.globalCompositeOperation = "destination-out";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 39;
}

function setupScratch() {
  const deck = shuffle(scratchPhotos.flatMap((_, index) => [index, index, index]));
  const cards = deck.map((photoIndex, cardIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scratch-card";
    if (tapMode) button.classList.add("tap-enabled");
    button.dataset.photo = photoIndex;
    button.setAttribute("aria-label", "Kapalı kart " + (cardIndex + 1));
    const picture = photoElement(scratchPhotos[photoIndex]);
    picture.setAttribute("inert", "");
    const cover = document.createElement("canvas");
    cover.width = 156;
    cover.height = 144;
    cover.setAttribute("aria-hidden", "true");
    button.append(picture, cover);
    const context = cover.getContext("2d", { willReadFrequently: true });
    if (context) drawCover(context, cover.width, cover.height);
    const reveal = () => revealCard(button, photoIndex, cardIndex);
    let pointer = null;
    let lastPoint = null;
    let check = 0;

    function checkCoverage() {
      check = 0;
      if (hasWinner || button.classList.contains("revealed")) return;
      const pixels = context.getImageData(0, 0, cover.width, cover.height).data;
      let cleared = 0;
      let sampled = 0;
      for (let y = 2; y < cover.height; y += 4) {
        for (let x = 2; x < cover.width; x += 4) {
          sampled += 1;
          if (pixels[(y * cover.width + x) * 4 + 3] < 40) cleared += 1;
        }
      }
      if (cleared / sampled >= .37) reveal();
    }

    function rub(event) {
      const rect = cover.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const point = {
        x: (event.clientX - rect.left) * cover.width / rect.width,
        y: (event.clientY - rect.top) * cover.height / rect.height
      };
      context.beginPath();
      context.moveTo(lastPoint?.x ?? point.x - .01, lastPoint?.y ?? point.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      lastPoint = point;
      if (!check) check = requestAnimationFrame(checkCoverage);
    }

    cover.addEventListener("pointerdown", (event) => {
      if (!context || hasWinner || tapMode || event.button !== 0 || pointer !== null || button.classList.contains("revealed")) return;
      pointer = event.pointerId;
      cover.setPointerCapture(pointer);
      rub(event);
    });
    cover.addEventListener("pointermove", (event) => {
      if (!hasWinner && event.pointerId === pointer && !button.classList.contains("revealed")) rub(event);
    });
    function release(event) {
      if (event.pointerId !== pointer) return;
      pointer = null;
      lastPoint = null;
    }
    cover.addEventListener("pointerup", release);
    cover.addEventListener("pointercancel", release);
    cover.addEventListener("lostpointercapture", release);
    button.addEventListener("click", (event) => {
      if (tapMode || !context || event.detail === 0) reveal();
    });
    return button;
  });
  grid.replaceChildren(...cards);
}

mode.addEventListener("click", () => {
  tapMode = !tapMode;
  mode.setAttribute("aria-pressed", String(tapMode));
  mode.textContent = tapMode ? "Kazıyarak açmaya dön" : "Dokunarak açmayı kullan";
  grid.querySelectorAll(".scratch-card").forEach((card) => card.classList.toggle("tap-enabled", tapMode));
});

function addSwipe(element, respond) {
  let start = null;
  element.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) { start = null; return; }
    start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  element.addEventListener("touchend", (event) => {
    if (!start || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    start = null;
    if (Math.abs(dx) >= 48 && Math.abs(dx) >= Math.abs(dy) * 1.5) respond(dx < 0 ? 1 : -1);
  }, { passive: true });
  element.addEventListener("touchcancel", () => { start = null; });
}

function renderLetter(direction = 0) {
  const paper = byId("letter-page");
  const paragraphs = letterPages[pageIndex].split("\n\n").map((text, index) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    if (pageIndex === letterPages.length - 1 && index > 0) paragraph.className = "closing";
    return paragraph;
  });
  paper.replaceChildren(...paragraphs);
  paper.className = "";
  if (direction) {
    void paper.offsetWidth;
    paper.className = direction > 0 ? "turn-forward" : "turn-back";
  }
  byId("letter-count").textContent = (pageIndex + 1) + " / " + letterPages.length;
  byId("letter-prev").disabled = pageIndex === 0;
  byId("letter-next").disabled = pageIndex === letterPages.length - 1;
}

byId("envelope").addEventListener("click", () => {
  if (letterOpen) return;
  letterOpen = true;
  byId("envelope").classList.add("is-open");
  byId("envelope").disabled = true;
  byId("envelope-hint").textContent = "Sayfaları çevirmek için okları kullan.";
  renderLetter();
  window.setTimeout(() => {
    byId("envelope").hidden = true;
    byId("letter-book").hidden = false;
    byId("restart").hidden = false;
    if (activeStep === 2) focusTarget(byId("letter-title"));
  }, reducedMotion.matches ? 10 : 1120);
});

function moveLetter(direction) {
  const target = pageIndex + direction;
  if (target < 0 || target >= letterPages.length) return;
  pageIndex = target;
  renderLetter(direction);
  const paper = byId("letter-page");
  if (paper.getBoundingClientRect().top < 0) {
    paper.scrollIntoView({ block: "start", behavior: reducedMotion.matches ? "instant" : "smooth" });
  }
}
byId("letter-prev").addEventListener("click", () => moveLetter(-1));
byId("letter-next").addEventListener("click", () => moveLetter(1));
addSwipe(byId("letter-page"), moveLetter);

byId("restart").addEventListener("click", () => {
  furthestStep = 0;
  candleOut = false;
  hasWinner = false;
  openedCount = 0;
  counts = new Map();
  pageIndex = 0;
  letterOpen = false;
  byId("wish").classList.remove("is-out");
  candle.disabled = false;
  setWishHint("Muma tıkla");
  grid.classList.remove("has-winner");
  mode.hidden = false;
  byId("game-progress").textContent = "0 / 9 kart açıldı";
  prize.hidden = true;
  byId("envelope").classList.remove("is-open");
  byId("envelope").hidden = false;
  byId("envelope").disabled = false;
  byId("envelope-hint").textContent = "Açmak için papatya mührüne dokun.";
  byId("letter-book").hidden = true;
  byId("restart").hidden = true;
  setupScratch();
  showStep(0);
});

setupScratch();
