
'use strict';

var _;

window.CONFIG = {
  devel: true,
  channel: 'testing',
  api: 'api',
  deps: ['ngRoute']
}

beforeEach(Init);

function Init() {
  module(window.CONFIG.app);
  _ = {};
}

function Inject() {

  var names = Array.prototype.slice.call(arguments);
  return inject(names.concat([receiveDeps]));

  function receiveDeps() {
    for (var i=0; i<names.length; ++i)
      _[names[i]] = arguments[i];
  }
}


describe('Test sanity', function () {

  beforeEach(Inject('$q'));

  it('has angular', function () {
    expect(angular).toBeDefined();
    expect(_.$q).toBeDefined();
  });

  it('injects deps', function () {
    Inject('$log');
    expect(_.$log).toBeDefined();
    expect(_.$q).toBeDefined();
  });

  it('should not leak dependencies', function () {
    Inject('$http');
    expect(_.$http).toBeDefined();
    expect(_.$q).toBeDefined();
    expect(_.$log).not.toBeDefined();
  });
});


describe('RemoveOnLoadDirective', function () {

  beforeEach(Inject('$compile', '$rootScope'));
  
  it('removes the element', function  () {
    var scope = _.$rootScope.$new();
    var el = _.$compile('<p><span remove-on-load> blah </span>')(scope);
    scope.$digest();
    expect(el.html()).toEqual('');
  });

});


describe('Routes', function () {

  beforeEach(Inject('$location', '$route', '$rootScope', '$httpBackend'));
  afterEach(function () {
    _.$httpBackend.verifyNoOutstandingExpectation();
    _.$httpBackend.verifyNoOutstandingRequest();
  })

  it('loads login view', function() {
    _.$location.path('/form/login')
    _.$httpBackend.expectGET('templates/login_form.html').respond(200);
    _.$rootScope.$digest();
    _.$httpBackend.flush();
    expect(_.$route.current.controller).toBe('LoginCtrl')
  });

  it('loads main view', function() {
    _.$location.path('/view/main')
    _.$httpBackend.expectGET('templates/main.html').respond(200);
    _.$rootScope.$digest();
    _.$httpBackend.flush();
    expect(_.$route.current.controller).toBe('ViewCtrl')
  });
});


describe('LoginCtrl', function () {

  beforeEach(Inject('$controller', '$httpBackend'))
  afterEach(function () {
    _.$httpBackend.verifyNoOutstandingExpectation();
    _.$httpBackend.verifyNoOutstandingRequest();
  })

  it('calls API via http', function () {
    var ctrl = _.$controller('LoginCtrl');
    _.$httpBackend.expectPOST('api/login').respond(200);
    ctrl.submit();
    _.$httpBackend.flush();
  });

  it('handles auth failure', function () {
    var ctrl = _.$controller('LoginCtrl');
    var rsp = {result: false, message: 'Login failed'};
    _.$httpBackend.expectPOST('api/login').respond(200, rsp);
    ctrl.submit();
    _.$httpBackend.flush();
    expect(ctrl.logged_in).toBe(false);
    expect(ctrl.form_message).toContain('Login failed');
  });

  it('handles auth success', function () {
    var ctrl = _.$controller('LoginCtrl');
    var rsp = {result: true};
    _.$httpBackend.expectPOST('api/login').respond(200, rsp);
    ctrl.submit();
    _.$httpBackend.flush();
    expect(ctrl.logged_in).toBe(true);
    expect(ctrl.form_message).toEqual('');
  });

});


describe('ViewCtrl', function () {

  // beforeEach(Inject('App', '$controller', '$routeParams', '$interval'));
  beforeEach(Inject('$controller'))

  it('says hello', function () {
    var ctrl = _.$controller('ViewCtrl');
    expect(ctrl.message).toEqual('Hello');
  });

});

