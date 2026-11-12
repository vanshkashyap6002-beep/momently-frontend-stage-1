const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function load(name, context) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js', name), 'utf8'), context);
}

test('original and zero strength preserve pixels, and each full film grade is distinct', () => {
  const context = { window: {} };
  load('studio-print.js', context);
  const print = context.window.StudioPrint;
  const pixels = [183, 104, 71, 255, 66, 121, 150, 128];
  function graded(film, strength) {
    const image = {data: Uint8ClampedArray.from(pixels)};
    const ctx = { getImageData: () => image, putImageData() {} };
    print.grade({width: 2, height: 1, getContext: () => ctx}, film, strength);
    return Array.from(image.data);
  }
  const results = new Set();
  for (const film of Object.keys(print.films)) {
    assert.deepEqual(graded(film, 0), pixels);
    const result = graded(film, 1);
    assert.deepEqual([result[3], result[7]], [255, 128]);
    results.add(result.join(','));
  }
  assert.deepEqual(graded('Original', 1), pixels);
  assert.equal(results.size, 7);
});

test('crop preserves aspect ratio and reaches both edges of an off-centre photograph', () => {
  const context = { window: {} };
  load('studio-print.js', context);
  let args;
  const ctx = { drawImage(...values) { args = values; } };
  for (const x of [0, 1]) {
    context.window.StudioPrint.crop(ctx, {width: 800, height: 400}, 0, 0, 200, 200, {zoom: 1, x, y: .5});
    assert.deepEqual(args.slice(1), [400*x, 0, 400, 400, 0, 0, 200, 200]);
  }
});

test('closing before camera permission resolves stops the late stream', async () => {
  const nodes = new Map();
  function element(id) {
    if (!nodes.has(id)) nodes.set(id, { open:false, showModal(){this.open=true;}, close(){this.open=false;} });
    return nodes.get(id);
  }
  let resolvePermission, requests = 0, stopped = 0;
  const context = {
    window: {addEventListener() {}},
    document: {getElementById:element, addEventListener() {}},
    navigator: {mediaDevices:{getUserMedia:() => {
      requests++;
      return new Promise(resolve => { resolvePermission = resolve; });
    }}}
  };
  load('studio-camera.js', context);
  const camera = context.window.createStudioCamera(() => assert.fail('unexpected capture'), element);
  assert.equal(requests, 0);
  camera.open(1);
  assert.equal(requests, 1);
  camera.close();
  resolvePermission({getTracks:() => [{stop:() => {stopped++;}}]});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stopped, 1);
  assert.equal(element('video').srcObject, null);
});


test('manual interval waits for each exposure and lets the last shutter sound finish', async () => {
  const nodes = new Map();
  function element(id) {
    if (!nodes.has(id)) nodes.set(id, {focus() {}});
    return nodes.get(id);
  }
  let shots = 0, flashes = 0, closed = 0;
  const sounds = [];
  class AudioContext {
    async resume() {}
    async close() { closed++; }
    async decodeAudioData() { return {}; }
    createBufferSource() {
      const source = {connect() {}, start() {}};
      sounds.push(source);
      return source;
    }
  }
  const context = {
    window: {AudioContext, addEventListener() {}},
    document: {addEventListener() {}, createElement: () => ({getContext: () => ({drawImage() {}})})},
    navigator: {mediaDevices: {getUserMedia: async () => ({getTracks: () => []})}},
    fetch: async () => ({ok: true, arrayBuffer: async () => new ArrayBuffer(0)}),
    performance, setTimeout: () => assert.fail("Manual advance must not schedule a timer")
  };
  Object.assign(element('video'), {
    play: async () => {}, videoWidth: 100, videoHeight: 100, readyState: 2,
    parentElement: {classList: {remove() {}, add() { flashes++; }}}
  });
  element('interval').value = 'manual';
  element('timer').value = '0';
  element('flash').checked = element('sound').checked = true;
  load('studio-camera.js', context);
  const camera = context.window.createStudioCamera(() => shots++, element);
  camera.open(2);
  await new Promise(resolve => setImmediate(resolve));
  const finished = element('shutter').onclick();
  await new Promise(resolve => setTimeout(resolve, 130));
  assert.equal(shots, 1);
  assert.equal(element('skip-shot').textContent, 'Take next photo');
  sounds[0].onended();
  element('skip-shot').onclick();
  await finished;
  assert.deepEqual([shots, flashes, sounds.length, closed], [2, 2, 2, 0]);
  sounds[1].onended();
  assert.equal(closed, 1);

  element('sound').checked = false;
  camera.open(2);
  await new Promise(resolve => setImmediate(resolve));
  const cancelled = element('shutter').onclick();
  await new Promise(resolve => setImmediate(resolve));
  camera.close();
  await cancelled;
  assert.equal(shots, 3);
});
