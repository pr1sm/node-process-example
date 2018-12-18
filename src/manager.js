const EventEmitter = require('events');

const uuidv4 = require('uuid/v4');

const Runner = require('./runner');

class Manager {
  constructor() {
    this._events = new EventEmitter();
    this._events.setMaxListeners(100);
    this._runners = {};
    this._runnerHandlers = {};

    this._collecting = {};
    this._collectingCount = 0;

    this.handleStatus = this.handleStatus.bind(this);
    this.handleRequestStart = this.handleRequestStart.bind(this);
    this.handleRequestEnd = this.handleRequestEnd.bind(this);
  }

  handleStatus(runnerId, message, event) {
    console.log(`Runner: ${runnerId} posted event: ${event}: ${message}`);
    this._events.emit('status', runnerId, message, event);
  }

  handleRequestStart(runnerId) {
    if (!this._collecting[runnerId]) {
      console.log(`Runner: ${runnerId} starting data request...`);
      this._collecting[runnerId] = true;
      this._collectingCount += 1;

      if (this._collectingCount === 1) {
        console.log(`Collecting enabled...`);
      }

      // Send some fake data (usually this would be asynchronous and from an actual source...)
      this._events.emit('data', runnerId, uuidv4());
    }
  }

  handleRequestEnd(runnerId) {
    if (this._collecting[runnerId]) {
      console.log(`Runner: ${runnerId} ending data request...`);
      delete this._collecting[runnerId];
      this._collectingCount -= 1;

      if (this._collectingCount === 0) {
        console.log(`Collecting disabled...`);
      }
    }
  }

  setup() {
    console.log(`Manager Setup for new runner`);
    let runnerId;
    do {
      runnerId = uuidv4();
    } while (this._runners[runnerId]);
    return [runnerId];
  }

  cleanup(runnerId) {
    console.log(`Manager Cleanup for Runner ${runnerId}`);
    delete this._runners[runnerId];
  }

  async start(payload) {
    console.log(`Start for new runner`);
    const [rId] = this.setup();

    this._start([rId, payload]).then(() => {
      this.cleanup(rId);
    });
  }

  _setupRunner(runner) {
    console.log(`Runner Specific Setup for ${runner.id}`);
    // Attach runner handlers for manager events
    const abort = id => {
      if (id === runner.id) {
        runner.handleAbort(id);
      }
    };
    const data = (id, datum) => {
      if (id === runner.id) {
        runner.handleData(id, datum);
      }
    };
    this._runnerHandlers[runner.id] = {
      abort,
      data,
    };

    this._events.on('abort', abort);
    this._events.on('data', data);

    // Attach manager handlers for runner events
    runner.events.on('status', this.handleStatus);
    runner.events.on('requestStart', this.handleRequestStart);
    runner.events.on('requestEnd', this.handleRequestEnd);
  }

  _cleanupRunner(runner) {
    console.log(`Runner Specific Cleanup for ${runner.id}`);
    // Detach manager handlers from runner events
    runner.events.removeListener('status', this.handleStatus);
    runner.events.removeListener('requestStart', this.handleRequestStart);
    runner.events.removeListener('requestEnd', this.handleRequestEnd);

    // Detach runner handlers from manager events
    const { abort, data } = this._runnerHandlers[runner.id];
    delete this._runnerHandlers[runner.id];
    this._events.removeListener('abort', abort);
    this._events.removeListener('data', data);
  }

  async _start([rId, payload]) {
    console.log(`Manager Specific Start for Runner ${rId}`);
    const runner = new Runner(rId, payload);
    this._runners[rId] = runner;

    // Perform runner setup
    this._setupRunner(runner);

    // Start runner
    try {
      await runner.start();
      console.log(`Runner ${runner.id} Finished without errors`);
    } catch (err) {
      console.log(`Runner ${runner.id} Finished error: ${err}`);
    }

    // Perform runner cleanup
    this._cleanupRunner(runner);
  }
}

module.exports = Manager;
