const child = require('child_process');
const path = require('path');

const Manager = require('./manager');

class ProcessManager extends Manager {
  _setupSlave(slave) {
    console.log(`Runner Specific Setup for ${slave.id}`);
    const abort = id => {
      if (id === slave.id) {
        slave.send({
          target: 'slave',
          event: 'abort',
          args: [id],
        });
      }
    };
    const data = (id, datum) => {
      if (id === slave.id) {
        slave.send({
          target: 'slave',
          event: 'data',
          args: [id, datum],
        });
      }
    };

    // Attach slave handlers for manager events
    this._events.on('abort', abort);
    this._events.on('data', data);

    const slaveHandler = ({ target, event, args }) => {
      // only deal with master target messages
      if (target !== 'master') {
        return;
      }

      if (event === 'status') {
        this.handleStatus(...args);
      } else if (event === 'requestStart') {
        this.handleRequestStart(...args);
      } else if (event === 'requestEnd') {
        this.handleRequestEnd(...args);
      }
    };

    // Attach manager handler for slave event
    slave.on('message', slaveHandler);

    // Store handlers for cleanup
    this._runnerHandlers[slave.id] = {
      abort,
      data,
      slaveHandler,
    };
  }

  _cleanupSlave(slave) {
    console.log(`Runner Specific Cleanup for ${slave.id}`);
    const { abort, data, slaveHandler } = this._runnerHandlers[slave.id];
    delete this._runnerHandlers[slave.id];

    // Detach manager handler from slave event
    slave.removeListener('message', slaveHandler);

    // Detach slave handlers from manager events
    this._events.removeListener('abort', abort);
    this._events.removeListener('data', data);
  }

  async _start([rId, payload]) {
    console.log(`Manager Specific Start for Runner ${rId}`);
    const slave = child.fork(path.resolve(__dirname, 'slave.js'));
    slave.id = rId;
    this._runners[rId] = slave;

    // Perform setup
    this._setupSlave(slave);

    // Start runner
    let doneHandler;
    try {
      slave.send({
        target: 'slave',
        event: '__start',
        args: [rId, payload],
      });
      await new Promise((resolve, reject) => {
        doneHandler = ({ target, event, args, error }) => {
          if (target !== 'master') {
            return;
          }

          if (event === '__error') {
            reject(error);
          }

          if (event === '__done') {
            resolve(args);
          }
        };
        doneHandler = doneHandler.bind(this);
        slave.on('message', doneHandler);
      });
      console.log(`Runner ${slave.id} Finished without errors`);
    } catch (err) {
      console.log(`Runner ${slave.id} Finished error: ${err}`);
    }
    slave.removeListener('message', doneHandler);

    // Perform runner cleanup
    this._cleanupSlave(slave);

    slave.kill();
  }
}

module.exports = ProcessManager;
