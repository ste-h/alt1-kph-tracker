import type { ImgRefData } from "alt1";
import type ChatBoxReader from "alt1/chatbox";
import type { ChatLine } from "alt1/chatbox";

type Poll = {
  at: number;
  status: string;
  frame: ImgRefData | null;
  reader: ChatBoxReader | null;
  lines: ChatLine[] | null;
  error: string;
  killsAdded: number;
};

function setText(id: string, text: string) {
  const element = document.getElementById(id);
  if (element.textContent !== text) element.textContent = text;
}

function clock(at: number) {
  return new Date(at).toTimeString().slice(0, 8);
}

function samePixels(a: ImgRefData, b: ImgRefData) {
  if (a.x !== b.x || a.y !== b.y || a.width !== b.width || a.height !== b.height) return false;
  const left = a.buf.data;
  const right = b.buf.data;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

class ChatDebug {
  private preview = document.getElementById("debug-preview") as HTMLCanvasElement;
  private saved = document.getElementById("debug-saved-preview") as HTMLCanvasElement;
  private previousFrame: ImgRefData | null = null;
  private previewAt = 0;
  private changedAt = 0;
  private lastPoll = 0;
  private longestGap = 0;
  private polls = 0;
  private lastRender = 0;
  private lastError = "";
  private events: string[] = [];
  private ocr: string[] = [];

  constructor(private interval: number) {
    setText("debug-status", "Waiting for the next poll");
    setText("debug-poll-age", "");
    setText("debug-preview-time", "Waiting for chat pixels");
    setText("debug-stats", "");
    setText("debug-ocr", "Waiting for readable text");
    this.event(Date.now(), "Debug enabled");
    window.addEventListener("focus", this.focusChanged);
    window.addEventListener("blur", this.focusChanged);
    document.addEventListener("visibilitychange", this.focusChanged);
  }

  private event(at: number, message: string) {
    this.events.unshift(`${clock(at)}  ${message}`);
    this.events.length = Math.min(this.events.length, 10);
    setText("debug-events", this.events.join("\n"));
  }

  private focusChanged = (event: Event) => {
    if (event.type === "focus") this.savePreview("plugin focus");
    const message = event.type === "visibilitychange" ? `Page ${document.visibilityState}` :
      event.type === "focus" ? "Plugin gained focus" : "Plugin lost focus";
    this.event(Date.now(), message);
    this.updatePollAge();
  };

  updatePollAge() {
    if (!this.lastPoll) return;
    const seconds = Math.max(0, Math.floor((Date.now() - this.lastPoll) / 1000));
    setText("debug-poll-age", seconds ? ` · last poll ${seconds}s ago` : "");
  }

  private savePreview(reason: string) {
    if (this.preview.hidden) return;
    this.saved.width = this.preview.width;
    this.saved.height = this.preview.height;
    this.saved.getContext("2d")?.drawImage(this.preview, 0, 0);
    setText("debug-saved-time", `${clock(this.previewAt)} · before ${reason}`);
    document.getElementById("debug-saved").hidden = false;
  }

  private sampleFrame(frame: ImgRefData, at: number) {
    if (this.previousFrame && at - this.previewAt < 500) return;
    if (!this.previousFrame || !samePixels(this.previousFrame, frame)) {
      if (this.previousFrame && this.previewAt - this.changedAt >= 5000) {
        const seconds = Math.round((this.previewAt - this.changedAt) / 1000);
        this.savePreview(`pixels changed after ${seconds}s`);
        this.event(at, `Preview changed after ${seconds}s of identical samples`);
      }
      const ctx = this.preview.getContext("2d");
      if (!ctx) {
        setText("debug-preview-time", "Canvas preview unavailable");
        return;
      }
      if (this.preview.width !== frame.width) this.preview.width = frame.width;
      if (this.preview.height !== frame.height) this.preview.height = frame.height;
      ctx.putImageData(frame.buf, 0, 0);
      this.preview.hidden = false;
      this.changedAt = at;
    }
    this.previousFrame = frame;
    this.previewAt = at;
    setText("debug-preview-time", `Last sample ${clock(at)} · pixels changed ${clock(this.changedAt)}`);
  }

  record(poll: Poll) {
    const { at, frame, reader, lines, status, error } = poll;
    const gap = this.lastPoll ? at - this.lastPoll : 0;
    this.lastPoll = at;
    this.longestGap = Math.max(this.longestGap, gap);
    this.polls++;
    if (gap > Math.max(2000, this.interval * 3)) {
      this.savePreview("delayed poll");
      this.event(at, `Poll gap ${(gap / 1000).toFixed(1)}s`);
    }
    if (error) {
      if (error !== this.lastError) this.event(at, error);
      this.lastError = error;
    } else if (frame && this.lastError) {
      this.event(at, "Chat read succeeded");
      this.lastError = "";
    }
    if (poll.killsAdded) this.event(at, `Kills recorded +${poll.killsAdded}`);
    if (frame) this.sampleFrame(frame, at);
    if (lines?.length) {
      for (const line of lines) {
        if (line.text.trim()) this.ocr.push(`${clock(at)}  ${line.text}`);
      }
      this.ocr = this.ocr.slice(-5);
      if (this.ocr.length) setText("debug-ocr", this.ocr.join("\n"));
    }

    setText("debug-status", status);
    if (at - this.lastRender < 500) return;
    this.lastRender = at;
    this.updatePollAge();
    const box = reader?.pos?.mainbox;
    const rect = box?.rect;
    const info = [
      `Poll #${this.polls} at ${clock(at)} · target ${this.interval} ms`,
      `Gap ${gap} ms · longest ${this.longestGap} ms`,
      `Plugin ${document.hasFocus() ? "focused" : "unfocused"} · page ${document.visibilityState}`,
      `Capture method ${alt1.captureMethod || "unknown"}`
    ];
    if (alt1.rsLinked) {
      info.push(`Client ${alt1.rsWidth}×${alt1.rsHeight} at (${alt1.rsX}, ${alt1.rsY})`);
      info.push(alt1.permissionGameState ? `Game window ${alt1.rsActive ? "active" : "inactive"}` : "Game focus unavailable");
    } else {
      info.push(alt1.rsLinked === false ? "Client unlinked" : "Client link unknown");
    }
    if (rect) {
      info.push(`Chat (${box.type}) ${rect.width}×${rect.height} at (${rect.x}, ${rect.y})`);
      info.push(`Font ${reader.font?.name ?? "unknown"} · left edge ${box.leftfound ? "found" : "unconfirmed"}`);
    }
    setText("debug-stats", info.join("\n"));
  }

  close() {
    window.removeEventListener("focus", this.focusChanged);
    window.removeEventListener("blur", this.focusChanged);
    document.removeEventListener("visibilitychange", this.focusChanged);
    this.preview.hidden = true;
    this.preview.width = this.saved.width = 0;
    document.getElementById("debug-saved").hidden = true;
    setText("debug-ocr", "");
    setText("debug-events", "");
  }
}

export let chatDebug: ChatDebug | null = null;

export function initChatDebug(interval: number) {
  const toggle = document.getElementById("debug-chat-toggle") as HTMLInputElement;
  const panel = document.getElementById("chat-debug-panel");
  document.getElementById("chat-debug").hidden = false;
  toggle.checked = false;
  toggle.addEventListener("change", () => {
    chatDebug?.close();
    chatDebug = toggle.checked ? new ChatDebug(interval) : null;
    panel.hidden = !toggle.checked;
  });
}
