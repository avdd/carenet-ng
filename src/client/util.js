
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




