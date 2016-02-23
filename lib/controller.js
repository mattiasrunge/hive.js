"use strict";

let actions = require("./actions");
let express = require("express");
let path = require("path");
let jade = require("jade");
let fs = require("fs");
let log = require("./log")(module);

module.exports = function(config) {
    let jadeTemplate = fs.readFileSync(path.join(__dirname, "..", "templates", "directory.jade"));
    let createDirectoryHTML = jade.compile(jadeTemplate, {
        pretty: true,
        filename: path.join(__dirname, "templates", "index.html")
    });

    return {
        repositories: express.static(config.repositoriesPath),
        bootstrap: express.static(path.normalize(__dirname + "/../node_modules/bootstrap/dist/")),
        directory: function(request, response, next) {
            if (request.method !== "GET" && request.method !== "HEAD") {
                return next();
            }

            actions.directory(request.url, request.originalUrl)
            .then(function(data) {
                if (data === true) { // True means we should continue to next
                    return next();
                }

                let html = createDirectoryHTML({
                    breadcrumb: actions.directoryBreadcrumb(data.directory),
                    files: data.files,
                    directoryPath: data.directory
                });

                response.status(200).type("html").send(html).end();
            })
            .catch(function(error) {
                log.error(error);
                log.error(error.stack);
                response.status(500).type("text").send(error.toString()).end();
            });
        },
        upload: function(request, response) {
            if (!request.allowed) {
                log.warn("Client is not allowed to upload files");
                return response.status(401).send("You must be logged in to upload files").end();
            }

            actions.upload(request.auth, request.params.repository, request.params[0], request.query, request)
            .then(function() {
                response.status(200).type("text").send("OK").end();
            })
            .catch(function(error) {
                log.error(error);
                log.error(error.stack);
                response.status(400).type("text").send(error.toString()).end();
            });
        },
        reserve: function(request, response) {
            if (!request.allowed) {
                log.warn("Client is not allowed to upload files");
                return response.status(401).send("You must be logged in to reserve a version").end();
            }

            actions.reserve(request.auth, request.params.repository, request.params[0] + "/reserve")
            .then(function(version) {
                response.status(201).type("text").send(version).end();
            })
            .catch(function(error) {
                log.error(error);
                log.error(error.stack);
                response.status(400).type("text").send(error.toString()).end();
            });
        },
        unreserve: function(request, response) {
            if (!request.allowed) {
                log.warn("Client is not allowed to upload files");
                return response.status(401).send("You must be logged in to unreserve a version").end();
            }

            actions.unreserve(request.auth, request.params.repository, request.params[0] + "/unreserve")
            .then(function() {
                response.status(200).type("text").send("OK").end();
            })
            .catch(function(error) {
                log.error(error);
                log.error(error.stack);
                response.status(400).type("text").send(error.toString()).end();
            });
        },
        regenerate: function(request, response) {
            if (!request.allowed) {
                log.warn("Client is not allowed to upload files");
                return response.status(401).send("You must be logged in to run regenerate metadata").end();
            }

            actions.regenerate(request.auth, request.params.repository, request.params[0] + "/regenerate")
            .then(function() {
                response.status(200).type("text").send("OK").end();
            })
            .catch(function(error) {
                log.error(error);
                log.error(error.stack);
                response.status(400).type("text").send(error.toString()).end();
            });
        }
    };
};
