const { Cluster } = require('puppeteer-cluster');
const { inlineSource } = require('inline-source');
const debug = require('debug')('imaworldhealth:coral');

const DEFAULTS = {
  preferCSSPageSize : true,
  format : 'A4',
  swallowErrors : true,
};

// launch cluster
let cluster;

/**
 * PDF rendering is extremely resource-intensive if we do not reuse browser instances
 * On a RPi V4, we have a 17 second startup by launching a new browser each time.  By
 * reusing the same chromium instance, we shave that to sub-second timing.
 */
const launch = async () => {
  debug('setting up puppeteer cluster');
  cluster = await Cluster.launch({
    concurrency : Cluster.CONCURRENCY_CONTEXT, // incognito windows
    maxConcurrency : 2,
  });

  debug('configuring PDF rendering task');

  await cluster.task(async ({ page, data }) => {
    if (data.options.filename) {
      debug(`rendering PDF w/ filename: ${data.options.filename}`);
    }

    await page.setContent(data.html.trim());

    // FIXME(@jniles) - for some reason, puppeteer seems to be inconsistent on the
    // kind of page rendering sizes, but this seems to work for making pages landscaped.
    // See: https://github.com/puppeteer/puppeteer/issues/3834#issuecomment-549007667
    if (data.options.orientation === 'landscape') {
      await page.addStyleTag(
        { content : '@page { size: A4 landscape; }' },
      );
    }

    return page.pdf(data.options);
  });

  debug('rendering task configured');

  return cluster;
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

  let inlined = html;
  if (!options.skipRendering) {
    inlined = await inlineSource(html, {
      attribute : false, rootpath : '/', compress : false, swallowErrors : opts.swallowErrors,
    });
  }

  if (!cluster) { cluster = await launch(); }

  // make sure cluster is setup
  const pdf = await cluster.execute({ options : opts, html : inlined });
  return pdf;
}

// make sure cluster is terminated correctly on exit
process.on('exit', async () => {
  await cluster.idle();
  await cluster.close();
});

module.exports = render;
