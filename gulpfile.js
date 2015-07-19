/* jshint node: true, laxcomma: true */
'use strict';

var gulp = require('gulp')
  , through = require('through2')
  , path = require('path')
  , del = require('del')
  , Q = require('q')
  , $ = require('gulp-load-plugins')()
  , config = getConfig()
  , task = gulp.task.bind(gulp)
  , watch = gulp.watch.bind(gulp)
  , log = $.util.log
  , serverInstance = null
  ;

task('default', ['serve-interactive'], interactiveDevel);
task('dist', ['serve-dist'], interactiveDist);

task('test', runTests);

task('test-client', runClientTests);
task('test-client-watch', watchClientTests);
task('test-api', runApiTests);
task('test-api-watch', watchApiTests);
task('test-ui', ['update-webdriver', 'serve-test'], runUiTests);
task('test-spec', ['update-webdriver', 'serve-spec'], runSpecTests);

task('serve-test', ['initjs-test'], serveTest);
task('initjs-test', ['clean-test'], testInitJs);
task('serve-interactive', ['initjs-interactive'], serveInteractive);
task('initjs-interactive', ['clean-interactive'], interactiveInitJs);

task('serve-spec', ['dist-html'], serveSpec);
task('serve-dist', ['dist-html'], serveDist);
task('dist-html', ['dist-initjs'], distHtml);
task('dist-initjs', ['dist-hash'], distInitJs);
task('dist-hash', ['dist-assets'], distHash);
task('dist-assets', ['app-css', 'app-js', 'app-misc',
                     'vendor-css', 'vendor-js', 'vendor-misc']);

task('app-css', ['clean-dist'], distAppCss);
task('app-js', ['clean-dist'], distAppJs);
task('app-misc', ['clean-dist'], distAppMisc);
task('vendor-css', ['clean-dist'], distVendorCss);
task('vendor-js', ['clean-dist'], distVendorJs);
task('vendor-misc', ['clean-dist'], distVendorMisc);

task('clean', ['clean-dist', 'clean-test', 'clean-interactive']);
task('clean-dist', cleanDist);
task('clean-test', cleanTest);
task('clean-interactive', cleanInteractive);

task('update-webdriver', updateWebdriver);



function getConfig() {
  var config = loadJson('project.json'),
      cp = config.paths,
      map = [
        ['client_assets','client_misc'],
        ['client_src',   'client_css'],
        ['client_src',   'client_html'],
        ['client_src',   'client_js'],
        ['client_src',   'client_templates'],
        ['server_src',   'server_py'],
        ['server_test',  'server_test'],
        ['spec_test',    'spec_test'],
        ['ui_test',      'ui_test'],
      ];

  map.forEach(function (pair) {
    var prefix = pair[0], name = pair[1];
    config[name] = prefixed(config.paths[prefix],
                            config.files[name]);
  });

  config.vendor_css = prefixed(cp.vendor_prefix, config.vendor.css);
  config.vendor_js = prefixed(cp.vendor_prefix, config.vendor.js);
  config.min_css = prefixed(cp.vendor_src, assetMin('css', config.vendor.css));
  config.min_js = prefixed(cp.vendor_src, assetMin('js', config.vendor.js))
  config.python_cgi = path.join(cp.server_src, config.files.python_main)

  function sortObj(o) {
    var out = {};
    Object.keys(o).sort().forEach(function (k) {
      out[k] = o[k];
    });
    return out;
  }
  console.log(sortObj(process.env));
  config.browser = 'chrome';
  if (process.env['TRAVIS']) {
    config.browser =  'firefox';
  }

  if (process.env['VIRTUAL_ENV'])
    cp.python = process.env['VIRTUAL_ENV'];
  config.python_exe = path.join(cp.python, 'bin', 'python')

  function tmpdir() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(config.paths.tmp);
    return path.join.apply(null, args);
  }

  config.tmp_dist = tmpdir('dist');
  config.tmp_assets = tmpdir('dist', 'assets');
  config.tmp_css = tmpdir('dist', 'assets', 'css');
  config.tmp_misc = tmpdir('dist', 'assets', 'misc');
  config.tmp_test = tmpdir('test');
  config.tmp_interactive = tmpdir('interactive');

  config.setHash = function setHash(hex) {
    var assetHash = 'assets-' + hex;
    config.assetHash = assetHash;
    config.tmp_hash = tmpdir('dist', assetHash);
  }
  return config;
}

