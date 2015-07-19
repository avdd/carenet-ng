
'use strict';

function bootstrap(f) {
  var args = {
    app: 'main',
    devel: true
  };
  return function () {
    setupApp(args);
    module(args.app);
    inject(f);
  }
}

describe('Sanity', function () {
  it('should have angular', function () {
    expect(angular).toBeDefined();
  });
});

describe('Basics', function () {

  var $ctrl, $loc, $params
  function deps($controller, $location, $routeParams) {
    $ctrl = $controller;
    $loc = $location;
    $params = $routeParams;
  }

  function viewCtrl(name) {
    $params.name = name;
    return $ctrl('ViewCtrl');
  }

  beforeEach(bootstrap(deps));

  describe('Hello', function () {
    it('should say hello', function () {
      var ctrl = viewCtrl('main');
      expect(ctrl.message).toBe('Hello');
    });
  });

});

