const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const chokidar = require('chokidar');

const defaultAlias = 'myExtension';
const hookFilesDir = 'cypress-extension-hooks';

const defaultOptions = {
  alias: defaultAlias,
  validBrowsers: ['chrome'],
  skipHooks: false,
  cypressMatches: ['*://*/*/integration/*'],
  watch: true,
  quiet: false,
  backgroundHookTemplate: path.join(__dirname, 'templates', 'background.js'),
  contentHookTemplate: path.join(__dirname, 'templates', 'contentscript.js'),
};

let watchers = [];

const merge = (...objs) => Object.assign({}, ...objs);

function handleOptionsDefaults(userOptions) {
  return merge(
    defaultOptions,
    {
      source: userOptions,
      destDir: path.join(os.tmpdir(), 'cypress-extensions', userOptions.alias || defaultAlias),
    },
    userOptions,
  );
}

function copyHookFile(templateFile, destDir, fileName, alias) {
  const templateContent = fs.readFileSync(templateFile, 'utf8');
  const content = templateContent.replace(new RegExp('{{alias}}', 'g'), alias);
  const destFile = path.resolve(destDir, hookFilesDir, fileName);
  return fs.writeFile(destFile, content);
}

async function buildExtension(opts) {
  if (!fs.existsSync(opts.source)) throw new Error(`No file found at extension source ${opts.source}`);

  if (!opts.quiet) console.log(`Cypress Extensions: Copying and preparing extension ${opts.alias} from ${opts.source} to ${opts.destDir}`);

  // Copy ext to tmp dir
  await fs.remove(opts.destDir);
  await fs.copy(opts.source, opts.destDir);
  await fs.mkdir(path.join(opts.destDir, hookFilesDir));

  // Update manifest
  const manifest = await fs.readJson(path.join(opts.source, 'manifest.json'));
  // Allow extension content scripts in all non-Cypress frames
  const cs = manifest.content_scripts;
  manifest.content_scripts = cs && cs.map(scriptObj => (
    merge(scriptObj, { all_frames: true, exclude_matches: opts.cypressMatches })
  ));

  // Inject hooks
  if (!opts.skipHooks) {
    // Copy hook files
    await copyHookFile(opts.backgroundHookTemplate, opts.destDir, 'background.js', opts.alias);
    await copyHookFile(opts.contentHookTemplate, opts.destDir, 'contentscript.js', opts.alias);

    // Inject background hook into manifest
    manifest.background = manifest.background || {};
    manifest.background.scripts = manifest.background.scripts || [];
    manifest.background.scripts.push(path.join(hookFilesDir, 'background.js'));

    // Inject content hook into manifest
    if (!manifest.content_scripts) manifest.content_scripts = [];
    manifest.content_scripts.push({
      js: [path.join(hookFilesDir, 'contentscript.js')],
      matches: ['<all_urls>'],
      all_frames: false,
    });
  }

  // Write new manifest to destDir
  await fs.writeJson(path.join(opts.destDir, 'manifest.json'), manifest);
}

// prevents duplicate watchers list growing whenever Cypress relaunches a new browser
function resetWatchers() {
  watchers.forEach(w => w.close());
  watchers = [];
}

function watch(opts) {
  if (!opts.watch) return;
  const watcher = chokidar.watch(opts.source, { ignoreInitial: true });
  watcher.on('all', (event, changePath) => {
    if (!opts.quiet) console.log('Cypress Extensions: Watch event ', event, ` on ${opts.alias}:`, changePath);
    buildExtension(opts);
  });
  watchers.push(watcher);
}

function watchAll(definitions, whenPromise) {
  whenPromise.then(() => definitions.forEach(watch));
}

module.exports = (...extensionDefinitions) => {
  const definitions = extensionDefinitions.map(handleOptionsDefaults);

  resetWatchers();

  const whenAllBuilt = Promise.all(
    definitions.map(buildExtension),
  );

  watchAll(definitions, whenAllBuilt);

  // async plugin function, will resolve loading args for browser when
  // all the temp extensions are built
  return function loadExtensions(browser = {}, args) {
    return whenAllBuilt.then(() => {
      const toLoad = definitions.filter(opts => (
        !opts.validBrowsers || opts.validBrowsers.includes(browser.name)
      ));
      if (toLoad.length > 0) {
        const dirList = toLoad.map(o => o.destDir).join(',');
        const existingLoadArgIndex = args.findIndex(arg => (
          (typeof arg === 'string') && arg.startsWith('--load-extension=')
        ));
        if (existingLoadArgIndex >= 0) {
          // eslint-disable-next-line no-param-reassign
          args[existingLoadArgIndex] = `${args[existingLoadArgIndex]},${dirList}`;
        } else {
          args.push(`--load-extension=${dirList}`);
        }
      }
      return args;
    });
  };
};
