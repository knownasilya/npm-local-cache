# npm-local-cache

[![build status](http://img.shields.io/travis/mblarsen/npm-local-cache.svg)](http://travis-ci.org/mblarsen/npm-local-cache) [![Dependencies](http://img.shields.io/david/mblarsen/npm-local-cache.svg
)](https://david-dm.org/mblarsen/npm-local-cache) ![NPM version](http://img.shields.io/npm/v/npm-local-cache.svg)

[![NPM](https://nodei.co/npm/npm-local-cache.png?downloads=true)](https://nodei.co/npm/npm-local-cache/)

Creates a local searchable NPM cache. Good for building your own module repo based on NPM.

Functionality:

* Filter on custom keywords (useful for when NPM is used as module repo, like in the case of [mongoosejs](http://mongoosejs.com) and [breach.cc](http://breach.cc)).
* Customizable search fields.
* Cache time to live (update cache periodically).
* Build from local NPM cache.

## Install

    npm install --save npm-local-cache

## Usage

Either require the library like this:

    var cache = require('npm-local-cache')();

.. or pass in an options object to configure. These are the default values:

    var cache = require('npm-local-cache')({
        keywords: [],
        searchFields: ['name', 'description', 'keywords'],
        useLocal: true,
        localCachePath: '$HOME/.npm/-/all/.cache.json',
        cachePath: 'node_modules/../cache.json',
        ttl: 86400000,
        writeCache: true
    });

(see options details below)

The cache is build lazily, so go ahead and search. Search returns a Promise.

    cache.search(query, optionalKeywordArray).then(onSuccess, onError).catch(errHandler);

E.g.

    cache.search('json', ['mongoosejs'])
        .then(function (pkgs) {
            // MongooseJS modules pertaining to _json_
            console.log(pkgs);
        }, function (err) {
            console.error(err);
        });

Packages are filtered on keywords first, then based on the query.

You can refresh the cache using `refresh()` or just let the automatic refresh take place (see `ttl` below):

    cache.refresh();    // returns a promise

## Options

__keywords__: Add one or several keywords to filter packages from NPM. __Default: `[]`__

__searchFields__: An array of package fields to do text search on. Legal values: 'name', 'description', 'author', 'keywords', 'dependencies', 'devDependencies'. __Default: `['name', 'description', 'keywords']`__

__useLocal__: If `true` the local NPM cache will be used to build the cache, instead of fetching from the NPM server. __Default: true__

__localCachePath__: Path to local NPM cache. Unless you changed it will be `$HOME/.npm/-/all/.cache.json` which is also the default value.

__cachePath__: The path where to store the cache. By default it is stored in the parent folder of `node_modules`.

__ttl__: _Time To Live_ of the cache in millies. After expiring the cache will update on next `search()` invocation. __Default: 86400000__

Note that the `keywords` option that is passed when constructing the cache limits the entire cache to those keywords, whereas the `keywords` option for the search method will only filter based on the keywords for that one query.
