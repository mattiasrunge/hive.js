"use strict";

let co = require("bluebird").coroutine;
let promisify = require("bluebird").promisify;
let extend = require("extend");
let fs = require("fs");
let readFile = promisify(fs.readFile);
let log = require("./log")(module);

module.exports = {
    init: co(function*(args) {
        log.info("Loading configuration from " + args.config + "...");

        let defaults = JSON.parse(yield readFile(__dirname + "/../conf/defaults.json"));
        let config = JSON.parse(yield readFile(args.config));
        extend(true, module.exports, defaults, config, args);

        return module.exports;
    })
};
