// Egg run schedule (US Eastern times)
const EGG_RUN_TIMES = [
  { hour: 14, minute: 45 }, // 2:45 PM
  { hour: 18, minute: 45 }, // 6:45 PM
];

let timeOffset = 0;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Load saved offset from localStorage
  const savedOffset = localStorage.getItem("timeOffset");
  if (savedOffset !== null) {
    timeOffset = parseFloat(savedOffset);
  }
  updateOffsetDisplay();

  // Set up offset button listeners
  document.getElementById("offsetPlus").addEventListener("click", () => {
    timeOffset = Math.min(12, timeOffset + 0.5);
    localStorage.setItem("timeOffset", timeOffset);
    updateOffsetDisplay();
    updateScheduleDisplay();
  });

  document.getElementById("offsetMinus").addEventListener("click", () => {
    timeOffset = Math.max(-12, timeOffset - 0.5);
    localStorage.setItem("timeOffset", timeOffset);
    updateOffsetDisplay();
    updateScheduleDisplay();
  });

  // Start updating times
  updateTimes();
  setInterval(updateTimes, 1000);

  // Initial schedule display
  updateScheduleDisplay();
});

function updateOffsetDisplay() {
  const offsetValue = document.getElementById("offsetValue");
  const sign = timeOffset >= 0 ? "+" : "";
  offsetValue.textContent = `${sign}${timeOffset}`;
}

function getServerTime() {
  // Get current time in US Eastern
  const now = new Date();
  return new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
}

