// Poetry jam timers and functionality

function getNextOccurrence(jam, serverTime) {
  const now = new Date(serverTime);

  if (jam.recurrence === "weekly") {
    return getNextWeeklyOccurrence(jam, now);
  } else if (jam.recurrence === "biweekly") {
    return getNextBiweeklyOccurrence(jam, now);
  } else if (jam.recurrence === "monthly") {
    return getNextMonthlyOccurrence(jam, now);
  }
  return null;
}

function getNextWeeklyOccurrence(jam, now) {
  const target = new Date(now);
  target.setHours(jam.hour, jam.minute, 0, 0);

  const currentDay = now.getDay();
  let daysUntil = jam.dayOfWeek - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && now >= target)) {
    daysUntil += 7;
  }
  target.setDate(target.getDate() + daysUntil);
  return target;
}

function getNextBiweeklyOccurrence(jam, now) {
  // Anchor to an epoch date to determine odd/even weeks
  const epoch = jam.epochDate
    ? new Date(jam.epochDate)
    : new Date("2026-01-05");
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;

  let candidate = getNextWeeklyOccurrence(jam, now);
  const weeksSinceEpoch = Math.round((candidate - epoch) / msPerWeek);

  if (weeksSinceEpoch % 2 !== 0) {
    candidate.setDate(candidate.getDate() + 7);
  }
  return candidate;
}

function getNextMonthlyOccurrence(jam, now) {
  // weekOfMonth: 1 = first, 2 = second, etc.
  function getNthDayOfMonth(year, month, dayOfWeek, n) {
    const first = new Date(year, month, 1);
    let day = dayOfWeek - first.getDay();
    if (day < 0) day += 7;
    day += (n - 1) * 7 + 1;
    const result = new Date(year, month, day);
    result.setHours(jam.hour, jam.minute, 0, 0);
    return result;
  }

  let candidate = getNthDayOfMonth(
    now.getFullYear(),
    now.getMonth(),
    jam.dayOfWeek,
    jam.weekOfMonth,
  );
  if (now >= candidate) {
    // Try next month
    let nextMonth = now.getMonth() + 1;
    let nextYear = now.getFullYear();
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    candidate = getNthDayOfMonth(
      nextYear,
      nextMonth,
      jam.dayOfWeek,
      jam.weekOfMonth,
    );
  }
  return candidate;
}

function getNextSoonestJam(serverTime) {
  let soonest = null;
  let soonestJam = null;

  for (const jam of POETRY_JAMS) {
    const next = getNextOccurrence(jam, serverTime);
    if (next && (!soonest || next < soonest)) {
      soonest = next;
      soonestJam = { ...jam, nextTime: next };
    }
  }
  return soonestJam;
}

function formatJamCountdown(diff) {
  if (diff <= 0) return "NOW!";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatJamCountdownFull(diff) {
  if (diff <= 0) return "NOW!";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  );
  return parts.join(", ");
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function updatePoetryJamButton(serverTime) {
  const soonest = getNextSoonestJam(serverTime);
  const countdownEl = document.getElementById("poetryJamCountdown");
  const nameEl = document.getElementById("poetryJamNextName");
  const btn = document.getElementById("poetryJamBtn");

  if (!soonest) {
    countdownEl.textContent = "--:--";
    nameEl.textContent = "No jams scheduled";
    btn.title = "No jams scheduled";
    return;
  }

  const diff = soonest.nextTime - serverTime;
  const userTime = getUserTime(soonest.nextTime);
  const dayName = DAY_NAMES[userTime.getDay()];
  const timeStr = userTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  nameEl.textContent = `${soonest.name} by ${soonest.guild} - ${dayName} @ ${timeStr}`;
  countdownEl.textContent = formatJamCountdownFull(diff);
  countdownEl.textContent += " until Dreva's next jam!";
  btn.title = "Click for more info";
}

function populateDonationContacts() {
  const listEl = document.getElementById("donationContacts");
  if (!listEl) return;
  listEl.innerHTML = "";
  for (const jam of POETRY_JAMS) {
    const names = jam.donations.join(", ");
    const li = document.createElement("li");
    li.innerHTML = `<strong>${jam.name}</strong> (${jam.guild}): ${names}`;
    listEl.appendChild(li);
  }
}

function updatePoetryJamPopup(serverTime) {
  const listEl = document.getElementById("poetryJamList");
  if (
    !listEl ||
    !document.getElementById("poetryJamPopup").classList.contains("open")
  )
    return;

  listEl.innerHTML = "";

  // Build sorted list of jams with their next occurrence
  const upcoming = POETRY_JAMS.map((jam) => ({
    ...jam,
    nextTime: getNextOccurrence(jam, serverTime),
  })).sort((a, b) => a.nextTime - b.nextTime);

  for (const jam of upcoming) {
    const diff = jam.nextTime - serverTime;
    const userTime = getUserTime(jam.nextTime);

    const card = document.createElement("div");
    card.className = "poetry-jam-card";

    const recurrenceLabel =
      jam.recurrence === "weekly"
        ? `Every ${DAY_NAMES[jam.dayOfWeek]}`
        : jam.recurrence === "biweekly"
          ? `Every other ${DAY_NAMES[jam.dayOfWeek]}`
          : jam.recurrence === "monthly"
            ? `${ordinal(jam.weekOfMonth)} ${DAY_NAMES[jam.dayOfWeek]} of the month`
            : jam.recurrence;

    card.innerHTML = `
      <div class="poetry-jam-card-header">
        <span class="poetry-jam-name">${jam.name}</span>
        <span class="poetry-jam-timer">${formatJamCountdown(diff)}</span>
      </div>
      <div class="poetry-jam-details">
        <span class="poetry-jam-detail"><strong>Hosting Guild:</strong> ${jam.guild}</span>
        <span class="poetry-jam-detail"><strong>Location:</strong> ${jam.location}</span>
        <span class="poetry-jam-detail"><strong>Schedule:</strong> ${recurrenceLabel} at ${userTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
        <span class="poetry-jam-detail"><strong>Next:</strong> ${formatDate(userTime)}, ${formatTime(userTime)}</span>
      </div>
    `;
    listEl.appendChild(card);
  }
}
