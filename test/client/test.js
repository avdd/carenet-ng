
'use strict';

var _;

beforeEach(function () {
  _ = {};
});

function FakeData($q) {
  var data = {};
  this.get = function (key) {
    return $q(function (resolve, reject) {
      var x = data[key];
      if (x === undefined)
        reject({status:404});
      else
        resolve(x);
    });
  }
  this.put = function (value) {
    var key = value._id;
    data[key] = value;
    return $q.resolve(value);
  }

  this.allDocs = function (args) {
    return $q(function (resolve, reject) {
      var rows = [];
      var k;
      for (k in data)
        rows.push(data[k]);
      return resolve({rows: rows, total_rows: rows.length});
    });
  }
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


describe('routing', function () {

  beforeEach(module('routing'));

  beforeEach(module(function ($provide) {
    $provide.service('App', FakeApp);
  }));

  function FakeApp() {
    this.getQuery = function () {}
    this.initCommand = function () {}
    this.getCurrent = function () {}
    this.getSession = function () {
      return _.q.resolve('dummy session');
    }
  }

  describe('RouteConfig', function () {

    beforeEach(Inject('App', '$location', '$httpBackend', '$q',
                      // must be injected:
                      '$route'));

    afterEach(function () {
      _.httpBackend.verifyNoOutstandingExpectation();
      _.httpBackend.verifyNoOutstandingRequest();
    })

    it('redirects to login with no session', function () {
      spyOn(_.App, 'getSession').and.callFake(function () {
        return _.q.reject();
      });
      spyOn(_.App, 'initCommand').and.callFake(function () {
        return {command_name: 'login'};
      });
      spyOn(_.App, 'getCurrent').and.callFake(function () {
        return {command_name: 'login'}
      });
      _.httpBackend.expectGET('templates/view/hello.html').respond(200);
      _.httpBackend.expectGET('templates/form/login.html').respond(200);
      _.location.path('/view/hello');
      _.httpBackend.flush();
      expect(_.location.url()).toEqual('/form/login');
    });

    it('doesn\'t redirect if logged in', function () {
      spyOn(_.App, 'getQuery').and.callFake(function () {
        return true;
      });
      _.httpBackend.expectGET('templates/view/hello.html').respond(200);
      _.location.path('/view/hello');
      _.httpBackend.flush();
      expect(_.location.url()).toEqual('/view/hello');
    });

    it('shows error when query fails', function () {
      spyOn(_.App, 'getQuery').and.callFake(function () {
        return _.q.reject({message: 'testing'});
      });
      _.httpBackend.expectGET('templates/view/hello.html').respond(200);
      _.httpBackend.expectGET('templates/error.html').respond(200);
      _.location.path('/view/hello');
      _.httpBackend.flush();
      expect(_.location.url()).toEqual('/error');
    });

    it('shows error with uninitialised command', function () {
      _.httpBackend.expectGET('templates/form/hello.html').respond(200);
      _.httpBackend.expectGET('templates/error.html').respond(200);
      _.location.path('/form/hello');
      _.httpBackend.flush();
      expect(_.location.url()).toEqual('/error');
    });
  });

  describe('ErrorCtrl', function () {

    beforeEach(Inject('App', '$controller', '$window', '$location', '$rootScope'));

    it('goes home if not loaded', function () {
      var ctrl = _.controller('ErrorCtrl');
      expect(ctrl.label).toEqual('Go home');
      _.rootScope.$apply(ctrl.go);
      expect(_.location.path()).toBe('/view/main');
    });

    it('goes back if loaded', function () {
      _.App.loaded = true;
      var ctrl = _.controller('ErrorCtrl');
      expect(ctrl.label).toEqual('Go back');
      var goArg = false;
      spyOn(_.window.history, 'go').and.callFake(function (arg) {
        goArg = arg;
      });
      _.rootScope.$apply(ctrl.go);
      expect(goArg).toBe(-1);
    });
  });


  describe('ViewCtrl', function () {

    beforeEach(Inject('App', '$controller', '$rootScope', '$location'));

    it('has query', function () {
      var ctrl = _.controller('ViewCtrl', {query: 'XXX'});
      expect(ctrl.query).toEqual('XXX');
    });

    it('calls command', function () {
      spyOn(_.App, 'initCommand').and.callFake(function () {
        return {command_name: 'foo'};
      });
      var ctrl = _.controller('ViewCtrl', {query: {app: _.App}});
      ctrl.initCommand('foo');
      _.rootScope.$apply();
      expect(_.location.path()).toBe('/form/foo');
    });

  });


  describe('FormCtrl', function () {

    beforeEach(Inject('$controller', '$rootScope', '$q'));

    function getForm(name, cmd) {
      return _.controller('FormCtrl', {command: cmd});
    }

    it('is submittable when valid', function () {
      var called = false;
      var ctrl = getForm('hello', {
        isValid: function (x) {
          called = true;
          return x.value == 1;
        }
      });
      expect(ctrl.form.submittable).toBe(false);
      ctrl.changed();
      expect(called).toBe(true);
      expect(ctrl.form.submittable).toBe(false);
      ctrl.form.data = {value: 1};
      ctrl.changed();
      expect(ctrl.form.submittable).toBe(true);
    });

    it('calls command with form data', function () {
      var called = {};
      var ctrl = getForm('hello', {
        next: function (data) {
          called.data = data;
        }
      });
      ctrl.form.data = {foo:'foo'};
      _.rootScope.$apply(ctrl.submit);
      expect(called.data).toEqual({foo:'foo'});
    });

    it('has message on failure', function () {
      var ctrl = getForm('hello', {
        next: function () {
          return _.q.reject({message: 'the failz'});
        }
      });
      expect(ctrl.form.message).toBeNull();
      _.rootScope.$apply(ctrl.submit);
      expect(ctrl.form.message).toEqual('the failz');
    });

    it('has unknown message on empty error', function () {
      var ctrl = getForm('hello', {
        next: function () {
          return _.q.reject();
        }
      });
      expect(ctrl.form.message).toBeNull();
      _.rootScope.$apply(ctrl.submit);
      expect(ctrl.form.message).toEqual('Unknown error');
    });
  });

});


describe('core', function () {

  beforeEach(module('core'));

  beforeEach(module(function ($provide) {
    $provide.service('Data', FakeData);
  }));


  describe('registration', function () {
    beforeEach(Inject('App', '$q', '$rootScope'));

    it('fails with duplicate query', function () {
      function fails() {
        _.App.registerQuery('hello', function () {});
        _.App.registerQuery('hello', function () {});
      }
      expect(fails).toThrow();
    });

    it('fails with duplicate command', function () {
      function fails() {
        _.App.registerCommand('hello', function () {});
        _.App.registerCommand('hello', function () {});
      }
      expect(fails).toThrow();
    });

    it('returns query as promise', function () {
      _.App.registerQuery('hello', function () {});
      var p = _.App.getQuery('hello');
      expect(p.then).toBeDefined();
    });

    it('creates query', function () {
      function Hello() {}
      _.App.registerQuery('hello', Hello);
      _.App.getQuery('hello').then(function (q) {
        expect(q instanceof Hello).toBe(true);
      });
    });

    it('creates query via promise', function () {
      var called = false;
      function Hello() {
        this.promise = {
          then: function (handler) {
            called = true;
            return _.q.resolve(handler());
          }
        }
      }
      _.App.registerQuery('hello', Hello);
      _.App.getQuery('hello')
        .then(function (q) {
          expect(q instanceof Hello).toBe(true);
          expect(called).toBe(true);
        })
        .catch(function (e) {
          fail('unexpected failure');
        });
      _.rootScope.$apply();
    });

    it('cancels query on rejected promise', function () {
      function Hello() {
        this.promise = _.q.reject('whoops');
      }
      _.App.registerQuery('hello', Hello);
      _.App.getQuery('hello')
        .then(function (q) {
          fail('expected failure');
        })
        .catch(function (e) {
          expect(e).toBe('whoops');
        });
      _.rootScope.$apply();
    });

    it('inits command', function () {
      function Hello(x, y) {
        this.args = [x, y]
      }
      _.App.registerCommand('hello', Hello);
      _.App.initCommand('hello', 1, 'two');
      var cmd = _.App.getCurrent();
      expect(cmd instanceof Hello).toBe(true);
      expect(cmd.args).toEqual([1, 'two']);
    });

    it('deinits command on query', function () {
      _.App.registerCommand('foo', function () {});
      _.App.registerQuery('bar', function () {});
      _.App.initCommand('foo');
      expect(_.App.getCurrent()).toBeDefined();
      _.App.getQuery('bar').then(function (q) {
        expect(_.App.getCurrent()).toBeFalsy();
      });
    });
  });


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
      _.App.getSession()
        .then(function (s) { expect(s).toBeTruthy() })
        .catch(function (e) { fail('Unexpected failure') });
    });

    it('handles auth failure', function () {
      spyOn(_.Api, 'call').and.callFake(function (url, args) {
        return _.q.resolve(false);
      });
      _.App.authenticate()
        .then(function (s) { fail('Expected failure') })
        .catch(function (e) { expect(e.message).toBe('Login failed') });
      _.rootScope.$apply();
      _.App.getSession()
        .then(function (s) { expect(s).toBeFalsy() })
        .catch(function (e) { fail('Unexpected failure') });
    });

    it('handles auth error', function () {
      spyOn(_.Api, 'call').and.callFake(function (url, args) {
        return _.q.reject({message: 'poop'});
      });
      _.App.authenticate()
        .then(function (s) { fail('Expected failure') })
        .catch(function (e) { expect(e.message).toBe('poop') });
      _.rootScope.$apply();
      _.App.getSession()
        .then(function (s) { expect(s).toBeFalsy() })
        .catch(function (e) { fail('Unexpected failure') });
    });
  });

});

