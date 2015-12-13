
(function () {
'use strict';


var CONFIG = window.CONFIG || {};


angular.module('init', ['ngRoute', 'core', 'util'])
  .controller('FormCtrl', FormCtrl)
  .controller('ViewCtrl', ViewCtrl)
  .config(routeConfig)
  .run(routeInit)
  ;




function routeConfig($routeProvider) {
  $routeProvider.when('/view/:name', {
    templateUrl: getViewTemplate,
    controller: 'ViewCtrl',
    controllerAs: 'self',
    resolve: {
      '': allowView
    }
  });

  $routeProvider.when('/form/:name', {
    templateUrl: getFormTemplate,
    controller: 'FormCtrl',
    controllerAs: 'self',
    resolve: {
      '': allowForm
    }
  });

  var DEFAULT_SCREEN = '/view/main';
  $routeProvider
    .when('',  {redirectTo: DEFAULT_SCREEN})
    .when('/', {redirectTo: DEFAULT_SCREEN})
    .when('/error', {templateUrl: 'templates/error.html'})
    .otherwise({redirectTo: '/error'});

  function allowView(App, $q, $location) {
    if (!App.getSession($location.url()))
      return $q.reject({command: 'login'});
  }

  function allowForm(App, $q, $route) {
    var params = $route.current.params
    var cmd = App.getCurrent();
    if (!cmd || params.name != cmd.command_name)
      return $q.reject({view: 'main'});
  }

  function getFormTemplate(params) {
    return 'templates/form/' + params.name + '.html';
  }

  function getViewTemplate(params) {
    return 'templates/view/' + params.name + '.html';
  }

}


function routeInit(App, $rootScope, $location) {
  $rootScope.version = CONFIG.channel + '-' + CONFIG.version;

  $rootScope.$on('$routeChangeError', function (ev, next, current, rej) {
    var view;
    // istanbul ignore next (else not covered)
    if (rej.command)
      view = App.initCommand(rej.command).start;
    else if (rej.view)
      view = 'view/' + rej.view
    else
      view = 'error';
    $location.path(view).replace();
  });

  App.registerQuery('main', function () {
    this.message = 'Hello';
  })

  App.registerCommand('login', function () {
    this.start = 'form/login';
    this.isValid = function (data) {
      return !!(data.username && data.password)
    }
    this.next = function (data) {
      return App.authenticate(data).then(function ok() {
        return App.requested_url;
      });
    }
  })
}


function ViewCtrl(App, $routeParams, $location) {
  this.query = App.getQuery($routeParams.name);
}


function FormCtrl(App, $routeParams, $location, $q) {
  var self = this;
  this.command = App.getCurrent();
  this.form = {
    break_code: 'sm',
    message: null,
    data: {},
    submittable: false
  }

  this.go = function(path) {
    $location.path(path).replace();
  }

  this.changed = function changed() {
    if (self.command.isValid(self.form.data))
      self.form.submittable = true;
  }

  this.submit = function () {
    self.form.message = '';
    $q.when(this.command.next(this.form.data)).then(ok).catch(fail);
    function ok(state) {
      self.go(state)
    }
    function fail(e) {
      self.form.message = e && e.message || 'Unknown error';
    }
  }
}



angular.module('core', [])
  .service('App', AppService)
  .service('Api', ApiService)
  ;




function AppService(Api, $q) {
  var self = this;
  this.session = null;
  this.requested_url = null;

  var _queries = {};
  var _commands = {};
  var _current = null;

  this.registerQuery = function registerQuery(name, f) {
    if (_queries[name])
      throw new Error('query `' + name + '` already defined');
    _queries[name] = f;
  }

  var commandProto = {
    isValid: function isValid(data) {
      return true;
    },
  }

  this.registerCommand = function registerCommand(name, f) {
    if (_commands[name])
      throw new Error('command `' + name + '` already defined');
    f.prototype = commandProto;
    _commands[name] = f;
  }

  this.getQuery = function getQuery(name) {
    return new _queries[name];
  }

  this.initCommand = function initCommand(name) {
    _current = new _commands[name];
    _current.command_name = name;
    return _current;
  }

  this.getCurrent = function getCurrent() {
    return _current;
  }

  /*
  this.deinitCommand = function deinitCommand() {
    _current = null;
  }
  */

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
