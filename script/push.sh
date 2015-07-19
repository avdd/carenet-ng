#!/bin/bash

host=rev
path=public_html/carenet-ng
src=src/client
dist=.run/carenet-gulp-tmp/dist

if [[ ! -d "$dist" ]]
then
  echo build first
  exit 1
fi

assets=($dist/assets-*)

if [[ ${#assets[@]} -ne 1 ]]
then
  echo clean first
  exit 2
fi

assets=$(basename $dist/assets-*)

RSYNC='rsync -v'

$RSYNC $src/upgrading.html $host:$path/index.html
$RSYNC -ra --delete $dist/assets-*/  $host:$path/'assets-*/'
ssh $host "test -d $path/$assets || mv -v $path/assets-* $path/$assets"
# $RSYNC -ra --exclude /index.html $dist/ $host:$path/
$RSYNC $dist/index.html $host:$path/index.html