function getUserTime(serverTime) {
  // Apply user's offset
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

function getNextEggRun(serverTime) {
  const currentHour = serverTime.getHours();
  const currentMinute = serverTime.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  // Find next run today
  for (let run of EGG_RUN_TIMES) {
    const runTotalMinutes = run.hour * 60 + run.minute;
    if (runTotalMinutes > currentTotalMinutes) {
      const nextRun = new Date(serverTime);
      nextRun.setHours(run.hour, run.minute, 0, 0);
      return nextRun;
    }
  }

  // If no more runs today, get first run tomorrow
  const nextRun = new Date(serverTime);
  nextRun.setDate(nextRun.getDate() + 1);
  nextRun.setHours(EGG_RUN_TIMES[0].hour, EGG_RUN_TIMES[0].minute, 0, 0);
  return nextRun;
}

function updateCountdown(serverTime, nextRun) {
  // Calculate milestone times
  const groupTime = new Date(nextRun);
  groupTime.setMinutes(nextRun.getMinutes() - 15); // :30 (15 min before :45)

  const portalTime = new Date(nextRun);
  portalTime.setMinutes(nextRun.getMinutes() - 5); // :40 (5 min before :45)

  // Determine current phase
  const phaseIndicator = document.querySelector(".phase-status");
  const milestone1 = document.getElementById("milestone1");
  const milestone2 = document.getElementById("milestone2");
  const milestone3 = document.getElementById("milestone3");

  // Reset milestone states
  [milestone1, milestone2, milestone3].forEach((m) => {
    m.classList.remove("active", "completed");
  });

  let currentPhase = "";
  let targetTime = nextRun;

  if (serverTime >= nextRun) {
    // Run has started or ended
    const runEndTime = new Date(nextRun);
    runEndTime.setMinutes(runEndTime.getMinutes() + 30); // Assume 30 min run duration

    if (serverTime < runEndTime) {
      currentPhase = "RUN IN PROGRESS!";
      phaseIndicator.className = "phase-status run-active";
      milestone1.classList.add("completed");
      milestone2.classList.add("completed");
      milestone3.classList.add("active");
    } else {
      currentPhase = "Waiting for Next Run";
      phaseIndicator.className = "phase-status waiting";
    }
  } else if (serverTime >= portalTime) {
    currentPhase = "Portal Open - Get Ready!";
    phaseIndicator.className = "phase-status portal-ready";
    milestone1.classList.add("completed");
    milestone2.classList.add("active");
    targetTime = nextRun;
  } else if (serverTime >= groupTime) {
    currentPhase = "Group Forming in Casino";
    phaseIndicator.className = "phase-status grouping";
    milestone1.classList.add("active");
    targetTime = portalTime;
  } else {
    currentPhase = "Waiting for Next Run";
    phaseIndicator.className = "phase-status waiting";
    targetTime = groupTime;
  }

  phaseIndicator.textContent = currentPhase;

  // Update countdown to next milestone or run
  const diff = targetTime - serverTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById("hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("minutes").textContent = String(minutes).padStart(
    2,
    "0",
  );
  document.getElementById("seconds").textContent = String(seconds).padStart(
    2,
    "0",
  );

  // Show next run time
  const userNextRun = getUserTime(nextRun);
  document.getElementById("nextRunTime").textContent =
    `Next run at ${formatTime(userNextRun)} (${formatDate(userNextRun)})`;

  // Update milestone times
  const userGroupTime = getUserTime(groupTime);
  const userPortalTime = getUserTime(portalTime);
  const userRunTime = getUserTime(nextRun);

  document.getElementById("groupTime").textContent = formatTime(userGroupTime);
  document.getElementById("portalTime").textContent =
    formatTime(userPortalTime);
  document.getElementById("runTime").textContent = formatTime(userRunTime);
}

function updateDoorStatus(serverTime) {
  const doorStatus = document.getElementById("doorStatus");
  const doorStatusText = document.getElementById("doorStatusText");

  const currentHour = serverTime.getHours();
  const currentMinute = serverTime.getMinutes();

  // Door opens at xx:45 on even hours, closes at xx:45 on odd hours
  // Determine if we're in an open period
  let isDoorOpen = false;
  let nextChangeTime;

  if (currentHour % 2 === 0) {
    // Even hour - door opens at :45
    if (currentMinute >= 45) {
      isDoorOpen = true;
      // Next change is at next odd hour :45
      nextChangeTime = new Date(serverTime);
      nextChangeTime.setHours(currentHour + 1, 45, 0, 0);
    } else {
      isDoorOpen = false;
      // Next change is this even hour :45
      nextChangeTime = new Date(serverTime);
      nextChangeTime.setHours(currentHour, 45, 0, 0);
    }
  } else {
    // Odd hour - door closes at :45
    if (currentMinute >= 45) {
      isDoorOpen = false;
      // Next change is at next even hour :45
      nextChangeTime = new Date(serverTime);
      nextChangeTime.setHours(currentHour + 1, 45, 0, 0);
    } else {
      isDoorOpen = true;
      // Next change is this odd hour :45
      nextChangeTime = new Date(serverTime);
      nextChangeTime.setHours(currentHour, 45, 0, 0);
    }
  }

  if (isDoorOpen) {
    doorStatus.className = "status-dot open";
    const userNextChange = getUserTime(nextChangeTime);
    doorStatusText.innerHTML = `Door is OPEN<br><small>closes at ${formatTime(userNextChange)}</small>`;
  } else {
    doorStatus.className = "status-dot closed";
    const userNextChange = getUserTime(nextChangeTime);
    doorStatusText.innerHTML = `Door is Closed<br><small>opens at ${formatTime(userNextChange)}</small>`;
  }
}

function updateScheduleDisplay() {
  const serverTime = getServerTime();
  const scheduleList = document.getElementById("scheduleList");
  scheduleList.innerHTML = "";

  EGG_RUN_TIMES.forEach((run) => {
    const runTime = new Date(serverTime);
    runTime.setHours(run.hour, run.minute, 0, 0);

    const userRunTime = getUserTime(runTime);

    const item = document.createElement("div");
    item.className = "schedule-item";

    // Check if this is the next run
    const nextRun = getNextEggRun(serverTime);
    if (
      runTime.getHours() === nextRun.getHours() &&
      runTime.getMinutes() === nextRun.getMinutes() &&
      runTime.getDate() === nextRun.getDate()
    ) {
      item.classList.add("active");
    }

    const diff = runTime - serverTime;
    let statusText = "";

    if (diff < -30 * 60 * 1000) {
      statusText = "✓";
    } else if (diff < 0) {
      statusText = "NOW";
    } else {
      statusText = "";
    }

    item.innerHTML = `
            <span class="schedule-time">${userRunTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
            <span class="schedule-status">${statusText}</span>
        `;

    scheduleList.appendChild(item);
  });
}

function updateTimes() {
  const serverTime = getServerTime();
  const localTime = new Date();
  const userTime = getUserTime(serverTime);

  // Update clocks
  document.getElementById("serverTime").textContent = formatTime(serverTime);
  document.getElementById("localTime").textContent = formatTime(localTime);

  // Update countdown
  const nextRun = getNextEggRun(serverTime);
  updateCountdown(serverTime, nextRun);

  // Update door status
  updateDoorStatus(serverTime);

  // Update schedule every minute
  if (serverTime.getSeconds() === 0) {
    updateScheduleDisplay();
  }
}
