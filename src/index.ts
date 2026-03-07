import * as a1lib from "alt1";
import "./index.html";
import "./appconfig.json";
import "./icon.png";
import ChatBoxReader from "alt1/chatbox";

var output = document.getElementById("output");
output.style.backgroundColor = "#1a1410";
output.style.color = "#c8b898";
output.style.padding = "6px";
output.style.fontFamily = "Segoe UI, sans-serif";
document.body.style.backgroundColor = "#1a1410";
document.body.style.margin = "0";

function styleButton(btn: HTMLButtonElement) {
  btn.style.backgroundColor = "#6a7d8f";
  btn.style.color = "#d8d0c4";
  btn.style.border = "1px solid #506070";
  btn.style.padding = "2px 6px";
  btn.style.cursor = "pointer";
  btn.style.borderRadius = "2px";
  btn.style.fontSize = "11px";
}

let startTime: number | null = null;
let sessionStarted = false;
let killsPerHour = 0;
let appOpenedTime: string | null = null;

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function updateTimerDisplay() {
  if (!startTime) return;
  let timerDiv = document.getElementById("timer-info");
  if (!timerDiv) {
    timerDiv = document.createElement("div");
    timerDiv.id = "timer-info";
    timerDiv.style.color = "#a08050";
    timerDiv.style.marginBottom = "4px";
    timerDiv.style.borderBottom = "1px solid #5c4a28";
    timerDiv.style.paddingBottom = "4px";
    output.insertAdjacentElement("afterbegin", timerDiv);
  }
  const startDate = new Date(startTime);
  const startStr = startDate.toLocaleTimeString([], { hour12: false });
  const elapsed = formatElapsed(Date.now() - startTime);
  timerDiv.innerHTML = `Started: ${startStr} | Running: ${elapsed} <button id="export-btn">Export</button>`;

  const exportBtn = timerDiv.querySelector("#export-btn") as HTMLButtonElement;
  if (exportBtn) {
    styleButton(exportBtn);
    exportBtn.style.marginLeft = "8px";
    exportBtn.addEventListener("click", exportLog);
  }
}
function calculateKillsPerHour() {
  if (!startTime || killCount === 0) return 0;

  const elapsedTimeInHours = (Date.now() - startTime) / 3600000;
  return killCount / elapsedTimeInHours;
}

const reader = new ChatBoxReader();
reader.readargs.colors.push(
  a1lib.mixColor(43, 179, 20), // Completion Time
  a1lib.mixColor(45, 185, 20) // Completion Time 2
);

let completionTimes: number[] = [];
let deathCount = 0;
let killCount = 0;
let loggedTimestamps = new Set();

function formatSeconds(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor(((t % 1) * 1000) / 100);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms}`;
}

function isBeforeAppOpened(timestamp: string): boolean {
  if (!appOpenedTime || !timestamp) return false;
  return timestamp <= appOpenedTime;
}

function processLine(lineText, timestamp) {
  if (isBeforeAppOpened(timestamp)) return;

  if (
    lineText.includes("completion time:") &&
    !loggedTimestamps.has(timestamp)
  ) {
    loggedTimestamps.add(timestamp);
    const timeMatch = lineText.match(
      /completion time:\s*(\d+):(\d+)(?:\.(\d{1}))?/i
    );
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      const milliseconds = timeMatch[3] ? parseInt(timeMatch[3]) * 100 : 0;
      logCompletionTime(minutes, seconds, milliseconds);
    }
  } else if (
    lineText.includes("oh dear, you are dead!") &&
    !loggedTimestamps.has(timestamp)
  ) {
    loggedTimestamps.add(timestamp);
    logDeath();
  }
}

function startPeriodicUpdates() {
  setInterval(() => {
    updateKillsPerHour();
    updateTimerDisplay();
  }, 600);
}

function logCompletionTime(minutes, seconds, milliseconds) {
  const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;

  if (!sessionStarted) {
    sessionStarted = true;
    const killDurationMs = totalSeconds * 1000;
    startTime = Date.now() - killDurationMs;
    updateTimerDisplay();
  }

  completionTimes.push(totalSeconds);
  killCount++;
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${Math.floor(milliseconds / 100)}`;
  console.log(`Kill ${killCount} completed in: ${timeString}`);
  updateDisplay(timeString, killCount);
  updateAverageTime();
  updateKillsPerHour();
  updateBestWorst();
  updateKillCount();
}

function updateKillsPerHour() {
  killsPerHour = calculateKillsPerHour();
  let kphDiv = document.getElementById("kills-per-hour");
  if (!kphDiv) {
    kphDiv = document.createElement("div");
    kphDiv.id = "kills-per-hour";
    (kphDiv as HTMLElement).style.color = "#6a9fc8";
  }
  kphDiv.textContent = `Kills per hour: ${killsPerHour.toFixed(1)}`;

  // Kph div always next to avg kill time div
  const averageDiv = document.getElementById("average-time");
  if (averageDiv) {
    if (averageDiv.nextSibling !== kphDiv) {
      averageDiv.insertAdjacentElement("afterend", kphDiv);
    }
  } else {
    output.insertAdjacentElement("afterbegin", kphDiv);
  }
}

