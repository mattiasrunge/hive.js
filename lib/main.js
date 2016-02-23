"use strict";

let co = require("bluebird").coroutine;
let configuration = require("./configuration");
let logger = require("./log");
let log = logger(module);
let actions = require("./actions");
let helpers = require("./helpers");
let server = require("./server");
let mb = require("./mb");

module.exports = {
    start: co(function*(args, version) {
        yield logger.init(args.level);
        yield configuration.init(args);

        log.info("Repository path is " + configuration.repositoriesPath);
        log.info("Re-deploy is " + (configuration.enableRedeploy ? "enabled" : "disabled") + " if not overridden on repository configuration");

        yield mb.init(configuration.mb);
        helpers.init(configuration);
        yield actions.init(configuration);
        yield server.init(configuration, version);
    }),
    stop: co(function*() {
        log.info("Received shutdown signal, stoppping...");
        yield server.stop();
        yield mb.stop();
    })
};
