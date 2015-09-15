
window.CONFIG = window.CONFIG || {channel:'devel'};
window.CONFIG.app = 'default';
window.CONFIG.devel = window.CONFIG.channel == 'devel';


(function () {
'use strict';

var DEFAULT_SCREEN = '/view/main';
var LOGIN_FORM = '/form/login';

var DUMMY = {
  username: 'test',
  password: 'test'
};

/* istanbul ignore next (no coverage) */
function validate(cred) {
  return (cred.username === DUMMY.username
          && cred.password === DUMMY.password);
}

var deps = [
  'ngRoute'
];

/* istanbul ignore next (no coverage) */
if (!window.CONFIG.devel)
  deps.push('templates');

angular.module(window.CONFIG.app, deps)
  .directive('disappear', DisappearDirective)
  .controller('ViewCtrl', ViewCtrl)
  .controller('LoginCtrl', LoginCtrl)
  .controller('RootCtrl', RootCtrl)
  .factory('App', AppService)
  .factory('Session', SessionService)
  .factory('Data', DataService)
  .config(appConfig)
  .run(appRun)
  ;

function DataService($window) {
  var LF = $window.localforage;
  return LF;
}

function SessionService($q, Data) {
  var service = {
    get: getSession,
    login: login,
    logout: logout
  };

  return service;

/* istanbul ignore next (no coverage) */
  function getSession() {
    return $q(function (resolve, reject) {
      Data.getItem('session').then(ok, fail);
      function ok(item) {
        if (item)
          resolve(item);
        else
          fail('No session');
      }
      function fail(e) {
        reject(e)
      }
    });
  }

/* istanbul ignore next (no coverage) */
  function login(credentials) {
    return $q(function (resolve, reject) {
      authenticate().then(resolve, reject);
    });
    function authenticate() {
      return $q(function (resolve, reject) {
        if (validate(credentials)) {
          var s = {loggedIn: true, ts: Date.now()};
          Data.setItem('session', s, function () {
            resolve(s);
          });
        }
        else
          reject('Invalid credentials');
      });
    }
  }

/* istanbul ignore next (no coverage) */
  function logout() {
    return $q(function (resolve, reject) {
      Data.removeItem('session', function () {
        resolve();
      });
    });
  }
}

function AppService($window, $interval, $timeout, $rootScope,
                   Session) {

  var app = {
    modal: false,
    start: start,
    version: $window.CONFIG.version,
    channel: $window.CONFIG.channel,
    login: Session.login,
    logout: logout,
    $on: listen,
    $emit: trigger
  };

  return app;

/* istanbul ignore next (no coverage) */
  function logout() {
    app.session = null;
    return Session.logout();
  }

  function listen() {
    $rootScope.$on.apply($rootScope, arguments)
  }

  function trigger() {
    $rootScope.$emit.apply($rootScope, arguments)
  }

  function start() {
    $interval(checkOnline, 10, 1);
    // $timeout(checkOnline, 500);
    // checkOnline();
  }

  function checkOnline() {
    app.$emit('online');
    // $interval(checkOnline, 2000, 1);
    // $timeout(checkOnline, 2500);
  }

}

function appRun(App) {
  App.start();
}

function appConfig($routeProvider) {

  var viewRoute = {
    templateUrl: getViewTemplate,
    resolve: {'validSession': validSession},
    controller: 'ViewCtrl',
    controllerAs: 'self'
  };

  var loginRoute = {
    templateUrl: 'templates/login_form.html',
    controller: 'LoginCtrl',
    controllerAs: 'self'
  };

  $routeProvider
    .when('',  {redirectTo: DEFAULT_SCREEN})
    .when('/', {redirectTo: DEFAULT_SCREEN})

  $routeProvider.when('/view/:name', viewRoute);
  $routeProvider.when('/view/:name/:arg*', viewRoute)
  $routeProvider.when('/form/login', loginRoute);

/* istanbul ignore next (no coverage) */
  /*@ngInject*/
  function validSession($q, $location, App, Session) {
    if (App.session)
      return App.session;
    return Session.get().then(ok, fail);
    function ok(s) {
      App.session = s;
    }
    function fail(er) {
      App.requested_url = $location.url();
      $location.path(LOGIN_FORM).replace();
      return $q.reject(er);
    };
  }

}

/* istanbul ignore next (no coverage) */
function getViewTemplate(params) {
  return 'templates/' + params.name + '.html';
}

/* istanbul ignore next (no coverage) */
function DisappearDirective() {
  return {
    link: function ($scope, el) {
      el.remove();
    }
  }
}

/* istanbul ignore next (no coverage) */
function RootCtrl(App, $location) {
  this.version = App.version;
  this.connectionStatus = 'UNKNOWN';
  this.logout = logout;
  var self = this,
      bodyClass = this.bodyClass = {
        devel:    false,
        staging:  false,
        live:     false,
        online:   false,
        offline:  false,
        modal:    false
      };

  bodyClass[App.channel] = true;
  App.$on('online', onOnline);
  App.$on('offline', onOffline);
  App.$on('view', onView);

  function onOnline(e) {
    bodyClass.offline = false;
    bodyClass.online = true;
    self.connectionStatus = 'ONLINE';
  }

  function onOffline(e) {
    bodyClass.offline = true;
    bodyClass.online = false;
    self.connectionStatus = 'OFFLINE';
  }

  function onView(e, ctrl) {
    bodyClass.modal = ctrl.modal;
  }

  function logout() {
    App.logout().then(logoutOk, logoutFail);
    return false;
    function logoutOk() {
      $location.path(LOGIN_FORM).replace();
    }
    function logoutFail() {
    }
  }
}


function ViewCtrl(App) {
  this.modal = false;
  this.message = 'Hello';
  App.$emit('view', this);
}

/* istanbul ignore next (no coverage) */
function LoginCtrl(App, $location, $timeout) {
  var self = this;
  var data = this.form_data = {};
  this.modal = true;
  App.$emit('view', this);
  this.form_break = 'md';
  this.changed = changed;
  this.submit = submit;
  if (window.CONFIG.devel) {
    data.username = DUMMY.username;
    data.password = DUMMY.password;
    this.submittable = true;
  }

  function changed() {
    self.submittable = !!data.username && !!data.password;
    if (self.form_message)
      $timeout(function () {
        self.form_message = '';
      }, 1000);
  }

  function submit() {
    App.login(data).then(loginOk, loginFail);
  };

  function loginOk(session) {
    var url = App.requested_url || DEFAULT_SCREEN;
    $location.path(url).replace();
    App.requested_url = null;
  }

  function loginFail(e) {
    self.form_message = 'Failed: ' + e;
  }
}

// END
})();
