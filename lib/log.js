"use strict";

let winston = require("winston");
let getLabel = function(callingModule) {
    let filename = typeof callingModule === "string" ? callingModule : callingModule.filename;
    let parts = filename.split("/").reverse();
    return parts[1] + "/" + parts[0];
};
let loggers = [];
let level = "debug";
let silent = false;

module.exports = function(callingModule) {
    let log = new winston.Logger({
        transports: [
            new (winston.transports.Console)({
                name: "console",
                label: getLabel(callingModule),
                prettyPrint: true,
                timestamp: true,
                level: level,
                silent: silent
            })
        ]
    });

    loggers.push(log);

    return log;
};

module.exports.init = function(l) {
    level = typeof l === "string" ? l : level;
    silent = l === false;

    loggers.forEach(function(log) {
        log.transports.console.level = level;
        log.transports.console.silent = silent;
    });

    return Promise.resolve();
};
