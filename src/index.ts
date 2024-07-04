import * as a1lib from "alt1";
import "./index.html";
import "./appconfig.json";
import "./icon.png";
import ChatBoxReader from "alt1/chatbox";

var output = document.getElementById("output");

const reader = new ChatBoxReader();
reader.readargs.colors.push(
  a1lib.mixColor(43, 179, 20), // Completion Time
  a1lib.mixColor(45, 185, 20) // Completion Time 2
);

let completionTimes = [];
let deathCount = 0;
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

function logCompletionTime(minutes, seconds, milliseconds) {
  const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
  completionTimes.push(totalSeconds);
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${Math.floor(milliseconds / 100)}`;
  console.log(`Kill completed in: ${timeString}`);
  updateDisplay(timeString);
  updateAverageTime();
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
    const averageDiv = document.getElementById("average-time");
    if (averageDiv) {
      averageDiv.insertAdjacentElement("afterend", deathDiv);
    } else {
      output.insertAdjacentElement("afterbegin", deathDiv);
    }
  }
  deathDiv.textContent = `Total deaths: ${deathCount}`;
}

function updateDisplay(timeString) {
  if (!output) return;

  const completionDiv = document.createElement("div");
  completionDiv.textContent = `Latest completion time: ${timeString}`;

  // Insert the new completion time after the death count div
  const deathDiv = document.getElementById("death-count");
  if (deathDiv) {
    deathDiv.insertAdjacentElement("afterend", completionDiv);
  } else {
    const averageDiv = document.getElementById("average-time");
    if (averageDiv) {
      averageDiv.insertAdjacentElement("afterend", completionDiv);
    } else {
      output.insertAdjacentElement("afterbegin", completionDiv);
    }
  }

  // Keep only the last 50 completion times
  while (output.children.length > 52) {
    // 52 to account for average time and death count divs
    output.removeChild(output.lastChild);
  }
}

function updateAverageTime() {
  if (completionTimes.length === 0) return;

  const totalSeconds = completionTimes.reduce((acc, cur) => acc + cur, 0);
  const averageSeconds = totalSeconds / completionTimes.length;
  const averageMinutes = Math.floor(averageSeconds / 60);
  const averageRemainingSeconds = Math.floor(averageSeconds % 60);
  const averageMilliseconds = Math.floor(((averageSeconds % 1) * 1000) / 100); // Calculate milliseconds and convert to one decimal place

  const averageTimeString = `${averageMinutes
    .toString()
    .padStart(2, "0")}:${averageRemainingSeconds
    .toString()
    .padStart(2, "0")}.${averageMilliseconds}`;

  let averageDiv = document.getElementById("average-time");
  if (!averageDiv) {
    averageDiv = document.createElement("div");
    averageDiv.id = "average-time";
    output.insertAdjacentElement("afterbegin", averageDiv);
  }
  averageDiv.textContent = `Average completion time: ${averageTimeString}`;
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
  if (window.alt1) {
    alt1.identifyAppUrl("./appconfig.json");
    readChatbox();
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