function runClientTests() {
  var args = {
    singleRun: true,
    autoWatch: false
  };
  var q = Q.defer();
  startKarma(args, function(e) {
    passfail(!e);
    if (e)
      q.reject(e)
    else
      q.resolve();
  });
  return q.promise;
}

function watchClientTests() {
  var args = {
    singleRun: false,
    autoWatch: true
  };
  startKarma(args);
}

function startKarma(args, done) {
  var karma_conf = './' + config.files.karma_conf;
  args.configFile = path.resolve(karma_conf);
  require('karma').server.start(args, done);
}

function runApiTests() {

  var exec = require('child_process').exec
    , color = $.util.colors.supportsColor
    , pytest = config.paths.python + '/bin/py.test'
    , tests = config.server_test
    , cmd = [pytest, color ? ' --color=yes ' : '',
             tests.join(' ')]
    , q = Q.defer();

  exec(cmd.join(' '), done);
  return q.promise;

  function done(e, stdo, stde) {
    if (stdo)
      log('\n' + stdo);
    passfail(!e);
    if (e)
      q.reject({stack: stde ? 'stderr:\n' + stde : ''});
    else
      q.resolve();
  }
}

function watchApiTests() {
  var watches = config.server_py.concat(config.server_test);
  runApiTests().then(done);
  watch(watches, function (event) {
    logChange(event);
    runApiTests().then(done);
  });
  function done(e) {
    if (e && e.stack)
      log(e.stack);
  }
}

function runTests() {
  var run = require('run-sequence');
  return run('test-client',
             'test-api',
             'test-ui',
             'test-spec');
}

function testInitJs() {
  return develInitJs(config.tmp_test);
}

function interactiveInitJs() {
  return develInitJs(config.tmp_interactive);
}

function develInitJs(dir) {

  var src = config.client_js.concat(config.client_css)
    , data = {
        app: config.app
      , devel: true
      , js: config.vendor_js
      , css: config.vendor_css
      };
  return gulp.src(src, {read:false})
              .pipe(assetCollector(data))
              .pipe(gulp.dest(dir));

}

function distInitJs() {
  if (!config.assetHash)
    throw new Error('missing asset hash');
  var js = [config.files.vendorjs, config.files.appjs]
    , css = [config.files.vendorcss, config.files.appcss]
    , data = {
        app: config.app
      , devel: false
      , js: prefixed(config.assetHash, js)
      , css: prefixed(config.assetHash + '/css', css)
      };
  return Source(initJs(data))
          .pipe(gulp.dest(config.tmp_hash));
}

function Source(file) {
  var s = through.obj(function(file, _, cb) {
    this.push(file);
    return cb();
  });
  s.write(file);
  s.end();
  return s;
}

function initJs(data) {
  var script = '\ninitApp(' + JSON.stringify(data) + ');\n';
  return new $.util.File({
    path: config.files.initjs,
    contents: new Buffer(script)
  });
}

function assetCollector(data) {

  return through.obj(consume, end);

  function consume(f, _, cb) {
    var rel = f.relative;
    if (/\.js$/.test(rel))
      data.js.push(rel)
    else if (/\.css$/.test(rel))
      data.css.push(rel)
    cb();
  }
  function end(cb) {
    this.push(initJs(data));
    cb();
  }
}

function distHtml() {
  if (!config.assetHash)
    throw new Error('missing asset hash');
  var initjs = config.assetHash + '/' + config.files.initjs;
  return gulp.src(config.client_html)
    .pipe($.replace(config.files.initjs, initjs))
    .pipe($.replace('misc/power', config.assetHash + '/misc/power'))
    .pipe(gulp.dest(config.tmp_dist));
}

function distAppCss() {
  return gulp.src(config.client_css)
             .pipe(require('gulp-concat')(config.files.appcss))
             .pipe(gulp.dest(config.tmp_css));
}

function distAppJs() {
  var merge = require('merge-stream');
  var templates = ngTemplateStream();
  return merge(gulp.src(config.client_js), templates)
          .pipe($.ngAnnotate())
          .pipe($.concat(config.files.appjs))
          .pipe($.uglify())
          .pipe(gulp.dest(config.tmp_assets));
}

