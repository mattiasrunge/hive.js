"use strict";

let utils = require("../utils");

module.exports = {
    next: (latest) => {
        if (latest === "") {
            return "0.0.1";
        }

        let parts = latest.split(".");
        parts[parts.length - 1] = (parseInt(parts[parts.length - 1], 10) + 1).toString();

        return parts.join(".");
    },
    sort: (list) => {
        return list.sort(utils.naturalSort);
    },
    valid: (/*version*/) => {
        return true;
    },
    settings: (/*settings*/) => {
        return undefined;
    }
};
