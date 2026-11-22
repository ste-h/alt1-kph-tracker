import * as a1lib from "alt1";
import "./index.html";
import "./appconfig.json";
import "./icon.png";
import ChatBoxReader, { Chatbox, ChatLine } from "alt1/chatbox";

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
let killsPerHour = 0;

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

const completionColors = [
  a1lib.mixColor(43, 179, 20), // Completion Time
  a1lib.mixColor(45, 185, 20) // Completion Time 2
];

const killTimesTenths: number[] = [];
let deathCount = 0;
let killCount = 0;
const recentEvents = new Map<string, number>();

function formatTenths(tenths: number): string {
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor(tenths / 10) % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${tenths % 10}`;
}

function averageTime(): string {
  const total = killTimesTenths.reduce((sum, time) => sum + time, 0);
  return formatTenths(killCount ? Math.floor(total / killCount) : 0);
}

function processLine(text: string, baseline: boolean) {
  const time = text.match(/completion time:\s*(\d+):(\d+)(?:\.(\d))?/i);
  const tenths = time ? (Number(time[1]) * 60 + Number(time[2])) * 10 + Number(time[3] || 0) : null;
  if (tenths === null && !/oh dear, you are dead!/i.test(text)) return;

  // Alt1 already returns new lines by overlap when there is no readable timestamp.
  const timestamp = text.match(/\[(\d{2}:\d{2}:\d{2})\]/);
  if (timestamp) {
    const key = `${timestamp[1]}:${tenths === null ? "death" : tenths}`;
    const now = Date.now();
    // Chat timestamps repeat daily. Only retain recent events for OCR replays.
    recentEvents.forEach((seen, event) => {
      if (now - seen >= 12 * 60 * 60 * 1000) recentEvents.delete(event);
    });
    if (recentEvents.has(key)) return;
    recentEvents.set(key, now);
  }

  if (baseline) return;
  if (tenths === null) {
    logDeath();
  } else {
    logCompletionTime(tenths);
  }
}

function startPeriodicUpdates() {
  setInterval(() => {
    updateKillsPerHour();
    updateTimerDisplay();
  }, 600);
}

function logCompletionTime(tenths: number) {
  if (startTime === null) {
    startTime = Date.now() - tenths * 100;
    updateTimerDisplay();
  }

  killTimesTenths.push(tenths);
  killCount++;
  const timeString = formatTenths(tenths);
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
  if (killTimesTenths.length === 0) {
    if (bestWorstDiv) bestWorstDiv.remove();
    return;
  }
  if (!bestWorstDiv) {
    bestWorstDiv = document.createElement("div");
    bestWorstDiv.id = "best-worst";
    bestWorstDiv.style.color = "#b080d0";
  }
  const best = Math.min(...killTimesTenths);
  const worst = Math.max(...killTimesTenths);
  bestWorstDiv.textContent = `Best: ${formatTenths(best)} | Worst: ${formatTenths(worst)}`;

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
  killTimesTenths.splice(index, 1);
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
  let averageDiv = document.getElementById("average-time");
  if (killTimesTenths.length === 0) {
    averageDiv?.remove();
    return;
  }
  if (!averageDiv) {
    averageDiv = document.createElement("div");
    averageDiv.id = "average-time";
    averageDiv.style.color = "#3aad2b";
    output.insertAdjacentElement("afterbegin", averageDiv);
  } else {
    output.insertAdjacentElement("afterbegin", averageDiv);
  }
  averageDiv.textContent = `Avg Kill Time: ${averageTime()}`;

  updateKillsPerHour();
}

function exportLog() {
  const now = new Date();
  const exportTime = now.toLocaleString();
  const startDate = startTime ? new Date(startTime).toLocaleString() : "N/A";
  const duration = startTime ? formatElapsed(Date.now() - startTime) : "N/A";

  let lines = [
    `KPH Tracker Export`,
    `Exported: ${exportTime}`,
    `Session start: ${startDate}`,
    `Session duration: ${duration}`,
    ``,
    `Kills: ${killCount}`,
    `Deaths: ${deathCount}`,
    `Average kill time: ${averageTime()}`,
    `Kills per hour: ${killsPerHour.toFixed(1)}`,
    ...(killTimesTenths.length > 0 ? [
      `Best kill: ${formatTenths(Math.min(...killTimesTenths))}`,
      `Worst kill: ${formatTenths(Math.max(...killTimesTenths))}`,
    ] : []),
    ``,
    `--- Kill Log ---`,
  ];

  killTimesTenths.forEach((tenths, i) => {
    lines.push(`Kill ${i + 1}: ${formatTenths(tenths)}`);
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kph-log-${now.toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function sameChatbox(a: Chatbox, b: Chatbox): boolean {
  // Alt1 can refine rect.x while reading text. The detected corners stay fixed.
  return a.type === b.type &&
    a.botleft.x === b.botleft.x && a.botleft.y === b.botleft.y &&
    a.topright.x === b.topright.x && a.topright.y === b.topright.y;
}

function firstNewLine(reader: ChatBoxReader, lines: ChatLine[], previousTail: ChatLine[]): number {
  // A fresh reader returns the whole box. Resume after the last known lines
  // if they are still visible; otherwise treat this first snapshot as history.
  if (previousTail.length >= reader.minoverlap) {
    for (let end = lines.length; end >= previousTail.length; end--) {
      const start = end - previousTail.length;
      if (previousTail.every((line, i) => reader.matchLines(line.text, lines[start + i].text))) return end;
    }
  }
  return lines.length;
}

function readChatbox() {
  let reader: ChatBoxReader | null = null;
  let previousTail: ChatLine[] = [];
  let nextSearchAt = 0;
  let needsBaseline = true;
  setInterval(() => {
    let lines: ChatLine[] | null;
    try {
      const now = Date.now();
      if (now >= nextSearchAt) {
        nextSearchAt = now + 5000;
        const candidate = new ChatBoxReader();
        const found = candidate.find();
        if (!found) {
          reader = null;
          return;
        }
        if (!reader || !sameChatbox(reader.pos.mainbox, found.mainbox)) {
          reader = candidate;
          reader.readargs.colors.push(...completionColors);
          needsBaseline = true;
        }
      }
      if (!reader) return;
      lines = reader.read();
    } catch (error) {
      console.warn("Could not capture chatbox", error);
      reader = null;
      return;
    }

    if (!lines) return; // Font detection can take more than one capture.
    const start = needsBaseline ? firstNewLine(reader, lines, previousTail) : 0;
    lines.forEach((line, i) => processLine(line.text, i < start));
    needsBaseline = false;
    if (lines.some(line => line.text.trim())) previousTail = reader.overlaplines.slice();
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
