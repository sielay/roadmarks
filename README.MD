Roadmarks
=========

Extensive tool to create and maintain Markdown documentation tables of contents and navigation

This project was originally called [tocmd](https://github.com/sielay/tocmd), but because large use of that name I decided to rename it.

This documentation (including nested sits in built with `Roadmarks`)

<!-- RM-IGNORE -->
##Table of contents
<!-- /RM-IGNORE -->

<!-- RM(tree:*) -->
[Got to parent](./README.MD) | [Got to top](/README.MD)
* [Why?](#why)
* [Features](#features)
* [Installation](#installation)
* [Usage](#usage)
  * [Markup](#markup)
  * [Rules](#rules)
* [Credits](#credits)
* [Licence](#licence)

* [README](./doc)
  * [Roadmarks](./doc/INDEX.MD)
  * [README.md](./doc/README.md)
  * [Instalation](./doc/installation.md)
  * [README](./doc/markup)
    * [README.md](./doc/markup/README.md)
    * [content](./doc/markup/content.MD)
    * [Ignore](./doc/markup/ignore.mD)
    * [media.md](./doc/markup/media.md)
    * [paging.md](./doc/markup/paging.md)
    * [snippets.md](./doc/markup/snippets.md)
    * [Tree](./doc/markup/tree.MD)

<!-- /RM -->

Why?
----

[Markdown](http://daringfireball.net/projects/markdown/) is already standard in the industry. There are number of various tools (mostly commercial) to give extra powers to MD. This simple liblary is meant to allow you add maintainless, hasslefree tables of contents and other indexing widgets to your project. Idea is that you can connect this lib to your build or versioning process to keep documentation navigation always up to date.

There are similar projects (listed below), but so far none of them address file tree:
 * https://www.npmjs.com/package/marked-toc
 * https://www.npmjs.com/package/md2toc
 * https://www.npmjs.com/package/markdown-toc
 * https://www.npmjs.com/package/md-toc
 
If you find features that would make this package better, or you know better open package, please let me know.

## Features
 * 100% Markdown and HTML compatible
 * List structure of the Markdown file
 * List structure of folders
 * ~~Gulp and Grunt integration~~
 * ~~Config files~~
 * ~~Source inlinking and quoting~~


## Installation

```
sudo npm install roadmarks -g
```

## Usage

```
roadmarks /path/to/my/project
```

### Markup


By default comment bloci load 

	<!-- RM -->
    <!-- /RM -->
	<!-- RM(max-depth:3)-->
	<!-- /RM -->
	<!-- RM(tree:./**/*) -->
    <!-- /RM -->
    
### Rules

I tried to put rules as close to Markdown specifciation and way how GitHub works with Markdown.

 * File is described in lists by level one heading. If absent, file name is used.
 * Files are listed in alphabetical order (of file, not heading).
 * Tables of content combining internal headers and files, list internal headers first
 * README.md is being used as index file of directory (INDEX seems to be natural, but is not used by GitHub).
 * README.md is alias to folder - so all sibling files in the same directory are understood as it's children.
 * Multiple level one headings are being ignored.
  

## Credits

Author [Lukasz Sielski](http://github.com/sielay). Hugely improved thanks to comments from [Patrick Polloni](https://github.com/kimu). Uses parser from amazing [Marked](https://github.com/chjj/marked) project.

## Licence

<!-- RM-INC(LICENSE) -->





