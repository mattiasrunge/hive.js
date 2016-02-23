"use strict";

let amqp = require("amqp");
let co = require("bluebird").coroutine;
let log = require("./log")(module);

let connections = [];
let params = {};

module.exports = {
    init: co(function*(config) {
        params = config;

        if (!config.mb) {
            return;
        }

        let configList = config.mb instanceof Array ? config.mb : [ config.mb ];

        for (let mbConfig of configList) {
            mbConfig.host = mbConfig.host || "localhost";
            mbConfig.port = mbConfig.port || 5672;
            mbConfig.login = mbConfig.login || "guest";
            mbConfig.password = mbConfig.password || "guest";
            mbConfig.vhost = mbConfig.vhost || "/";
            mbConfig.exchangeDurable = typeof mbConfig.exchangeDurable === "undefined" ? false : mbConfig.exchangeDurable;
            mbConfig.exchangePassive = typeof mbConfig.exchangePassive === "undefined" ? true : mbConfig.exchangePassive;

            let exchangeOptions = {
                durable: mbConfig.exchangeDurable,
                passive: mbConfig.exchangePassive
            };

            let connection = amqp.createConnection(mbConfig, { defaultExchangeName: mbConfig.exchange });

            yield new Promise((resolve, reject) => {
                connection.on("error", reject);

                connection.on("ready", () => {
                    connection.exchange(mbConfig.exchange, exchangeOptions, (exchange) => {
                        connections.push({
                            connection: connection,
                            exchange: exchange,
                            config: mbConfig
                        });

                        log.info("Successfully connected to messagebus on " + mbConfig.host + ":" + mbConfig.port + "/" + mbConfig.exchange);
                        resolve();
                    });
                });
            });
        }
    }),
    publish: co(function*(repositoryInfo, args) {
        if (connections.length === 0) {
            throw new Error("Not connected to messagebus");
        }

        let published = [];

        for (let connection of connections) {
            let schemeName = connection.config.messageScheme || "default";
            let scheme = require("./messageScheme/" + schemeName);
            let message = scheme(params, connection.config, repositoryInfo, args);

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
