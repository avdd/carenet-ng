#!/bin/bash

set -eu

ROOT=$(readlink -f $(dirname $0)/..)
HOST=rev
DEST=~/public_html/carenet-ng

DIST=$ROOT/.run/carenet-gulp-tmp/dist
UPGRADE_HTML=$ROOT/src/client/upgrading.html
INDEX_HTML=index.html

LIVE=$DEST/live
STAGING=$DEST/staging

RSYNC='rsync -v'

main() {

  TAG="${1:-}"
  BRANCH=$(git_branch)
  OUTGOING=
  DIRTY=

  git fetch -p origin
  git_outgoing && OUTGOING=1
  git_dirty && DIRTY=1

  if [[ "$TAG" ]]
  then
    publish_release
  elif [[ "$OUTGOING$DIRTY" ]]
  then
    publish_staging
  else
    fatal "Nothing to publish"
  fi
}

publish_staging() {
  local suffix=$(git describe --tags --dirty=+)
  local id="${BRANCH:+$BRANCH-}$suffix"

  if gulp test
  then
    warn_unclean
    git push -u origin $BRANCH
    publish $STAGING/$id
    prune_staging
    warn_unclean
  fi
}

publish_release() {
  if [[ "$DIRTY" ]]; then
    error "Must release from clean checkout"
    git status -sb
    fatal
  fi
  if [[ "$BRANCH" = trunk ]]; then
    fatal "Must be trunk to release (not '$BRANCH')"
  fi
  
  if [[ "$TAG" ]]
  then
    release="$TAG$CLEAN"
  else
    release=$(git describe --tags --dirty=+)
  fi

  local id="${BRANCH:+$BRANCH-}$release"

  # optimise: assume nothing to push implies
  # previous push is tested
  #if [[ "$OUTGOING" ]]
  #then
    gulp test $TAG
    # will exit if failed
  #else

  if ! prompt "Release $OLD -> $TAG? [y/n]"
  then
    fatal Aborting as requested
  fi

  git checkout release
  git merge --ff-only
  git tag "$TAG"
  # re-build ? re-test ?
  gulp build
  publish $STAGING/$id
  publish $LIVE
  prune_staging
  git push origin $TAG
  git checkout trunk
  echo Done
}

prompt() {
  read -p "$1" answer
  test "$answer" = y
}

warn_unclean() {
  if [[ "$DIRTY" ]]; then
    error "\n*** WARNING: unclean ***\n"
    git status -sb
    error
  fi
}

git_outgoing() {
  git rev-list origin/$BRANCH..$BRANCH | grep -q .
}

git_dirty() {
  ! git diff --no-ext-diff --quiet --exit-code
}

git_tag() {
  git describe --tags
}

git_branch() {
  git rev-parse --abbrev-ref HEAD
}

prune_staging() {
  # delete all older but keep 2 
  # find older | head -n-2
  list="$(ssh $HOST "(cd $STAGING; find * -maxdepth 0 -type d -mtime +1)")"
  test "$list" || return
  list="$(echo "$list" | sort -V | head -n-2)"
  if [[ "$list" ]]
  then
    echo prune
    echo "$list"
    for d in $list
    do
      ssh $HOST "rm -rf $STAGING/$d"
    done
  fi
}

publish() {

  local dest="$1"
  local asset_star=($DIST/assets-*)

  if [[ ${#asset_star[@]} -ne 1 ]]
  then
    fatal "ERROR: clean first"
  fi

  local asset_hash=$(basename $DIST/assets-*)
  local dest_assets=$dest/$asset_hash
  local exists=

  echo "PUBLISH $HOST:$dest"

  if ssh $HOST "test -d $dest"
  then
    exists=1
    ssh $HOST "test -d $dest_assets || mv -v $dest/assets-* $dest_assets"
  else
    ssh $HOST "mkdir $dest"
  fi

  $RSYNC $UPGRADE_HTML $HOST:$dest/$INDEX_HTML
  $RSYNC -ra --delete $DIST/assets-*/  $HOST:$dest_assets/
  # $RSYNC -ra --exclude /$INDEX_HTML $DIST/ $HOST:$dest/
  $RSYNC $DIST/$INDEX_HTML $HOST:$dest/$INDEX_HTML
}

error() {
  echo -e "$@" 1>&2
}

fatal() {
  if [[ "${1:-}" ]]; then
    error "$@"
  fi
  exit 1
}

main "$@"
exit $?
