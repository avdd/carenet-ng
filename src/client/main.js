
window.CONFIG.app = 'default';

(function () {
'use strict';

angular.module(window.CONFIG.app, window.CONFIG.deps)
  .controller('LoginCtrl', LoginCtrl)
  .controller('ViewCtrl', ViewCtrl)
  .directive('removeOnLoad', RemoveOnLoadDirective)
  .directive('autofocus', AutofocusDirective)
  .config(appConfig)
  .run(appRun)
  ;


function appRun($rootScope, $http) {
  $rootScope.version = window.CONFIG.channel + '-' + window.CONFIG.version;
  // var url = window.CONFIG.api + '/ping';
  // $http.get(url)
  // istanbul ignore next
  window.CONFIG.onappcacheupdate = function () {
    timelog('Psst ... the app was updated; should refresh!');
  }
}

function appConfig($routeProvider) {

  $routeProvider.when('/form/login', {
    templateUrl: 'templates/login_form.html',
    controller: 'LoginCtrl',
    controllerAs: 'self'
  });

  $routeProvider.when('/view/:name', {
    templateUrl: getViewTemplate,
    controller: 'ViewCtrl',
    controllerAs: 'self'
  });

  function getViewTemplate(params) {
    return 'templates/' + params.name + '.html';
  }
}


function LoginCtrl($location, $http) {
  var self = this;
  this.form_break = 'sm';
  this.form_data = {}
  this.submittable = false
  this.logged_in = false;
  this.form_message = '';

  this.changed = function changed() {
    var f = self.form_data;
    if (f.username && f.password)
      self.submittable = true;
  }

  this.submit = function Submit() {
    self.form_message = '';
    var url = window.CONFIG.api + '/login';
    $http.post(url, this.form_data).then(ok, fail);
    function ok(rsp) {
      self.logged_in = rsp.data && rsp.data.result || false;
      if (self.logged_in)
        $location.path('/view/main').replace();
      else
        fail(rsp)
    }
    function fail(rsp) {
      self.form_message = rsp.data && rsp.data.message || 'Unknown error';
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
