
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



//-----

  xit('maintains the session', function () {
    get('view/main');
    expectUrl('view/main');
  });

});


