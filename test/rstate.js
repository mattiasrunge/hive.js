"use strict";

require("../lib/test")(__filename);
let assert = require("chai").assert;

let rstate = require("../lib/versionScheme/rstate");

describe("rstate", () => {
    describe("valid/invalid", () => {
        it("should test valid rstates as valid", function*() {
            let valids = [ "R1A01", "R1A99", "R1AA01", "R1AA99", "R1ZZ01", "R1ZZ99", "R99A01", "R99A99", "R99AA01", "R99AA99", "R99ZZ01", "R99ZZ99", "R1A", "R1A_2", "R1A02_3" ];

            for (let valid of valids) {
                assert.ok(rstate.valid(valid), valid + " should be valid");
            }
        });

        it("should test invalid rstates as invalid", function*() {
            let invalids = [ "R1A00", "R1A001", "R1AA00", "R1AAA", "R1I", "R1O", "R1Q", "R1R", "R1W", "X1", "RA12" ];

            for (let invalid of invalids) {
                assert.equal(rstate.valid(invalid), false, invalid + " should not be valid");
            }
        });

        it("should test valid pstates as valid", function*() {
            rstate.settings({ prototype: true });

            let valids = [ "P1A01", "P1A99", "P1AA01", "P1AA99", "P1ZZ01", "P1ZZ99", "P99A01", "P99A99", "P99AA01", "P99AA99", "P99ZZ01", "P99ZZ99", "P1A", "P1A_2", "P1A02_3" ];

            for (let valid of valids) {
                assert.ok(rstate.valid(valid), valid + " should be valid");
            }

            rstate.settings({ prototype: false });
        });

        it("should test invalid rstates as invalid", function*() {
            rstate.settings({ prototype: true });

            let invalids = [ "P1A00", "P1A001", "P1AA00", "P1AAA", "P1I", "P1O", "P1Q", "P1R", "P1W", "X1", "PA12", "P3R01" ];

            for (let invalid of invalids) {
                assert.equal(rstate.valid(invalid), false, invalid + " should not be valid");
            }

            rstate.settings({ prototype: false });
        });
    });

    describe("sort", () => {
        it("should sorting list correctly", function*() {
            let list = [ "R1J07", "R1J06", "R1J02", "R1J08", "R1A02", "R1A02_3" ];

            assert.deepEqual(rstate.sort(list), [ "R1A02", "R1A02_3", "R1J02", "R1J06", "R1J07", "R1J08" ]);
        });
    });

    describe("next", () => { // invalid: I O P Q R W
        it("should step R1A01 -> R1A02", function*() {
            assert.equal(rstate.next("R1A01"), "R1A02");
        });

        it("should step R1A99 -> R1B01", function*() {
            assert.equal(rstate.next("R1A99"), "R1B01");
        });

        it("should step R1A -> R1B", function*() {
            assert.equal(rstate.next("R1A"), "R1B");
        });

        it("should step R1Z -> R1AA", function*() {
            assert.equal(rstate.next("R1Z"), "R1AA");
        });

        it("should step R1AA -> R1AB", function*() {
            assert.equal(rstate.next("R1AA"), "R1AB");
        });

        it("should step R1ZZ -> R2A", function*() {
            assert.equal(rstate.next("R1ZZ"), "R2A");
        });

        it("should step R9ZZ -> R10A", function*() {
            assert.equal(rstate.next("R9ZZ"), "R10A");
        });

        it("should step R99ZZ -> false", function*() {
            assert.equal(rstate.next("R99ZZ"), false);
        });

        it("should step R1H -> R1J", function*() {
            assert.equal(rstate.next("R1H"), "R1J");
        });

        it("should step R1N -> R1S", function*() {
            assert.equal(rstate.next("R1N"), "R1S");
        });

        it("should step R1V -> R1X", function*() {
            assert.equal(rstate.next("R1V"), "R1X");
        });
    });

    describe("settings", () => {
        it("should step in prototype mode", function*() {
            rstate.settings({ prototype: true });
            assert.equal(rstate.next("P1A01"), "P1A02");
            assert.ok(rstate.valid("P1A01"), "P1A01 should be valid");
        });
    });
});
