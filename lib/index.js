'use strict';

var textSearch = require('fuzzy-filter'),
  path = require('path'),
  fs = require('fs'),
  Promise = require('promise'),
  request = require('request'),
  _ = require('lodash'),
  log = require('debug')('npm-local-cache'),
  utils = require('./utils');

var defaultOptions = {
  // Add keywords to enable keyword filtering
  keywords: [],
  // Package properties searched in
  searchFields: ['name', 'description', 'keywords'],
  // Use local NPM cache to build cache
  useLocal: true,
  // Location of local NPM cache. Default is: $HOME/.npm/-/all/.cache.json
  localCachePath: path.join(process.env.HOME, '.npm', '-/all/.cache.json'),
  // Location of cache. Default is the parent folder of `node_modules`
  cachePath: path.join(__dirname, '../..', 'cache.json'),
  // Max age of cache in millis. Default 24 hours
  ttl: 1000 * 60 * 60 * 24,
  writeCache: true
};

var legalSearchFields = ['name', 'description', 'author', 'keywords', 'dependencies', 'devDependencies'];

module.exports = function (options) {

  // Cache state
  var cache = {
    loaded: false,
    stale: false,
    updatedAt: null,
    packages: {},
    dirty: false,
    lastResult: null
  };

  options = _.extend(defaultOptions, options);

  if (_.difference(options.searchFields, legalSearchFields).length !== 0) {
    throw new Error('Illegal search field, legal values: ' + legalSearchFields.join(', '));
  }

  /**
   * Fetch package data from NPM, returns a promise that when resolves provides an object of packages.
   */
  function refreshFromNPM(since) {
    since = since || new Date('2014-02-14').getTime();
    return new Promise(function (resolve, reject) {
      module.exports.request.get({ json: true, url: 'https://registry.npmjs.org/-/all/since?stale=update_after&startkey=' + since } , function(err, httpMessage, body) {
        if (err === undefined && (body.error === undefined || (typeof body.error === 'object' && typeof body.error.name !== 'undefined')) ) {
          log('Content fetched from NPM: ' + JSON.stringify(body).length + ' bytes');
          resolve(body);
        } else {
          reject({ error: 'Error retrieving from NPM', errorObj: err || body.error });
        }
      });
    });
  }

  /**
   * Filter method for filtering packages based on a packages keywords. E.g. [ 'mongoosejs' ]
   *
   * @param pkgs Array
   *   An array of packages.
   * @param keywords String|Array
   *   An optional array of keywords. If not provided `options.keywords` is used.
   */
  function filterByKeywords(pkgs, keywords) {
    log('Filtering by keyword');

    keywords = keywords || options.keywords;
    if (!(keywords instanceof Array)) {
      keywords = [keywords];
    }

    // If no keywords are defined, skip
    if (keywords.length === 0) return pkgs;

    var matchingPkgs = {};

    _.each(pkgs, function (details, name) {
      var pkgKeywords = details.keywords || [];

      // If a package does not have keywords, skip
      if (pkgKeywords.length === 0) {
        return ;
      }

      // If a package have at least one of the keywords, include it
      if (_.intersection(keywords, pkgKeywords).length !== 0) {
        matchingPkgs[name] = details;
      }
    });

    return matchingPkgs;
  }

  /**
   * Updated metadata.
   * 1. If passed a file path it will read mtime and set updatedAt.
   * 2. If passed an object it will packages, and update updatedAt based on a possible _updated key from NPM.
   */
  function updateMetadata(mixed) {
    // log('Updating metadata: ' + typeof mixed);

    if (typeof mixed === 'string') {
      cache.updatedAt = fs.statSync(mixed).mtime.getTime();
    } else if (mixed instanceof Object) {
      if (mixed._updated !== undefined) {
        cache.updatedAt = new Date(mixed._updated).getTime();
        delete mixed._updated;
      } else {
        cache.updatedAt = new Date().getTime();
      }
      cache.packages = mixed;
      cache.loaded = true;
    }

    // Check if update from NPM is needed
    if (cache.updatedAt < (new Date().getTime() - options.ttl)) {
      cache.stale = true;
      cache.dirty = true;
    }

    return Promise.resolve(mixed);
  }

  /**
   * Write cache
   */
  function writeCache() {
    if (options.writeCache && cache.dirty) {
      log('Writing local cache');
      cache.dirty = false;
      return utils.write(options.cachePath, JSON.stringify(cache.packages));
    } else {
      log('Writing of cache skipped');
    }
    return Promise.resolve(cache.packages);
  }

  /**
   * Loads cache and/or creates cache if it doesn't exist or is out of date.
   */
  function loadCache() {
    if (cache.loaded) {
      log('Cache already loaded, skipping');
      return Promise.resolve(cache.packages);
    }

    log('Checking for logs in following places:');
    log('  Local cache      : ' + options.cachePath);
    log('  Local user cache : ' + options.localCachePath);

    var p = null;
    if (fs.existsSync(options.cachePath)) {
      log('Local cache exists: ' + options.cachePath);
      p = updateMetadata(options.cachePath) // returns file path
        .then(utils.readUTF8)
        .then(function (data) { return JSON.parse(data); })
        .then(function (docs) { return updateMetadata(docs); })
        .then(updateFromNPM);
    } else if (options.useLocal && fs.existsSync(options.localCachePath)) {
      log('Local user cache exists: ' + options.localCachePath);
      cache.dirty = true;
      p = updateMetadata(options.localCachePath) // returns file path
        .then(utils.readUTF8)
        .then(function (data) { return JSON.parse(data); })
        .then(function (docs) { return filterByKeywords(docs); })
        .then(function (docs) { return updateMetadata(docs); })
        .then(updateFromNPM);
    } else {
      log('No cache exists, loading from NPM');
      cache.dirty = true;
      p = refreshFromNPM()
        .then(function (docs) { return filterByKeywords(docs); })
        .then(function (docs) { return updateMetadata(docs); });
    }

    // Writes cache if dirty
    return p.then(function (docs) { return writeCache(docs); });
  }

  /**
   * Refreshes cache with updates from NPM.
   */
  function updateFromNPM() {
    // TODO implement and test
    if (false && cache.stale) {
      log('Package date expired');
      return refreshFromNPM(cache.updatedAt)
        .then(function (docs) { return filterByKeywords(docs); })
        .then(function (objs) {
          if (_.empty(cache.packages)) {
            cache.packages = objs;
          }
          _.each(objs, function (val, pkg) {
            if (pkg === '_updated') return ;
            cache.packages[pkg] = val;
          });
          return Promise.resolve(cache.packages);
        });
    }
    return Promise.resolve(cache.package);
  }

  /**
   * Filter method for filtering package based on a query (fuzzy text).
   */
  function filterByQuery(pkg) {
    log('Filtering by query');

    var input = [],
      searchField;

    for (var i = 0; i < options.searchFields.length; i++) {
      var searchField = options.searchFields[i];
      if ('keywords' === searchField) {
        input = input.concat(pkg.keywords);
      } else if ('dependencies' === searchField || 'devDependencies' === searchField) {
        input = input.concat(_.keys(pkg[searchField]));
      } else {
        input.push(pkg[searchField]);
      }
    }
    return textSearch(this.q, input).length !== 0;
  }

  function init() {
    return loadCache();
  }

  /**
   * Search in cache. Searches in keys defined in `options.searchFields`
   *
   * @param q String
   *   A query string. Eg. `bookmark`
   * @param keywords String|Array
   *   An optional array of keywords. If not provided `options.keywords` is used.
   */
  function search(q, keywords) {
    return new Promise(function (resolve, reject) {
      var p = init();
      // If keywords are supplied filter on keyword first
      if (k === undefined) {
        p = p.then(function (docs) { return filterByKeywords(docs, keywords); });
      }
      // Then do the fuzzy text search
      p.then(function () {
        log('Searching in ' + _.keys(cache.packages).length + ' packages');
        cache.lastResult = _.filter(cache.packages, filterByQuery, { q: q });

        if (!_.isEmpty(cache.lastResult)) {
          resolve(cache.lastResult);
        } else {
          reject(common.err('No result'));
        }
      });
    });
  }

  /**
   * Refreshes the cache from NPM.
   */
  function refresh() {
    cache.stale = true;
    return updateFromNPM()
      .then(function (docs) { return writeCache(docs); });
  }

  return {
    init: init,
    search: search,
    refresh: refresh,
    getPackages: function () { return cache.packages ; },
    /** for testing purpose */
    getOptions: function () { return options; },
    reset: function() {
      cache.loaded = false,
      cache.stale = false,
      cache.updatedAt = null,
      cache.packages = {},
      cache.dirty = false,
      cache.lastResult = null
    }
  };
};

/**
 * Exposed wrapper for `request`.
 */
module.exports.request = {
  get: function (options, callback) {
    request(options, callback);
  }
}