
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
    scope.$apply();
    expect(el.html()).toEqual('');
  });
});


describe('AutofocusDirective', function () {

  beforeEach(Inject('$timeout', '$compile', '$rootScope'));
  
  it('calls focus on element', function  () {
    var scope = _.$rootScope.$new();
    var el = _.$compile('<input autofocus>')(scope);
    var focused = false
    el[0].focus = function () { focused = true; }
    _.$timeout.flush();
    expect(focused).toBe(true);
  });
});


describe('RouteConfig', function () {

  beforeEach(Inject('$location', '$rootScope', '$httpBackend',
                    '$route', 'App',
                    '$controller'));

  afterEach(function () {
    _.$httpBackend.verifyNoOutstandingExpectation();
    _.$httpBackend.verifyNoOutstandingRequest();
  })

  it('redirects to login', function () {
    _.$httpBackend.expectGET('templates/main.html').respond(200);
    _.$httpBackend.expectGET('templates/login_form.html').respond(200);
    _.$location.path('/view/main');
    _.$httpBackend.flush();
    expect(_.$location.url()).toEqual('/form/login');
    expect(_.$route.current.controller).toBe('LoginCtrl')
  });

  it('login redirects if logged in', function () {
    _.App.session = true;
    _.$httpBackend.expectGET('templates/login_form.html').respond(200);
    _.$httpBackend.expectGET('templates/main.html').respond(200);
    _.$location.path('/form/login');
    _.$httpBackend.flush();
    expect(_.$location.url()).toEqual('/view/main');
    expect(_.$route.current.controller).toBe('ViewCtrl')
  });

  it('doesn\'t redirect if logged in', function () {
    _.App.session = true;
    _.$httpBackend.expectGET('templates/main.html').respond(200);
    _.$location.path('/view/main');
    _.$httpBackend.flush();
    expect(_.$location.url()).toEqual('/view/main');
    expect(_.$route.current.controller).toBe('ViewCtrl')
  });
});


describe('LoginCtrl', function () {

  beforeEach(Inject('$controller', '$rootScope', '$q', 'App'));

  it('is submittable only with form filled', function () {
    var ctrl = _.$controller('LoginCtrl');
    expect(ctrl.submittable).toBe(false);
    ctrl.form_data = {username: '', password: ''};
    ctrl.changed();
    expect(ctrl.submittable).toBe(false);
    ctrl.form_data = {username: 'foo', password: 'bar'};
    ctrl.changed();
    expect(ctrl.submittable).toBe(true);
  });

  it('handles auth success', function () {
    spyOn(_.App, 'authenticate').and.callFake(function (args) {
      return _.$q(function (resolve, reject) {
        if (args.password === 'magoo')
          resolve({result:true});
        else
          reject({message: 'Login failed'});
      });
    });

    var ctrl = _.$controller('LoginCtrl');
    ctrl.form_data = {username: 'foo', password: 'magoo'};
    ctrl.submit();
    expect(_.App.authenticate).toHaveBeenCalled();
    _.$rootScope.$apply();
    expect(ctrl.form_message).toEqual('');
  });

  it('handles auth failure', function () {
    spyOn(_.App, 'authenticate').and.callFake(function (args) {
      return _.$q(function (resolve, reject) {
        reject({message: 'Login failed'});
      });
    });

    var ctrl = _.$controller('LoginCtrl');
    ctrl.submit();
    _.$rootScope.$apply();
    expect(ctrl.form_message).toEqual('Login failed');
  });
});


describe('App.authenticate', function () {

  beforeEach(Inject('CONFIG', 'App', '$httpBackend'));

  it('handles success', function () {
    var url = _.CONFIG.api + '/login';
    _.$httpBackend.expectPOST(url).respond({result: true});
    _.App.authenticate();
    _.$httpBackend.flush();
    expect(_.App.getSession()).toBe(true);
  });

  it('handles auth failure', function () {
    var url = _.CONFIG.api + '/login';
    _.$httpBackend.expectPOST(url).respond({error: {message: 'Login failed'}});
    _.App.authenticate();
    _.$httpBackend.flush();
    expect(_.App.getSession()).toBeFalsy();
  });

  it('handles API non-response', function () {
    var url = _.CONFIG.api + '/login';
    _.$httpBackend.expectPOST(url).respond();
    _.App.authenticate();
    _.$httpBackend.flush();
    expect(_.App.getSession()).toBeFalsy();
  });

});


describe('ViewCtrl', function () {

  beforeEach(Inject('$controller'))

  it('says hello', function () {
    var ctrl = _.$controller('ViewCtrl');
    expect(ctrl.message).toEqual('Hello');
  });
});


