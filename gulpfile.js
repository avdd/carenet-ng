/* jshint node: true, laxcomma: true */
'use strict';

var gulp = require('gulp')
  , Q = require('q')
  , del = require('del')
  , path = require('path')
  , through = require('through2')
  , childProc = require('child_process')
  , mergeStream = require('merge-stream')
  , runSequence = require('run-sequence')
  , util = require('gulp-util')
  , replace = require('gulp-replace')
  , concat = require('gulp-concat')
  , uglify = require('gulp-uglify')
  , minify = require('gulp-minify-css')
  , ngAnnotate = require('gulp-ng-annotate')
  , templateCache = require('gulp-angular-templatecache')
  , config = getConfig()
  , task = gulp.task.bind(gulp)
  , watch = gulp.watch.bind(gulp)
  , log = util.log
  , serverInstance = null
  ;

task('default', ['browse-devel']);
task('dist', ['browse-dist']);
task('spec', ['test-spec']);

task('browse-devel', ['serve-devel'], browseDevel);
task('browse-dist', ['serve-dist'], browseDist);


task('test', function allTests() {
  return runSequence('test-client',
                     'test-api',
                     // 'test-ui',
                     'test-spec');
});


// task('build', ['dist-html']);

// task('git-branch', gitBranch);
// task('git-revision', gitRevision);
// task('git-is-clean', gitIsClean);
// task('git-id', ['git-branch', 'git-revision', 'git-is-clean'], gitId);

task('version-tag', versionTag)


task('test-client', runClientTests);
task('test-client-watch', watchClientTests);
task('test-api', runApiTests);
task('test-api-watch', watchApiTests);
task('test-ui', ['update-webdriver', 'serve-uitest'], runUiTests);
task('test-spec', ['update-webdriver', 'serve-spec'], runSpecTests);
task('test-vagrant', ['update-webdriver'], //, 'html-livesim'],
     // vagrant up, wait, publish ??!!
     runSpecTestsVagrant);



task('initjs-devel', ['version-tag', 'clean-devel'], initJsDevel);
task('initjs-uitest', ['version-tag', 'clean-test'], initJsUiTest);
task('serve-devel', ['initjs-devel'], serveDevel);
task('serve-uitest', ['initjs-uitest'], serveUiTest);
task('serve-spec', ['html-staging'], serveSpec);
task('serve-dist', ['html-dist'], serveDist);

function htmlTask(channel, api) {
  return function () {
    return generateIndexHtml(channel, config.paths[api]);
  }
}

task('html-dist', ['manifest'], htmlTask('dist-local', 'api_cgi'));
task('html-staging', ['manifest'], htmlTask('staging', 'api_cgi'));
task('html-livesim', ['manifest'], htmlTask('livesim', 'api_daemon'));
task('html-live', ['manifest'], htmlTask('live', 'api_daemon'));

task('manifest', ['version-tag', 'asset-hash', 'online.txt'], distManifest);
task('asset-hash', ['assets'], assetHash);
task('assets', ['app-css', 'app-js', 'app-misc',
                'vendor-css', 'vendor-js', 'vendor-misc']);

task('online.txt', ['clean-dist'], distOnline);
task('app-css', ['clean-dist'], distAppCss);
task('app-js', ['clean-dist'], distAppJs);
task('app-misc', ['clean-dist'], distAppMisc);
task('vendor-css', ['clean-dist'], distVendorCss);
task('vendor-js', ['clean-dist'], distVendorJs);
task('vendor-misc', ['clean-dist'], distVendorMisc);

task('clean', ['clean-dist', 'clean-uitest', 'clean-devel']);
task('clean-dist', cleanDist);
task('clean-uitest', cleanUiTest);
task('clean-devel', cleanDevel);

task('update-webdriver', updateWebdriver);



function getConfig() {
  var config = loadJson('project.json'),
      bower = loadJson('.bowerrc'), 
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

  cp.vendor_src = bower.directory;
  config.vendor_css = prefixed(cp.vendor_prefix, config.vendor.css);
  config.vendor_js = prefixed(cp.vendor_prefix, config.vendor.js);
  config.min_css = prefixed(cp.vendor_src, config.vendor.cssmin);
  config.min_js = prefixed(cp.vendor_src, config.vendor.jsmin);

  if (process.env.VIRTUAL_ENV)
    cp.python_env = process.env.VIRTUAL_ENV;

  config.python_cgi = path.join(cp.python_env, 'bin', 'carenetctl');

  function buildDir() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(config.paths.build);
    return path.join.apply(null, args);
  }

  config.out = {
    dist: buildDir('dist'),
    assets: buildDir('dist', 'assets'),
    css: buildDir('dist', 'assets', 'css'),
    misc: buildDir('dist', 'assets', 'misc'),
    test: buildDir('test'),
    devel: buildDir('devel')
  };

  config.setHash = function setHash(hex) {
    var assetHash = 'assets-' + hex;
    config.assetHash = assetHash;
    config.out.hash = buildDir('dist', assetHash);
  }

  return config;
}


