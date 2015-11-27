
(function () {
'use strict';


var DEFAULT_SCREEN = '/view/main';
var LOGIN_SCREEN = '/form/login';
var CONFIG = window.CONFIG || {};


angular.module('init', ['ngRoute', 'core', 'util'])
  .controller('LoginCtrl', LoginCtrl)
  .controller('ViewCtrl', ViewCtrl)
  .config(routeConfig)
  .run(routeInit)
  ;


function ViewCtrl() {
  this.message = 'Hello';
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
      var url = App.requested_url || DEFAULT_SCREEN;
      $location.path(url).replace();
    }
    function fail(e) {
      self.form_message = e && e.message || 'Unknown error';
    }
  }
}


function routeInit($rootScope, $location) {
  $rootScope.version = CONFIG.channel + '-' + CONFIG.version;

  $rootScope.$on('$routeChangeError', function (ev, next, current, rej) {
    // istanbul ignore next ('else' not covered)
    if (rej.redirectTo)
      $location.path(rej.redirectTo).replace();
    else
      throw rej;
  });
}


function routeConfig($routeProvider) {
  $routeProvider.when(DEFAULT_SCREEN, {
    templateUrl: 'templates/main.html',
    controller: 'ViewCtrl',
    controllerAs: 'self',
    resolve: {
      '': hasSession
    }
  });

  $routeProvider.when(LOGIN_SCREEN, {
    templateUrl: 'templates/login_form.html',
    controller: 'LoginCtrl',
    controllerAs: 'self',
    resolve: {
      '': hasNoSession
    }
  });

  $routeProvider
    .when('',  {redirectTo: DEFAULT_SCREEN})
    .when('/', {redirectTo: DEFAULT_SCREEN})
    .otherwise({templateUrl: 'templates/error.html'});

  function hasSession(App, $q, $location) {
    if (!App.getSession($location.url()))
      return $q.reject({redirectTo: LOGIN_SCREEN});
  }

  function hasNoSession(App, $q, $location) {
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


angular.module('core', [])
  .service('App', AppService)
  .service('Api', ApiService)
  ;


function AppService(Api, $q) {
  var self = this;
  this.session = null;
  this.requested_url = null;

  this.authenticate = function authenticate(args) {
    return Api.call('login', args).then(function (result) {
      if (result)
        return self.session = result;
      else
        return $q.reject({message: 'Login failed'});
    });
  }

  this.getSession = function getSession(url) {
    if (url)
      this.requested_url = url;
    return this.session;
  }
}


function ApiService($http, $q) {
  this.call = callApi;
  function callApi(id, args) {
    var url = (CONFIG.api || '') + '/' + id;
    return $http.post(url, args).then(ok).catch(fail);
    function ok(rsp) {
      var data = rsp.data;
      if (data && data.result !== undefined)
        return data.result;
      else
        return $q.reject(rsp);
    }
    function fail(rsp) {
      var data = rsp.data;
      return $q.reject(data && data.error ? data.error : {'message': 'Network error'});
    }
  }

}


angular.module('util', [])
  .directive('autofocus', AutofocusDirective)
  .directive('removeOnLoad', RemoveOnLoadDirective)


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
  }
}


// END
})();
