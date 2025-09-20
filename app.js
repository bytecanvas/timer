// app.js - timer logic for German Exam Timers (PWA-ready)

// Pre-init audio by user interaction to satisfy autoplay policies
let audioUnlocked = false;
const alarmAudio = document.getElementById('alarmAudio');
document.body.addEventListener('click', () => {
  if (!audioUnlocked) {
    // try play/pause to unlock on browsers that require user gesture
    alarmAudio.play().then(()=>{ alarmAudio.pause(); alarmAudio.currentTime = 0; }).catch(()=>{});
    audioUnlocked = true;
  }
}, { once: true });

const levels = {
  A1: [
    { name: "Hören", duration: 20*60, color: "cyan" },
    { name: "Lesen", duration: 25*60, color: "green" },
    { name: "Schreiben", duration: 20*60, color: "purple" },
    { name: "Sprechen", duration: 15*60, color: "orange" },
  ],
  A2: [
    { name: "Hören", duration: 30*60, color: "cyan" },
    { name: "Lesen", duration: 30*60, color: "green" },
    { name: "Schreiben", duration: 30*60, color: "purple" },
    { name: "Sprechen", duration: 15*60, color: "orange" },
  ],
  B1: [
    { name: "Hören", duration: 40*60, color: "cyan" },
    { name: "Lesen", duration: 65*60, color: "green" },
    { name: "Schreiben", duration: 60*60, color: "purple" },
    { name: "Sprechen", duration: 15*60, color: "orange" },
  ],
  B2: [
    { name: "Hören", duration: 40*60, color: "cyan" },
    { name: "Lesen", duration: 65*60, color: "green" },
    { name: "Schreiben", duration: 75*60, color: "purple" },
    { name: "Sprechen", duration: 15*60, color: "orange" },
  ],
  C1: [
    { name: "Hören", duration: 40*60, color: "cyan" },
    { name: "Lesen", duration: 65*60, color: "green" },
    { name: "Schreiben", duration: 75*60, color: "purple" },
    { name: "Sprechen", duration: 20*60, color: "orange" },
  ],
  C2: [
    { name: "Hören", duration: 35*60, color: "cyan" },
    { name: "Lesen", duration: 80*60, color: "green" },
    { name: "Schreiben", duration: 80*60, color: "purple" },
    { name: "Sprechen", duration: 15*60, color: "orange" },
  ]
};

const timers = {};
const levelColors = { A1:"cyan", A2:"green", B1:"yellow", B2:"pink", C1:"purple", C2:"orange" };

function formatTime(seconds) {
  const m = String(Math.floor(Math.abs(seconds) / 60)).padStart(2, '0');
  const s = String(Math.abs(seconds) % 60).padStart(2, '0');
  return (seconds < 0 ? "-" : "") + `${m}:${s}`;
}
function formatTotal(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h > 0 ? h + "h " : ""}${m}m`;
}

function renderTimerCard(id, label, duration, color, removable=false) {
  const container = document.createElement("div");
  container.id = id;
  container.className = `p-4 sm:p-6 rounded-2xl border-2 border-${color}-400 relative bg-gray-900 flex flex-col items-center`;
  container.innerHTML = `
    ${removable ? `<button onclick="removeTimer('${id}')" class="absolute top-2 right-2 text-red-500 font-bold">✖</button>` : ""}
    <div data-clickarea class="relative cursor-pointer flex items-center justify-center w-28 h-28 sm:w-40 sm:h-40">
      <svg class="absolute w-full h-full -rotate-90" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="80" stroke="rgba(255,255,255,0.06)" stroke-width="10" fill="none"/>
        <circle id="${id}-circle" cx="90" cy="90" r="80" stroke="currentColor" stroke-width="10" fill="none"
          stroke-dasharray="${2 * Math.PI * 80}" stroke-dashoffset="0" class="text-${color}-400 transition-all duration-500 ease-linear"/>
      </svg>
      <div id="${id}-time" class="absolute text-sm sm:text-2xl font-bold text-${color}-300 drop-shadow-lg">
        ${formatTime(duration)}
      </div>
    </div>
    <h3 class="text-center mt-3 text-sm sm:text-lg font-semibold text-${color}-300">${label}</h3>
    <div class="flex justify-center gap-2 mt-3 flex-wrap">
      <button onclick="startTimer('${id}')" class="px-2 py-1 sm:px-4 sm:py-2 bg-${color}-600 rounded-lg text-xs sm:text-base">Start</button>
      <button onclick="pauseTimer('${id}')" class="px-2 py-1 sm:px-4 sm:py-2 bg-yellow-500 rounded-lg text-xs sm:text-base">Pause</button>
      <button onclick="resumeTimer('${id}')" class="px-2 py-1 sm:px-4 sm:py-2 bg-green-600 rounded-lg text-xs sm:text-base">Resume</button>
      <button onclick="resetTimer('${id}')" class="px-2 py-1 sm:px-4 sm:py-2 bg-red-600 rounded-lg text-xs sm:text-base">Reset</button>
    </div>
  `;

  document.getElementById("timers").appendChild(container);

  // click-to-reset on the center area
  const clickArea = container.querySelector('[data-clickarea]');
  clickArea.addEventListener('click', () => resetTimer(id));

  timers[id] = {
    duration,
    remaining: duration,
    running: false,
    lastUpdate: null,
    circle: container.querySelector(`#${id}-circle`),
    timeLabel: container.querySelector(`#${id}-time`),
    container
  };
  updateTimer(id);
}

