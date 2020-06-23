const constants = {
  responseType: 'BrowserCommandResponse',
  commandType: 'BrowserCommand',
  messageType: 'BrowserMessage'
};

function logger({ prefix }) {
  return function prefixedLogger(txt, ...rest) {
    console.log(`%c${prefix} %c${txt}`, 'color: gray; font-weight: lighter;', 'font-weight: bolder;', ...rest);
  };
}

module.exports = {
  constants,
  logger,
};
