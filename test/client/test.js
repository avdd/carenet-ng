
'use strict';

var $;

beforeEach(Init);

function Init() {
  module(window.CONFIG.app);
  $ = {};
}

function Inject() {

  var names = Array.prototype.slice.call(arguments);
  return init;

  function init() {
    inject(names.concat([receiveDeps]));
  }

  function receiveDeps() {
    for (var i=0; i<names.length; ++i)
      $[names[i]] = arguments[i];
  }
}

describe('Sanity', function () {
  it('should have angular', function () {
    expect(angular).toBeDefined();
    expect($.App).not.toBeDefined();
  });
});

describe('Basics', function () {

  beforeEach(Inject('App', '$controller', '$routeParams', '$interval'));

  function viewCtrl(name) {
    $.$routeParams.name = name;
    return $.$controller('ViewCtrl');
  }

  describe('App', function () {
    it('sends online event', function () {
      var count = 0;
      $.App.$on('online', function (e) {
        count++;
      });
      expect(count).toBe(0);
      $.$interval.flush(1000);
      expect(count).toBe(1);
    });

    it('should say hello', function () {
      var ctrl = viewCtrl('main');
      expect(ctrl.message).toBe('Hello');
    });

  });
});

describe('Other', function () {

  beforeEach(Inject('App'));

  it('should not leak dependencies', function () {
    expect(angular).toBeDefined();
    expect($.App).toBeDefined();
    expect($.$interval).not.toBeDefined();
  });

});
