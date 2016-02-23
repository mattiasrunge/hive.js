"use strict";

let path = require("path");
let fs = require("fs-extra-promise");
let crypto = require("crypto");
let moment = require("moment");
let umask = require("umask");
let co = require("bluebird").coroutine;

let params = {};

module.exports = {
    init: co(function*(config) {
        params = config;
    }),
    // For primary artifacts: /$groupId[0]/../${groupId[n]/$artifactId/$version/$artifactId-$version.$extension
    // For secondary artifacts: /$groupId[0]/../$groupId[n]/$artifactId/$version/$artifactId-$version-$classifier.$extension
    // For metadata: /$groupId[0]/../$groupId[n]/$artifactId/maven-metadata.$extension
    decodeRepositoryUrl: co(function*(repository, url) {
        if (url[0] !== "/") {
            url = "/" + url;
        }

        let info = {};
        let parts = url.split("/");
        let versionScheme = typeof params.versionScheme === "undefined" ? "default" : params.versionScheme;
        let versionSettings = {};
        let enableRedeploy = typeof params.enableRedeploy === "undefined" ? false : params.enableRedeploy;

        if (params.repos && params.repos[repository]) {
            if (typeof params.repos[repository].enableRedeploy !== "undefined") {
                enableRedeploy = params.repos[repository].enableRedeploy;
            }

            if (typeof params.repos[repository].versionScheme !== "undefined") {
                versionScheme = params.repos[repository].versionScheme;
            }
        }

        if (typeof versionScheme === "object") {
            versionSettings = versionScheme;
            versionScheme = versionSettings.name;
        }

        info.versionScheme = require("./versionScheme/" + versionScheme);
        info.versionScheme.settings(versionSettings);
        info.enableRedeploy = enableRedeploy;
        info.repository = repository;
        info.filename = parts[parts.length - 1];
        info.directory = path.dirname(url) + "/";

        if (info.filename.indexOf("maven-metadata") !== -1 || info.filename === "reserve" || info.filename === "regenerate") {
            info.isArtifact = false;
            info.groupId = parts.splice(1, parts.length - 3).join(".");
            info.artifactId = parts[parts.length - 2];
        } else if (info.filename === "unreserve") {
            info.isArtifact = false;
            info.groupId = parts.splice(1, parts.length - 4).join(".");
            info.artifactId = parts[parts.length - 3];
            info.version = parts[parts.length - 2];
        } else {
            info.isArtifact = true;
            info.groupId = parts.splice(1, parts.length - 4).join(".");
            info.artifactId = parts[parts.length - 3];
            info.version = parts[parts.length - 2];
            info.classifier = false;

            if (!info.versionScheme.valid(info.version)) {
                throw new Error ("Version, " + info.version + ", is not valid");
            }

            let classifierExt = info.filename.replace(info.artifactId + "-" + info.version, "");

            if (classifierExt[0] === "-") {
                let pos = classifierExt.indexOf(".");

                info.classifier = classifierExt.substr(1, pos - 1);
                info.extension = classifierExt.substr(pos + 1);
            } else if (classifierExt[0] === ".") {
                info.extension = classifierExt.substr(1);
            } else {
                throw new Error("Url is malformed, classifierExt = \"" + classifierExt + "\"");
            }
        }

        return info;
    }),
    writeUploadedFile: co(function*(repositoriesPath, repositoryInfo, fileStream, overwrite) {
        let filename = path.normalize(path.join(repositoriesPath, repositoryInfo.repository, repositoryInfo.directory, repositoryInfo.filename));
        let exist = yield fs.existsAsync(filename);

        if (exist && !overwrite) {
            throw new Error(filename + " already exist!", filename);
        }

        return new Promise((resolve) => {
            fileStream
            .pipe(fs.createWriteStream(filename))
            .on("finish", () => {
                resolve(filename);
            });
        });
    }),
    ensureArtifactMetadata: co(function*(repositoryPath, repositoryInfo) {
        let metadataPath = path.normalize(path.join(repositoryPath, repositoryInfo.repository, repositoryInfo.groupId.replace(/\./g, "/"), repositoryInfo.artifactId, "maven-metadata.xml"));
        let exist = yield fs.existsAsync(metadataPath);

        if (!exist) {
            return module.exports.updateArtifactMetadata(repositoryPath, repositoryInfo);
        }
    }),
    getVersions: co(function*(repositoryPath, repositoryInfo) {
        let artifactPath = path.normalize(path.join(repositoryPath, repositoryInfo.repository, repositoryInfo.groupId.replace(/\./g, "/"), repositoryInfo.artifactId));
        let files = yield fs.readdirAsync(artifactPath);
        let result = {
            versions: [],
            releases: [],
            reserved: []
        };

        for (let file of files) {
            let stat = yield fs.statAsync(path.join(artifactPath, file));

            if (stat.isDirectory()) {
                result.versions.push(file);
                result.releases.push(file);
            } else if (stat.isFile() && file.indexOf("-RESERVED") !== -1) {
                let version = file.replace("-RESERVED", "");

                result.versions.push(version);
                result.reserved.push(version);
            }
        }

        result.versions = repositoryInfo.versionScheme.sort(result.versions);
        result.releases = repositoryInfo.versionScheme.sort(result.releases);
        result.reserved = repositoryInfo.versionScheme.sort(result.reserved);

        result.release = result.releases.length > 0 ? result.releases[result.releases.length - 1] : "";
        result.latest = result.versions.length > 0 ? result.versions[result.versions.length - 1] : "";
        result.next = repositoryInfo.versionScheme.next(result.latest);

        return result;
    }),
    updateArtifactMetadata: co(function*(repositoryPath, repositoryInfo) {
        let artifactPath = path.normalize(path.join(repositoryPath, repositoryInfo.repository, repositoryInfo.groupId.replace(/\./g, "/"), repositoryInfo.artifactId));
        let metadataPath = path.normalize(path.join(artifactPath, "maven-metadata.xml"));

        let versionInfo = yield module.exports.getVersions(repositoryPath, repositoryInfo);
        let metadata = "<metadata modelVersion=\"1.1.0\">\n";
        metadata += "  <groupId>" + repositoryInfo.groupId + "</groupId>\n";
        metadata += "  <artifactId>" + repositoryInfo.artifactId + "</artifactId>\n";
        metadata += "  <versioning>\n";
        metadata += "    <latest>" + versionInfo.latest + "</latest>\n";
        metadata += "    <release>" + versionInfo.release + "</release>\n";
        metadata += "    <lastUpdated>" + moment().format("YYYYMMDDHHMMSS") + "</lastUpdated>\n";
        metadata += "    <versions>\n";

        for (let release of versionInfo.releases) {
            metadata += "      <version>" + release + "</version>\n";
        }

        metadata += "    </versions>\n";
        metadata += "  </versioning>\n";
        metadata += "</metadata>\n";

        let sha1 = crypto.createHash("sha1").update(metadata).digest("hex");
        let md5 = crypto.createHash("md5").update(metadata).digest("hex");

        yield fs.writeFileAsync(metadataPath, metadata);
        yield fs.writeFileAsync(metadataPath + ".sha1", sha1);
        yield fs.writeFileAsync(metadataPath + ".md5", md5);
    }),
    ensureGAVStructure: co(function*(repositoryPath, repositoryInfo) {
        let artifactPath = path.normalize(path.join(repositoryPath, repositoryInfo.repository, repositoryInfo.groupId.replace(/\./g, "/"), repositoryInfo.artifactId));

        yield fs.ensureDirAsync(artifactPath, { mode: umask.fromString("0755") });
        yield module.exports.ensureArtifactMetadata(repositoryPath, repositoryInfo);

        if (repositoryInfo.filename === "reserve") {
            let versionInfo = yield module.exports.getVersions(repositoryPath, repositoryInfo);
            let versionPath = path.normalize(path.join(artifactPath, versionInfo.next + "-RESERVED"));

            yield fs.writeFileAsync(versionPath, moment().format());

            repositoryInfo.version = versionInfo.next;
        } else if (repositoryInfo.isArtifact || repositoryInfo.filename === "unreserve") {
            let versionPath = path.normalize(path.join(artifactPath, repositoryInfo.version));
            let reservedPath = versionPath.replace(/\/$/, "") + "-RESERVED";
            let exist = yield fs.existsAsync(reservedPath);

            if (exist) {
                yield fs.removeAsync(versionPath.replace(/\/$/, "") + "-RESERVED");
            }

            if (repositoryInfo.isArtifact) {
                yield fs.ensureDirAsync(versionPath, { mode: umask.fromString("0755") });
            }
        } else if (repositoryInfo.filename === "regenerate") {
            yield module.exports.updateArtifactMetadata(repositoryPath, repositoryInfo);
        }
    })
};
