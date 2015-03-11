'use strict';

var fs        = require('fs'),
    glob      = require('glob'),
    path      = require('path'),
    lexer     = require('marked').lexer,
    util      = require('util'),
    EOL       = require('os').EOL,
    slash     = require('slash'),
    chalk     = require('chalk'),
    eachAsync = require('each-async'),
    _         = require('lodash'),
    runner    = require('./runner'),
    giParser  = require('gitignore-parser');

/**
 * @class
 * @contructor
 * @param {Object} config
 **/
function RoadMarks(config) {


    var defaultPattern = (config && config.defaultPattern) || '/**/+(*.+(MD|md|mD|Md))',
        defaultExcludes = (config && config.defaultExcludes) || [/node_modules/],
        defaultOptions = (config && config.defaultOptions) || {
                depth     : 10,
                tree      : false,
                nocontent : false,
                notop     : false,
                nosiblings: true,
                noparent  : false
            },
        contentRepo = {},
        fileRepo = {},
        blockRepo = {};

    this.verbose = (config && config.verbose) || false;

    /**
     *
     * @returns {*|string}
     */
    this.getDefaultPattern = function () {
        return defaultPattern;
    };

    /**
     *
     * @param pattern
     */
    this.setDefaultPattern = function (pattern) {
        defaultPattern = pattern;
    };

    /**
     *
     * @returns {*|string[]}
     */
    this.getDefaultExcludes = function () {
        return defaultExcludes;
    };

    this.getSync = function (path) {
        return contentRepo[path] || false;
    };

    this.set = function (path, value) {
        return contentRepo[path] = value;
    };

    this.getFilesSync = function (path) {
        return fileRepo[path] || false;
    };

    this.setFiles = function (path, value) {
        return fileRepo[path] = value;
    };

    this.getDefaultOptions = function () {
        return defaultOptions;
    };

    this.getBlockSync = function (path) {
        return blockRepo[path];
    };

    this.setBlock = function (path, blocks) {
        return blockRepo[path] = blocks;
    };

    var fileContentCache = {};

    this.content = function (path, callback) {
        this.debug(2, 'Content load', path);
        if (fileContentCache[path]) {
            return callback(null, fileContentCache[path]);
        }
        fs.readFile(path, 'utf8', function (error, content) {
            if (error) {
                return callback(error);
            }
            fileContentCache[path] = content;
            callback(null, content);
        });
    };

    this.report = function () {
        return Object.keys(fileContentCache).length;
    }
}

/**
 *
 * @param {String} rootPath - dir top path of colleciton
 * @param {Function} callback
 */
