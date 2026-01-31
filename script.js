const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const video = document.getElementById("video");

let DPR = window.devicePixelRatio || 1;

// 🔥 Resolution cheating
const SCALE = 0.8;

// --- Canvas setup ---
function resize() {
  canvas.width = innerWidth * SCALE * DPR;
  canvas.height = innerHeight * SCALE * DPR;
  ctx.imageSmoothingEnabled = false;
}
resize();
addEventListener("resize", resize);

// --- State ---
let inputX = 0.5;      // mouse / touch
let gyroX = 0;        // smoothed gyro
let targetGyro = 0;   // raw gyro
let gyroEnabled = false;

let targetTime = 0;
let currentTime = 0;
let dirty = false;

// --- Quantization ---
const STEPS = 24;

// ================= INPUTS =================

// --- Mouse ---
window.addEventListener("mousemove", (e) => {
  inputX = e.clientX / innerWidth;
  dirty = true;
});

// --- Touch ---
window.addEventListener(
  "touchmove",
  (e) => {
    inputX = e.touches[0].clientX / innerWidth;
    dirty = true;
  },
  { passive: true }
);

// --- Gyro permission button (iOS safe) ---
const gyroBtn = document.getElementById("gyroBtn");
if (gyroBtn) {
  gyroBtn.addEventListener("click", async () => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === "granted") enableGyro();
      } catch {}
    } else {
      enableGyro();
    }
    gyroBtn.style.display = "none";
  });
}

function enableGyro() {
  gyroEnabled = true;

  window.addEventListener("deviceorientation", (e) => {
    const raw = e.gamma || 0; // left/right tilt
    targetGyro = Math.max(-30, Math.min(30, raw)) / 60;
    dirty = true;
  });
}

// ================= VIDEO WARMUP =================

video.addEventListener("loadedmetadata", () => {
  video.currentTime = 0.001;

  const p = video.play();
  if (p) {
    p.then(() => video.pause()).catch(() => {});
  }
});

// ================= RENDER =================

function draw() {
  if (!dirty) return;

  // --- Smooth gyro ---
  gyroX += (targetGyro - gyroX) * 0.08;

  // --- Blend input (CHEAT HARD) ---
  const blendedX = gyroEnabled
    ? 0.5 + gyroX * 0.8
    : inputX;

  // --- Quantized time ---
  const q = Math.round(blendedX * STEPS) / STEPS;
  targetTime = q * video.duration;

  // --- Temporal easing ---
  currentTime += (targetTime - currentTime) * 0.12;
  currentTime = Math.max(0, Math.min(video.duration, currentTime));
  video.currentTime = currentTime;

  // --- Clear ---
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- Micro parallax shift ---
  const shiftX =
    ((blendedX - 0.5) * 30 + gyroX * 40) * DPR;

  ctx.drawImage(
    video,
    shiftX,
    0,
    canvas.width,
    canvas.height
  );

  dirty = false;
}

// ================= LOOP =================

function loop() {
  draw();
  requestAnimationFrame(loop);
}
loop();
