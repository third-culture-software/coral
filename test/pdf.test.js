const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const fileType = require('file-type');
const render = require('..');

test('renders a buffer', async () => {
  const rendered = await render('<html></html>');

  assert(rendered instanceof Uint8Array, 'Did not produce a Uint8Array');
  // filetype should still detect this correctly using the fromBuffer
  const type = await fileType.fromBuffer(rendered);
  assert.strictEqual(type.mime, 'application/pdf');
});

test('renders a PDF buffer from an html file', async () => {
  const file = path.join(__dirname, './fixtures/simple.html');
  const template = await fs.promises.readFile(file, 'utf8');
  const rendered = await render(template);
  assert(rendered instanceof Uint8Array, 'Did not produce a Uint8Array');
  const type = await fileType.fromBuffer(rendered);
  assert.strictEqual(type.mime, 'application/pdf');
});

test('throws an error if no parameters are provided', async () => {
  await assert.rejects(async () => { await render(); });
});

// Force the process to exit after all tests are done
test('exit', async () => { await render.close(); });
