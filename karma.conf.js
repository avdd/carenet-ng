// http://karma-runner.github.io/0.12/config/configuration-file.html

'use strict';

function prefixed(prefix, items) {
  var path = require('path');
  return items.map(function (s) {
    return path.join(prefix, s);
  });
}

module.exports = function(config) {

  var project = require('./project.json')

    , vendor_js = prefixed(project.paths.vendor_src, project.vendor.js)
    , extra_js = prefixed(project.paths.vendor_src, project.test.js)
    , app_js = prefixed(project.paths.client_src, project.files.client_js)
    , test_js = prefixed(project.paths.client_test, project.files.client_test)
    , files = vendor_js.concat(extra_js, app_js, test_js)

    , coverage = {};

  coverage[app_js] = ['coverage'];

  var osd = [];
  if (process.env['DESKTOP_SESSION'] == 'ubuntu')
      osd.push('osd-notifier');

  config.set({

    files: files,
    preprocessors: coverage,
    singleRun: true,

    frameworks: ['jasmine'],
    reporters: ['progress', 'coverage', 'coverage-reporter'].concat(osd),

    port: project.ports.karma,

    browsers: [
      'PhantomJS'
      // Chrome
      // ChromeCanary
      // Firefox
      // Opera
      // PhantomJS
    ],

    plugins: [
      'karma-jasmine',
      'karma-phantomjs-launcher',
      'karma-coverage',
      'coverage-reporter',
      'osd-notifier',
    ],

    coverageReporter: {
      dir: '.cache/karma-coverage-report',
      reporters: [
        { type: 'text', subdir: '.', file: 'text.txt' },
        // { type: 'text-summary', subdir: '.', file: 'text-summary.txt' },
      ]
    },

    colors: true,

    // LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,

  });
};

function fakeModule(name, parent, obj) {
  require('karma');
  var Module = require('module')
    , karma = Module._cache[require.resolve(parent)]
    , resolved = Module._resolveLookupPaths(name, karma)
    , cacheKey = JSON.stringify({request: name, paths: resolved[1]})
    , filename = '/dev/null/' + name + '.js';
  Module._pathCache[cacheKey] = filename;
  Module._cache[filename] = {exports:obj};
}

function readFile(fn) {
  var read = require('fs').readFileSync
    , opts = {encoding: 'utf-8'};
  return read(fn, opts);
}

var BaseReporter = require('karma/lib/reporters/base');

function NotifyReporter(formatError) {

  BaseReporter.call(this, formatError);

  var util = require('util');
  var exec = require('child_process').exec;
  this.onBrowserComplete = function Notify(browser) {
    var result = browser.lastResult;
    var msg = this.renderBrowser(browser);
    var icon = (result.failed || result.error) ? 'important' : 'dialog-ok',
        code =  result.failed ? 'FAIL' : 'PASS';

    var cmd = util.format('notify-send -t 1000 -i %s "%s"', icon, msg);
    exec(cmd, function () {});
  }
}

function CoverageReporter(config, formatError) {

  BaseReporter.call(this, formatError);

  var coverage = config.coverageReporter;
  var dir = coverage.dir;
  var path = require('path');
  var fs = require('fs');

  this.onRunComplete = function MyRunComplete(browsers, results) {
    coverage.reporters.forEach(function (x) {
      if (!/^text/.test(x.type))
        return;
      var f = path.join(dir, x.subdir, x.file);
      fs.exists(f, function () {
        process.stdout.write(readFile(f))
        fs.rename(f, f + '.old');
      });
    });
  }

}

CoverageReporter.$inject = ['config', 'formatError'];

fakeModule('coverage-reporter', 'karma', {
  'reporter:coverage-reporter': ['type', CoverageReporter]
});

fakeModule('osd-notifier', 'karma', {
  'reporter:osd-notifier': ['type', NotifyReporter]
});

