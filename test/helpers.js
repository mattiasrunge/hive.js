"use strict";

require("../lib/test")(__filename);
let assert = require("chai").assert;
let helpers = require("../lib/helpers");

describe("helpers", () => {
    describe("decodeRepositoryUrl", () => {
        it("should parse /com/test/dummy/1.0.0/dummy-1.0.0.tgz", function*() {
            let expectedResult = {
                enableRedeploy: false,
                repository: "repoDummy",
                filename: "dummy-1.0.0.tgz",
                directory: "/com/test/dummy/1.0.0/",
                isArtifact: true,
                groupId: "com.test",
                artifactId: "dummy",
                version: "1.0.0",
                classifier: false,
                extension: "tgz"
            };

            let result = yield helpers.decodeRepositoryUrl("repoDummy", "/com/test/dummy/1.0.0/dummy-1.0.0.tgz");

            delete result.versionScheme;

            assert.deepEqual(expectedResult, result);
        });

        it("should parse /com/test/dummy/1.0.0/dummy-1.0.0-src.tgz", function*() {
            let expectedResult = {
                enableRedeploy: false,
                repository: "repoDummy",
                filename: "dummy-1.0.0-src.tgz",
                directory: "/com/test/dummy/1.0.0/",
                isArtifact: true,
                groupId: "com.test",
                artifactId: "dummy",
                version: "1.0.0",
                classifier: "src",
                extension: "tgz"
            };

            let result = yield helpers.decodeRepositoryUrl("repoDummy", "/com/test/dummy/1.0.0/dummy-1.0.0-src.tgz");

            delete result.versionScheme;

            assert.deepEqual(expectedResult, result);
        });

        it("Parse /com/test/dummy/1.0.0/dummy-1.0.0-src.tar.gz and check extension is tar.gz and classifier is src", function*() {
            let result = yield helpers.decodeRepositoryUrl("repoDummy", "/com/test/dummy/1.0.0/dummy-1.0.0-src.tar.gz");

            assert.equal("tar.gz", result.extension);
            assert.equal("src", result.classifier);
        });

        it("Parse /com/test/dummy/R1A02_3/dummy-R1A02_3-src.tar.gz and that slashed versions work", function*() {
            let result = yield helpers.decodeRepositoryUrl("repoDummy", "/com/test/dummy/R1A02_3/dummy-R1A02_3-src.tar.gz");

            assert.equal("R1A02_3", result.version);
            assert.equal("tar.gz", result.extension);
            assert.equal("src", result.classifier);
        });
    });
});
