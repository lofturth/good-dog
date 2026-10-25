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

function renderNotebook() {
  const list = document.querySelector("#notes");
  list.replaceChildren();
  message.textContent = "";
  let entries = [];
  try {
    entries = readRecords(notesKey).reverse();
  } catch {
    message.textContent = "Saved notes couldn’t be read. Your notes have not been changed.";
  }
  entries.sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
  for (const entry of entries) {
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
    list.append(article);
  }
}

function sizeEditor() {
  const viewport = window.visualViewport;
  editor.style.height = `${viewport?.height ?? window.innerHeight}px`;
  editor.style.top = `${viewport?.offsetTop ?? 0}px`;
}
window.visualViewport?.addEventListener("resize", sizeEditor);
window.visualViewport?.addEventListener("scroll", sizeEditor);
window.addEventListener("resize", sizeEditor);

recordButton.addEventListener("click", () => {
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
    notes.push({ text, timestamp: new Date().toISOString() });
    localStorage.setItem(notesKey, JSON.stringify(notes));
  } catch {
    editorMessage.textContent = "Couldn’t save. Your note is still here; your stored data has not been changed.";
    return;
  }
  renderNotebook();
  closeEditor();
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
