const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");

let gyroX = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// Map gyro gamma [-30,30] degrees → [0,1] video time
function mapGammaToTime(gamma) {
  let clamped = Math.max(-30, Math.min(30, gamma));
  let normalized = (clamped + 30) / 60; // -30 → 0, 0 → 0.5, +30 → 1
  return normalized * video.duration;
}

// Start button for mobile autoplay
startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";
  
  try { await video.play(); } catch(err) { console.warn(err); }
  
  // Request gyro permission for iOS
  if (typeof DeviceOrientationEvent?.requestPermission === "function") {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res === "granted") {
        window.addEventListener("deviceorientation", e => {
          gyroX = e.gamma || 0;
        });
      }
    } catch(err) { console.warn(err); }
  } else {
    // Android / desktop
    window.addEventListener("deviceorientation", e => {
      gyroX = e.gamma || 0;
    });
  }
  
  draw(); // start loop
});

// Main draw loop
function draw() {
  if (!video.duration || isNaN(video.duration)) {
    requestAnimationFrame(draw);
    return;
  }

  // Map gyro to video time
  video.currentTime = mapGammaToTime(gyroX);

  // Draw current video frame to canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  requestAnimationFrame(draw);
}
