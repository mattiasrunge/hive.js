"use strict";

let utils = require("../utils");

let validChars = "ABCDEFGHJKLMNSTUVXYZ";
let prefix = "R";

let splitVersion = (version) => {
    let slash = false;
    let re = new RegExp("^" + prefix + "|[0-9]{1,2}|[A-Z]{1,2}|[0-9]{1,2}$", "g");
    let slashPosition = version.indexOf("_");

    if (slashPosition !== -1) {
        slash = version.substr(slashPosition + 1);
        version = version.substr(0, slashPosition);
    }

    let matches = version.match(re);

    if (!matches) {
        return false;
    }

    // Check that we have at least R1A length
    if (matches.length < 3) {
        //console.error("To short.", matches.length);
        return false;
    }

    // Parse variables
    let release = matches[0];
    let major = parseInt(matches[1], 10);
    let minor = matches[2];
    let optional = matches.length >= 4 ? parseInt(matches[3], 10) : false;

    //console.log(release, major, minor, optional);

    // Ok R1 but not RA
    if (isNaN(major)) {
        //console.error("Major is not a number.", major, matches[1]);
        return false;
    }

    // Ok R1 but not R0
    if (major === 0) {
        //console.error("Major is zero.", major, matches[1]);
        return false;
    }

    // Check that we start with prefix
    if (release !== prefix) {
        //console.error("Release is not R.", release);
        return false;
    }

    // Ok R1A but not R1R
    for (let n = 0; n < minor.length; n++) {
        if (validChars.indexOf(minor.charAt(n)) === -1) {
            //console.error("Minor has invalid char.", minor, minor[n].charAt(n));
            return false;
        }
    }

    // If optional supplied
    if (optional !== false) {
        // Ok R1A01 but not R1A1
        if (matches[3].length <= 1) {
            //console.error("Optional is not two letters.", matches[3]);
            return false;
        }

        // Ok R1A01 but not R1AAA
        if (isNaN(optional)) {
            //console.error("Optional is not a number.", optional, matches[3]);
            return false;
        }

        // Ok R1A01 but not R1A00
        if (optional === 0) {
            //console.error("Optional is zero", optional, matches[3]);
            return false;
        }
    }

    return { release: release, major: major, minor: minor, optional: optional, slash: slash };
};

let joinVersion = (parts) => {
    let version = parts.release.substr(0, 1);
    version += parts.major;
    version += parts.minor;

    if (parts.optional !== false) {
        version += parts.optional < 10 ? "0" + parts.optional : parts.optional;
    }

    if (parts.slash !== false) {
        version += "_" + parts.slash;
    }

    return version;
};

let stepChar = (char) => {
    if (char === validChars[validChars.length - 1]) {
        return validChars.charAt(0);
    }

    return validChars.charAt(validChars.indexOf(char) + 1);
};

let stepMinor = (latest) => {
    let parts = latest.split("");
    let idx = parts.length - 1;

    while (idx >= 0) {
        parts[idx] = stepChar(parts[idx]);

        if (parts[idx] === validChars.charAt(0)) {
            idx--;
        } else {
            return parts.join("");
        }
    }

    if (parts.length === 1) {
        return "AA";
    }

    return false;
};

module.exports = {
    next: (latest) => {
        if (latest === "") {
            return prefix + "1A";
        }

        let parts = splitVersion(latest);

        if (parts === false) {
            return false;
        }

        let newVersion = false;

        do {
            let carry = true;

            if (parts.optional !== false) {
                carry = false;
                parts.optional++;

                if (parts.optional > 99) {
                    parts.optional = 1;
                    carry = true;
                }
            }

            if (carry) {
                carry = false;

                parts.minor = stepMinor(parts.minor);

                if (parts.minor === false) {
                    parts.minor = "A";
                    carry = true;
                }
            }

            if (carry) {
                parts.major++;

                if (parts.major > 99) {
                    return false;
                }
            }

            newVersion = joinVersion(parts);
        } while (!module.exports.valid(newVersion));

        return newVersion;
    },
    sort: (list) => {
        let partList = list.map(splitVersion);

        partList.sort((a, b) => {
            if (a.major.length !== b.major.length) {
                return a.major.length - b.major.length;
            } else if (a.major !== b.major) {
                return utils.naturalSort(a.major, b.major);
            }

            if (a.minor.length !== b.minor.length) {
                return a.minor.length - b.minor.length;
            } else if (a.minor !== b.minor) {
                return utils.naturalSort(a.minor, b.minor);
            }

            if (a.optional && b.optional) {
                return a.optional - b.optional;
            }

            return 0;
        });

        return partList.map(joinVersion);
    },
    valid: (version) => {
        return splitVersion(version);
    },
    settings: (settings) => {
        prefix = settings.prototype ? "P" : "R";
    }
};
