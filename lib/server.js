"use strict";

// https://cwiki.apache.org/confluence/display/MAVENOLD/Repository+Layout+-+Final
// http://maven.apache.org/pom.html#What_is_the_POM
// http://maven.apache.org/guides/mini/guide-3rd-party-jars-remote.html

let express = require("express");
let http = require("http");
let log = require("./log")(module);
let compression = require("compression");
let Bluebird = require("bluebird");
let enableDestroy = require("server-destroy");
let basicAuth = require("basic-auth");
let promisify = Bluebird.promisify;
let co = Bluebird.coroutine;

let Controller = require("./controller");
let server = null;

module.exports = {
    init: co(function*(config, version) {
        let app = express();
        server = http.createServer(app);
        let controller = new Controller(config);

        app.use(compression());

        app.use(function(request, response, next) {
            let auth = basicAuth(request);

            request.auth = auth ? { username: auth.name } : undefined;
            request.allowed = auth && config.users.filter((user) => user.username === auth.name && user.password === auth.pass)[0] || false;

            next();
        });

        app.get("*", function(request, response, next) {
            log.debug("Got request for " + request.url);
            next();
        });

        app.get("/status", function(request, response) {
            response.status(200).type("json").send(JSON.stringify({ status: "ok", version: version }, null, 2)).end();
        });

        app.put("/:repository/*", controller.upload);
        app.get("/:repository/*/reserve", controller.reserve);
        app.get("/:repository/*/unreserve", controller.unreserve);
        app.get("/:repository/*/regenerate", controller.regenerate);
        app.use(controller.directory);
        app.use(controller.repositories);
        app.use(controller.bootstrap);

        enableDestroy(server);

        server.listen(config.port);

        log.info("Now listening for connections on port " + config.port);
    }),
    stop: co(function*() {
        if (server) {
            yield promisify(server.destroy, { context: server })();
        }
    })
};

