
function view(path) {
  return browser.get('/#/view/' + path);
}

function url() {
  return browser.getLocationAbsUrl();
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

describe('New session', function() {
  it('shows login', function() {
    view('main');
    expect(url()).toBe('/form/login');
    // expect(element(by.binding('root.connectionStatus')).getText()).toBe('ONLINE');
  });

  it('accepts login', function() {
    view('main');
    expect(url()).toBe('/form/login');
    element(by.model('self.form_data.username')).sendKeys('test');
    element(by.model('self.form_data.password')).sendKeys('test');
    element(by.tagName('form')).submit();
    expect(url()).toBe('/view/main');
  });

  it('maintains the session', function () {
    view('main');
    expect(url()).toBe('/view/main');
  });

  it('can log out', function () {
    view('main');
    element(by.id('logout-link')).click();
    // browser.switchTo().alert().accept();
    expect(url()).toBe('/form/login');
  });
});