function updateTimer(id) {
  const t = timers[id];
  const radius = 80;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, t.remaining) / t.duration) * circ;
  t.circle.setAttribute("stroke-dashoffset", offset);
  t.timeLabel.textContent = formatTime(t.remaining);
}

function tick(id) {
  const t = timers[id];
  if (!t.running) return;
  const now = Date.now();
  const elapsed = Math.floor((now - t.lastUpdate) / 1000);
  if (elapsed > 0) {
    t.remaining -= elapsed;
    t.lastUpdate = now;
    updateTimer(id);
    if (t.remaining <= 0) {
      // when reaches zero start ringing (once)
      playRinging();
    }
  }
  requestAnimationFrame(() => tick(id));
}

function startTimer(id) {
  const t = timers[id];
  if (t.running) return;
  t.running = true;
  t.lastUpdate = Date.now();
  t.container.classList.add("glow-active");
  tick(id);
}

function pauseTimer(id) {
  const t = timers[id];
  t.running = false;
  t.container.classList.remove("glow-active");
}

function resumeTimer(id) { startTimer(id); }

function resetTimer(id) {
  const t = timers[id];
  // stop ringing if any
  stopRinging();
  t.running = false;
  t.remaining = t.duration;
  t.container.classList.remove("glow-active");
  updateTimer(id);
}

function addCustomTimer() {
  const minutes = prompt("Enter minutes for custom timer:", "1");
  if (!minutes || isNaN(minutes)) return;
  const secs = Math.max(1, parseInt(minutes)) * 60;
  const id = "custom-" + Date.now();
  renderTimerCard(id, "Custom", secs, "pink", true);
}

function removeTimer(id) {
  document.getElementById(id).remove();
  delete timers[id];
}

// audio controls using packaged sound (offline-capable)
let ringing = false;
function playRinging() {
  if (!audioUnlocked) return;
  if (ringing) return;
  ringing = true;
  try {
    alarmAudio.loop = true;
    alarmAudio.currentTime = 0;
    alarmAudio.play().catch(()=>{});
  } catch(e){ console.warn(e); }
}
function stopRinging() {
  ringing = false;
  try{
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  }catch(e){}
}

// total summary & level loading
function loadLevel() {
  const level = document.getElementById("levelSelect").value;
  const totalSummary = document.getElementById("totalSummary");
  document.getElementById("timers").innerHTML = "";
  totalSummary.classList.add("hidden");
  totalSummary.innerHTML = "";
  Object.keys(timers).forEach(k => delete timers[k]);

  if (levels[level]) {
    let total = 0;
    levels[level].forEach((m, i) => {
      renderTimerCard(`module-${i}`, m.name, m.duration, m.color);
      total += m.duration;
    });
    const color = levelColors[level] || "pink";
    totalSummary.className = `mt-4 px-4 py-2 rounded-full text-base sm:text-lg font-bold shadow-lg bg-gray-900 bg-opacity-70 text-${color}-300 border-2 border-${color}-400`;
    totalSummary.textContent = `Total: ${formatTotal(total)}`;
    totalSummary.classList.remove("hidden");
  }
}

// export for service worker scope if needed (no-op)
window.__TIMERS_APP__ = { renderTimerCard };

// initialize small demo: load A1 by default
loadLevel();
document.getElementById('addCustomBtn').addEventListener('click', addCustomTimer);
