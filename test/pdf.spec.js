const test = require('ava');
const fs = require('fs');
const path = require('path');
const fileType = require('file-type');
const render = require('..');

test('renders a buffer', async (t) => {
  const rendered = await render('<html></html>');

  t.true(rendered instanceof Uint8Array, 'Did not produce a Uint8Array');
  // filetype should still detect this correctly using the fromBuffer
  const type = await fileType.fromBuffer(rendered);
  t.is(type.mime, 'application/pdf');
});

test('renders a PDF buffer from an html file', async (t) => {
  const file = path.join(__dirname, './fixtures/simple.html');
  const template = await fs.promises.readFile(file, 'utf8');
  const rendered = await render(template);
  t.true(rendered instanceof Uint8Array, 'Did not produce a Uint8Array');
  const type = await fileType.fromBuffer(rendered);
  t.is(type.mime, 'application/pdf');
});

test('throws an error if no parameters are provided', async (t) => {
  await t.throwsAsync(() => render());
});
