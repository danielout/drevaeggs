// Main page functionality
// Depends on: config.js, egg.js, jam.js

let timeOffset = 0;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Load saved offset from localStorage, or calculate from user's timezone
  const savedOffset = localStorage.getItem("timeOffset");
  if (savedOffset !== null) {
    timeOffset = parseFloat(savedOffset);
  } else {
    // Auto-detect timezone offset from US Eastern
    timeOffset = calculateTimezoneOffset();
    localStorage.setItem("timeOffset", timeOffset);
  }
  updateOffsetDisplay();

  // Set up offset button listeners
  document.getElementById("offsetPlus").addEventListener("click", () => {
    timeOffset = Math.min(12, timeOffset + 0.5);
    localStorage.setItem("timeOffset", timeOffset);
    updateOffsetDisplay();
    updateTimes();
  });

  document.getElementById("offsetMinus").addEventListener("click", () => {
    timeOffset = Math.max(-12, timeOffset - 0.5);
    localStorage.setItem("timeOffset", timeOffset);
    updateOffsetDisplay();
    updateTimes();
  });

  // Start updating times
  updateTimes();
  setInterval(updateTimes, 1000);

  // Initial schedule display
  updateScheduleDisplay();

  // Populate donation contacts from config
  populateDonationContacts();

  // Egg-citement toggle
  const eggToggleBtn = document.getElementById("eggToggle");
  const savedEggcitement = localStorage.getItem("eggcitement");
  if (savedEggcitement === "off") {
    eggcitementEnabled = false;
    eggToggleBtn.textContent = "🥚 Egg-citement: OFF";
    eggToggleBtn.classList.remove("active");
  }
  eggToggleBtn.addEventListener("click", () => {
    eggcitementEnabled = !eggcitementEnabled;
    localStorage.setItem("eggcitement", eggcitementEnabled ? "on" : "off");
    if (eggcitementEnabled) {
      eggToggleBtn.textContent = "🥚 Egg-citement: ON";
      eggToggleBtn.classList.add("active");
    } else {
      eggToggleBtn.textContent = "🥚 Egg-citement: OFF";
      eggToggleBtn.classList.remove("active");
      stopEggRain();
    }
  });

  // Poetry jam popup
  const poetryBtn = document.getElementById("poetryJamBtn");
  const poetryPopup = document.getElementById("poetryJamPopup");
  const poetryOverlay = document.getElementById("poetryJamOverlay");
  const poetryClose = document.getElementById("poetryJamClose");

  function openJamPopup() {
    poetryPopup.classList.add("open");
    poetryOverlay.classList.add("open");
    updatePoetryJamPopup(getServerTime());
  }

  function closeJamPopup() {
    poetryPopup.classList.remove("open");
    poetryOverlay.classList.remove("open");
  }

  poetryBtn.addEventListener("click", openJamPopup);
  poetryOverlay.addEventListener("click", closeJamPopup);
  poetryClose.addEventListener("click", closeJamPopup);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeJamPopup();
  });

  // Tooltip functionality for mobile and click support
  const tooltipTriggers = document.querySelectorAll(".tooltip-trigger");

  tooltipTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      tooltipTriggers.forEach((other) => {
        if (other !== trigger) {
          other.classList.remove("active");
        }
      });

      trigger.classList.toggle("active");
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        trigger.classList.toggle("active");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".tooltip-trigger")) {
      tooltipTriggers.forEach((trigger) => {
        trigger.classList.remove("active");
      });
    }
  });
});

// Shared utility functions

function calculateTimezoneOffset() {
  const now = new Date();
  const localTime = now.getTime();
  const easternTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  ).getTime();
  const diffMs = localTime - easternTime;
  return Math.round(diffMs / (1000 * 60 * 60));
}

function updateOffsetDisplay() {
  const offsetValue = document.getElementById("offsetValue");
  const sign = timeOffset >= 0 ? "+" : "";
  offsetValue.textContent = `${sign}${timeOffset}`;
}

function getServerTime() {
  const now = new Date();
  return new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
}

function getUserTime(serverTime) {
  const userTime = new Date(serverTime);
  userTime.setHours(userTime.getHours() + timeOffset);
  return userTime;
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Main update loop

function updateTimes() {
  const serverTime = getServerTime();
  const localTime = new Date();

  // Update clocks
  document.getElementById("serverTime").textContent = formatTime(serverTime);
  document.getElementById("localTime").textContent = formatTime(localTime);

  // Update egg run countdown
  const nextRun = getNextEggRun(serverTime);
  updateCountdown(serverTime, nextRun);

  // Update page title with countdown to next run start
  const titleDiff = nextRun - serverTime;
  if (titleDiff > 0) {
    const titleH = Math.floor(titleDiff / (1000 * 60 * 60));
    const titleM = Math.floor((titleDiff % (1000 * 60 * 60)) / (1000 * 60));
    const titleS = Math.floor((titleDiff % (1000 * 60)) / 1000);
    const titleCountdown = titleH > 0
      ? `${titleH}h ${String(titleM).padStart(2, "0")}m ${String(titleS).padStart(2, "0")}s`
      : `${titleM}m ${String(titleS).padStart(2, "0")}s`;
    document.title = `${titleCountdown} - Dreva Server Egg Runs`;
  } else {
    document.title = "RUN ACTIVE - Dreva Server Egg Runs";
  }

  // Update door status
  updateDoorStatus(serverTime);

  // Update poetry jam button
  updatePoetryJamButton(serverTime);
  updatePoetryJamPopup(serverTime);

  // Update schedule every minute
  if (serverTime.getSeconds() === 0) {
    updateScheduleDisplay();
  }
}
