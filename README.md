Coral
======

[![Greenkeeper badge](https://badges.greenkeeper.io/IMA-WorldHealth/coral.svg)](https://greenkeeper.io/)

A PDF rendering engine based on puppeteer for IMA World Health projects, with automatic inlining
of assets and sensible defaults.

### Usage
```js
const render = require('@ima-worldhealth/coral');

async function toPdf(html) {
  const rendered = await render(html);
  return rendered;
}
```

### License
[MIT](./LICENSE)
