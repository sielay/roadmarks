'use strict';

var should               = require('should'),
    RoadMarks            = require('./../src/RoadMarks'),
    util                 = require('util'),
    fs                   = require('fs'),
    jsonMock             = require('./jsonMock'),
    path                 = require('path'),
    lexer                = require('marked').lexer,
    PROJECT_PATH         = path.resolve(__dirname + '/../'),
    DOC_PATH             = path.resolve(__dirname + '/../doc'),
    README_PATH          = path.resolve(__dirname + '/../README.md'),
    README2_PATH         = path.resolve(__dirname + '/../doc/README.md'),
    INSTALLATION_PATH    = path.resolve(__dirname + '/../doc/installation.md'),
    IGNORE_PATH          = path.resolve(__dirname + '/../doc/markup/ignore.mD'),
    FILE_NOT_EXISTS_PATH = path.resolve(__dirname + '/file_not_exists'),
    chalk                = require('chalk');

Object.prototype.dump = function (cons) {
    if (cons) {
        return console.log(this);
    }
    console.log(util.inspect(this, false, null));
}

describe('Roadmarks', function () {
    it('Should initiate', function () {

        var rm = new RoadMarks();
        should.exist(rm);
        // getters
        rm.should.have.property('get').which.is.a.Function;
        rm.should.have.property('getSync').which.is.a.Function;
        rm.should.have.property('getDefaultPattern').which.is.a.Function;
        rm.should.have.property('getDefaultExcludes').which.is.a.Function;
        // setters
        rm.should.have.property('set').which.is.a.Function;
        rm.should.have.property('setDefaultPattern').which.is.a.Function;
        // methods
        rm.should.have.property('findDocFiles').which.is.a.Function;
        // methods
    });
});


describe('File parser', function () {

    it('Should index content', function () {

        var rm = new RoadMarks();

        rm.harvest([], README_PATH).should.eql({
            title: 'README',
            items: []
        });

        rm.harvest(lexer(fs.readFileSync(README_PATH, 'utf8')), README_PATH).should.eql(jsonMock('file.cache'));

    });

    it('Should get data from cache', function (next) {

        var rm = new RoadMarks();
        rm.getSync(README_PATH).should.be.false;

        rm.get(FILE_NOT_EXISTS_PATH, function (error, nofile) {

            should.exists(error);
            should(nofile).be.null;

            rm.get(README_PATH, function (error, entry) {

                should.not.exist(error);
                entry.should.eql(jsonMock('file.cache'));

                rm.get(README_PATH, function (error, entry2) {
                    should.not.exist(error);
                    should(entry2).be.equal(entry);
                });

                next();
            });
        });
    });
});

describe('File map', function () {

    it('Should understand config', function () {

        var rm = new RoadMarks();
        rm.getDefaultPattern().should.be.equal('/**/+(*.+(MD|md|mD|Md))');
        rm.getDefaultExcludes().should.be.eql([/node_modules/]);
        rm.setDefaultPattern('/**/*');
        rm.getDefaultPattern().should.be.equal('/**/*');

        var rm2 = new RoadMarks({
            defaultPattern : '~',
            defaultExcludes: [/\.git/]
        });
        rm2.getDefaultPattern().should.be.equal('~');
        rm2.getDefaultExcludes().should.be.eql([/\.git/]);
    });

    it('Should be able to map files in the project', function (next) {

        var rm = new RoadMarks();
        rm.findDocFiles(__dirname + '/..', PROJECT_PATH, false, function (error, list) {

            should.not.exist(error);
            should(list).be.eql(jsonMock('file.list'));
            next();
        });
    });

    it('Should beable to organize files in the project', function (next) {

        var rm = new RoadMarks();
        rm.organizeFiles(jsonMock('file.list'), function (error, tree) {

            should.not.exist(error);
            should(tree).be.eql(jsonMock('file.map'));
            next();
        });

    });
});

