const EventEmitter = require('events');

const delay = 500;

class Runner {
  static get States() {
    return {
      Initialize: 'INITIALIZED',
      Start: 'STARTED',
      Stage1: 'STAGE1',
      Stage2: 'STAGE2',
      Stage3: 'STAGE3',
      End: 'END',
      Error: 'ERROR',
    };
  }

  constructor(id, payload) {
    this.id = id;
    this.payload = payload;

    this.state = Runner.States.Initialize;
    this.data = [];
    this.aborted = false;
    this.events = new EventEmitter();

    this.handleAbort = this.handleAbort.bind(this);
    this.handleData = this.handleData.bind(this);
  }

  handleAbort(id) {
    if (this.id === id) {
      this.aborted = true;
    }
  }

  handleData(id, datum) {
    if (this.id === id) {
      this.data.push(datum);
    }
  }

  _emit(payload) {
    this.events.emit('status', this.id, payload, 'status');
  }

  async _handleStepLogic() {
    switch (this.state) {
      case Runner.States.Start: {
        await new Promise(resolve => setTimeout(resolve, delay));
        return Runner.States.Stage1;
      }
      case Runner.States.Stage1: {
        await new Promise(resolve => setTimeout(resolve, delay));
        this.events.emit('requestStart', this.id);
        return Runner.States.Stage2;
      }
      case Runner.States.Stage2: {
        await new Promise(resolve => setTimeout(resolve, delay));
        if (this.data.length === 0) {
          return Runner.States.Stage2;
        }
        const datum = this.data.pop();
        this._emit(`Received datum: ${datum}`);
        this.events.emit('requestEnd', this.id);
        return Runner.States.Stage3;
      }
      case Runner.States.Stage3: {
        await new Promise(resolve => setTimeout(resolve, delay));
        // Throw an error at this stage if a payload error exists
        if (this.payload.error) {
          return Runner.States.Error;
        }
        return Runner.States.End;
      }
      default: {
        return Runner.States.Error;
      }
    }
  }

  async start() {
    this.state = Runner.States.Start;
    this._emit(`State Update: ${this.state}`);
    do {
      this.state = await this._handleStepLogic();
      this._emit(`State Update: ${this.state}`);
    } while (this.state !== Runner.States.End && this.state !== Runner.States.Error);

    // Cleanup
    this.events.emit('requestEnd', this.id);

    if (this.state === Runner.States.Error) {
      throw new Error('An Error Occurred');
    }
  }
}

module.exports = Runner;