describe('registration', function () {

  beforeEach(module('registration'));

  beforeEach(module(function ($provide) {
    $provide.service('Data', FakeData);
    $provide.constant('Id', FakeId);
  }));

  var FAKEID = 1;
  function FakeId() {
    return FAKEID;
  }

  beforeEach(Inject('App', '$q', '$rootScope'));

  describe('Login command', function () {

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
      _.App.initCommand('login', 'go/here')
        .next()
        .then(function (r) { expect(r).toBe('go/here') })
        .catch(function (e) { fail('unexpected failure') })
      _.rootScope.$apply();
    });
  });


  describe('Main query', function () {
    it('says hello', function () {
      _.App.getQuery('main').then(function (q) {
        expect(q.message).toBe('Hello');
      });
    });
  });


  describe('list-records', function () {
    it('is empty', function () {
      _.App.getQuery('list-records').then(function (q) {
        expect(q.records.length).toBe(0);
      });
      _.rootScope.$apply();
    });

    it('is not empty', function () {
      Inject('Data');
      _.Data.put({_id: 'foo', name: 'bar'});
      _.App.getQuery('list-records').then(function (q) {
        expect(q.records.length).toBe(1);
        expect(q.records[0].name).toBe('bar');
      });
      _.rootScope.$apply();
    });
  });

  describe('new-record', function () {
    it('validates', function () {
      var cmd = _.App.initCommand('new-record');
      expect(cmd.command_name).toBeDefined();
      function bad(data) {
        expect(cmd.isValid(data)).toBeFalsy();
      }
      function good(data) {
        expect(cmd.isValid(data)).toBeTruthy();
      }
      bad({});
      bad({name:'x'});
      bad({age: 'nine'});
      good({name: 'yes', age: '10'});
    });

    it('saves a record', function () {
      Inject('Data');
      var record = {name:'gary', age: 99};
      FAKEID = 1234
      _.App.initCommand('new-record')
        .next(record)
        .then(function (result) {
          expect(result).toBe('view/record/ptr:1234');
          return _.Data.get('ptr:1234');
        })
        .then(function (rec) {
          expect(rec).toEqual({
            _id: 'ptr:1234',
            name:'gary',
            age: 99
          });
        })
        .catch(function (e) {
          fail('unexpected failure');
        });
      _.rootScope.$apply();
    });
  });

  describe('view-record', function () {
    it('fails when not found', function () {
      _.App.getQuery('record', ['ptr:1234'])
        .then(function (q) {
          fail('expected failure');
        })
        .catch(function (e) {
          expect(e.status).toEqual(404);
        });
      _.rootScope.$apply();
    });

    it('gets a saved record', function () {
      Inject('Data');
      _.Data.put({_id: 'blah-blah', name: 'barry'});
      _.App.getQuery('record', ['blah-blah'])
        .then(function (q) {
          expect(q.record).toEqual({
            _id: 'blah-blah',
            name: 'barry'
          });
        })
        .catch(function (q) {
          fail('unexpected failure');
        });
      _.rootScope.$apply();
    });
  });

});

