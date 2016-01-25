
(function () {
'use strict';


var CONFIG = window.CONFIG || {};
var DEFAULT_SCREEN = '/view/main';


angular.module('init', ['routing', 'registration', 'util']);


angular.module('routing', ['ngRoute'])
  .controller('FormCtrl', FormCtrl)
  .controller('ViewCtrl', ViewCtrl)
  .controller('ErrorCtrl', ErrorCtrl)
  .config(routeConfig)
  .run(routeInit)
  ;

function routeConfig($routeProvider) {

  var viewRoute = {
    templateUrl: getViewTemplate,
    controller: 'ViewCtrl',
    controllerAs: 'self',
    resolve: {
      session: getSession,
      query: getQuery
    }
  };

  $routeProvider.when('/view/:name', viewRoute);
  $routeProvider.when('/view/:name/:args*', viewRoute);

  $routeProvider.when('/form/:name', {
    templateUrl: getFormTemplate,
    controller: 'FormCtrl',
    controllerAs: 'self',
    resolve: {
      command: getCommand
    }
  });

  $routeProvider
    .when('',  {redirectTo: DEFAULT_SCREEN})
    .when('/', {redirectTo: DEFAULT_SCREEN})
    .when('/error', {
      templateUrl: 'templates/error.html',
      controller: 'ErrorCtrl',
      controllerAs: 'self',
    })
    .otherwise({redirectTo: '/error'});

  function getSession(App, $q, $location) {
    "ngInject"
    return App.getSession()
      .then(function (s) {
        App.loaded = true;
        return s;
        // TODO: check session?
      })
      .catch(function (e) {
        var cmd = App.initCommand('login', $location.url());
        return $q.reject({url: cmd.start});
      })
  }

  function getQuery(App, $route, $q) {
    "ngInject"
    var params = $route.current.params
    var args = (params.args || '').split('/');
    args.unshift(params.name);
    return App.getQuery.apply(null, args);
  }

  function getCommand(App, $q, $route) {
    "ngInject"
    var params = $route.current.params
    var cmd = App.getCurrent();
    if (!cmd || params.name != cmd.command_name)
      return $q.reject({message: 'invalid form invocation'});
    return cmd;
  }

  function getFormTemplate(params) {
    return 'templates/form/' + params.name + '.html';
  }

  function getViewTemplate(params) {
    return 'templates/view/' + params.name + '.html';
  }

}


function routeInit($rootScope, $location, $log) {
  $rootScope.version = CONFIG.channel + '-' + CONFIG.version;

  $rootScope.$on('$routeChangeError', function (ev, next, current, rej) {
    $log.log('route error:', (rej.message || rej));
    if (rej && rej.url)
      $location.path(rej.url).replace();
    else
      $location.path('error').replace();
  });
}


function ErrorCtrl(App, $location, $window) {
  this.label = 'Go ' + (App.loaded ? 'back' : 'home');
  this.go = function() {
    if (App.loaded)
      $window.history.go(-1);
    else
      $location.path(DEFAULT_SCREEN).replace();
  }
}


function ViewCtrl(query, $routeParams, $location) {
  var self = this;
  self.query = query;

  self.initCommand = function () {
    var cmd = query.app.initCommand.apply(null, arguments);
    $location.path(cmd.start);
  }

}


function FormCtrl(command, $routeParams, $location, $q) {
  var self = this;
  self.command = command;
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
    self.form.submittable = self.command.isValid(self.form.data);
  }

  this.submit = function () {
    self.form.message = '';
    $q.when(self.command.next(self.form.data))
      .then(function ok(state) {
        self.go(state)
      })
      .catch(function fail(e) {
        self.form.message = e && e.message || 'Unknown error';
      });
  }
}




angular.module('core', ['pouchdb'])
  .service('App', AppService)
  .service('Api', ApiService)
  .factory('Data', DataService)
  .factory('Id', IdService)
  ;

function AppService(Api, Data, $q, $log) {
  var App = this;
  var _queries = {};
  var _commands = {};
  var _current = null;

  App.log = $log;

  App.registerQuery = function registerQuery(name, f) {
    if (_queries[name])
      throw new Error('query `' + name + '` already defined');
    _queries[name] = f;
  }

  App.registerCommand = function registerCommand(name, f) {
    if (_commands[name])
      throw new Error('command `' + name + '` already defined');
    _commands[name] = f;
  }

  App.getQuery = function getQuery(name, args) {
    App.deinitCommand();
    var Cls = _queries[name],
        args = Array.prototype.slice.call(arguments);
    // `new` with dynamic args: http://stackoverflow.com/a/8843181/297361
    var q = new (Function.prototype.bind.apply(Cls, args));
    q.app = App;
    if (q.promise)
      return q.promise.then(function (discarded) {
        delete q.promise;
        return q;
      });
    else
      return $q.resolve(q);
  }

  App.initCommand = function initCommand(name) {
    var Cls = _commands[name],
        args = Array.prototype.slice.call(arguments);
    // `new` with dynamic args: http://stackoverflow.com/a/8843181/297361
    _current = new (Function.prototype.bind.apply(Cls, args));
    _current.command_name = name;
    return _current;
  }

  App.deinitCommand = function deinitCommand() {
    _current = null;
  }

  App.getCurrent = function getCurrent() {
    return _current;
  }

  App.authenticate = function authenticate(args) {
    return Api.call('login', args).then(function (result) {
      if (result)
        return Data.put({_id: '_local/session', result: result});
      else
        return $q.reject({message: 'Login failed'});
    });
  }

  App.getSession = function getSession() {
    return Data.get('_local/session');
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
      return $q.reject(data && data.error
                        ? data.error
                        : {'message': 'Network error'});
    }
  }

}


// istanbul ignore next
function DataService(pouchDB) {
  return pouchDB('carenet');
}


// istanbul ignore next
function IdService() {
  return next;
  function next() {
    return Date.now();
  }
}


angular.module('registration', ['core'])
  .run(registration);

function registration(App, Data, Id, $rootScope, $log) {

  App.registerCommand('login', function (url) {
    this.start = 'form/login';
    this.isValid = function (data) {
      return !!(data.username && data.password)
    }
    this.next = function (data) {
      return App.authenticate(data).then(function ok(s) {
        return url;
      });
    }
  })

  App.registerQuery('main', function () {
    this.message = 'Hello';
  })

  App.registerQuery('list-records', function () {
    var self = this;
    self.records = [];
    self.promise =
      Data.allDocs({include_docs:true})
        .then(function (rsp) {
          if (rsp.total_rows)
            self.records = rsp.rows;
        });
  })

  App.registerCommand('new-record', function () {
    this.start = 'form/new-record';
    this.isValid = function (data) {
      var age = parseInt(data.age);
      return data.name && age > 0 && age < 150;
    }
    this.next = function (data) {
      data._id = 'ptr:' + Id();
      return Data.put(data)
        .then(function (rec) {
            return 'view/record/' + data._id;
        })
    }
  })

  App.registerQuery('record', function (id) {
    var self = this;
    console.log(id);
    self.id = id;
    self.promise =
      Data.get(id)
        .then(function (rec) {
          self.record = rec;
        })
  })
}




angular.module('util', [])
  .directive('autofocus', AutofocusDirective)
  .directive('removeOnLoad', RemoveOnLoadDirective)
  ;

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
