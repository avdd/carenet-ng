#!/bin/bash

set -eu

root=$(readlink -f $(dirname $0)/..)
host=rev
# TODO: distinct there location based on branch
there=public_html/carenet-ng
dist=$root/.run/carenet-gulp-tmp/dist
upgrade_html=$root/src/client/upgrading.html
index_html=index.html

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

assets=$there/$(basename $dist/assets-*)

RSYNC='rsync -v'

$RSYNC $upgrade_html $host:$there/$index_html
$RSYNC -ra --delete $dist/assets-*/  $host:$there/'assets-*/'
ssh $host "test -d $assets || mv -v $there/assets-* $assets"
# $RSYNC -ra --exclude /$index_html $dist/ $host:$there/
$RSYNC $dist/$index_html $host:$there/$index_html
