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
  CLEAN=

  git fetch -p origin
  git_outgoing && OUTGOING=1
  git_clean && CLEAN=1

  if [[ "$TAG" ]]
  then
    publish_release
  elif [[ "$OUTGOING" ]]
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
  if [[ ! "$CLEAN" ]]; then
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
  purge_staging
  git push origin $TAG
  git checkout trunk
  echo Done
}

prompt() {
  read -p "$1" answer
  test "$answer" = y
}

warn_unclean() {
  if [[ ! "$CLEAN" ]]; then
    error "\n*** WARNING: unclean ***\n"
    git status -sb
    error
  fi
}

git_outgoing() {
  git rev-list --quiet origin/$BRANCH..$BRANCH
}

git_clean() {
  git diff --no-ext-diff --quiet --exit-code
}

git_tag() {
  git describe --tags
}

git_branch() {
  git rev-parse --abbrev-ref HEAD
}

prune_staging() {
  echo purge
  # delete all older but keep 2 
  # find older | head -n-2
  list="find $STAGING/* -maxdepth 0 -type d -mtime +1"
  # FIXME should use new -V option to sort by version number
  keep2="sort | head -n-2"
  nuke="xargs -r rm -rf"
  script="$list | $keep2 | $nuke"
  ssh $HOST "$script"
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

  echo "PUBLISH $DIST $HOST:$dest"

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
