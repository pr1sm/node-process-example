const EventEmitter = require('events');

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

function setupPassthroughWiring(runner, events) {
  console.log('Setting up passthrough wiring...');
  // Attach runner handlers to incoming events
  events.on('abort', runner.handleAbort);
  events.on('data', runner.handleData);

  // Attach outgoing events to runner events
  runner.events.on('status', (...args) => {
    events.emit('status', ...args);
  });
  runner.events.on('requestStart', (...args) => {
    events.emit('requestStart', ...args);
  });
  runner.events.on('requestEnd', (...args) => {
    events.emit('requestEnd', ...args);
  });

  // Process level wiring...
  process.on('message', ({ target, event, args }) => {
    if (target !== 'slave' || event === '__start') {
      return;
    }
    // Reemit any events that are targetted for the slave
    events.emit(event, ...args);
  });

  const forward = event => (...args) => {
    process.send({
      target: 'master',
      event,
      args,
    });
  };

  ['status', 'requestStart', 'requestEnd'].forEach(ev => {
    events.on(ev, forward(ev));
  });
}

function cleanupPassthroughWiring(runner, events) {
  console.log('Cleaning up passthrough wiring...');
  // Detach outgoing event from runner events
  runner.events.removeAllListeners();

  // Detach runner handlers from incoming events
  events.removeAllListeners();

  // TODO: clean up process level wiring...
}

async function _start([rId, payload]) {
  const events = new EventEmitter();
  const runner = new Runner(rId, payload);

  setupPassthroughWiring(runner, events);

  await runner.start();

  cleanupPassthroughWiring(runner, events);
}

process.on('message', async data => {
  if (data.target !== 'slave' || data.event !== '__start') {
    return;
  }

  wireErrorHandlers();
  await _start(data.args);
  forwardDone('done');
});
