
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
    for (var i=0; i<names.length; ++i) {
      var name = names[i];
      if (name[0] === '$')
        name = name.substring(1)
      _[name] = arguments[i];
    }
  }
}


describe('Test sanity', function () {

  beforeEach(Inject('$q'));

  it('has angular', function () {
    expect(angular).toBeDefined();
    expect(_.q).toBeDefined();
  });

  it('injects deps', function () {
    Inject('$log');
    expect(_.log).toBeDefined();
    expect(_.q).toBeDefined();
  });

  it('should not leak dependencies', function () {
    Inject('$http');
    expect(_.q).toBeDefined();
    expect(_.http).toBeDefined();
    expect(_.log).not.toBeDefined();
  });
});


describe('RemoveOnLoadDirective', function () {

  beforeEach(Inject('$compile', '$rootScope'));
  
  it('removes the element', function  () {
    var scope = _.rootScope.$new();
    var el = _.compile('<p><span remove-on-load> blah </span>')(scope);
    scope.$apply();
    expect(el.html()).toEqual('');
  });
});


describe('AutofocusDirective', function () {

  beforeEach(Inject('$timeout', '$compile', '$rootScope'));
  
  it('calls focus on element', function  () {
    var scope = _.rootScope.$new();
    var el = _.compile('<input autofocus>')(scope);
    var focused = false
    el[0].focus = function () { focused = true; }
    _.timeout.flush();
    expect(focused).toBe(true);
  });
});


describe('RouteConfig', function () {

  beforeEach(Inject('$location', '$rootScope', '$httpBackend', '$route'));

  afterEach(function () {
    _.httpBackend.verifyNoOutstandingExpectation();
    _.httpBackend.verifyNoOutstandingRequest();
  })

  it('redirects to login', function () {
    _.httpBackend.expectGET('templates/main.html').respond(200);
    _.httpBackend.expectGET('templates/login_form.html').respond(200);
    _.location.path('/view/main');
    _.httpBackend.flush();
    expect(_.location.url()).toEqual('/form/login');
    expect(_.route.current.controller).toBe('LoginCtrl')
  });

  it('login redirects if logged in', function () {
    Inject('App');
    _.App.session = true;
    _.httpBackend.expectGET('templates/login_form.html').respond(200);
    _.httpBackend.expectGET('templates/main.html').respond(200);
    _.location.path('/form/login');
    _.httpBackend.flush();
    expect(_.location.url()).toEqual('/view/main');
    expect(_.route.current.controller).toBe('ViewCtrl')
  });

  it('doesn\'t redirect if logged in', function () {
    Inject('App');
    _.App.session = true;
    _.httpBackend.expectGET('templates/main.html').respond(200);
    _.location.path('/view/main');
    _.httpBackend.flush();
    expect(_.location.url()).toEqual('/view/main');
    expect(_.route.current.controller).toBe('ViewCtrl')
  });
});


describe('LoginCtrl', function () {

  beforeEach(Inject('$controller', '$rootScope', '$q', 'App'));

  it('is submittable only with form filled', function () {
    var ctrl = _.controller('LoginCtrl');
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
      return _.q(function (resolve, reject) {
        resolve({result:true});
      });
    });
    var ctrl = _.controller('LoginCtrl');
    ctrl.submit();
    expect(_.App.authenticate).toHaveBeenCalled();
    _.rootScope.$apply();
    expect(ctrl.form_message).toEqual('');
  });

  it('handles auth failure with message', function () {
    spyOn(_.App, 'authenticate').and.callFake(function (args) {
      return _.q(function (resolve, reject) {
        reject({message: 'A problem'});
      });
    });
    var ctrl = _.controller('LoginCtrl');
    ctrl.submit();
    _.rootScope.$apply();
    expect(ctrl.form_message).toEqual('A problem');
  });

  it('handles auth error', function () {
    spyOn(_.App, 'authenticate').and.callFake(function (args) {
      return _.q(function (resolve, reject) {
        reject();
      });
    });
    var ctrl = _.controller('LoginCtrl');
    ctrl.submit();
    _.rootScope.$apply();
    expect(ctrl.form_message).toEqual('Unknown error');
  });

});


