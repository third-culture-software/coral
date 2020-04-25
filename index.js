const pptr = require('puppeteer');
const { inlineSource } = require('inline-source');

const pptrOptions = {
  headless : true,
  args : [
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
  preferCSSPageSize : true,
  format : 'A4',
  swallowErrors : true,
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
  let browser;
  try {
    const opts = { ...options, ...DEFAULTS };


    let inlined = html;
    if (!options.skipRendering) {
      inlined = await inlineSource(html, {
        attribute : false, rootpath : '/', compress : false, swallowErrors : opts.swallowErrors,
      });
    }

    browser = await pptr.launch(pptrOptions);
    const page = await browser.newPage();
    await page.setContent(inlined.trim());

    // FIXME(@jniles) - for some reason, puppeteer seems to be inconsistent on the
    // kind of page rendering sizes, but this seems to work for making pages landscaped.
    // See: https://github.com/puppeteer/puppeteer/issues/3834#issuecomment-549007667
    if (opts.orientation === 'landscape') {
      await page.addStyleTag(
        { content : '@page { size: A4 landscape; }' },
      );
    }

    const pdf = await page.pdf(opts);

    await browser.close();
    return pdf;
  } catch (e) {
    if (browser) { browser.close(); }
    return null;
  }
}

module.exports = render;
