'use strict';

var t = require('should'),
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

// Builds a clean function of path supplied
var buildCleanFunction = function (path) {
  return function () {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  }
};

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
      cleanUpFunction = buildCleanFunction(defaultCachePath);
      done();
    });
  });

  describe('Parsing from NPM, mock', function () {
    it('Should produce an object with packages', function (done) {
      var cache = Cache({ cachePath: testCachePath, useLocal: false });
      Cache.request = RequestMock(function () { 
        var npmFileSmall = path.join(__dirname, 'npm-small.json');
        return JSON.parse(fs.readFileSync(npmFileSmall, { encoding: 'utf8' })); 
      });
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
        log(err);
      });
    });
  });
  
  describe('Fetching from NPM', function () {
    it('Should fetch from repo and produce a cache of 80k+ packages', function (done) {
      var cache = Cache({ cachePath: testCachePath, useLocal: false });
      var p = cache.init().then(function (result) {
        var pkgs = cache.getPackages();
        pkgs.should.be.an.Object;
        var keys = _.keys(pkgs);
        keys.length.should.greaterThan(80000);
        done();
      }, function (err) {
        log(err);
      });
    });
  });
});
