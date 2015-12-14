
function get(path) {
  return browser.get('#/' + path);
}

function expectUrl(x) {
  var url = browser.getLocationAbsUrl();
  expect(url).toEqual('/' + x);
}

function expectUrlNot(x) {
  var url = browser.getLocationAbsUrl();
  expect(url).not.toEqual('/' + x);
}

function getLog(f) {
  return browser.manage().logs().get('browser')
}


afterEach(function () {
  getLog().then(function (log) {
    log.forEach(function (x) {
      if (x.level.value > 900)
        console.log(' * ' + x.message);
    });
  });
});


fdescribe('environment', function () {
  function getStorageDriver() {
    return window.localforage.driver();
  }
  function setItem() {
    var cb = arguments[arguments.length-1];
    window.localforage.setItem('--test-item', '--test-value')
      .then(cb);
  }
  function getItem() {
    var cb = arguments[arguments.length-1];
    window.localforage.getItem('--test-item')
      .then(cb);
  }

  it('is sane', function () {
    get('/');
    browser.executeScript(getStorageDriver)
      .then(function (x) {
        expect(x).toEqual('asyncStorage');
      });
    browser.executeAsyncScript(setItem)
      .then(function (x) {
        expect(x).toEqual('--test-value');
      });
    browser.executeAsyncScript(getItem)
      .then(function (x) {
        expect(x).toEqual('--test-value');
      });
  });
});


describe('clean session', function () {
  it('redirects to login', function () {
    get('view/main')
    expectUrl('form/login');
  });
});


describe('login', function () {
  it('form appears', function () {
    get('form/login')
    expectUrl('form/login');
    expect(element(by.model('self.form.data.username'))
           .isPresent()).toBe(true);
    expect(element(by.model('self.form.data.password'))
           .isPresent()).toBe(true);
    expect(element(by.tagName('button')).getText())
      .toEqual('Log in');
  });

  it('rejects invalid credentials', function () {
    get('form/login')
    var invalid = 'definitely-not-valid';
    element(by.model('self.form.data.username')).sendKeys(invalid);
    element(by.model('self.form.data.password')).sendKeys(invalid);
    element(by.tagName('form')).submit();
    expectUrl('form/login');
    expect(element(by.exactBinding('self.form.message')).getText())
      .toMatch(/failed/i);
  });

  it('accepts valid credentials', function () {
    get('view/main');
    element(by.model('self.form.data.username')).sendKeys('devel-only');
    element(by.model('self.form.data.password')).sendKeys('password');
    element(by.tagName('form')).submit();
    expectUrl('view/main');
    expect(element(by.tagName('h1')).getText())
      .toContain('Hello');
  });

  xit('maintains the session', function () {
    get('view/main');
    expectUrl('view/main');
  });

// });


// describe('main form sequence', function () {
  xit('shows empty list', function () {
    get('view/list-records');
    expectUrl('view/list-records');
    expect(element(by.tagName('ul')).getText())
      .toEqual('');
  });
});