function ngTemplateStream() {
  var args = {
    root: 'templates/',
    standalone: true
  };
  return gulp.src(config.client_templates)
              .pipe($.angularTemplatecache(args))
}

function distAppMisc() {
  return gulp.src(config.client_misc)
             .pipe(gulp.dest(config.tmp_misc));
}

function distVendorCss() {
  return gulp.src(config.min_css)
              .pipe($.concat(config.files.vendorcss))
              .pipe(gulp.dest(config.tmp_css));
}

function distVendorJs() {
  return gulp.src(config.min_js)
              .pipe($.concat(config.files.vendorjs))
              .pipe(gulp.dest(config.tmp_assets));
}

function distVendorMisc() {

  var merge = require('merge-stream'),
      dest = config.tmp_assets,
      stream = null;

  Object.keys(config.vendor.other || {}).forEach(each);
  return stream;

  function each(prefix) {
    var items = config.vendor.other[prefix];
    var base = path.join(config.paths.vendor_src, prefix);
    var src = items.map(function (f) {
      return path.join(base, f);
    });
    var s = gulp.src(src)
                .pipe(relativePath(base))
                .pipe(gulp.dest(dest));
    if (stream)
      stream.merge(s)
    else
      stream = s;
  }
}

function relativePath(base) {
  return through.obj(function (f, _, cb) {
    f.base = base;
    cb(null, f);
  });
}

function distHash() {
  var crypto = require('crypto'),
      fs = require('fs'),
      hash = crypto.createHash('sha1');
  return gulp.src(path.join(config.tmp_assets, '**'))
             .pipe(through.obj(In, Out));
  function In(f, _, cb) {
    if (f.contents)
      hash.update(f.contents);
    cb();
  }
  function Out(cb) {
    config.setHash(hash.digest('hex').substring(0,10));
    fs.rename(config.tmp_assets, config.tmp_hash, cb);
  }
}

function serveInteractive() {
  return runServer(develServer(config.tmp_interactive, true),
                   config.ports.interactive);
}

function serveTest() {
  return runServer(develServer(config.tmp_test),
                   config.ports.test);
}

function serveDist() {
  return runServer(distServer(), config.ports.interactive);
}

function serveSpec() {
  return runServer(distServer(), config.ports.test);
}

function closeServer() {
  if (serverInstance)
    serverInstance.close();
  serverInstance = null;
}

function runServer(server, port) {
  var q = Q.defer();
  serverInstance = server.listen(port)
    .on('listening', function () {
      log('server started on http://localhost:' + port + '/');
      q.resolve();
    })
    .on('error', function (e) {
      q.reject(e);
    })
    .on('close', function () {
      log('server closed');
    });
  return q.promise;
}

function distServer() {
  var serveStatic = require('serve-static')
  return getServer()
          .use(serveStatic(config.tmp_dist));
}

function develServer(dir, reload) {
  var serveStatic = require('serve-static')
  return getServer(reload)
          .use(config.paths.vendor_prefix,
              serveStatic(config.paths.vendor_src))
          .use(serveStatic(dir))
          .use(serveStatic(config.paths.client_assets))
          .use(serveStatic(config.paths.client_src));
}

function getServer(reload) {
  var connect = require('connect')
    , morgan = require('morgan')
    , cgi = require('cgi')
    , livereload = require('connect-livereload')
    , api_cgi = cgi(config.python_exe, {
        args: [config.python_cgi],
        stderr: process.stderr
      })
    ;
  var s = connect()
            .use(morgan('dev'))
            .use(config.paths.api_prefix, api_cgi);
  if (reload)
    s.use(livereload({port: config.ports.livereload}));
  return s;
}

function runUiTests() {
  return runProtractor(config.ui_test);
}

function runSpecTests() {
  return runProtractor(config.spec_test);
}

function openBrowser() {
  require('opn')('http://localhost:' + config.ports.interactive + '/');
}

function logChange(event) {
  var cwd = process.cwd()
    , path = event.path.replace(cwd + '/', '')
    , C = $.util.colors
    , map = { changed: C.blue
            , added: C.yellow
            , deleted: C.red
            }
    , msg = C.inverse(map[event.type](event.type)) + ' '
          + C.magenta(path)
    log(msg);
}

