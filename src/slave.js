const Runner = require('./runner');

let errorHandlersWired = false;

function wireErrorHandlers() {
  if (errorHandlersWired) {
    return;
  }

  process.on('uncaughtException', forwardError);
  process.on('unhandledRejection', forwardError);
}

function forwardError(error) {
  const { message, stack } = error;
  process.send({
    target: 'master',
    event: '__error',
    error: { message, stack },
  });
}

function forwardDone(...args) {
  process.send({
    target: 'master',
    event: '__done',
    args,
  });
}

function setupPassthroughWiring(runner) {
  console.log('Setting up passthrough wiring...');
  // Attach runner handlers to incoming events
  process.on('message', ({ target, event, args }) => {
    if (target !== 'slave' || event === '__start') {
      return;
    }

    if (event === 'abort') {
      runner.handleAbort(...args);
    } else if (event === 'data') {
      runner.handleData(...args);
    }
  });

  // Attach outgoing events to runner events
  ['status', 'requestStart', 'requestEnd'].forEach(event => {
    runner.events.on(event, (...args) => {
      process.send({
        target: 'master',
        event,
        args,
      });
    });
  });
}

function cleanupPassthroughWiring(runner) {
  console.log('Cleaning up passthrough wiring...');
  // Detach outgoing event from runner events
  runner.events.removeAllListeners();

  // TODO: clean up process level wiring... is this necessary?
}

async function _start([rId, payload]) {
  const runner = new Runner(rId, payload);

  setupPassthroughWiring(runner);

  await runner.start();

  cleanupPassthroughWiring(runner);
}

process.on('message', async data => {
  if (data.target !== 'slave' || data.event !== '__start') {
    return;
  }

  wireErrorHandlers();
  await _start(data.args);
  forwardDone('done');
});
