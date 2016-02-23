"use strict";

module.exports = (config, repositoryInfo, params) => {
    repositoryInfo.params = params;
    return repositoryInfo;
};