describe('Process file', function () {

    it('Should find non-ignored blocks', function (done) {
        var rm = new RoadMarks(),
            actual = [];
        rm.parse(fs.readFileSync(IGNORE_PATH, 'utf8'), IGNORE_PATH, function (tag, filePath, cb) {
            filePath.should.eql(IGNORE_PATH);
            actual.push(tag);
            cb(null, tag);
        }, function (tag, filePath, cb) {
            filePath.should.eql(IGNORE_PATH);
            cb(null, 'TAG-CONTENT');
        }, function (error, blockData) {
            should.not.exist(error);
            fs.writeFileSync(__dirname + '/mockups/parse.emde', blockData, 'utf8');
            blockData.should.eql(fs.readFileSync(__dirname + '/mockups/parse.emde', 'utf8'));
            // we don't test blockData as it's dynamic
            //fs.writeFileSync(__dirname + '/mockups/tags.ignore.json', JSON.stringify(actual,null,4),'utf8');
            actual.should.eql(jsonMock('tags.ignore'));
            done();

        });
    });

    it('Generate index - content', function (next) {
        var rm = new RoadMarks(),
            tag = {notop: true, noparent: true, nosiblings: true};
        rm.process(tag, IGNORE_PATH, PROJECT_PATH, function (error, tag) {
            tag.should.eql(jsonMock('content.index'));
            next();
        });
    });

    it('Generate index - tree', function (next) {
        var rm = new RoadMarks(),
            tag = {
                tree      : 'markup',
                nocontent : true,
                nosiblings: false
            };
        rm.process(tag, INSTALLATION_PATH, DOC_PATH, function (error, tag) {
            tag.should.eql(jsonMock('content.tree'));
            next();
        });
    });

    it('Generate index - depth', function (next) {
        var rm = new RoadMarks(),
            tag = {
                tree : '*',
                depth: 1
            };
        rm.process(tag, README_PATH, PROJECT_PATH, function (error, tag) {
            tag.should.eql(jsonMock('content.depth'));

            next();

        });
    });

});

describe('Formatter', function () {

    it('Format inner index', function (done) {

        var rm = new RoadMarks();
        rm.defaultFormatter(jsonMock('content.index'), IGNORE_PATH, PROJECT_PATH, function (error, lines) {

            //fs.writeFileSync(__dirname + '/mockups/flat.emde', lines, 'utf8');
            lines.should.eql(fs.readFileSync(__dirname + '/mockups/flat.emde', 'utf8'));

            rm.process({}, README_PATH, PROJECT_PATH, function (error, tag) {
                rm.defaultFormatter(tag, README_PATH, PROJECT_PATH, function (error, lines) {
                    //fs.writeFileSync(__dirname + '/mockups/tree.emde', lines, 'utf8');
                    lines.should.eql(fs.readFileSync(__dirname + '/mockups/tree.emde', 'utf8'));
                    done();
                });
            });
        });
    });

    it('Format full toc', function (done) {
        var rm = new RoadMarks();
        rm.process({}, INSTALLATION_PATH, PROJECT_PATH, function (error, tag) {
            rm.defaultFormatter(tag, INSTALLATION_PATH, PROJECT_PATH, function (error, lines) {
                //fs.writeFileSync(__dirname + '/mockups/install.toc.emde', lines, 'utf8');
                lines.should.eql(fs.readFileSync(__dirname + '/mockups/install.toc.emde', 'utf8'));

                rm.process({nosiblings: false}, README2_PATH, DOC_PATH, function (error, tag) {
                    rm.defaultFormatter(tag, README2_PATH, PROJECT_PATH, function (error, lines) {
                        //fs.writeFileSync(__dirname + '/mockups/readme2.toc.emde', lines, 'utf8');
                        lines.should.eql(fs.readFileSync(__dirname + '/mockups/readme2.toc.emde', 'utf8'));
                        done();
                    });
                });
            });
        });
    });

});

describe('.git and .hg ignoring', function (done) {

    it('Should not list directory containing .git subfolder', function(next){

        fs.mkdir(DOC_PATH+'/markup/.git', function(error, success) {
            if (error && error.code !== 'EEXIST') {
                console.log(chalk.red(error));
                return next();
            }

            var rm = new RoadMarks();
            rm.findDocFiles(__dirname + '/..', PROJECT_PATH, false, function (error, list) {
                should.not.exist(error);
                should(list).be.eql(jsonMock('file.list.git'));
                fs.rmdir(DOC_PATH + '/markup/.git', next);
            });
        });
    });

    it('Should not list directory containing .hg subfolder', function(next){

        fs.mkdir(DOC_PATH+'/markup/.hg', function(error, success) {
            if (error && error.code !== 'EEXIST') {
                console.log(chalk.red(error));
                return next();
            }

            var rm = new RoadMarks();
            rm.findDocFiles(__dirname + '/..', PROJECT_PATH, false, function (error, list) {
                should.not.exist(error);
                should(list).be.eql(jsonMock('file.list.git'));
                fs.rmdir(DOC_PATH + '/markup/.hg', next);
            });
        });
    });

});