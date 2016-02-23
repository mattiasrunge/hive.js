"use strict";

module.exports = (params, config, repositoryInfo, args) => {
    repositoryInfo.params = args;
    return repositoryInfo;
};
