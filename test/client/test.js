
'use strict';

var _;

beforeEach(function () {
  _ = {};
});


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


describe('util', function () {

  beforeEach(module('util'));

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
});


describe('core', function () {

  beforeEach(module('core'));

  describe('ApiService', function () {

    beforeEach(Inject('Api', '$httpBackend'));
    afterEach(function () {
      _.httpBackend.flush();
      _.httpBackend.verifyNoOutstandingExpectation();
      _.httpBackend.verifyNoOutstandingRequest();
    });

    it('handles true result', function () {
      _.httpBackend.expectPOST('/foo').respond({result: true});
      _.Api.call('foo')
        .then(function (x) { expect(x).toBe(true) })
        .catch(function (e) { fail('unexpected failure') });
    });

    it('handles false result', function () {
      _.httpBackend.expectPOST('/foo').respond({result: false});
      _.Api.call('foo')
        .then(function (x) { expect(x).toBe(false) })
        .catch(function (e) { fail('unexpected failure') });
    });

    it('handles result object', function () {
      _.httpBackend.expectPOST('/foo').respond({result: {yes:'what'}});
      _.Api.call('foo')
        .then(function (x) { expect(x).toEqual({yes:'what'}) })
        .catch(function (e) { fail('unexpected failure') });
    });

    it('handles undefined result as error', function () {
      _.httpBackend.expectPOST('/foo').respond({});
      _.Api.call('foo')
        .then(function () { fail('expected failure') })
        .catch(function (e) { expect(e.message).toBe('Network error') });
    });

    it('handles non-response as error', function () {
      _.httpBackend.expectPOST('/foo').respond();
      _.Api.call('foo')
        .then(function () { fail('expected failure') })
        .catch(function (e) { expect(e.message).toBe('Network error') });
    });

    it('handles 200 error', function () {
      _.httpBackend.expectPOST('/foo').respond(200, {error:{message:'foo'}});
      _.Api.call('foo')
        .then(function () { fail('expected failure') })
        .catch(function (e) { expect(e.message).toBe('foo') });
    });

    it('handles non-200 error', function () {
      _.httpBackend.expectPOST('/foo').respond(400, {error:{message:'foo'}});
      _.Api.call('foo')
        .then(function () { fail('expected failure') })
        .catch(function (e) { expect(e.message).toBe('foo') });
    });

    it('handles malformed error', function () {
      _.httpBackend.expectPOST('/foo').respond(400, 'whoopsie');
      _.Api.call('foo')
        .then(function () { fail('expected failure') })
        .catch(function (e) { expect(e.message).toBe('Network error') });
    });

    it('handles undefined error', function () {
      _.httpBackend.expectPOST('/foo').respond(400);
      _.Api.call('foo')
        .then(function () { fail('expected failure') })
        .catch(function (e) { expect(e.message).toBe('Network error') });
    });
  });


  describe('App.authenticate', function () {

    beforeEach(Inject('App', 'Api', '$q', '$rootScope'));

    it('handles success', function () {
      spyOn(_.Api, 'call').and.callFake(function (url, args) {
        return _.q.resolve(true);
      });
      _.App.authenticate()
        .then(function (s) { expect(s).toBeTruthy() })
        .catch(function (e) { fail('Unexpected failure') });
      _.rootScope.$apply();
      expect(_.App.getSession()).toBe(true);
    });

    it('handles auth failure', function () {
      spyOn(_.Api, 'call').and.callFake(function (url, args) {
        return _.q.resolve(false);
      });
      _.App.authenticate()
        .then(function (s) { fail('Expected failure') })
        .catch(function (e) { expect(e.message).toBe('Login failed') });
      _.rootScope.$apply();
      expect(_.App.getSession()).toBeFalsy();
    });

    it('handles auth error', function () {
      spyOn(_.Api, 'call').and.callFake(function (url, args) {
        return _.q.reject({message: 'poop'});
      });
      _.App.authenticate()
        .then(function (s) { fail('Expected failure') })
        .catch(function (e) { expect(e.message).toBe('poop') });
      _.rootScope.$apply();
      expect(_.App.getSession()).toBeFalsy();
    });
  });
});


