
import pytest
from server import main

def test_trivial():
    assert True == True

def test_flak():
    c = main.app.test_client()
    rv = c.get()
    assert 'home' in rv.data

