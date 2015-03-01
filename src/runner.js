'use strict';

var RoadMarks = require('./RoadMarks'),
    chalk     = require('chalk'),
    path      = require('path'),
    fs        = require('fs');

module.exports = function (options) {

    options.dir = path.resolve(options.dir || '');

    var rm = new RoadMarks(options);

    function parseFile(file, callback) {
        var file = path.resolve(file);

        console.log(chalk.blue('Processing file ') + chalk.yellow(file));

        rm.parse(
            fs.readFileSync(file, 'utf8'),
            file,
            function (tag, filePath, cb) {
                rm.process(tag, filePath, options.dir, cb);
            },
            function (tag, filePath, cb) {
                rm.defaultFormatter(tag, filePath, options.dir, cb);
            },
            function (error, blockData) {
                if(error) {
                    console.log(chak.red(file));
                    console.log(chak.red(error));
                    return iterate();
                }
                fs.writeFile(file, blockData, 'utf8', function(error) {
                    if(error) {
                        console.log(chak.red(file));
                        console.log(chak.red(error));
                        return   callback();
                    }
                    callback();
                });
            }
        );
    }

    if(options.file) {
        parseFile(options.file, function(){});
        return;
    }

    rm.findDocFiles(options.dir, options.dir, true, function (error, list) {
            if (error) return console.log(chalk.red(error));

            function iterate() {

                if (list.length === 0) return;
                var file = list.shift();
                parseFile(file, iterate);
            }
            iterate();
        }
    );


};