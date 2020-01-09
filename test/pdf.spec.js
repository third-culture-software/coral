import test from 'ava';
import fs from 'fs';
import path from 'path';
import fileType from 'file-type';
import render from '..';


test('renders a buffer', async (t) => {
  const rendered = await render('<html></html>');
  t.true(Buffer.isBuffer(rendered), 'Did not produce a buffer');
  const type = await fileType.fromBuffer(rendered);
  t.is(type.mime, 'application/pdf');
});

test('renders a PDF buffer from an html file', async (t) => {
  const file = path.join(__dirname, './fixtures/simple.html');
  const template = await fs.promises.readFile(file, 'utf8');
  const rendered = await render(template);
  t.true(Buffer.isBuffer(rendered), 'Did not produce a buffer');
  const type = await fileType.fromBuffer(rendered);
  t.is(type.mime, 'application/pdf');
});
