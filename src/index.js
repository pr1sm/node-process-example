const Manager = require('./manager');
const ProcessManager = require('./processManager');

function generatePayloads(length) {
  const payloads = [];
  for (let step = 0; step < length; step += 1) {
    const error = step % 2 ? {} : null;
    payloads.push({
      payload: `data${step}`,
      error,
    });
  }
  return payloads;
}

async function runManager(length) {
  console.log(`Running Single Process Manager for ${length} payloads`);
  const manager = new Manager();
  const payloads = generatePayloads(length);

  payloads.forEach(payload => manager.start(payload));
}

async function runProcessManager(length) {
  console.log(`Running Multi Process Manager for ${length} payloads`);
  const manager = new ProcessManager();
  const payloads = generatePayloads(length);

  payloads.forEach(payload => manager.start(payload));
}

const DEFAULT_PAYLOAD_LENGTH = 10;

async function run() {
  if (process.argv.length === 3) {
    let length = DEFAULT_PAYLOAD_LENGTH;
    try {
      length = parseInt(process.argv[2], 10);
    } catch (_) {}

    length = isNaN(length) ? DEFAULT_PAYLOAD_LENGTH : length;

    if (process.argv[2] === '--threads') {
      await runProcessManager(length);
      return;
    } else {
      await runManager(length);
      return;
    }
  } else if (process.argv.length === 4) {
    let length = DEFAULT_PAYLOAD_LENGTH;
    let length2;
    let length3;
    try {
      length2 = parseInt(process.argv[2], 10);
      length3 = parseInt(process.argv[3], 10);
    } catch (_) {}

    length = !isNaN(length2) ? length2 : !isNaN(length3) ? length3 : DEFAULT_PAYLOAD_LENGTH;

    if (process.argv[2] === '--threads' || process.argv[3] === '--threads') {
      await runProcessManager(length);
      return;
    } else {
      await runManager(length);
      return;
    }
  }
  await runManager(DEFAULT_PAYLOAD_LENGTH);
}

run();
