'use strict';

var t = require('should'),
  assert = require('assert'),
  RequestMock = require('./requestMock'),
  fixtures = require('./fixtures'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  log = require('debug')('npm-local-cache:debug'),
  Cache = require('../lib');

var originalRequest = Cache.request;

var defaultCachePath = path.join(__dirname, '../..', 'cache.json');
var testCachePath = path.join(__dirname, 'cache.json');

log('Default cache path: ' + defaultCachePath);
log('Default test cache path: ' + testCachePath);

// ------------------- HELPERS -------------------

var buildCleanUpFunction = function (path) {
  return function () {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  };
};

var buildRequestMock = function (path) {
  return RequestMock(function () {
    log('Faking fetch from NPM, using content of file: ' + path);
    try {
      var content = fs.readFileSync(path, { encoding: 'utf8' });
      log('Content loaded: ' + content.length + ' bytes');
      var docs = JSON.parse(content);
      log('JSON parsed');
      return docs;
    } catch (error) {
      log('Error occured');
      // log(error);
    }
  });
};

// ------------------- TESTS -------------------

describe('npm-local-cache', function () {
  var cleanUpFunction = null;
  // Remove custom clean function
  beforeEach(function (done) {
    cleanUpFunction = null;
    Cache.request = originalRequest;
    done();
  });
  
  // Invoke clean function or remove default cache.json
  afterEach(function (done) {
    if (cleanUpFunction !== null) {
      log('Invoking custom clean function');
      cleanUpFunction();
    } else if (fs.existsSync(testCachePath)) {
      log('Removing default test');
      fs.unlinkSync(testCachePath);
    }
    log('Cleaning done');
    done();
  });
  
  describe('Default options', function () {
    it('Should be correct', function (done) {
      var cache = Cache();
      var options = cache.getOptions();
      options.should.be.an.Object;
      options.keywords.should.be.a.Array;
      options.searchFields.should.eql(['name', 'description', 'keywords']);
      options.useLocal.should.be.true;
      var localCachePath = path.join(process.env.HOME, '.npm/-/all/.cache.json');
      var cachePath = defaultCachePath;
      options.localCachePath.should.equal(localCachePath);
      options.cachePath.should.equal(cachePath);
      cleanUpFunction = buildCleanUpFunction(defaultCachePath);
      done();
    });
  });

  describe('Parsing from NPM small, using mocked request', function () {
    it('Should produce an object with packages', function (done) {
      var cache = Cache({ cachePath: testCachePath, useLocal: false });
      Cache.request = buildRequestMock(path.join(__dirname, 'npm-small.json'));
      var p = cache.init().then(function (result) {
        var pkgs = cache.getPackages();
        pkgs.should.be.an.Object;
        var keys = _.keys(pkgs);
        keys.length.should.equal(52);
        keys[0].should.equal("0");
        var firstPackage = pkgs[keys[0]];
        firstPackage.name.should.equal('0');
        var lastPackage = pkgs[keys[keys.length - 1]];
        lastPackage.name.should.equal('2csv');
        done();
      }, function (err) {
        done(err);
      }).catch(function (err) {
        done(err);
      });
    });
  });

  describe('Parsing from NPM big, using mocked request', function () {
    it('Should produce an object with packages', function (done) {
      var cache = Cache({ cachePath: testCachePath, useLocal: false, writeCache: false });
      Cache.request = buildRequestMock(path.join(__dirname, 'npm-big.json'));
      var p = cache.init().then(function (result) {
        var pkgs = cache.getPackages();
        assert(typeof pkgs === 'object');
        var keys = _.keys(pkgs);
        assert.equal(83952, keys.length);
        done();
      }, function (err) {
        done(err);
      }).catch(function (err) {
        done(err);
      });
    });
  });
  
  describe('Applying keyword filter', function () {
    it('Should produce an object with packages all with server keyword', function (done) {
      var cache = Cache({ cachePath: testCachePath, useLocal: false, keywords: ['server'] });
      Cache.request = buildRequestMock(path.join(__dirname, 'npm-small.json'));
      var p = cache.init().then(function (result) {
        var pkgs = cache.getPackages();
        pkgs.should.be.an.Object;
        var keys = _.keys(pkgs);
        keys.length.should.equal(7);
        done();
      }, function (err) {
        done(err);
      }).catch(function (err) {
        done(err);
      });
    });
    
    it('Should produce an object with packages all with framework, server keywords', function (done) {
      var cache = Cache({ cachePath: testCachePath, useLocal: false, keywords: ['framework', 'server'] });
      Cache.request = buildRequestMock(path.join(__dirname, 'npm-small.json'));
      var p = cache.init().then(function (result) {
        var pkgs = cache.getPackages();
        pkgs.should.be.an.Object;
        var keys = _.keys(pkgs);
        keys.length.should.equal(9);
        done();
      }, function (err) {
        done(err);
      }).catch(function (err) {
        done(err);
      });
    });
  });
});
