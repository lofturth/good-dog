const storageKey = "meditation-observations.v1";
const sessionsKey = "meditation-sessions.v1";
const acknowledgment = document.querySelector("#acknowledgment");
let acknowledgmentTimeout;

function recordObservation(type) {
  // Capture the event time before reading or writing storage.
  const record = { type, timestamp: new Date().toISOString() };
  clearTimeout(acknowledgmentTimeout);

  try {
    const records = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(records)) throw new Error("Invalid saved observations");
    records.push(record);
    localStorage.setItem(storageKey, JSON.stringify(records));
  } catch {
    acknowledgment.classList.add("error");
    acknowledgment.textContent = "Couldn’t save. Local storage is unavailable.";
    return;
  }

  renderThoughtCounter();
  acknowledgment.classList.remove("error");
  acknowledgment.textContent = "Saved";
  acknowledgmentTimeout = setTimeout(() => {
    acknowledgment.textContent = "";
  }, 800);
}

document.querySelectorAll("[data-event]").forEach((button) => {
  button.addEventListener("click", () => recordObservation(button.dataset.event));
});

const loggingView = document.querySelector("#logging-view");
const historyView = document.querySelector("#history-view");
const historyDays = document.querySelector("#history-days");
const historyMessage = document.querySelector("#history-message");

function readObservations() {
  const records = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  if (!Array.isArray(records)) throw new Error("Invalid saved observations");
  return records;
}

function readSessions() {
  const sessions = JSON.parse(localStorage.getItem(sessionsKey) ?? "[]");
  if (!Array.isArray(sessions)) throw new Error("Invalid saved sessions");
  return sessions;
}

function periodForHour(hour) {
  return hour < 11 ? "Morning" : hour < 16 ? "Daytime" : "Evening";
}

function countCurrentThoughts(records, now) {
  const period = periodForHour(now.getHours());
  return records.filter(record => {
    const date = new Date(record.timestamp);
    return record.type === "thought" && date.toDateString() === now.toDateString()
      && periodForHour(date.getHours()) === period;
  }).length;
}

function renderThoughtCounter() {
  const counter = document.querySelector("#thought-counter");
  const now = new Date();
  const period = periodForHour(now.getHours());
  counter.hidden = true;
  try {
    document.querySelector("#thought-count").textContent = countCurrentThoughts(readObservations(), now);
    document.querySelector("#thought-period").textContent = `${period.toUpperCase()} THOUGHTS`;
    counter.hidden = false;
  } catch {
    // Keep logging usable without showing a misleading count if storage cannot be read.
  }
}

renderThoughtCounter();
// Refresh on interaction or return to the app, without a polling timer.
window.addEventListener("focus", renderThoughtCounter);
window.addEventListener("pageshow", renderThoughtCounter);
window.addEventListener("storage", renderThoughtCounter);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderThoughtCounter();
});
document.addEventListener("pointerdown", renderThoughtCounter);

function hourLabel(hour) {
  const start = `${hour % 12 || 12}`;
  const end = `${(hour + 1) % 12 || 12}`;
  const startSuffix = hour < 12 ? "AM" : "PM";
  const endSuffix = (hour + 1) % 24 < 12 ? "AM" : "PM";
  return startSuffix === endSuffix
    ? `${start}–${end} ${endSuffix}`
    : `${start} ${startSuffix}–${end} ${endSuffix}`;
}

function renderCounts(records) {
  const counts = document.createElement("span");
  counts.className = "day-counts";
  for (const [type, label, className] of [
    ["thought", "Thought", "thought-count"],
    ["subtle-pull", "Subtle pull", "pull-count"]
  ]) {
    const count = document.createElement("span");
    count.className = className;
    count.textContent = `${label}: ${records.filter(record => record.type === type).length}`;
    counts.append(count);
  }
  return counts;
}

function renderObservationList(records) {
  const list = document.createElement("ul");
  for (const record of records) {
    const row = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = record.type === "thought" ? "Thought" : "Subtle pull";
    const time = document.createElement("time");
    time.dateTime = record.timestamp;
    time.textContent = new Date(record.timestamp).toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    row.append(label, time);
    list.append(row);
  }
  return list;
}

function groupObservations(records) {
  const days = new Map();
  const newestFirst = [...records].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  for (const record of newestFirst) {
    const date = new Date(record.timestamp);
    // Use local date parts: slicing the UTC timestamp would group some nights incorrectly.
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!days.has(key)) days.set(key, { date, records: [] });
    days.get(key).records.push(record);
  }
  return [...days.values()];
}

function renderHistory() {
  historyDays.replaceChildren();
  historyMessage.textContent = "";
  try {
    const records = readObservations();
    if (!records.length) historyMessage.textContent = "No observations yet.";
    for (const day of groupObservations(records)) {
      const section = document.createElement("section");
      section.className = "history-day";
      const heading = document.createElement("h2");
      heading.textContent = day.date.toLocaleDateString(undefined, {
        weekday: "short", year: "numeric", month: "short", day: "numeric"
      });
      section.append(heading);
      for (const name of ["Morning", "Daytime", "Evening"]) {
        const periodRecords = day.records.filter(record =>
          periodForHour(new Date(record.timestamp).getHours()) === name);
        const period = document.createElement("section");
        period.className = "history-period";
        const title = document.createElement("h3");
        title.textContent = name;
        period.append(title, renderCounts(periodRecords));
        // Only occupied hours need a row; records retain their newest-first order.
        const hours = [...new Set(periodRecords.map(record => new Date(record.timestamp).getHours()))];
        for (const hour of hours.sort((a, b) => b - a)) {
          const hourRecords = periodRecords.filter(record => new Date(record.timestamp).getHours() === hour);
          const bracket = document.createElement("details");
          const summary = document.createElement("summary");
          const label = document.createElement("span");
          label.textContent = hourLabel(hour);
          const counts = renderCounts(hourRecords);
          // Counts remain visible; expand the hour to inspect individual observations.
          summary.append(label, counts);
          bracket.append(summary, renderObservationList(hourRecords));
          period.append(bracket);
        }
        section.append(period);
      }
      historyDays.append(section);
    }
  } catch {
    historyMessage.textContent = "Couldn’t read saved observations. Your stored data has not been changed.";
  }
}

document.querySelector("#open-history").addEventListener("click", () => {
  renderHistory();
  loggingView.hidden = true;
  historyView.hidden = false;
  window.scrollTo(0, 0);
  document.querySelector("#history-title").focus();
});

document.querySelector("#close-history").addEventListener("click", () => {
  renderThoughtCounter();
  historyView.hidden = true;
  loggingView.hidden = false;
  document.querySelector("#open-history").focus();
});

document.querySelector("#export-json").addEventListener("click", () => {
  try {
    // Export the original values and order, without converting timestamps to local time.
    const data = { version: 2, observations: readObservations(), sessions: readSessions() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "good-dog-observations.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    historyMessage.textContent = "JSON export requested.";
  } catch {
    historyMessage.textContent = "Couldn’t export saved observations. Your stored data has not been changed.";
  }
});
