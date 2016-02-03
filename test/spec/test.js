
var SLEEP_MS = 1;
if (browser.params.sleep)
  SLEEP_MS = 1000;

function get(path) {
  return browser.setLocation(path)
}

function getUrl() {
  return browser.getLocationAbsUrl();
}

function expectUrl(x) {
  function check() {
    return expect(getUrl()).toMatch(x);
  }
  return browser.sleep(SLEEP_MS).then(check)
}

function getLog(f) {
  return browser.manage().logs().get('browser')
}


afterEach(function () {
  getLog().then(function (log) {
    log.forEach(function (x) {
      // because firefox logs (only) internal warnings
      if (x.level.value > 900)
        console.log(' * ' + x.level + ': ' + x.message);
    });
  });
});


browser.get('/');


describe('environment', function () {
  function pouchInfo() {
    var cb = arguments[arguments.length-1];
    var db = new PouchDB('carenet')
    db.info().then(cb);
  }
  it('starts clean', function () {
    browser.executeAsyncScript(pouchInfo)
      .then(function (rsp) {
        expect(rsp.doc_count).toBe(0);
        expect(rsp.update_seq).toBe(0);
      });
  });
});


describe('clean session', function () {
  it('redirects to login', function () {
    get('view/main');
    expectUrl('form/login');
  });
});


describe('login', function () {
  it('form appears', function () {
    get('view/main');
    expectUrl('form/login');
    expect(element(by.model('self.form.data.username'))
           .isPresent()).toBe(true);
    expect(element(by.model('self.form.data.password'))
           .isPresent()).toBe(true);
    expect(element(by.tagName('button')).getText())
      .toEqual('Log in');
  });

  it('rejects invalid credentials', function () {
    get('view/main');
    expectUrl('form/login');
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
    expectUrl('form/login');
    element(by.model('self.form.data.username')).sendKeys('devel');
    element(by.model('self.form.data.password')).sendKeys('password');
    element(by.tagName('form')).submit();
    expectUrl('view/main');
  });

  it('maintains the session', function () {
    get('view/main');
    expectUrl('view/main');
  });

});


describe('main form sequence', function () {
  it('shows empty list', function () {
    get('view/list-records');
    expectUrl('view/list-records');
    expect(element(by.tagName('ul')).getText())
      .toEqual('');
  });

  it('is error to view form directly', function () {
    get('form/new-record');
    expectUrl('error');
  });

  it('saves a new record', function () {
    get('view/list-records');
    element(by.buttonText('New record')).click();
    expectUrl('form/new-record');
    element(by.model('self.form.data.name')).sendKeys('John Doe');
    element(by.model('self.form.data.age')).sendKeys('99');
    element(by.tagName('form')).submit();
    expectUrl(/view\/record\/ptr:\d+/);
    expect(element(by.binding('self.query.record.name')).getText()).toContain('John Doe');
    browser.navigate().back();
    expectUrl('view/list-records');
    expect(element(by.tagName('ul')).getText()) .toContain('John Doe');
  });

});
