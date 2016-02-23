"use strict";

let amqp = require("amqp");
let co = require("bluebird").coroutine;
let log = require("./log")(module);

let connections = [];

module.exports = {
    init: co(function*(params) {
        if (!params) {
            return;
        }

        let configList = params instanceof Array ? params : [ params ];

        for (let config of configList) {
            config.host = config.host || "localhost";
            config.port = config.port || 5672;
            config.login = config.login || "guest";
            config.password = config.password || "guest";
            config.vhost = config.vhost || "/";
            config.exchangeDurable = typeof config.exchangeDurable === "undefined" ? false : config.exchangeDurable;
            config.exchangePassive = typeof config.exchangePassive === "undefined" ? true : config.exchangePassive;

            let exchangeOptions = {
                durable: config.exchangeDurable,
                passive: config.exchangePassive
            };

            let connection = amqp.createConnection(config, { defaultExchangeName: config.exchange });

            yield new Promise((resolve, reject) => {
                connection.on("error", reject);

                connection.on("ready", () => {
                    connection.exchange(config.exchange, exchangeOptions, (exchange) => {
                        connections.push({
                            connection: connection,
                            exchange: exchange,
                            config: config
                        });

                        log.info("Successfully connected to messagebus on " + config.host + ":" + config.port + "/" + config.exchange);
                        resolve();
                    });
                });
            });
        }
    }),
    publish: co(function*(repositoryInfo, params) {
        if (connections.length === 0) {
            throw new Error("Not connected to messagebus");
        }

        let published = [];

        for (let connection of connections) {
            let schemeName = connection.config.messageScheme || "default";
            let scheme = require("./messageScheme/" + schemeName);
            let message = scheme(connection.config, repositoryInfo, params);

            if (message) {
                //console.log("Publishing message, ", JSON.stringify(message));
                connection.exchange.publish(connection.config.routingKey, new Buffer(JSON.stringify(message)));
                published.push(message);
            }
        }

        return published;
    }),
    stop: co(function*() {
        for (let connection of connections) {
            connection.connection.end();
        }

        connections = [];
    })
};
