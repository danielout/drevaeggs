// Egg run timers and functionality

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

  // Check if we're currently in an active run (within 1 hour after any scheduled run time)
  let isInActiveRun = false;
  let activeRunEndTime = null;

  for (let run of EGG_RUN_TIMES) {
    const runStartTime = new Date(serverTime);
    runStartTime.setHours(run.hour, run.minute, 0, 0);

    const runEndTime = new Date(runStartTime);
    runEndTime.setHours(runEndTime.getHours() + 1);

    if (serverTime >= runStartTime && serverTime < runEndTime) {
      isInActiveRun = true;
      activeRunEndTime = runEndTime;
      break;
    }
  }

  if (isInActiveRun) {
    currentPhase = "RUN IN PROGRESS!";
    phaseIndicator.className = "phase-status run-active";
    milestone1.classList.add("completed");
    milestone2.classList.add("completed");
    milestone3.classList.add("active");
    targetTime = activeRunEndTime;
    wasPortalOpen = false;
    stopEggRain();
  } else if (serverTime >= portalTime) {
    currentPhase = "Portal Open - Get Ready!";
    phaseIndicator.className = "phase-status portal-ready";
    milestone1.classList.add("completed");
    milestone2.classList.add("active");
    targetTime = nextRun;

    // Start egg rain when portal opens
    if (!wasPortalOpen) {
      startEggRain(5 * 60 * 1000);
    }
    wasPortalOpen = true;
  } else if (serverTime >= groupTime) {
    currentPhase = "Group Forming in Casino";
    phaseIndicator.className = "phase-status grouping";
    milestone1.classList.add("active");
    targetTime = portalTime;
    wasPortalOpen = false;
  } else {
    currentPhase = "Waiting for Next Run";
    phaseIndicator.className = "phase-status waiting";
    targetTime = portalTime;
    wasPortalOpen = false;
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

// Egg rain animation
let eggRainInterval = null;
let eggRainTimeout = null;
let wasPortalOpen = false;
let eggcitementEnabled = true;

function startEggRain(durationMs) {
  if (eggRainInterval) return;
  if (!eggcitementEnabled) return;

  durationMs = durationMs || 5 * 60 * 1000; // default 5 minutes
  const container = document.getElementById("eggRainContainer");
  const spawnRate = 100; // one egg every 100ms

  eggRainInterval = setInterval(() => {
    const egg = document.createElement("span");
    egg.className = "egg-drop";
    egg.textContent = "🥚";
    egg.style.left = Math.random() * 100 + "vw";
    egg.style.animationDuration = 3 + Math.random() * 4 + "s";
    egg.style.fontSize = 1.2 + Math.random() * 1.5 + "rem";
    container.appendChild(egg);
    egg.addEventListener("animationend", () => egg.remove());
  }, spawnRate);

  eggRainTimeout = setTimeout(() => stopEggRain(), durationMs);
}

function stopEggRain() {
  if (eggRainInterval) {
    clearInterval(eggRainInterval);
    eggRainInterval = null;
  }
  if (eggRainTimeout) {
    clearTimeout(eggRainTimeout);
    eggRainTimeout = null;
  }
  // Let remaining eggs finish falling, then clean up
  setTimeout(() => {
    const container = document.getElementById("eggRainContainer");
    container.innerHTML = "";
  }, 7000);
}