function runGit(cmd) {
  var q = Q.defer();
  childProc.exec('git ' + cmd, done);
  return q.promise;
  function done(err, stdout, stderr){
    if (err)
      q.reject(err, stdout, stderr);
    else
      q.resolve(stdout, stderr);
  }
};


function runClientTests() {
  var args = {
    singleRun: true,
    autoWatch: false
  };
  var q = Q.defer();
  startKarma(args, function(e) {
    passfail(!e);
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
  var Server = require('karma').Server;
  (new Server(args, done)).start()
}

function runApiTests() {

  var color = util.colors.supportsColor
    , cmd = [config.paths.python_env + '/bin/py.test',
             '--showlocals']
    , tests = config.server_test
    , opts = {stdio:'inherit'}
    , q = Q.defer();

  if (color)
    cmd.push(' --color=yes');

  cmd.push(tests.join(' '));

  childProc.spawn('sh', ['-c', cmd.join(' ')], opts)
    .on('error', done)
    .on('exit', done);
  
  return q.promise;

  function done(e) {
    passfail(!e);
    notify({failed: !!e, msg: 'API: ' + (e ? 'FAILED' : 'PASS')});
    if (e)
      // q.reject({stack: stde ? 'stderr:\n' + stde : ''});
      q.reject(e===1 && 'Failed' || e);
    else
      q.resolve();
  }
  function notify(result) {
    var util = require('util'),
        icon = (result.failed || result.error) ? 'important' : 'dialog-ok',
        code = result.failed ? 'FAIL' : 'PASS',
        cmd = util.format('notify-send -t 1000 -i %s "%s"', icon, result.msg);
    childProc.exec(cmd, function () {});
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

function initJsUiTest() {
  return makeInitJsDevel(config.out.test);
}

function initJsDevel() {
  return makeInitJsDevel(config.out.devel);
}

function gitBranch() {
  var cmd = 'rev-parse --abbrev-ref HEAD';
  return runGit(cmd).then(function (out) {
    config.gitBranch = out.trim();
  });
}

function gitRevision() {
  var cmd = 'describe --tags';
  return runGit(cmd).then(function (out) {
    config.gitRevision = out.trim();
  });
}

function gitIsClean() {
  return runGit('diff --no-ext-diff --quiet --exit-code')
          .then(clean, dirty);
  function clean() {
    config.gitIsClean = true;
  }
  function dirty() {
    config.gitIsClean = false;
  }
}

function versionTag(done) {
  config.versionTag = process.env.CARENET_BUILD_VERSION || 'UNDEFINED!';
  done();
}

function gitIdBroken(done) {
  var suffix = config.gitIsClean ? '' : '+';
  config.versionTag = (config.gitBranch
                    + '-' + config.gitRevision
                    + suffix);
  done();
}

function makeInitJsDevel(out) {
  var data = {
        devel: true
      , channel: 'devel'
      , api: config.paths.api_cgi
      , version: config.versionTag
      , js: config.vendor_js
      , css: config.vendor_css
      };

  var js = gulp.src(config.client_js, {read:false})
               .pipe(push(data.js)),

      css = gulp.src(config.client_css, {read:false})
                .pipe(push(data.css));

  return mergeStream(js, css).pipe(end())
            .pipe(gulp.dest(out));

  function push(l) {
    return through.obj(function (f, _, cb) {
      l.push(f.relative);
      cb();
    });
  }

  function end() {
    return through.obj(null, null, function (cb) {
      var out = new util.File({
        path: config.files.initjs,
        contents: new Buffer(initJs(data))
      });
      this.push(out);
      cb();
    });
  }
}

function stringSrc(filename, string) {
  var src = require('stream').Readable({objectMode: true})
  src._read = function () {
    this.push(new util.File({
      cwd: '',
      base: '',
      path: filename,
      contents: new Buffer(string)
    }))
    this.push(null)
  }
  return src
}

function distOnline() {
  stringSrc('online.txt', 'ONLINE')
      .pipe(gulp.dest(config.out.dist));
}

function distManifest() {
  if (!config.assetHash)
    throw new Error('missing asset hash');

  var manifest = [],
      allAssets = path.join(config.out.assets, '**');

  return gulp.src(allAssets, {read:false})
             .pipe(through.obj(In))
             .pipe(through.obj(null, null, Out))
             .pipe(gulp.dest(config.out.dist));

  function In(f, _, cb) {
    if (f.stat.isFile())
      manifest.push(config.assetHash + '/' + f.relative);
    cb();
  }
  function Out(cb) {
    var manifestData = (
      'CACHE MANIFEST\n#'
      + config.versionTag + Math.random()
      + '\n'
      + manifest.join('\n')
      + '\nFALLBACK:'
      + '\n/online.txt ' + config.assetHash + '/misc/cached.txt'
      + '\nNETWORK:\n*\n'
    );
    var out = new util.File({
      path: config.files.cache_manifest,
      contents: new Buffer(manifestData)
    });
    config.assetCount = manifest.length;
    this.push(out);
    cb();
  }
}

function initJsDist(channel, api_path) {
  var js = [config.files.vendorjs, config.files.appjs]
    , css = [config.files.vendorcss, config.files.appcss]
    , hash = config.assetHash
    , data = {
        devel: false
      , channel: channel
      , api: api_path
      , version: config.versionTag
      , deps: ['templates']
      , js: prefixed(hash, js)
      , css: prefixed(hash + '/css', css)
      , assetCount: config.assetCount
      };
  if (!api_path)
    throw new Error('Incorrect api path: ' + api);
  return initJs(data);
}

function initJs(data) {
  return '\nINIT(' + JSON.stringify(data) + ');\n';
}

function generateIndexHtml(channel, api_path) {
  if (!config.assetHash)
    throw new Error('missing asset hash');
  var initjs = ' src=init.js>',
      initjsReplace = '>' + initJsDist(channel, api_path),
      iconpath = 'misc/power',
      iconpathReplace = config.assetHash + '/misc/power',
      html = '<html ',
      htmlReplace = '<html manifest=' + config.files.cache_manifest + ' ';
  return gulp.src(config.client_html)
             .pipe(replace(initjs, initjsReplace))
             .pipe(replace(iconpath, iconpathReplace))
             .pipe(replace(html, htmlReplace))
             .pipe(gulp.dest(config.out.dist));
}

function distAppCss() {
  return gulp.src(config.client_css)
             .pipe(concat(config.files.appcss))
             .pipe(minify())
             .pipe(gulp.dest(config.out.css));
}

function distAppJs() {
  var templates = ngTemplateStream();
  return mergeStream(gulp.src(config.client_js), templates)
          .pipe(ngAnnotate())
          .pipe(concat(config.files.appjs))
          .pipe(uglify())
          .pipe(gulp.dest(config.out.assets));
}

function ngTemplateStream() {
  var args = {
    root: 'templates/',
    standalone: true
  };
  return gulp.src(config.client_templates)
             .pipe(templateCache(args))
}

function distAppMisc() {
  return gulp.src(config.client_misc)
             .pipe(gulp.dest(config.out.misc));
}

function distVendorCss() {
  return gulp.src(config.min_css)
             .pipe(concat(config.files.vendorcss))
             .pipe(gulp.dest(config.out.css));
}

function distVendorJs() {
  return gulp.src(config.min_js)
             .pipe(concat(config.files.vendorjs))
             .pipe(gulp.dest(config.out.assets));
}

function distVendorMisc() {

  var dest = config.out.assets,
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

function assetHash() {
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
    fs.symlink('assets', config.out.hash, cb);
  }
}

function serveDevel() {
  return runServer(develServer('devel', config.out.devel, true),
                   config.ports.browse);
}

function serveUiTest() {
  return runServer(develServer('devel-ui-UNUSED', config.out.test),
                   config.ports.test);
}

function serveDist() {
  return runServer(distServer('dist-local'), config.ports.browse);
}

function serveSpec() {
  return runServer(distServer('spec-local'), config.ports.test);
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

function distServer(api_token) {
  var serveStatic = require('serve-static')
  return getServer(api_token)
          // .use('/manifest.appcache', fakeManifest(2))
          // .use('/' + config.assetHash + '/misc/cached.txt', simulateDownloadError)
          .use(serveStatic(config.out.dist));
}

var toggle = false;
function simulateDownloadError(rq, rsp, next) {
  if (toggle) {
    toggle = false;
    next();
  }
  else {
    toggle = true;
    rsp.simpleBody(404, '404');
  }
}

function fakeManifest(count) {
  return request;

  function token() {
    if (count>0)
      count--;
    return count;
    // return Date.now();
  }

  function request(rq, rs) {
    var manifest = [
      'app.js',
      'vendor.js',
      'css/app.css',
      'css/vendor.css',
      'fonts/glyphicons-halflings-regular.eot',
      'fonts/glyphicons-halflings-regular.ttf',
      'fonts/glyphicons-halflings-regular.woff',
      'fonts/glyphicons-halflings-regular.woff2',
      'misc/power.ico',
      'misc/power120.png',
      'misc/power152.png',
      'misc/power57.png',
      'misc/power76.png',
    ].map(function (x) {
      return config.assetHash + '/' + x;
    }).join('\n') + '\n';

    // console.log(rq.headers);
    var version = '### ' + token() + ' ###\n';
    rs.setHeader('Content-Type', 'text/cache-manifest');
    // rs.setHeader('Cache-Control', 'public, max-age=0');
    rs.setHeader('Cache-Control', 'private, no-cache, max-age=0');
    // rs.setHeader('Expires', 'Thu, 10 Sep 2015 00:00:00 GMT');
    rs.setHeader('Expires', '0');
    // rs.setHeader('Last-Modified', 'Sat, 10 Oct 2015 09:21:45 GMT');
    rs.end('CACHE MANIFEST\n' + version + manifest + 'NETWORK:\n*\n');
    // setTimeout(next, 2000);
  }
}

function develServer(api_token, dir, reload) {
  var serveStatic = require('serve-static')
  return getServer(api_token, reload)
          .use(config.paths.vendor_prefix,
              serveStatic(config.paths.vendor_src))
          .use(serveStatic(dir))
          .use(serveStatic(config.paths.client_assets))
          .use(serveStatic(config.paths.client_src));
}

function getServer(api_token, reload) {
  var connect = require('connect')
    , morgan = require('morgan')
    , cgi = require('cgi')
    , livereload = require('connect-livereload')
    , api_cgi = cgi(config.python_cgi, {
        stderr: process.stderr,
        env: {'CARENET_ENV': api_token}
      })
    ;
  var s = connect()
            .use(morgan('dev'))
            .use('/' + config.paths.api_cgi, api_cgi);
  if (reload)
    s.use(livereload({port: config.ports.livereload}));
  return s;
}

function runUiTests() {
  return runProtractor(config.ui_test, config.ports.test);
}

function runSpecTests() {
  return runProtractor(config.spec_test, config.ports.test);
}

function runSpecTestsVagrant() {
  return runProtractor(config.spec_test, config.ports.vagrant, '/livesim');
}

function openBrowser() {
  // var path = 'form/login';
  // var path = 'view/main';
  var path = '';
  require('opn')('http://localhost:' + config.ports.browse + '/#/' + path);
}

function logChange(event) {
  var cwd = process.cwd()
    , path = event.path.replace(cwd + '/', '')
    , C = util.colors
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
    , watches = [
        config.client_js,
        config.client_css,
        config.client_templates,
        config.server_py,
        path.join(config.out.devel, config.files.initjs)
      ];

  watch(watches, onChange);
  tinylr().listen(config.ports.livereload, function(err) {
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
          // triggers change
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
  return del(config.out.dist);
}

function cleanUiTest(done) {
  return del(config.out.test);
}

function cleanDevel(done) {
  return del(config.out.devel);
}

function runProtractor(tests, port, prefix) {
  // var jar = 'node_modules/protractor/selenium/selenium-server-standalone-2.45.0.jar';
  var url = 'http://localhost:' + port + (prefix || '/');

  var browser = 'chrome',
      sleep = '';
  if (process.env.TRAVIS) {
    browser = 'firefox';
    sleep = true;
  }

  var args = ['--baseUrl', url,
              '--directConnect', 'true',
              // '--browser.ignoreSynchronization', 'true',
              '--framework', 'jasmine2',
              '--browser', browser,
              '--params.sleep', sleep,
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

function updateWebdriver(done) {
  var bin = _protractorBinary('webdriver-manager');
  var args = ['update',  '--standalone', '--chrome'];
  return runCommand(bin, args);
}

function _runProtractorBinary(name, args) {
  var bin = _protractorBinary(name);
  var opts = {
    stdio: 'inherit',
    env: process.env
  };
  return childProc.spawn(bin, args, opts)
}

function _protractorBinary(name) {
  var winExt = /^win/.test(process.platform) ? '.cmd': '';
  var prodir = require.resolve('protractor');
  if (!prodir)
    throw new Error('No protractor installation found'); 
  return path.resolve(path.join(path.dirname(prodir), '..', 'bin',
                                name + winExt));
}

function runCommand(bin, args) {
  var q = Q.defer();
  childProc.spawn(bin, args, {stdio:'inherit'})
    .on('error', function (e) {
      q.reject(e);
    })
    .on('exit', function (code) {
      if (code === 0)
        q.resolve();
      else
        q.reject(code)
    });
  return q.promise;
}

function passfail(passed) {
  var C = util.colors;
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