function watchReload() {
  var tinylr = require('tiny-lr')
    , server = tinylr()
    , watches = [
        config.client_js,
        config.client_css,
        config.client_templates,
        config.server_py,
        path.join(config.tmp_interactive, config.files.initjs)
      ];

  watch(watches, onChange);
  server.listen(config.ports.livereload, function(err) {
    if (err)
      log(err);
    else
      log('live-reload server started');
  });

  var assetsRegexp = /\.(js|css)$/;
  function onChange(event) {
    logChange(event);
    switch (event.type) {
      case 'added':
      case 'deleted':
        if (assetsRegexp.test(event.path)) {
          interactiveInitJs();
          return;
        }
    }
    tinylr.changed(event.path);
  }
}

function interactiveDist(done) {
  openBrowser();
  done();
}

function interactiveDevel(done) {
  watchReload();
  openBrowser();
  done();
}

function cleanDist(done) {
  del(config.tmp_dist, done);
}

function cleanTest(done) {
  del(config.tmp_test, done);
}

function cleanInteractive(done) {
  del(config.tmp_interactive, done);
}

function runProtractor(tests) {
  // config.browser = 'firefox';
  var jar = 'node_modules/protractor/selenium/selenium-server-standalone-2.45.0.jar';
  var args = ['--baseUrl',
              'http://localhost:' + config.ports.test,
              // '--seleniumAddress', 'http://localhost:4444/',
              // '--seleniumPort', '4444',
              // '--seleniumServerJar', jar,
              // '--directConnect', 'true',
              '--browser', config.browser,
              '--specs', tests.join(',')],
      q = Q.defer(),
      error = null;

  // args = ['./protractor.conf.js'];
  console.log('protractor ' + args.join(' '));

  var child = _runProtractorBinary('protractor', args)
    .on('error', function (e) {
      // exec error
      closeServer();
      passfail(false);
      log(e);
      q.reject(e);
    })
    .on('exit', function(code) {
      // normal exit: success or fail
      log('protractor exit');
      closeServer();
      passfail(!code);
      if (child)
        child.kill();
      if (code)
        q.reject(code)
      else
        q.resolve();
    });
  return q.promise;
}

function updateWebdriver() {
  var args = ['update', '--standalone'];
  return _runProtractorBinary('webdriver-manager', args);
}

function _runProtractorBinary(name, args) {
  var spawn = require('child_process').spawn;
  var bin = _protractorBinary(name);
  var opts = {
    stdio: 'inherit',
    env: process.env
  };
  return spawn(bin, args, opts)
}

function _protractorBinary(name) {
  var winExt = /^win/.test(process.platform) ? '.cmd': '';
  var prodir = require.resolve('protractor');
  if (!prodir)
    throw new Error('No protractor installation found'); 
  return path.resolve(path.join(path.dirname(prodir), '..', 'bin',
                                name + winExt));
}

function assetMin(ext, l) {
  var a = '.' + ext,
      b = '.min' + a;
  return l.map(function (f) {
    return f.replace(a, b);
  });
}

function passfail(passed) {
  var C = $.util.colors;
  log(passed
        ? C.bgGreen('PASS')
        : C.bgRed('FAIL'));
}

function prefixed(prefix, items) {
  return items.map(function (s) {
    return path.join(prefix, s);
  });
}

function readFile(fn) {
  var read = require('fs').readFileSync
    , opts = {encoding: 'utf-8'};
  return read(fn, opts);
}

function loadJson(fn) {
  return JSON.parse(readFile(fn));
}

function getBowerFiles() {
  var getBower = require('main-bower-files')
    , vendor_src = config.paths.vendor_src
    , prefix = path.join(process.cwd(), vendor_src)
    , jsExt = /\.js$/i
    , cssExt = /\.css$/i
    , js = []
    , css = []
    , other = []
    , bowerFiles
    , bowerOpts
    , f
    ;

  bowerOpts = {
    checkExistence: true
  }

  bowerFiles = getBower(bowerOpts).map(stripPrefix)
  return bowerFiles;

  while (bowerFiles.length) {
    f = bowerFiles.shift();
    if (jsExt.test(f))
      js.push(f)
    else if (cssExt.test(f))
      css.push(f)
    else
      other.push(f)
  }

  return {
      js: js,
      css: css,
      other: other
  };

  function stripPrefix(s) {
    return s.replace(prefix+'/', '');
  }

}

