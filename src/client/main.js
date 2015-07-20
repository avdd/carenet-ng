
window.CONFIG = window.CONFIG || {devel:true};
window.CONFIG.app = 'default';

(function () {
'use strict';

var deps = [
  'ngRoute',
  'aModule',
  'zModule'
];

/* istanbul ignore next (no coverage) */
if (!window.CONFIG.devel)
  deps.push('templates');

angular.module(window.CONFIG.app, deps)
  .controller('ViewCtrl', ViewCtrl)
  .directive('zzRemove',
/* istanbul ignore next (no coverage) */
             function () {
    // console.log('main::zzRemove');
    return {
      link: function removeOnLoadLink($scope, el) {
        el.remove();
      }
    }
  })
  .config(viewConfig)
  ;

function viewConfig($routeProvider) {

  // console.log('main::config()');

  var viewRoute = {
    templateUrl: getViewTemplate,
    controller: 'ViewCtrl',
    controllerAs: 'self'
  };

  var DEFAULT_SCREEN = '/view/main';

  $routeProvider
    .when('',  {redirectTo: DEFAULT_SCREEN})
    .when('/', {redirectTo: DEFAULT_SCREEN})

  $routeProvider.when('/view/:name', viewRoute);
  $routeProvider.when('/view/:name/:arg*', viewRoute)
}

/* istanbul ignore next (no coverage) */
function getViewTemplate(params) {
  return 'templates/' + params.name + '.html';
}

function ViewCtrl($routeParams, $location, $window) {
  // log('ViewCtrl()');
  // $window.document.body.className = '';
  this.message = 'Hello';
}

// END
})();