function logDeath() {
  deathCount++;
  console.log(`Death count: ${deathCount}`);
  updateDeathCount();
}

function updateDeathCount() {
  let deathDiv = document.getElementById("death-count");
  if (!deathDiv) {
    deathDiv = document.createElement("div");
    deathDiv.id = "death-count";
    deathDiv.style.color = "#c04040";
  }
  deathDiv.textContent = `Total deaths: ${deathCount}`;

  // Insert the death count after the kills per hour div
  const kphDiv = document.getElementById("kills-per-hour");
  if (kphDiv) {
    if (kphDiv.nextSibling !== deathDiv) {
      kphDiv.insertAdjacentElement("afterend", deathDiv);
    }
  } else {
    const averageDiv = document.getElementById("average-time");
    if (averageDiv) {
      averageDiv.insertAdjacentElement("afterend", deathDiv);
    } else {
      output.insertAdjacentElement("afterbegin", deathDiv);
    }
  }
}
function updateBestWorst() {
  let bestWorstDiv = document.getElementById("best-worst");
  if (completionTimes.length === 0) {
    if (bestWorstDiv) bestWorstDiv.remove();
    return;
  }
  if (!bestWorstDiv) {
    bestWorstDiv = document.createElement("div");
    bestWorstDiv.id = "best-worst";
    bestWorstDiv.style.color = "#b080d0";
  }
  const best = Math.min(...completionTimes);
  const worst = Math.max(...completionTimes);
  bestWorstDiv.textContent = `Best: ${formatSeconds(best)} | Worst: ${formatSeconds(worst)}`;

  const avgDiv = document.getElementById("average-time");
  if (avgDiv) {
    if (avgDiv.nextSibling !== bestWorstDiv) {
      avgDiv.insertAdjacentElement("afterend", bestWorstDiv);
    }
  } else {
    output.insertAdjacentElement("afterbegin", bestWorstDiv);
  }
}

function updateKillCount() {
  let kcDiv = document.getElementById("kill-count");
  if (!kcDiv) {
    kcDiv = document.createElement("div");
    kcDiv.id = "kill-count";
    kcDiv.style.color = "#d4a830";
  }
  kcDiv.textContent = `Kills: ${killCount}`;

  const deathDiv = document.getElementById("death-count");
  if (deathDiv) {
    if (deathDiv.nextSibling !== kcDiv) {
      deathDiv.insertAdjacentElement("afterend", kcDiv);
    }
  } else {
    const kphDiv = document.getElementById("kills-per-hour");
    if (kphDiv) {
      kphDiv.insertAdjacentElement("afterend", kcDiv);
    } else {
      output.insertAdjacentElement("afterbegin", kcDiv);
    }
  }
}

function removeKill(index: number) {
  completionTimes.splice(index, 1);
  killCount--;
  renumberKills();
  updateAverageTime();
  updateKillsPerHour();
  updateBestWorst();
  updateKillCount();
}

function getKillScroll(): HTMLDivElement {
  let container = document.getElementById("kill-scroll") as HTMLDivElement;
  if (!container) {
    container = document.createElement("div");
    container.id = "kill-scroll";
    container.style.maxHeight = "200px";
    container.style.overflowY = "auto";
    container.style.marginTop = "4px";
    container.style.backgroundColor = "#241e14";
    container.style.border = "1px solid #5c4a28";
    container.style.borderRadius = "2px";
    container.style.padding = "4px";
    output.appendChild(container);
  }
  return container;
}

function renumberKills() {
  const container = getKillScroll();
  const killDivs = container.querySelectorAll(".kill-entry");
  killDivs.forEach((div, i) => {
    const span = div.querySelector(".kill-text") as HTMLSpanElement;
    if (span) {
      const timeStr = span.textContent.replace(/^Kill \d+: /, "");
      span.textContent = `Kill ${i + 1}: ${timeStr}`;
    }
  });
}

function updateDisplay(timeString: string, killNumber: number) {
  if (!output) return;

  const container = getKillScroll();

  const completionDiv = document.createElement("div");
  completionDiv.className = "kill-entry";
  completionDiv.style.color = "#c8b898";

  const textSpan = document.createElement("span");
  textSpan.className = "kill-text";
  textSpan.textContent = `Kill ${killNumber}: ${timeString} `;
  completionDiv.appendChild(textSpan);

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "X";
  removeBtn.style.backgroundColor = "#3a2a1a";
  removeBtn.style.color = "#c04040";
  removeBtn.style.border = "1px solid #5c4a28";
  removeBtn.style.padding = "0px 3px";
  removeBtn.style.cursor = "pointer";
  removeBtn.style.borderRadius = "2px";
  removeBtn.style.fontSize = "10px";
  removeBtn.style.marginLeft = "4px";
  removeBtn.addEventListener("click", () => {
    const allKills = Array.from(container.querySelectorAll(".kill-entry"));
    const idx = allKills.indexOf(completionDiv);
    if (idx !== -1) {
      completionDiv.remove();
      removeKill(idx);
    }
  });
  completionDiv.appendChild(removeBtn);

  container.appendChild(completionDiv);
  container.scrollTop = container.scrollHeight;
}

