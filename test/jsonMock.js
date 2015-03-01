'use strict';

var fs = require('fs');

module.exports = function (path) {
    return JSON.parse(fs.readFileSync(__dirname + '/mockups/' + path + '.json'));
};