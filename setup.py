
import json
from setuptools import setup

package = json.load(open('package.json'))

setup(
    name=package['name'],
    version=package['version'],
    license='BSD',
    package_dir ={'': 'src'},
    packages=['server'],
    zip_safe=False,
    install_requires=[
        'flak==dev',
        'pytest',
        'click>=2.0',
    ],
    dependency_links=[
        'https://github.com/avdd/flak/tarball/master#egg=flak-dev',
    ]
)