function updateAverageTime() {
  if (completionTimes.length === 0) return;

  const totalSeconds = completionTimes.reduce((acc, cur) => acc + cur, 0);
  const averageSeconds = totalSeconds / completionTimes.length;
  const averageTimeString = formatSeconds(averageSeconds);

  let averageDiv = document.getElementById("average-time");
  if (!averageDiv) {
    averageDiv = document.createElement("div");
    averageDiv.id = "average-time";
    averageDiv.style.color = "#3aad2b";
    output.insertAdjacentElement("afterbegin", averageDiv);
  } else {
    output.insertAdjacentElement("afterbegin", averageDiv);
  }
  averageDiv.textContent = `Avg Kill Time: ${averageTimeString}`;

  updateKillsPerHour();
}

function exportLog() {
  const now = new Date();
  const exportTime = now.toLocaleString();
  const startDate = startTime ? new Date(startTime).toLocaleString() : "N/A";
  const duration = startTime ? formatElapsed(Date.now() - startTime) : "N/A";

  const avgSeconds = completionTimes.length > 0
    ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
    : 0;
  const avgStr = formatSeconds(avgSeconds);

  let lines = [
    `KPH Tracker Export`,
    `Exported: ${exportTime}`,
    `Session start: ${startDate}`,
    `Session duration: ${duration}`,
    ``,
    `Kills: ${killCount}`,
    `Deaths: ${deathCount}`,
    `Average kill time: ${avgStr}`,
    `Kills per hour: ${killsPerHour.toFixed(1)}`,
    ...(completionTimes.length > 0 ? [
      `Best kill: ${formatSeconds(Math.min(...completionTimes))}`,
      `Worst kill: ${formatSeconds(Math.max(...completionTimes))}`,
    ] : []),
    ``,
    `--- Kill Log ---`,
  ];

  completionTimes.forEach((t, i) => {
    lines.push(`Kill ${i + 1}: ${formatSeconds(t)}`);
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kph-log-${now.toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function readChatbox() {
  if (!window.alt1) {
    console.log("Alt1 not detected");
    return;
  }

  let failedReadCount = 0;

  setInterval(() => {
    if (!reader.pos) {
      console.log("Chatbox not found, searching...");
      try {
        reader.find();
      } catch (e) {
        console.warn("Error finding chatbox:", e);
        return;
      }
      if (reader.pos) {
        console.log("Chatbox found at", reader.pos);
        failedReadCount = 0;
      } else {
        console.log("Chatbox not found");
        return;
      }
    }

    let lines = reader.read();
    if (!lines || lines.length === 0) {
      failedReadCount++;
      if (failedReadCount > 10) {
        console.log("Too many failed reads, re-searching for chatbox...");
        reader.pos = null;
        failedReadCount = 0;
      }
      return;
    }
    failedReadCount = 0;

    console.log(`Read ${lines.length} lines`);
    for (let line of lines) {
      const timestampMatch = line.text.match(/\[(\d{2}:\d{2}:\d{2})\]/);
      const timestamp = timestampMatch ? timestampMatch[1] : "";
      console.log("Chat line:", line.text);
      let lineText = line.text.toLowerCase();
      processLine(lineText, timestamp);
    }
  }, alt1.captureInterval);
}

function showWaitingMessage() {
  let timerDiv = document.getElementById("timer-info");
  if (!timerDiv) {
    timerDiv = document.createElement("div");
    timerDiv.id = "timer-info";
    timerDiv.style.color = "#a08050";
    timerDiv.style.marginBottom = "4px";
    timerDiv.style.borderBottom = "1px solid #5c4a28";
    timerDiv.style.paddingBottom = "4px";
    output.insertAdjacentElement("afterbegin", timerDiv);
  }
  timerDiv.textContent = "Waiting for first kill...";
}

function main() {
  if (window.alt1) {
    alt1.identifyAppUrl("./appconfig.json");
    const now = new Date();
    appOpenedTime = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    showWaitingMessage();
    readChatbox();
    startPeriodicUpdates();
  } else {
    let addappurl = `alt1://addapp/${
      new URL("./appconfig.json", document.location.href).href
    }`;
    output.insertAdjacentHTML(
      "beforeend",
      `Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1`
    );
  }
}
document.addEventListener("DOMContentLoaded", () => {
  main();
});
