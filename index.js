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
  debug('#launch(): setting up puppeteer cluster');

  const options = {
    concurrency : Cluster.CONCURRENCY_CONTEXT, // incognito windows
    maxConcurrency : 2,
  };

  if (process.env.CHROME_OPTIONS) {
    options.puppteerOptions = {
      args : process.env.CHROME_OPTIONS.split(' '),
    };

    debug('#launch() using extra launch arguments:', process.env.CHROME_OPTIONS);
  }

  cluster = await Cluster.launch(options);

  debug('#launch(): configuring PDF rendering task');

  await cluster.task(async ({ page, data }) => {
    if (data.options.filename) {
      debug(`#task(): rendering PDF w/ filename: ${data.options.filename}`);
    }

    const content = data.html.trim();

    await page.setContent(content);
    debug(`#task(): rendering content length of ${content.length}`);

    // FIXME(@jniles) - for some reason, puppeteer seems to be inconsistent on the
    // kind of page rendering sizes, but this seems to work for making pages landscaped.
    // See: https://github.com/puppeteer/puppeteer/issues/3834#issuecomment-549007667
    if (data.options.orientation === 'landscape') {
      await page.addStyleTag(
        { content : '@page { size: A4 landscape; }' },
      );
    }

    const pdf = await page.pdf(data.options);
    debug('#task(): pdf rendered.');
    return pdf;
  });

  debug('#launch(): rendering task configured');

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
    debug('#render(): HTML render skipping is disabled.  Using inline-source to render HTML.');
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
process.on('beforeExit', async () => {
  debug('cleaning up subprocesses');
  await cluster.idle();
  await cluster.close();
  debug('successfully closed all subprocesses.');
});

// force-close all subprocesses on exit.
process.on('exit', () => cluster && cluster.close());

module.exports = render;