RoadMarks.prototype.findDocFiles = function (rootSearchPath, rootPath, allowReadme, callback) {

    var excludes = _.clone(this.getDefaultExcludes()),
        excludedirs = [],
        searchPath = (rootSearchPath + this.getDefaultPattern()).replace(/\/\//g, '/'), g, gi = null, that = this;

    if (!allowReadme) {
        excludes.push(/README\.md$/);
    }

    if (fs.existsSync(rootSearchPath + '/.gitignore')) {
        gi = giParser.compile(fs.readFileSync(rootSearchPath + '/.gitignore', 'utf8'));
    }
    ;

    g = glob(rootSearchPath + '/**/.+(git|hg)', {dot: true, nodir: false}, function (error, dirList) {
        if (error) {
            if (error.code !== 'EACCESS') {
                return callback(error);
            }
            return g.continue();
        }
        dirList.forEach(function (dir) {
            var dirPath = path.relative(rootPath, path.dirname(dir));
            if (dirPath !== '') {
                excludes.push(new RegExp('^' + dirPath));
            }
        });
        that.debug(1, 'RoadMarks.findDocFiles ', rootSearchPath);
        //this.debug(2, 'RoadMarks.findDocFiles - project path ', rootPath);
        //this.debug(2, 'RoadMarks.findDocFiles - excludes ', excludes);
        that.debug(2, 'RoadMarks.findDocFiles - searchPattern ', searchPath);

        g = glob(searchPath, function (error, fileList) {

            if (error) {
                if (error.code !== 'EACCESS') {
                    return callback(error);
                }
                return g.continue();
            }

            fileList.forEach(function (item, index) {
                fileList[index] = slash(path.relative(rootPath, item));
            });

            callback(null, fileList.filter(function (item) {
                return !excludes.some(function (exclude) {
                    if (gi !== null && gi.denies(item)) {
                        return true;
                    }
                    return exclude.test(item);
                });
            }));
        });

    });
};

function jpath(parent, parts) {
    var root = parts.shift();
    if (!parent[root] && parts.length === 0) return parent[root] = true;
    if (!parent[root]) return jpath(parent[root] = {}, parts);
    if (parent[root] && parts.length === 0) return parent[root];
    if (parent[root]) return jpath(parent[root], parts);
}

RoadMarks.prototype.organizeFiles = function (list, callback) {
    var root = {};
    list.forEach(function (filePath) {
        jpath(root, filePath.split('/'));
    });
    callback(null, root);
};

/**
 *
 * @param absPath
 * @param callback
 * @returns {*}
 */
RoadMarks.prototype.get = function (absPath, callback) {
    var cache = this.getSync(absPath);
    if (cache) {
        return callback(null, cache);
    }
    this.fetch(absPath, callback);
};

RoadMarks.prototype.getFiles = function (absPath, rootPath, callback) {
    this.debug(1, 'RoadMarks.getFiles', absPath);
    var cache = this.getFilesSync(absPath), that = this;
    if (cache) {
        return callback(null, cache);
    }
    this.findDocFiles(absPath, rootPath, false, function (error, list) {
        if (error) throw Error;
        that.organizeFiles(list, function (error, tree) {
            if (error) throw Error;
            callback(null, that.setFiles(absPath, tree));
        });
    });
};

/**
 *
 * @param absPath
 * @param callback
 */
RoadMarks.prototype.fetch = function (absPath, callback) {
    var that = this,
        crop,
        regDefinitions = /__(.+?)__/g,
        regDefinition = /__(.+?)__/,
        regImages = /\!\[.+?\]\(.+?\)/g,
        regImage = /\!\[(.+?)\]\((.+?)\)/,
        images = [],
        definitions = [],
        matches,
        match;
    this.content(absPath, function (error, content) {
        if (error) {
            return callback(error, null);
        }
        crop = that.harvest(lexer(content), absPath);
        matches = content.match(regDefinitions);
        if (matches) {
            matches.forEach(function (definition) {
                match = definition.match(regDefinition);
                definitions.push(match[1]);
            });
            crop.definitions = definitions;
        }
        matches = content.match(regImages);
        if (matches) {
            matches.forEach(function (image) {
                match = image.match(regImage);
                images.push(match[1].length > 0 ? match[1] : match[2]);
            });
            crop.images = images;
        }
        that.set(absPath, crop);
        callback(null, that.getSync(absPath));
    });
};

/**
 *
 * @param tokens
 */
RoadMarks.prototype.harvest = function (tokens, filePath) {
    var title = path.basename(filePath).replace(/\.(md)$/i, ''),
        bundle = [],
        ignore = false,
        ignoreOpen = /\<\!--\s*RM-IGNORE\s*--\>/,
        ignoreClose = /\<\!--\s*\/RM-IGNORE\s*--\>/,
        last = null,
        current = null,
        stack = [bundle],
        currentList = bundle;

    tokens.forEach(function (token) {

        if (token.type === 'html' && token.text.match(ignoreOpen)) return ignore = true;
        if (token.type === 'html' && token.text.match(ignoreClose)) return ignore = false;
        if (ignore) return;

        if (token.type === 'heading' && token.depth === 1)  return title = token.text;

        if (token.type === 'heading') {
            current = {
                title: token.text,
                level: token.depth
            };
            if (last) {
                (function () {
                    if (current.level === last.level) return;
                    if (current.level > last.level) {
                        stack.push(currentList);
                        return (currentList = (last.items = last.items || []));
                    }
                    currentList = stack.pop();
                })();
            }
            currentList.push(current);
            last = current;
        }
    });
    return {
        title: title,
        items: bundle
    };
};

/**
 *
 * @param content
 * @returns {Array}
 */
function getBlocks(content, path) {

    var cache = this.getBlockSync(path);
    if (cache) {
        return cache;
    }

    var chunks = [],
        current = null,
        codeBlockTag = /^(\s{0,3})```/,
        inCodeBloc = false,
        inIgnoreBloc = false,
        tabbedCodeBlockTag = /^\s{3}/,
        listBlockTag = /^\s*\*\s+.+$/,
        rmIgnoreStart = /^\<\!--\s*RM-IGNORE\s*--\>/,
        rmIgnoreEnd = /^\<\!--\s*\/RM-IGNORE\s*--\>/,
        that = this,
        lines = content.split(EOL);
    lines.forEach(function (line, index) {
        if (line.match(codeBlockTag)) {
            inCodeBloc = !inCodeBloc;
            if (inCodeBloc) {
                //that.debug(3, 'Matches  code block start', line);
                chunks.push(current);
                current = null;
                return;
            }
            //that.debug(3, 'Matches  code block end', line);
            return;
        }
        if (inCodeBloc) {
            //that.debug(3, 'Code block', line);
            return;
        }
        if (inIgnoreBloc && !line.match(rmIgnoreEnd)) {
            //that.debug(3, 'Ignore', line);
            return;
        }
        if (inIgnoreBloc) {
            //that.debug(3, 'Ingnore block end', line);
            inIgnoreBloc = false;
            return;
        }
        if (line.match(rmIgnoreStart)) {
            //that.debug(3, 'Ignore start', line);
            inIgnoreBloc = true;
            chunks.push(current);
            current = null;
            return;
        }
        if (line.match(tabbedCodeBlockTag) && !line.match(listBlockTag)) {
            //that.debug(3, 'Matches tabbed code block block start', line);
            if (current) {
                chunks.push(current);
                current = null;
            }
            return;
        }
        //that.debug(3, 'Add', line);
        if (current === null) current = [index];
        current[1] = index;
    });
    if (current && current.length > 0) {
        chunks.push(current);
    }

    return this.setBlock(path, {
        chunks: chunks,
        lines : lines
    });
}

/**
 *
 * @param content
 * @param absFilePath
 * @param processor
 * @param formatter
 * @param callback
 */
RoadMarks.prototype.parse = function (content, absFilePath, processor, formatter, callback) {

    this.debug(1, 'RoadMarks.parse', absFilePath);

    var regTags = /^\<\!--\s*RM(|\(.*?\))\s*--\>([\s\S]*?)\<\!--\s*\/RM\s*-->/gm,
        regOneTag = /^(\<\!--\s*RM(|\((.*?)\))\s*--\>)([\s\S]*?)\<\!--\s*\/RM\s*-->/,
        blockData = getBlocks.apply(this, [content, absFilePath]),
        matches,
        tag,
        match,
        that = this,
        i = 0,
        j = 0,
        chunk,
        section,
        result = '',
        l = 0,
        stack = '';

    function iterate() {

        result += stack;
        stack = '';
        //that.debug(1, 'Iterate ' + i + ' from ', blockData.chunks.length);

        if (i >= blockData.chunks.length) {
            for (l; l < blockData.lines.length; l++) {
                result += blockData.lines[l] + EOL;
            }
            result = result.substr(0, result.length - EOL.length);

            return callback(null, result);
        }
        chunk = blockData.chunks[i++];

        if (chunk === null) {
            console.error(chalk.red('There was an issue with chunk at index ' + i + '. Skipping chunk.'));
            console.error(chalk.red(JSON.stringify(blockData, null, 4)));
            return iterate();
        }

        for (l; l < chunk[0]; l++) result += blockData.lines[l] + EOL;
        for (l; l <= chunk[1]; l++) stack += blockData.lines[l] + EOL;


        section = blockData.lines.slice(chunk[0], chunk[1] + 1).join(EOL);

        matches = section.match(regTags);
        if (matches) {
            j = 0;
            return iterate2();
        }
        return iterate();
    }

    function iterate2() {

        //that.debug(1, 'Sub Iterate ' + j + ' from ', matches.length);

        if (j >= matches.length) return iterate();
        match = matches[j++];
        tag = (function (match) {
            //that.debug(3, 'Match', match);
            if (!match) return {};
            var params = {};
            if (match[3]) {
                match[3].split(',').forEach(function (one) {
                    var kv = one.split(':');
                    params[kv[0]] = kv[1] || true;
                    if (params[kv[0]] === 'false') {
                        params[kv[0]] = false;
                    }
                });
            }
            that.debug(1, 'tag params', JSON.stringify(params, null, 4));
            params.__original = [match[0], match[1]];
            return params;
        })(match.match(regOneTag));

        processor(tag, absFilePath, function (error, tag) {
            if (error) throw error;
            formatter(tag, absFilePath, function (error, snippet) {
                //that.debug(2, 'Formatted Tag', JSON.stringify(tag));
                //that.debug(2, 'Tag original', tag.__original);
                if (tag.__original) {

                    //that.debug(3, 'Replaced ', tag.__original[0]);

                    var replacement = tag.__original[1] + EOL + EOL + snippet + EOL + EOL + '<!-- /RM -->';
                    stack = stack.replace(tag.__original[0], replacement);

                }
                iterate2();
            });
        });
    }

    iterate();
};

function limitDepth(depth, elem) {
    var copy = [];
    if (!elem) return elem;
    if (Array.isArray(elem)) {
        elem.forEach(function (sub) {
            copy.push(limitDepth(depth, sub));
        });
        return copy;
    }
    if (elem !== Object(elem)) return elem;
    copy = {};
    if (depth > 0) {
        Object.keys(elem).forEach(function (key) {
            copy[key] = limitDepth(depth - 1, elem[key]);
        });
    }
    return copy;
}

function limitContentDepth(depth, elem) {

    var copy = {
        title: elem.title
    };

    if (elem.level) copy.level = elem.level;

    if (depth > 0 && elem.items) {
        copy.items = [];
        elem.items.forEach(function (item) {
            copy.items.push(limitContentDepth(depth - 1, item));
        });
    }

    return copy;
}

function flat(object, arr) {

    if (!arr) arr = [];

    if (object === true) {
        return arr;
    }
    var keys = Object.keys(object);

    keys.forEach(function (key) {
        arr.push(key);
        flat(object[key], arr);
    });

    return arr;
}


RoadMarks.prototype.process = function (tag, absFilePath, rootPath, callback) {

    var that = this,
        fileName = path.basename(absFilePath),
        _defaults = _.clone(this.getDefaultOptions());

    tag = _.extend(_defaults, tag);

    //this.debug(1, 'RoadMarks.process ', absFilePath);
    //this.debug(2, JSON.stringify(tag, null, 3), '');

    function gotSiblings(error, tree) {

        var siblings, idx;

        if (error) throw error;

        if (tree) {

            siblings = flat(tree);
            idx = siblings.indexOf(path.basename(path.dirname(absFilePath)));
            if (idx >= 0) siblings.splice(idx, 1);
            siblings.sort();
            idx = siblings.indexOf(fileName);
            if (idx > 0) tag.previous = siblings[idx - 1];
            if (idx < siblings.length - 1) tag.next = siblings[idx + 1];

        }
        //that.debug(3, JSON.stringify(tag, null, 3), '');
        callback(null, tag);
    }

    function gotTree(error, tree) {

        //that.debug(1, 'RoadMarks.process#gotTree', JSON.stringify(tree,null,4));

        if (error) throw error;
        tag.files = limitDepth(tag.depth, tree);
        if (tag.nosiblings) {
            return gotSiblings(null, null);
        }

        that.debug(2, 'Get siblings');
        that.debug(3, 'gotTree for abs file path', absFilePath);

        that.getFiles(
            path.dirname(absFilePath),
            rootPath,
            gotSiblings
        )
    }

    function gotContent(error, content) {

        //that.debug(1, 'RoadMarks.process#gotContent', content);

        if (error) {
            that.debug(1, error);
            throw new Error(error);
        }
        if (content) {
            tag.content = limitContentDepth(tag.depth, content);
        }

        //that.debug(2, 'RoadMarks.process#gotContent - tag.tree', tag.tree);

        if (tag.tree === false) return gotTree(null, {});
        var thisDir = (fs.lstatSync(absFilePath).isDirectory() ? absFilePath : path.dirname(absFilePath));
        var searchPath = thisDir + '/' + tag.tree;

        that.debug(2, 'searchpath', searchPath);
        that.debug(2, 'rootPath', thisDir);

        that.getFiles(
            searchPath,
            thisDir,
            gotTree
        );
    }

    if (tag.nocontent) {
        return gotContent(null, null);

    }
    this.get(absFilePath, gotContent);
};

RoadMarks.prototype.getTitle = function (fullPath, callback) {

    var indexPath = fullPath,
        key = path.basename(fullPath),
        isDir = fs.lstatSync(fullPath).isDirectory();


    if (isDir) {
        if (fs.existsSync(fullPath + '/README.md')) {
            indexPath = fullPath + '/README.md';
        }
    }

    this.get(indexPath, function (error, fileTag) {
        if (error) {
            return callback(error);
        }
        callback(null, (fileTag && fileTag.title && !(isDir && fileTag.title === 'README')) ? fileTag.title : (key !== '..') ? key : path.basename(fullPath), fileTag);
    });
};

RoadMarks.prototype.defaultFormatter = function (tag, absPath, projectAbsPath, callback) {

    var string = '',
        navLinks = [],
        relation = path.relative(projectAbsPath, absPath),
        basename = path.basename(absPath),
        dirname = path.dirname(absPath),
        that = this,
        rows = {};


    if (tag.table) {
        string += 'Name | Page          ' + EOL;
        string += '---- | ------------- ' + EOL;
    }

    function headings(list, indent) {
        var str = '',
            indent = indent || 0,
            indentStr = doIndent(indent)

        list.forEach(function (item) {
            if (str.length > 0) str += EOL;
            str += indentStr + '* [' + item.title + '](#' + that.linkize(item.title) + ')';

            if (item.items) {
                str += EOL + headings(item.items, indent + 1);
            }
        });
        return str;
    }

    function tableCheck(error, string) {
        if (error) return callback(error);
        if (tag.table) {
            var definitions = Object.keys(rows);
            definitions.sort();
            definitions.forEach(function (row) {
                string += ' ' + row + ' | ' + rows[row].join(', ') + ' ' + EOL;
            });
        }
        string += EOL;

        callback(error, string);

    }

    //this.debug(2, 'RoadMarks..defaultFormatter#noparent', tag.noparent);
    if (tag.noparent === false) {

        if (relation !== '' && relation !== 'README.md') {

            if (basename !== 'README.md' && fs.existsSync(dirname + '/README.md')) {
                navLinks.push('[Got to parent](./README.md)');
            }
            if (basename === 'README.md' && fs.existsSync(dirname + '/../README.md')) {
                navLinks.push('[Got to parent](./../README.md)');
            }
        }
    }

    //this.debug(2, 'RoadMarks..defaultFormatter#notop', tag.notop);
    if (tag.notop === false) {
        if (relation !== '' && relation !== 'README.md') {
            if (fs.existsSync(projectAbsPath + '/README.md')) {
                navLinks.push('[Got to top](/README.md)');
            }
        }
    }

    //this.debug(2, 'RoadMarks..defaultFormatter#previous', tag.previous);
    if (tag.previous) {
        navLinks.push('[Previous](./' + tag.previous + ')');
    }

    //this.debug(2, 'RoadMarks..defaultFormatter#next', tag.next);
    if (tag.next) {
        navLinks.push('[Next](./' + tag.next + ')');
    }

    if (navLinks.length > 0) {
        string += navLinks.join(' | ') + EOL + EOL;
    }

    //this.debug(2, 'RoadMarks..defaultFormatter#content', JSON.stringify(tag.content, null, 4));
    if (tag.content && tag.content.items) {
        var heads = headings(tag.content.items);
        string += heads;
        //this.debug(3, 'RoadMarks..defaultFormatter#content#heads', heads);
    }

    this.debug(1, 'tree', JSON.stringify(tag.files, null, 4));

    function files(string, dir, parent, rootdir, indent, cb) {

        var keys = Object.keys(dir), keysCopy = _.clone(keys), keyMap = [];

        if (keys && keys.length > 0 && indent === 0 && (tag.content && tag.content.items)) {
            string += EOL + '****' + EOL + EOL;
        }

        indent = indent || 0;

        function sortKeysIterate() {
            var key = keys.shift();
            if(!key) {
                keysCopy = keys;
                keyMap.sort(function(a,b){
                    var aT = a.title.toLowerCase(), bT = b.title.toLowerCase();
                    if(aT === bT) return 0;
                    return aT < bT ? -1 : 1;
                });
                return iterate(null, string);
            }

            that.getTitle(path.resolve(parent + '/' + key), function(error, title, tag) {
                if(error) {
                    return cb(error);
                }
                keyMap.push({
                    title: title,
                    key: key,
                    tag: tag
                });
                sortKeysIterate();
            });


        }

        function iterate(error, string) {
            var keyEntry = keyMap.shift();
            if (!keyEntry) {
                return cb(null, string);
            }
            var key = keyEntry.key,
                fileTag = keyEntry.tag,
                title = keyEntry.title,
                fullPath = path.resolve(parent + '/' + key);



                var directPath = path.relative(rootdir, fullPath);

                if (!tag.nofiles) {

                    if (tag.table) {

                        if (!rows[title]) rows[title] = [];
                        rows[title].push('[' + path.basename(fullPath) + '](' + path.relative(rootdir, fullPath) + ')');

                    } else {

                        string += doIndent(indent) + '* [';
                        string += title;
                        string += '](./';
                        string += directPath;
                        string += ')' + EOL;

                    }

                }

                if (tag['list-images'] && fileTag.images) {

                    fileTag.images.forEach(function (image) {

                        if (tag.table) {

                            if (!rows[image]) rows[image] = [];
                            rows[image].push('[' + title + '](' + directPath + ')');

                        } else {

                            string += doIndent(indent + 1) + '* Image: [';
                            string += image;
                            string += '](./';
                            string += path.relative(rootdir, fullPath);
                            string += ')' + EOL;

                        }
                    });
                }

                if (tag['list-definitions'] && fileTag.definitions) {

                    fileTag.definitions.forEach(function (definition) {

                        if (tag.table) {

                            if (!rows[definition]) rows[definition] = [];
                            rows[definition].push('[' + title + '](' + directPath + ')');

                        } else {

                            string += doIndent(indent + 1) + '* Definition: [';
                            string += definition;
                            string += '](./';
                            string += path.relative(rootdir, fullPath);
                            string += ')' + EOL;

                        }
                    });
                }

                if (dir[key] !== true) {
                    return files(string, dir[key], fullPath, rootdir, indent + 1, iterate);
                }
                iterate(null, string);

        }

        sortKeysIterate();

    }

    if (tag.files) {


        this.debug(1, 'dirname', dirname);
        if (tag.tree !== false) {

            this.debug(1, 'tree', path.resolve(dirname + tag.tree.replace(/(^\.|\*)/g, '')));
        }
        files(string, tag.files, dirname, dirname, 0, tableCheck);
        return;
    }

    tableCheck(null, string);
};

function doIndent(i) {
    var s = '';
    while (i-- > 0) s += '  ';
    return s;
}

var color = [
    'grey', 'cyan', 'magenta', 'blue'
];

RoadMarks.prototype.debug = function (level, string, value) {
    if (this.verbose >= level) {
        console.log(doIndent(level) + chalk[color[level] || 'white'](string + ' ' + chalk.yellow(value)));
    }
};

RoadMarks.prototype.linkize = function (string) {
    string = string.replace(/[A-Z]+/g, function (v) {
        return v.toLowerCase();
    });
    string = string.replace(/[^a-z0-9-\s\u00BF-\u1FFF\u2C00-\uD7FF\w]+/g, '');
    string = string.replace(/[\s\t ]+/g, '-');
    string = encodeURIComponent(string);
    return string;
};


RoadMarks.runner = runner;

module.exports = RoadMarks;

//TODO: file list parsing


