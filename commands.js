const createHelpers = require('./helpers');

const definitions = [
  { cmdMethod: 'clearExtensionStorage', helperMethod: 'clearStorage', cmdName: 'clr ext stor', cmdArgNames: ['type', 'opts'], cmdMessage: (args => args[0]) },
  { cmdMethod: 'setExtensionStorage', helperMethod: 'setStorage', cmdName: 'set ext stor', cmdArgNames: ['type', 'obj', 'opts'], cmdMessage: (args => [args[0], args[1]]) },
  { cmdMethod: 'getExtensionStorage', helperMethod: 'getStorage', cmdName: 'get ext stor', cmdArgNames: ['type', 'keys', 'opts'], cmdMessage: (args => [args[0], args[1]]) },
  { cmdMethod: 'execExtensionCommand', helperMethod: 'execCommand', cmdName: 'exec ext cmd', cmdArgNames: ['property', 'method', 'args', 'opts'], cmdMessage: (args => [args[0], args[1]]) },
];

const findOptsArg = (args, maxLength) => args[maxLength];
const customAliasPrefixIfAny = (opts, ctx) => (
  [opts, ctx]
    .map(o => o && o.alias)
    .filter(present => present)
    .slice(0, 1)
);

module.exports = function addCommands(Cypress, helperContext) {
  const helpers = createHelpers(helperContext);

  definitions.forEach(({ helperMethod, cmdMethod, cmdName, cmdArgNames, cmdMessage }) => (
    Cypress.Commands.add(cmdMethod, (...args) => {
      const opts = findOptsArg(args, cmdArgNames.length);
      const customAliasPrefix = customAliasPrefixIfAny(opts, helperContext);
      Cypress.log({
        name: cmdName,
        // show message from definition's cmdMessage, prefixed
        // with the cutom alias in options or helper context
        // unless using the default alias (no custom alias)
        message: customAliasPrefix.concat(cmdMessage(args)),
        // consoleProps logs all the args and the helper ctx
        consoleProps: () => cmdArgNames.reduce((consoleProps, argName, idx) => (
          Object.assign({}, consoleProps, { [argName]: args[idx] })
        ), { context: helperContext }),
      });
      return helpers[helperMethod](...args);
    })
  ));
};
