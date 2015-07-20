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
    , files = vendor_js.concat(extra_js, test_js, app_js)

    , coverage = {};

  coverage[app_js] = ['coverage'];

  var reporters = [];

  if (process.env['DESKTOP_SESSION'] == 'ubuntu')
      reporters.push('osd-notifier');

  config.set({

    files: files,
    preprocessors: coverage,
    singleRun: true,

    frameworks: ['jasmine'],
    reporters: reporters.concat(['progress', 'coverage']),

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
      'osd-notifier',
    ],

    coverageReporter: {
      reporters: [{type: 'text'}]
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

fakeModule('osd-notifier', 'karma', {
  'reporter:osd-notifier': ['type', NotifyReporter]
});

