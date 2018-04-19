const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const defaultAlias = 'myExtension';
const hookFilesDir = 'cypress-extension-hooks';
const cypressMatches = ['*://*/*/integration/*'];

const defaultOptions = {
  alias: defaultAlias,
  validBrowsers: ['chrome'],
  backgroundHookTemplate: fs.readFileSync(path.join(__dirname, 'templates', 'background.js'), 'utf8'),
  contentHookTemplate: fs.readFileSync(path.join(__dirname, 'templates', 'contentscript.js'), 'utf8'),
};

function handleOptions(userOptions) {
  return Object.assign(
    {},
    defaultOptions,
    {
      source: userOptions,
      destDir: path.join(os.tmpdir(), 'cypress-extensions', userOptions.alias || defaultAlias),
    },
    userOptions,
  );
}

function copyHookFile(templateContent, destDir, fileName, alias) {
  const content = templateContent.replace(new RegExp('{{alias}}', 'g'), alias);
  const destFile = path.resolve(destDir, hookFilesDir, fileName);
  fs.writeFileSync(destFile, content);
}

function buildExtension(opts) {
  // eslint-disable-next-line no-console
  console.log(`Cypress Extensions: Copying and preparing extension ${opts.alias} from ${opts.source} to ${opts.destDir}`);
  // Copy ext to tmp dir
  fs.removeSync(opts.destDir);
  fs.copySync(opts.source, opts.destDir);
  fs.mkdirSync(path.join(opts.destDir, hookFilesDir));

  // Copy hook files
  copyHookFile(opts.backgroundHookTemplate, opts.destDir, 'background.js', opts.alias);
  copyHookFile(opts.contentHookTemplate, opts.destDir, 'contentscript.js', opts.alias);

  // Update manifest
  const manifest = fs.readJsonSync(path.join(opts.source, 'manifest.json'));
  // Inject background hook
  manifest.background = manifest.background || {};
  manifest.background.scripts = manifest.background.scripts || [];
  manifest.background.scripts.push(path.join(hookFilesDir, 'background.js'));
  // Allow scripts in all frames but only non-JS
  if (!manifest.content_scripts) manifest.content_scripts = [];
  manifest.content_scripts = manifest.content_scripts.map(scriptObj => (
    Object.assign({}, scriptObj, { all_frames: true, exclude_matches: cypressMatches })
  ));
  // Inject content hook
  manifest.content_scripts.push({
    js: [path.join(hookFilesDir, 'contentscript.js')],
    matches: ['<all_urls>'],
    all_frames: false,
  });
  // Write new manifest to destDir
  fs.writeJsonSync(path.join(opts.destDir, 'manifest.json'), manifest);
}

module.exports = (userOptions = {}) => {
  const opts = handleOptions(userOptions);
  if (!fs.existsSync(opts.source)) throw new Error(`No file found at extension source ${opts.source}`);

  buildExtension(opts);

  return function loadExtension(browser = {}, args) {
    if (!opts.validBrowsers || opts.validBrowsers.includes(browser.name)) {
      const existingLoadArgIndex = args.findIndex(arg => (typeof arg === 'string') && arg.startsWith('--load-extension='));
      if (existingLoadArgIndex >= 0) {
        // eslint-disable-next-line no-param-reassign
        args[existingLoadArgIndex] = `${args[existingLoadArgIndex]},${opts.destDir}`;
      } else {
        args.push(`--load-extension=${opts.destDir}`);
      }
    }
    return args;
  };
};
