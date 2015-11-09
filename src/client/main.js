
window.CONFIG.app = 'default';

(function () {
'use strict';

var DEFAULT_SCREEN = '/view/main';
var LOGIN_SCREEN = '/form/login';

angular.module(window.CONFIG.app, window.CONFIG.deps)
  .constant('CONFIG', window.CONFIG)
  .service('App', AppService)
  .controller('LoginCtrl', LoginCtrl)
  .controller('ViewCtrl', ViewCtrl)
  .directive('autofocus', AutofocusDirective)
  .directive('removeOnLoad', RemoveOnLoadDirective)
  .config(appConfig)
  .run(appRun)
  ;


function appRun(CONFIG, $rootScope, $window, $location) {
  $rootScope.version = CONFIG.channel + '-' + CONFIG.version;

  $rootScope.$on('$routeChangeError', function (ev, next, current, rej) {
    // istanbul ignore next ('else' not covered)
    if (rej.redirectTo)
      $location.path(rej.redirectTo).replace();
    else
      throw rej;
  });
}

function appConfig($routeProvider) {
  $routeProvider.when(DEFAULT_SCREEN, {
    templateUrl: 'templates/main.html',
    controller: 'ViewCtrl',
    controllerAs: 'self',
    resolve: {
      session: resolveSession
    }
  });

  $routeProvider.when(LOGIN_SCREEN, {
    templateUrl: 'templates/login_form.html',
    controller: 'LoginCtrl',
    controllerAs: 'self',
    resolve: {
      session: resolveNoSession
    }
  });

  $routeProvider
    .when('',  {redirectTo: DEFAULT_SCREEN})
    .when('/', {redirectTo: DEFAULT_SCREEN})
    .otherwise({templateUrl: 'templates/error.html'});

  function resolveSession(App, $q, $location) {
    var s = App.getSession($location.url());
    if (s)
      return s;
    else
      return $q.reject({redirectTo: LOGIN_SCREEN});
  }

  function resolveNoSession(App, $q, $location) {
    if (App.getSession())
      return $q.reject({redirectTo: DEFAULT_SCREEN});
  }

/*
  $routeProvider.when('/view/:name', {
    templateUrl: getViewTemplate,
    controller: 'ViewCtrl',
    controllerAs: 'self'
  });

  function getViewTemplate(params) {
    return 'templates/' + params.name + '.html';
  }
*/

}

function AppService(CONFIG, $http, $q) {
  var self = this;
  this.session = null;
  this.requested_url = DEFAULT_SCREEN;

  this.authenticate = function authenticate(args) {
    var url = CONFIG.api + '/login';
    return $http.post(url, args).then(ok)
    function ok(rsp) {
      var data = rsp.data,
          error = data && data.error;
      if (data && data.result)
        return self.session = data.result;
      return $q.reject(error || new Error('unknown error'));
    }
  }

  this.getSession = function getSession(url) {
    if (url)
      this.requested_url = url;
    return this.session;
  }
}


function LoginCtrl(App, $location) {
  var self = this;
  this.form_break = 'sm';
  this.logged_in = false;
  this.form_message = null;
  this.form_data = {};
  this.submittable = false
  this.changed = function changed() {
    var f = self.form_data;
    if (f.username && f.password)
      self.submittable = true;
  }
  this.submit = function () {
    self.form_message = '';
    App.authenticate(self.form_data).then(ok).catch(fail);
    function ok(session) {
      $location.path(App.requested_url).replace();
    }
    function fail(e) {
      self.form_message = e.message;
    }
  }
}


function ViewCtrl() {
  this.message = 'Hello';
}




function RemoveOnLoadDirective() {
  return {
    link: function ($scope, el) {
      el.remove();
    }
  }
}


function AutofocusDirective($timeout) {
  return {
    restrict: 'A',
    link: function ($scope, el) {
      $timeout(function () {
        el[0].focus();
      });
    }
  };
}


// END
})();
