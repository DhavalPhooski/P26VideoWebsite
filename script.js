const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const video = document.getElementById("video");
const gyroBtn = document.getElementById("gyroBtn");

let DPR = window.devicePixelRatio || 1;
const SCALE = 0.8;

let inputX = 0.5;      // mouse/touch input
let gyroX = 0;         // smoothed gyro
let targetGyro = 0;    // raw gyro
let gyroEnabled = false;

let targetTime = 0;
let currentTime = 0;
let dirty = true;

const STEPS = 24;

// --- Canvas setup ---
function resize() {
  canvas.width = innerWidth * SCALE * DPR;
  canvas.height = innerHeight * SCALE * DPR;
  ctx.imageSmoothingEnabled = false;
}
resize();
window.addEventListener("resize", resize);

// --- Mouse ---
window.addEventListener("mousemove", e => {
  inputX = e.clientX / innerWidth;
  dirty = true;
});

// --- Touch ---
window.addEventListener("touchmove", e => {
  inputX = e.touches[0].clientX / innerWidth;
  dirty = true;
}, { passive: true });

// --- Gyro button ---
gyroBtn.addEventListener("click", async () => {
  if (typeof DeviceOrientationEvent?.requestPermission === "function") {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res === "granted") enableGyro();
    } catch (err) {
      console.warn("Gyro permission denied", err);
    }
  } else {
    enableGyro();
  }
  gyroBtn.style.display = "none";
});

function enableGyro() {
  gyroEnabled = true;
  window.addEventListener("deviceorientation", e => {
    const raw = e.gamma || 0; // left/right tilt
    targetGyro = Math.max(-30, Math.min(30, raw)) / 60; // clamp -0.5 → 0.5
    dirty = true;
  });
}

// --- Video warmup ---
video.addEventListener("loadeddata", () => {
  // Start video muted so canvas can draw frames
  video.play().catch(() => {});
  dirty = true;
});

// --- Draw loop ---
function draw() {
  // Only run if video has loaded duration
  if (!video.duration || video.duration === Infinity || isNaN(video.duration)) {
    requestAnimationFrame(draw);
    return;
  }

  // Smooth gyro
  gyroX += (targetGyro - gyroX) * 0.08;

  // Blend input
  const blendedX = gyroEnabled ? 0.5 + gyroX * 0.8 : inputX;

  // Quantized time
  const q = Math.round(blendedX * STEPS) / STEPS;
  targetTime = q * video.duration;

  // Temporal easing
  currentTime += (targetTime - currentTime) * 0.12;
  currentTime = Math.max(0, Math.min(video.duration, currentTime));
  video.currentTime = currentTime;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Micro parallax shift
  const maxShift = 50 * DPR;
  const shiftX = (blendedX - 0.5) * maxShift;
  ctx.drawImage(video, shiftX, 0, canvas.width, canvas.height);

  requestAnimationFrame(draw);
}


draw();
