"use strict";

let co = require("bluebird").coroutine;
let mocha = require("mocha");
let timemachine = require("timemachine");

module.exports = function() {
    // Make new Date() return the same date every time
    timemachine.config({
        dateString: "November 25, 1982 00:09:07"
    });

    // Create mocha-functions which deals with generators
    function mochaGen(originalFn) {
        return (text, fn) => {
            fn = typeof text === "function" ? text : fn;

            if (fn.constructor.name === "GeneratorFunction") {
                let oldFn = fn;
                fn = (done) => {
                    co(oldFn)()
                    .then(done)
                    .catch(done);
                };
            }

            if (typeof text === "function") {
                originalFn(fn);
            } else {
                originalFn(text, fn);
            }
        };
    }

    // Override mocha, we get W020 lint warning which we ignore since it works...
    it = mochaGen(mocha.it); // jshint ignore:line
    before = mochaGen(mocha.before); // jshint ignore:line
    after = mochaGen(mocha.after); // jshint ignore:line

    return {
        createDeferred: function() {
            let reject;
            let resolve;
            let promise = new Promise(function() {
                resolve = arguments[0];
                reject = arguments[1];
            });

            return {
                reject: reject,
                resolve: resolve,
                promise: promise
            };
        }
    };
};
