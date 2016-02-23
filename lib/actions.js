"use strict";

let fs = require("fs-extra-promise");
let url = require("url");
let path = require("path");
let humanize = require("humanize");
let moment = require("moment");
let co = require("bluebird").coroutine;
let log = require("./log")(module);
let helpers = require("./helpers");
let mb = require("./mb");
let utils = require("./utils");

let params = {};

module.exports = {
    upload: co(function*(auth, repository, urlPath, args, fileStream) {
        let repositoryInfo = yield helpers.decodeRepositoryUrl(repository, urlPath);

        yield helpers.ensureGAVStructure(params.repositoriesPath, repositoryInfo);

        let filename = yield helpers.writeUploadedFile(params.repositoriesPath, repositoryInfo, fileStream, repositoryInfo.enableRedeploy || !repositoryInfo.isArtifact);

        if (repositoryInfo.isArtifact) {
            log.info(auth.username + " uploaded new file (" + filename + ") to version " + repositoryInfo.version + " of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);

            if (params.mb) {
                let messages = yield mb.publish(repositoryInfo, args);

                if (messages.length > 0) {
                    log.info("Published message(s) to the messagebus, ", JSON.stringify(messages));
                }
            }
        } else {
            log.info(auth.username + " updated metadata file (" + filename + ") for artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
        }
    }),
    reserve: co(function*(auth, repository, urlPath) {
        let repositoryInfo = yield helpers.decodeRepositoryUrl(repository, urlPath);

        yield helpers.ensureGAVStructure(params.repositoriesPath, repositoryInfo);

        log.info(auth.username + " reserved version " + repositoryInfo.version + " of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);

        return repositoryInfo.version;
    }),
    unreserve: co(function*(auth, repository, urlPath) {
        let repositoryInfo = yield helpers.decodeRepositoryUrl(repository, urlPath);

        yield helpers.ensureGAVStructure(params.repositoriesPath, repositoryInfo);

        log.info(auth.username + " unreserved version " + repositoryInfo.version + " of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
    }),
    regenerate: co(function*(auth, repository, urlPath) {
        let repositoryInfo = yield helpers.decodeRepositoryUrl(repository, urlPath);

        yield helpers.ensureGAVStructure(params.repositoriesPath, repositoryInfo);

        log.info(auth.username + " regenerated the metadata of artifact " + repositoryInfo.artifactId + " in group " + repositoryInfo.groupId + " in repository " + repositoryInfo.repository);
    }),
    directoryBreadcrumb: function(dir) {
        let partDir = "";
        let list = dir.split("/").map((part) => {
            partDir = path.join(partDir, part);

            return {
                url: "/" + partDir,
                name: part
            };
        });

        list[0] = { url: "/", name: "Repositories" };

        return list;
    },
    directory: co(function*(urlPath, originalUrl) {
        let dir = decodeURIComponent(url.parse(urlPath).pathname);
        let directory = path.normalize(path.join(params.repositoriesPath, dir));
        let directoryPath = decodeURIComponent(url.parse(originalUrl).pathname);

        // null byte(s), bad request
        if (directory.indexOf("\0") !== -1) {
            throw new Error("Bad request");
        }

        // malicious path, forbidden
        if (directory.indexOf(params.repositoriesPath) !== 0) {
            throw new Error("Forbidden");
        }

        let stat;

        try {
            stat = yield fs.statAsync(directory);
        } catch (e) {
            if (e.code === "ENOENT") {
                return true; // Continue to next
            } else {
                throw e;
            }
        }

        if (!stat.isDirectory()) {
            return true; // Continue to next
        }

        let list = (yield fs.readdirAsync(directory)).filter((name) => name[0] !== ".");
        let files = [];

        for (let name of list) {
            let filename = path.join(directory, name);
            let stat = yield fs.statAsync(filename);

            files.push({
                name: name,
                path: path.join("/", filename.replace(params.repositoriesPath, "")),
                size: (stat.isFile() ? humanize.filesize(stat.size) : "-"),
                created: moment(stat.mtime).format("dddd, MMMM Do YYYY, HH:mm:ss"),
                isRepo: directoryPath === "/" || directoryPath === "",
                isDir: stat.isDirectory()
            });
        }

        files.sort((a, b) => {
            if (a.isDir && !b.isDir) {
                return -1;
            } else if (!a.isDir && b.isDir) {
                return 1;
            }

            return utils.naturalSort(a, b);
        });

        return {
            directory: directoryPath,
            files: files
        };
    }),
    init: co(function*(config) {
        params = config;
    })
};
