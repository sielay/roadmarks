Roadmarks
=========

[![Join the chat at https://gitter.im/sielay/roadmarks](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/sielay/roadmarks?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Extensive tool to create and maintain Markdown documentation tables of contents and navigation

This project was originally called [tocmd](https://github.com/sielay/tocmd), but because large use of that name I decided to rename it.

This documentation (including nested sits in built with `Roadmarks`)

<!-- RM-IGNORE -->
##Table of contents
<!-- /RM-IGNORE -->

<!-- RM(tree:*) -->

[Got to parent](./README.md) | [Got to top](/README.md)

* [Why?](#why)
* [Features](#features)
* [Installation](#installation)
* [Usage](#usage)
  * [Markup](#markup)
  * [Rules](#rules)
* [Credits](#credits)
* [Licence](#licence)
****

* [doc](./doc)
  * [Instalation](./doc/installation.md)
  * [README.md](./doc/markup)
    * [content](./doc/markup/content.MD)
    * [Ignore](./doc/markup/ignore.mD)
    * [media](./doc/markup/media.md)
    * [paging](./doc/markup/paging.md)
    * [snippets](./doc/markup/snippets.md)
    * [Tree](./doc/markup/tree.MD)
  * [Roadmarks](./doc/INDEX.MD)



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
 * Ignores folders containing .git and .hg
 * Appreciate .gitignore
 * ~~Gulp and Grunt integration~~
 * ~~Config files~~
 * ~~Source inlinking and quoting~~


## Installation

```
sudo npm install roadmarks -g
```

## Usage

Start in current dir
```
roadmarks 
```

Start in other dir
```
roadmarks -d /path/to/my/project
```

Process one file
```
roadmarks -f /path/to/my/file.MD
```

### Markup


By default comment block load

	<!-- RM -->
    <!-- /RM -->
	<!-- RM(max-depth:3)-->
	<!-- /RM -->
	<!-- RM(tree:/) -->
    <!-- /RM -->

You can use ignore blocks

    <!-- RM-IGNORE -->
    <!-- /RM-IGNORE -->

Now you can create indexes

    <!-- RM(images,tree:*,nocontent,noparent,notop) -->
    <!-- /RM  -->

<!-- RM(tree:*,list-images,nocontent,noparent,notop) -->

* [doc](./doc)
  * [Instalation](./doc/installation.md)
  * [README.md](./doc/markup)
    * [content](./doc/markup/content.MD)
    * [Ignore](./doc/markup/ignore.mD)
    * [media](./doc/markup/media.md)
      * Image: [Cookies](./doc/markup/media.md)
    * [paging](./doc/markup/paging.md)
    * [snippets](./doc/markup/snippets.md)
    * [Tree](./doc/markup/tree.MD)
  * [Roadmarks](./doc/INDEX.MD)



<!-- /RM -->

    <!-- RM(definitions,images,tree:*,nocontent,noparent,notop,table) -->
    <!-- /RM  -->

<!-- RM(list-definitions,tree:*,nofiles,nocontent,noparent,notop,table) -->

Name | Page          
---- | ------------- 
 indexable | [paging](doc/markup/paging.md), [Tree](doc/markup/tree.MD) 
 indexed | [paging](doc/markup/paging.md) 



<!-- /RM -->

    <!-- RM(images,tree:*,nocontent,noparent,notop,table) -->
    <!-- /RM -->

<!-- RM(images,tree:*,nocontent,noparent,notop,table) -->

Name | Page          
---- | ------------- 
 Ignore | [ignore.mD](doc/markup/ignore.mD) 
 Instalation | [installation.md](doc/installation.md) 
 README.md | [markup](doc/markup) 
 Roadmarks | [INDEX.MD](doc/INDEX.MD) 
 Tree | [tree.MD](doc/markup/tree.MD) 
 content | [content.MD](doc/markup/content.MD) 
 doc | [doc](doc) 
 media | [media.md](doc/markup/media.md) 
 paging | [paging.md](doc/markup/paging.md) 
 snippets | [snippets.md](doc/markup/snippets.md) 



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

MIT of course



