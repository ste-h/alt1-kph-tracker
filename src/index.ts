import * as a1lib from "alt1";
import "./index.html";
import "./appconfig.json";
import "./icon.png";
import ChatBoxReader from "alt1/chatbox";

var output = document.getElementById("output");
output.style.backgroundColor = "#181b1c";
output.style.color = "#abb2bf";
document.body.style.backgroundColor = "#181b1c";

let startTime = null;
let killsPerHour = 0;

function resetStartTime() {
  startTime = Date.now();
  updateKillsPerHour();
}
function calculateKillsPerHour() {
  if (!startTime || killCount === 0) return 0;

  const elapsedTimeInHours = (Date.now() - startTime) / 3600000; // Convert milliseconds to hours
  return killCount / elapsedTimeInHours;
}

const reader = new ChatBoxReader();
reader.readargs.colors.push(
  a1lib.mixColor(43, 179, 20), // Completion Time
  a1lib.mixColor(45, 185, 20) // Completion Time 2
);

let completionTimes = [];
let deathCount = 0;
let killCount = 0; // Counter for number of kills
let loggedTimestamps = new Set();

function processLine(lineText, timestamp) {
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
  }, 600);
}

function logCompletionTime(minutes, seconds, milliseconds) {
  const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
  completionTimes.push(totalSeconds);
  killCount++; // This will now keep incrementing even if the timer is reset
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${Math.floor(milliseconds / 100)}`;
  console.log(`Kill ${killCount} completed in: ${timeString}`);
  updateDisplay(timeString, killCount);
  updateAverageTime();
  updateKillsPerHour();
}

function updateKillsPerHour() {
  killsPerHour = calculateKillsPerHour();
  let kphDiv = document.getElementById("kills-per-hour");
  if (!kphDiv) {
    kphDiv = document.createElement("div");
    kphDiv.id = "kills-per-hour";
    (kphDiv as HTMLElement).style.color = "#61afef";
  }
  kphDiv.innerHTML = `Kills per hour: ${killsPerHour.toFixed(1)} <button id="reset-kph">Reset</button>`;

  // Style the reset button
  const resetButton = kphDiv.querySelector("#reset-kph") as HTMLButtonElement;
  if (resetButton) {
    resetButton.style.backgroundColor = "#181b1c"; 
    resetButton.style.color = "#DCD9D4"; 
    resetButton.style.border = "none";
    resetButton.style.padding = "2px 5px";
    resetButton.style.cursor = "pointer";
    resetButton.style.borderRadius = "3px";

    resetButton.addEventListener("click", resetStartTime);
  }

  // Ensure the kills per hour div is always right after the average time div
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
    deathDiv.style.color = "#e06c75";
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
function updateDisplay(timeString, killCount) {
  if (!output) return;

  const completionDiv = document.createElement("div");
  completionDiv.textContent = `Kill ${killCount}: ${timeString} `;
  completionDiv.style.color = "#DCD9D4";

  // Insert the new completion time after the kills per hour div
  const kphDiv = document.getElementById("kills-per-hour");
  if (kphDiv) {
    kphDiv.insertAdjacentElement("afterend", completionDiv);
  } else {
    const averageDiv = document.getElementById("average-time");
    if (averageDiv) {
      averageDiv.insertAdjacentElement("afterend", completionDiv);
    } else {
      output.insertAdjacentElement("afterbegin", completionDiv);
    }
  }

  // Not sure if limiting amt of kill times shown is necessary
  // while (output.children.length > 53)
  //   output.removeChild(output.lastChild);
  // }
}

function updateAverageTime() {
  if (completionTimes.length === 0) return;

  const totalSeconds = completionTimes.reduce((acc, cur) => acc + cur, 0);
  const averageSeconds = totalSeconds / completionTimes.length;
  const averageMinutes = Math.floor(averageSeconds / 60);
  const averageRemainingSeconds = Math.floor(averageSeconds % 60);
  const averageMilliseconds = Math.floor(((averageSeconds % 1) * 1000) / 100);

  const averageTimeString = `${averageMinutes
    .toString()
    .padStart(2, "0")}:${averageRemainingSeconds
    .toString()
    .padStart(2, "0")}.${averageMilliseconds}`;

  let averageDiv = document.getElementById("average-time");
  if (!averageDiv) {
    averageDiv = document.createElement("div");
    averageDiv.id = "average-time";
    averageDiv.style.color = "#5ad23e";
    output.insertAdjacentElement("afterbegin", averageDiv);
  } else {
    // Ensure the average time div is always at the top
    output.insertAdjacentElement("afterbegin", averageDiv);
  }
  averageDiv.textContent = `Avg Kill Time: ${averageTimeString}`;

  updateKillsPerHour();
}

function readChatbox() {
  if (!window.alt1) {
    console.log("Alt1 not detected");
    return;
  }

  setInterval(() => {
    if (!reader.pos) {
      try {
        reader.find();
      } catch (e) {
        console.warn(e);
        return;
      }
    }

    let lines = reader.read();
    if (!lines) {
      return;
    }

    for (let line of lines) {
      const timestampMatch = line.text.match(/\[(\d{2}:\d{2}:\d{2})\]/);
      const timestamp = timestampMatch ? timestampMatch[1] : "";
      console.log("detected text", line.text);
      let lineText = line.text.toLowerCase();
      processLine(lineText, timestamp);
    }
  }, alt1.captureInterval);
}

function main() {
  startTime = Date.now();
  if (window.alt1) {
    alt1.identifyAppUrl("./appconfig.json");
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
