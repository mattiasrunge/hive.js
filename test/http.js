"use strict";

require("../lib/test")(__filename);
let assert = require("chai").assert;
let main = require("../lib/main");
let configuration = require("../lib/configuration");
let request = require("request-promise");
let getPort = require("get-port");
let fs = require("fs-extra-promise");
let tmp = require("tmp");

describe("HTTP", function() {
    this.timeout(10000);

    before(function*() {
        let tmpobj = tmp.dirSync();

        let args = {
            level: false,
            config: "test/data/config.json",
            repositoriesPath: tmpobj.name,
            port: yield getPort()
        };

        yield fs.ensureDirAsync(args.repositoriesPath + "/repo1");

        yield main.start(args, "A.B.C");
    });

    after(function*() {
        yield main.stop();

        yield fs.removeAsync(configuration.repositoriesPath);
    });

    describe("Simple request", function() {
        it("should return status and version", function*() {
            let options = {
                url: "http://localhost:" + configuration.port + "/status",
                json: true
            };

            let result = yield request(options);

            assert.equal(result.status, "ok");
            assert.equal(result.version, "A.B.C");
        });

        it("should return the index page", function*() {
            let options = {
                url: "http://localhost:" + configuration.port
            };

            let result = yield request(options);

            assert.ok(result.indexOf("<html") > -1);
            assert.ok(result.indexOf("</html>") > -1);
        });
    });

    describe("Reserve and unreserve", function() {
        it("should reserve a version", function*() {
            let options = {
                url: "http://localhost:" + configuration.port + "/repo1/a/b/c/artifactname/reserve",
                auth: {
                    user: "admin",
                    pass: "admin123"
                }
            };

            let result = yield request(options);

            assert.equal(result, "0.0.1");
        });

        it("should reserve another version", function*() {
            let options = {
                url: "http://localhost:" + configuration.port + "/repo1/a/b/c/artifactname/reserve",
                auth: {
                    user: "admin",
                    pass: "admin123"
                }
            };

            let result = yield request(options);

            assert.equal(result, "0.0.2");
        });

        it("should unreserve a version", function*() {
            let options = {
                url: "http://localhost:" + configuration.port + "/repo1/a/b/c/artifactname/0.0.2/unreserve",
                auth: {
                    user: "admin",
                    pass: "admin123"
                }
            };

            let result = yield request(options);

            assert.equal(result, "OK");
        });

        it("should reserve the unreserved version again", function*() {
            let options = {
                url: "http://localhost:" + configuration.port + "/repo1/a/b/c/artifactname/reserve",
                auth: {
                    user: "admin",
                    pass: "admin123"
                }
            };

            let result = yield request(options);

            assert.equal(result, "0.0.2");
        });

        it("should unreserve the first version", function*() {
            let options = {
                url: "http://localhost:" + configuration.port + "/repo1/a/b/c/artifactname/0.0.1/unreserve",
                auth: {
                    user: "admin",
                    pass: "admin123"
                }
            };

            let result = yield request(options);

            assert.equal(result, "OK");
        });

        it("should reserve again and get next", function*() {
            let options = {
                url: "http://localhost:" + configuration.port + "/repo1/a/b/c/artifactname/reserve",
                auth: {
                    user: "admin",
                    pass: "admin123"
                }
            };

            let result = yield request(options);

            assert.equal(result, "0.0.3");
        });
    });

    describe("Upload and download", function() {
        it("should upload an artifact", function*() {
            for (let ext of [ "tgz", "tgz.sha1", "tgz.md5", "pom", "pom.sha1", "pom.md5" ]) {
                let options = {
                    url: "http://localhost:" + configuration.port + "/repo1/a/b/c/artifactname/0.0.1/artifactname-0.0.1." + ext,
                    method: "PUT",
                    body: "artifact content " + ext,
                    auth: {
                        user: "admin",
                        pass: "admin123"
                    }
                };

                let result = yield request(options);

                assert.equal(result, "OK");
            }

            let options = {
                url: "http://localhost:" + configuration.port + "/repo1/a/b/c/artifactname/regenerate",
                auth: {
                    user: "admin",
                    pass: "admin123"
                }
            };

            let result = yield request(options);

            assert.equal(result, "OK");
        });

        it("should download an artifact", function*() {
            for (let ext of [ "tgz", "tgz.sha1", "tgz.md5", "pom", "pom.sha1", "pom.md5" ]) {
                let options = {
                    url: "http://localhost:" + configuration.port + "/repo1/a/b/c/artifactname/0.0.1/artifactname-0.0.1." + ext,
                    auth: {
                        user: "admin",
                        pass: "admin123"
                    }
                };

                let result = yield request(options);

                assert.equal(result, "artifact content " + ext);
            }
        });
    });
});
