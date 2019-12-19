const pptr = require('puppeteer');
const { inlineSource } = require('inline-source');

const pptrOptions = {
  headless: true,
  args: [
    '--bwsi',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--hide-scrollbars',
    '--disable-web-security',
    '--no-sandbox',
  ],
};

const DEFAULTS = {
  preferCSSPageSize: true,
  format: 'A4',
};

/**
 * @function render
 *
 * @description
 * Takes an HTML source file, inlines the assets, spins up a new puppeteer instance, and
 * renders them together into a PDF.
 *
 * @param {String} html - the html template
 * @param {Object} options - options to merge into the HTML
 *
 * @returns {Promise} a PDF of the HTML source
 */
async function render(html, options = {}) {
  const opts = { ...options, ...DEFAULTS };
  const inlined = await inlineSource(html, { attribute: false, rootpath: '/', compress: false });
  const browser = await pptr.launch(pptrOptions);
  const page = await browser.newPage();
  await page.setContent(inlined.trim());
  const pdf = await page.pdf(opts);
  await browser.close();
  return pdf;
}

module.exports = render;
