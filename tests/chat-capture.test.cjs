const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sharp = require("sharp");
const alt1 = require("alt1/base");

// Supply the browser's PNG decoder so the real Alt1 detector can run in Node.
async function decode(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return new alt1.ImageData(new Uint8ClampedArray(data), info.width, info.height);
}
const loading = [];
alt1.ImageDetect.imageDataFromBase64 = text => {
  const image = decode(Buffer.from(text, "base64"));
  loading.push(image);
  return image;
};
const ChatBoxReader = require("alt1/chatbox").default;
before(() => Promise.all(loading));

async function makeFrame() {
  const pixels = new alt1.ImageData(500, 300);
  const assets = path.resolve(path.dirname(require.resolve("alt1/chatbox")), "../../src/chatbox/imgs");
  async function place(template, x, y) {
    const icon = await decode(path.join(assets, template + ".data.png"));
    icon.copyTo(pixels, 0, 0, icon.width, icon.height, x, y);
  }
  // Two bottom markers are visible, but only the lower panel has a visible header.
  await place("chatLegacyBorder", 40, 50);
  await place("plusbutton", 420, 100);
  await place("chatLegacyBorder", 40, 250);
  return new alt1.ImgRefData(pixels);
}

test("a surplus chat marker above the header cannot produce an upside-down capture", async () => {
  const frame = await makeFrame();
  const reader = new ChatBoxReader();
  const box = reader.find(frame).mainbox;
  assert.equal(box.rect.y, 121);
  assert.equal(box.rect.height, 128);
  assert.equal(box.leftfound, false);
  reader.read(frame);
  assert.equal(reader.lastReadBuffer.x, 0, "left-edge search stays inside the client");
  assert.equal(reader.lastReadBuffer.width, box.topright.x);

  const smallerClient = new alt1.ImgRefData(new alt1.ImageData(300, 200));
  assert.throws(() => reader.read(smallerClient), /Invalid chatbox/);
});

test("two timestamps cannot establish the font until there is a message body", async () => {
  const frame = await makeFrame();
  const reader = new ChatBoxReader();
  reader.find(frame);
  let lastLine = "[00:15:08]";
  reader.readChatLine = (_box, _img, _x, _y, _font, _colors, row) => ({
    text: row === 0 ? lastLine : row === 1 ? "[00:14:50]" : "", fragments: [], basey: 0
  });
  assert.equal(reader.read(frame), null);
  assert.equal(reader.font, null);
  lastLine += " Completion time: 00:18.0";
  assert.equal(reader.read(frame).at(-1).text, lastLine);
});