describe('ApiService', function () {
  beforeEach(Inject('CONFIG', 'Api', '$httpBackend'));
  afterEach(function () {
    _.httpBackend.flush();
    _.httpBackend.verifyNoOutstandingExpectation();
    _.httpBackend.verifyNoOutstandingRequest();
  });

  it('handles true result', function () {
    var url = _.CONFIG.api + '/foo';
    _.httpBackend.expectPOST(url).respond({result: true});
    _.Api.call('foo')
      .then(function (x) { expect(x).toBe(true) })
      .catch(function (e) { fail('unexpected failure') });
  });

  it('handles false result', function () {
    var url = _.CONFIG.api + '/foo';
    _.httpBackend.expectPOST(url).respond({result: false});
    _.Api.call('foo')
      .then(function (x) { expect(x).toBe(false) })
      .catch(function (e) { fail('unexpected failure') });
  });

  it('handles result object', function () {
    var url = _.CONFIG.api + '/foo';
    _.httpBackend.expectPOST(url).respond({result: {yes:'what'}});
    _.Api.call('foo')
      .then(function (x) { expect(x).toEqual({yes:'what'}) })
      .catch(function (e) { fail('unexpected failure') });
  });

  it('handles undefined result as error', function () {
    var url = _.CONFIG.api + '/foo';
    _.httpBackend.expectPOST(url).respond({});
    _.Api.call('foo')
      .then(function () { fail('expected failure') })
      .catch(function (e) { expect(e.message).toBe('Network error') });
  });

  it('handles non-response as error', function () {
    var url = _.CONFIG.api + '/foo';
    _.httpBackend.expectPOST(url).respond();
    _.Api.call('foo')
      .then(function () { fail('expected failure') })
      .catch(function (e) { expect(e.message).toBe('Network error') });
  });

  it('handles 200 error', function () {
    var url = _.CONFIG.api + '/foo';
    _.httpBackend.expectPOST(url).respond(200, {error:{message:'foo'}});
    _.Api.call('foo')
      .then(function () { fail('expected failure') })
      .catch(function (e) { expect(e.message).toBe('foo') });
  });

  it('handles non-200 error', function () {
    var url = _.CONFIG.api + '/foo';
    _.httpBackend.expectPOST(url).respond(400, {error:{message:'foo'}});
    _.Api.call('foo')
      .then(function () { fail('expected failure') })
      .catch(function (e) { expect(e.message).toBe('foo') });
  });

  it('handles malformed error', function () {
    var url = _.CONFIG.api + '/foo';
    _.httpBackend.expectPOST(url).respond(400, 'whoopsie');
    _.Api.call('foo')
      .then(function () { fail('expected failure') })
      .catch(function (e) { expect(e.message).toBe('Network error') });
  });

  it('handles undefined error', function () {
    var url = _.CONFIG.api + '/foo';
    _.httpBackend.expectPOST(url).respond(400);
    _.Api.call('foo')
      .then(function () { fail('expected failure') })
      .catch(function (e) { expect(e.message).toBe('Network error') });
  });
});

describe('App.authenticate', function () {

  beforeEach(Inject('App', 'Api', '$q', '$rootScope'));

  it('handles success', function () {
    spyOn(_.Api, 'call').and.callFake(function (url, args) {
      return _.q(function (resolve, reject) {
        resolve(true);
      });
    });
    _.App.authenticate()
      .then(function (s) { expect(s).toBeTruthy() })
      .catch(function (e) { fail('Unexpected failure') });
    _.rootScope.$apply();
    expect(_.App.getSession()).toBe(true);
  });

  it('handles auth failure', function () {
    spyOn(_.Api, 'call').and.callFake(function (url, args) {
      return _.q(function (resolve, reject) {
        resolve(false);
      });
    });
    _.App.authenticate()
      .then(function (s) { fail('Expected failure') })
      .catch(function (e) { expect(e.message).toBe('Login failed') });
    _.rootScope.$apply();
    expect(_.App.getSession()).toBeFalsy();
  });

  it('handles auth error', function () {
    spyOn(_.Api, 'call').and.callFake(function (url, args) {
      return _.q(function (resolve, reject) {
        reject({message: 'poop'});
      });
    });
    _.App.authenticate()
      .then(function (s) { fail('Expected failure') })
      .catch(function (e) { expect(e.message).toBe('poop') });
    _.rootScope.$apply();
    expect(_.App.getSession()).toBeFalsy();
  });

});


describe('ViewCtrl', function () {

  beforeEach(Inject('$controller'))

  it('says hello', function () {
    var ctrl = _.controller('ViewCtrl');
    expect(ctrl.message).toEqual('Hello');
  });
});


