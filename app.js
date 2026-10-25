const notesKey = "good-dog-notes.v1";
const notebook = document.querySelector("#notebook");
const editor = document.querySelector("#editor");
const field = document.querySelector("#note-text");
const message = document.querySelector("#message");
const editorMessage = document.querySelector("#editor-message");
const recordButton = document.querySelector("#record");

function readRecords(key) {
  const records = JSON.parse(localStorage.getItem(key) ?? "[]");
  if (!Array.isArray(records)) throw new Error("Invalid saved records");
  return records;
}

const periods = [
  { id: "morning", name: "Morning", range: "Midnight–11 AM", end: 660 },
  { id: "midday", name: "Midday", range: "11 AM–4 PM", end: 960 },
  { id: "evening", name: "Evening", range: "4 PM–8:30 PM", end: 1230 },
  { id: "late-night", name: "Late night", range: "8:30 PM–midnight", end: 1440 }
];
const history = document.querySelector("#history");
let selectedPeriod = periodForDate(new Date());
const periodButtons = document.querySelectorAll("#period-selector button");
periodButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectedPeriod = periods.find(period => period.id === button.dataset.period);
    renderNotebook();
  });
});

function periodForDate(date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return periods.find(period => minutes < period.end);
}

function localDay(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function belongsToSelectedPeriod(entry, now) {
  const date = new Date(entry.timestamp);
  return localDay(date) === localDay(now) && periodForDate(date) === selectedPeriod;
}

function renderEntry(entry) {
  const article = document.createElement("article");
  const time = document.createElement("time");
  const date = new Date(entry.timestamp);
  if (!Number.isNaN(date.getTime())) {
    time.dateTime = date.toISOString();
    time.textContent = date.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit"
    });
  } else {
    time.textContent = "Timestamp unavailable";
  }
  const text = document.createElement("p");
  text.textContent = entry.text;
  article.append(time, text);
  return article;
}

function renderNotebook() {
  const now = new Date();
  document.body.dataset.period = selectedPeriod.id;
  document.querySelector("#current-period").textContent = selectedPeriod.name;
  document.querySelector("#period-range").textContent = selectedPeriod.range;
  periodButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.period === selectedPeriod.id));
  });

  const list = document.querySelector("#notes");
  const historyList = document.querySelector("#history-notes");
  list.replaceChildren();
  historyList.replaceChildren();
  message.textContent = "";
  document.querySelector("#history-message").textContent = "";
  let entries = [];
  try {
    entries = readRecords(notesKey).reverse();
  } catch {
    const error = "Saved notes couldn’t be read. Your notes have not been changed.";
    message.textContent = error;
    document.querySelector("#history-message").textContent = error;
  }
  entries.sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
  const days = new Map();
  for (const entry of entries) {
    if (belongsToSelectedPeriod(entry, now)) list.append(renderEntry(entry));
    const date = new Date(entry.timestamp);
    const dayKey = localDay(date);
    if (!days.has(dayKey)) {
      const section = document.createElement("section");
      const heading = document.createElement("h2");
      heading.textContent = Number.isNaN(date.getTime()) ? "Date unavailable" :
        date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" });
      section.append(heading);
      historyList.append(section);
      days.set(dayKey, { section, groups: new Map() });
    }
    const day = days.get(dayKey);
    const period = periodForDate(date);
    const key = period?.id ?? "unknown";
    if (!day.groups.has(key)) {
      const group = document.createElement("section");
      group.className = "period-group";
      group.dataset.period = key;
      const heading = document.createElement("h3");
      heading.textContent = period?.name ?? "Period unavailable";
      group.append(heading);
      day.section.append(group);
      day.groups.set(key, group);
    }
    day.groups.get(key).append(renderEntry(entry));
  }
}

document.querySelector("#open-history").addEventListener("click", () => {
  renderNotebook();
  notebook.hidden = true;
  history.hidden = false;
  window.scrollTo(0, 0);
  document.querySelector("#history-title").focus();
});
document.querySelector("#close-history").addEventListener("click", () => {
  renderNotebook();
  history.hidden = true;
  notebook.hidden = false;
  document.querySelector("#open-history").focus();
  window.scrollTo(0, 0);
});

function sizeEditor() {
  const viewport = window.visualViewport;
  editor.style.height = `${viewport?.height ?? window.innerHeight}px`;
  editor.style.top = `${viewport?.offsetTop ?? 0}px`;
}
window.visualViewport?.addEventListener("resize", sizeEditor);
window.visualViewport?.addEventListener("scroll", sizeEditor);
window.addEventListener("resize", sizeEditor);

recordButton.addEventListener("click", () => {
  renderNotebook();
  field.value = "";
  editorMessage.textContent = "";
  notebook.hidden = true;
  editor.hidden = false;
  sizeEditor();
  // Synchronous focus in the tap handler lets iOS open its own keyboard.
  field.focus();
});

function closeEditor() {
  field.blur();
  editor.hidden = true;
  notebook.hidden = false;
  recordButton.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

document.querySelector("#cancel").addEventListener("click", closeEditor);
editor.addEventListener("submit", event => {
  event.preventDefault();
  const text = field.value.trim();
  if (!text) {
    editorMessage.textContent = "Add a note before saving.";
    field.focus();
    return;
  }
  try {
    const notes = readRecords(notesKey);
    const timestamp = new Date();
    notes.push({ text, timestamp: timestamp.toISOString() });
    localStorage.setItem(notesKey, JSON.stringify(notes));
    selectedPeriod = periodForDate(timestamp);
  } catch {
    editorMessage.textContent = "Couldn’t save. Your note is still here; your stored data has not been changed.";
    return;
  }
  renderNotebook();
  closeEditor();
});

window.addEventListener("focus", renderNotebook);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderNotebook();
});
window.addEventListener("storage", renderNotebook);
window.addEventListener("pageshow", renderNotebook);
// Explicitly retired legacy observation and session data. Never clear unrelated storage.
try {
  localStorage.removeItem("meditation-observations.v1");
  localStorage.removeItem("meditation-sessions.v1");
} catch {
  message.textContent = "Couldn’t remove legacy data. Local storage is unavailable.";
}
renderNotebook();

document.querySelector("#export-json").addEventListener("click", () => {
  try {
    // Keep each note and its original UTC timestamp.
    const data = { version: 3, notes: readRecords(notesKey) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "good-dog-observations.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.textContent = "JSON export requested.";
  } catch {
    message.textContent = "Couldn’t export saved records. Your stored data has not been changed.";
  }
});
