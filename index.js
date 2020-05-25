const pptr = require('puppeteer');
const { inlineSource } = require('inline-source');

const pptrOptions = {
  headless : true,
  args : [
    '--bwsi',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-sandbox',
    '--hide-scrollbars',
    '--disable-web-security',
  ],
};

const DEFAULTS = {
  preferCSSPageSize : true,
  format : 'A4',
  swallowErrors : true,
};

let browser;

/**
 * PDF rendering is extremely resource-intensive if we do not reuse browser instances
 * On a RPi V4, we have a 17 second startup by launching a new browser each time.  By
 * reusing the same chromium instance, we shave that to sub-second timing.
 */

/**
 * @function launchNewBrowser()
 *
 * @description
 * Replaces the global "browser" variable with a fresh chromium instance.
 *
 */
function launchNewBrowser() {
  browser = pptr.launch(pptrOptions);
}

const hasBrowserReuseFlag = process.env.CORAL_REUSE_BROWSER;
if (hasBrowserReuseFlag) {
  launchNewBrowser();
}

/**
 * @function getBrowserInstance
 *
 * @description
 * Allows us to reuse browser instances as needed.
 */
function getBrowserInstance() {
  return hasBrowserReuseFlag
    ? browser
    : pptr.launch(pptrOptions);
}

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
  try {
    const opts = { ...options, ...DEFAULTS };

    let inlined = html;
    if (!options.skipRendering) {
      inlined = await inlineSource(html, {
        attribute : false, rootpath : '/', compress : false, swallowErrors : opts.swallowErrors,
      });
    }

    browser = await getBrowserInstance();
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

    await page.close();
    return pdf;
  } catch (e) {
    if (browser) { await browser.close(); }
    launchNewBrowser();
    return null;
  }
}

module.exports = render;
