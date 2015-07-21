/* jshint node: true, laxcomma: true */
'use strict';

var gulp = require('gulp')
  , runSequence = require('run-sequence')
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

task('default', ['browse-devel']);
task('preview', ['browse-dist']);
task('build', ['dist-html']);

task('browse-devel', ['serve-devel'], browseDevel);
task('browse-dist', ['serve-dist'], browseDist);

task('test', function allTests() {
  return runSequence('test-client',
                     'test-api',
                     'test-ui',
                     'test-spec');
});


task('test-client', runClientTests);
task('test-client-watch', watchClientTests);
task('test-api', runApiTests);
task('test-api-watch', watchApiTests);
task('test-ui', ['update-webdriver', 'serve-test'], runUiTests);
task('test-spec', ['update-webdriver', 'serve-spec'], runSpecTests);

task('serve-test', ['initjs-test'], serveTest);
task('initjs-test', ['clean-test'], initJsTest);
task('serve-devel', ['initjs-devel'], serveDevel);
task('initjs-devel', ['clean-devel'], initJsDevel);

task('serve-spec', ['dist-html'], serveSpec);
task('serve-dist', ['dist-html'], serveDist);
task('dist-html', ['initjs-dist'], distHtml);
task('initjs-dist', ['dist-hash'], initJsDist);
task('dist-hash', ['dist-assets'], distHash);
task('dist-assets', ['app-css', 'app-js', 'app-misc',
                     'vendor-css', 'vendor-js', 'vendor-misc']);

task('app-css', ['clean-dist'], distAppCss);
task('app-js', ['clean-dist'], distAppJs);
task('app-misc', ['clean-dist'], distAppMisc);
task('vendor-css', ['clean-dist'], distVendorCss);
task('vendor-js', ['clean-dist'], distVendorJs);
task('vendor-misc', ['clean-dist'], distVendorMisc);

task('clean', ['clean-dist', 'clean-test', 'clean-devel']);
task('clean-dist', cleanDist);
task('clean-test', cleanTest);
task('clean-devel', cleanDevel);

task('update-webdriver', updateWebdriver);



function getConfig() {
  var config = loadJson('project.json'),
      cp = config.paths,
      map = [
        // config.Y =
        // <config.paths.X> / <config.files.Y>
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

  config.out = {
    dist: tmpdir('dist'),
    assets: tmpdir('dist', 'assets'),
    css: tmpdir('dist', 'assets', 'css'),
    misc: tmpdir('dist', 'assets', 'misc'),
    test: tmpdir('test'),
    devel: tmpdir('devel')
  };

  config.setHash = function setHash(hex) {
    var assetHash = 'assets-' + hex;
    config.assetHash = assetHash;
    config.out.hash = tmpdir('dist', assetHash);
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

function initJsTest() {
  return makeDevelInitJs(config.out.test);
}

function initJsDevel() {
  return makeDevelInitJs(config.out.devel);
}

function makeDevelInitJs(out) {
  var merge = require('merge-stream');
  var data = {
        devel: true
      , js: config.vendor_js
      , css: config.vendor_css
      };

  var js = gulp.src(config.client_js, {read:false})
               .pipe(push(data.js)),

      css = gulp.src(config.client_css, {read:false})
               .pipe(push(data.css));

  return merge(js, css).pipe(end())
            .pipe(gulp.dest(out));

  function push(l) {
    return through.obj(function (f, _, cb) {
      l.push(f.relative);
      cb();
    });
  }

  function end() {
    return through.obj(null, null, function (cb) {
      this.push(makeInitJs(data));
      cb();
    });
  }

}

function initJsDist() {
  if (!config.assetHash)
    throw new Error('missing asset hash');
  var js = [config.files.vendorjs, config.files.appjs]
    , css = [config.files.vendorcss, config.files.appcss]
    , data = {
        devel: false
      , js: prefixed(config.assetHash, js)
      , css: prefixed(config.assetHash + '/css', css)
      };
  return Source(makeInitJs(data))
            .pipe(gulp.dest(config.out.hash));
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

function makeInitJs(data) {
  var script = '\nINIT(' + JSON.stringify(data) + ');\n';
  return new $.util.File({
    path: config.files.initjs,
    contents: new Buffer(script)
  });
}

function distHtml() {
  if (!config.assetHash)
    throw new Error('missing asset hash');
  var initjs = config.assetHash + '/' + config.files.initjs;
  return gulp.src(config.client_html)
    .pipe($.replace(config.files.initjs, initjs))
    .pipe($.replace('misc/power', config.assetHash + '/misc/power'))
    .pipe(gulp.dest(config.out.dist));
}

function distAppCss() {
  return gulp.src(config.client_css)
             .pipe(require('gulp-concat')(config.files.appcss))
             .pipe(gulp.dest(config.out.css));
}

function distAppJs() {
  var merge = require('merge-stream');
  var templates = ngTemplateStream();
  return merge(gulp.src(config.client_js), templates)
          .pipe($.ngAnnotate())
          .pipe($.concat(config.files.appjs))
          .pipe($.uglify())
          .pipe(gulp.dest(config.out.assets));
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
             .pipe(gulp.dest(config.out.misc));
}

function distVendorCss() {
  return gulp.src(config.min_css)
              .pipe($.concat(config.files.vendorcss))
              .pipe(gulp.dest(config.out.css));
}

function distVendorJs() {
  return gulp.src(config.min_js)
              .pipe($.concat(config.files.vendorjs))
              .pipe(gulp.dest(config.out.assets));
}

function distVendorMisc() {

  var merge = require('merge-stream'),
      dest = config.out.assets,
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
  return gulp.src(path.join(config.out.assets, '**'))
             .pipe(through.obj(In, Out));
  function In(f, _, cb) {
    if (f.contents)
      hash.update(f.contents);
    cb();
  }
  function Out(cb) {
    config.setHash(hash.digest('hex').substring(0,10));
    fs.rename(config.out.assets, config.out.hash, cb);
  }
}

function serveDevel() {
  return runServer(develServer(config.out.devel, true),
                   config.ports.browse);
}

function serveTest() {
  return runServer(develServer(config.out.test),
                   config.ports.test);
}

function serveDist() {
  return runServer(distServer(), config.ports.browse);
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
          .use(serveStatic(config.out.dist));
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
  require('opn')('http://localhost:' + config.ports.browse + '/');
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
        path.join(config.out.devel, config.files.initjs)
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
          initJsDevel();
          return;
        }
    }
    tinylr.changed(event.path);
  }
}

function browseDist(done) {
  openBrowser();
  done();
}

function browseDevel(done) {
  watchReload();
  openBrowser();
  done();
}

function cleanDist(done) {
  del(config.out.dist, done);
}

function cleanTest(done) {
  del(config.out.test, done);
}

function cleanDevel(done) {
  del(config.out.devel, done);
}

function runProtractor(tests) {
  var jar = 'node_modules/protractor/selenium/selenium-server-standalone-2.45.0.jar';
  var args = ['--baseUrl',
              'http://localhost:' + config.ports.test,
              '--directConnect', 'true',
              '--browser', config.browser,
              '--specs', tests.join(',')],
      q = Q.defer(),
      error = null;

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

