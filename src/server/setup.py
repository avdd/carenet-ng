
from setuptools import setup

setup(
    name='carenet-ng',
    version='0+rolling',
    packages=['carenetng'],
    zip_safe=False,
    entry_points={
        'console_scripts': [
            'carenet-cgi = carenetng.run:serve_cgi',
            'carenet-upgrade = carenetng.run:upgrade_db'
        ]
    })