describe('init', function () {

  beforeEach(module('init'));

  describe('RouteConfig', function () {

    beforeEach(Inject('App', '$location', '$rootScope', '$httpBackend', '$route'));

    afterEach(function () {
      _.httpBackend.verifyNoOutstandingExpectation();
      _.httpBackend.verifyNoOutstandingRequest();
    })

    afterEach(function () {
      // _.App.deinitCommand();
    });

    it('redirects to login', function () {
      _.httpBackend.expectGET('templates/view/main.html').respond(200);
      _.httpBackend.expectGET('templates/form/login.html').respond(200);
      _.location.path('/view/main');
      _.httpBackend.flush();
      expect(_.location.url()).toEqual('/form/login');
    });

    /*
    xit('login redirects if logged in', function () {
      Inject('App');
      _.App.session = true;
      _.App.initCommand('login');
      _.httpBackend.expectGET('templates/form/login.html').respond(200);
      _.httpBackend.expectGET('templates/view/main.html').respond(200);
      _.location.path('/form/login');
      _.httpBackend.flush();
      expect(_.location.url()).toEqual('/view/main');
    });
    */

    it('doesn\'t redirect if logged in', function () {
      _.App.session = true;
      _.httpBackend.expectGET('templates/view/main.html').respond(200);
      _.location.path('/view/main');
      _.httpBackend.flush();
      expect(_.location.url()).toEqual('/view/main');
    });

    it('redirects with uninitialised command', function () {
      _.App.session = true;
      _.httpBackend.expectGET('templates/form/hello.html').respond(200);
      _.httpBackend.expectGET('templates/view/main.html').respond(200);
      _.App.registerCommand('hello', function () {});
      _.location.path('/form/hello');
      _.httpBackend.flush();
      expect(_.location.url()).toEqual('/view/main');
    });

    it('shows error on error', function () {
      _.httpBackend.expectGET('templates/view/main.html').respond(200);
      _.httpBackend.expectGET('templates/form/login.html').respond(200);
      _.httpBackend.flush();
      Inject('$route');
    });
  });


  describe('App.cqrs', function () {
    beforeEach(Inject('App'));
    it('fails registering query with same name', function () {
      function fails() {
        _.App.registerQuery('hello', function () {});
        _.App.registerQuery('hello', function () {});
      }
      expect(fails).toThrow();
    });
    it('fails registering command with same name', function () {
      function fails() {
        _.App.registerCommand('hello', function () {});
        _.App.registerCommand('hello', function () {});
      }
      expect(fails).toThrow();
    });
  });


  describe('ViewCtrl', function () {

    beforeEach(Inject('App', '$controller', '$routeParams'))

    it('says hello', function () {
      _.App.registerQuery('hello', function () {
        this.message = 'Hello!';
      });
      _.routeParams.name = 'hello';
      var ctrl = _.controller('ViewCtrl');
      expect(ctrl.query.message).toEqual('Hello!');
    });
  });


  describe('FormCtrl', function () {

    beforeEach(Inject('App', '$controller', '$routeParams', '$rootScope', '$q'));

    function getForm(name, f) {
      _.App.registerCommand(name, f);
      _.App.initCommand(name);
      _.routeParams.name = name;
      return _.controller('FormCtrl');
    }

    it('basic command', function () {
      function dummy() {}
      var ctrl = getForm('hello', dummy);
      expect(ctrl.form.submittable).toBe(false);
      ctrl.changed();
      expect(ctrl.form.submittable).toBe(true);
    });

    it('is submittable when valid', function () {
      var called = false;
      function command() {
        this.isValid = function (x) {
          called = true;
          return x.value == 1;
        }
      }
      var ctrl = getForm('hello', command);
      expect(ctrl.form.submittable).toBe(false);
      ctrl.changed();
      expect(called).toBe(true);
      expect(ctrl.form.submittable).toBe(false);
      ctrl.form.data = {value: 1};
      ctrl.changed();
      expect(ctrl.form.submittable).toBe(true);
    });

    it('calls command on submit', function () {
      var called = false;
      function command() {
        this.next = function () {
          called = true;
        }
      }
      getForm('hello', command).submit();
      _.rootScope.$apply();
      expect(called).toBe(true);
    });

    it('calls command with form data', function () {
      var called = {};
      function command() {
        this.next = function (data) {
          called.data = data;
        }
      }
      var ctrl = getForm('hello', command)
      ctrl.form.data = {foo:'foo'};
      ctrl.submit();
      _.rootScope.$apply();
      expect(called.data).toEqual({foo:'foo'});
    });

    it('has message on failure', function () {
      function command() {
        this.next = function (App, x) {
          return _.q.reject({message: 'the failz'});
        }
      }
      var ctrl = getForm('hello', command);
      expect(ctrl.form.message).toBeNull();
      ctrl.submit();
      _.rootScope.$apply();
      expect(ctrl.form.message).toEqual('the failz');
    });

    it('has unknown message on empty error', function () {
      function command() {
        this.next = function (App, x) {
          return _.q.reject();
        }
      }
      var ctrl = getForm('hello', command);
      expect(ctrl.form.message).toBeNull();
      ctrl.submit();
      _.rootScope.$apply();
      expect(ctrl.form.message).toEqual('Unknown error');
    });
  });

  describe('Login command', function () {

    beforeEach(Inject('App', '$q', '$rootScope'));

    it('is invalid with no user or password', function () {
      var cmd = _.App.initCommand('login');
      expect(cmd.isValid({})).toBe(false);
    });

    it('is valid with any user and password', function () {
      var cmd = _.App.initCommand('login');
      expect(cmd.isValid({username: 'x', password: 'y'})).toBe(true);
    });

    it('handles auth failure with message', function () {
      spyOn(_.App, 'authenticate').and.callFake(function () {
        return _.q.reject({message: 'A problem!'});
      });
      _.App.initCommand('login')
        .next({})
        .then(function () { fail('expected failure') })
        .catch(function (e) { expect(e.message).toEqual('A problem!') })
      _.rootScope.$apply();
    });

    it('handles auth success', function () {
      spyOn(_.App, 'authenticate').and.callFake(function () {
        return _.q.resolve({result: true});
      });
      _.App.requested_url = 'go/here';
      _.App.initCommand('login')
        .next()
        .then(function (r) { expect(r).toBe('go/here') })
        .catch(function (e) { fail('unexpected failure') })
      _.rootScope.$apply();
    });
  });

  describe('Main query', function () {
    it('says hello', function () {
      Inject('App');
      var q = _.App.getQuery('main');
      expect(q.message).toBe('Hello');
    });
  });

});


