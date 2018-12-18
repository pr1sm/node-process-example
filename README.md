# Node Process Example

This project is a proof-of-concept for integrating multiple process into an existing `Manager/Runner` relationship.

## Run

```
$ yarn run build
$ yarn start
```

## Options

You can specify whether or not you want to use multiple processes by passing a `--threads` flag. You can also optionally specify the number of runners to start:

```
$ yarn start --threads     # run default runners (10) with multiple processes
$ yarn start 100           # run 100 runners in a single process
$ yarn start --threads 100 # run 100 runners with multiple processes
```
