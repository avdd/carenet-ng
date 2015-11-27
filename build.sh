#!/bin/bash -eu

shopt -s extglob

SELF=$(readlink -f $0)
SCRIPT=$(basename $SELF)

PYTHON_REQUIRES=python-requires.txt
GULP_JS=node_modules/gulp/bin/gulp.js

CARENET_WHEEL=carenet_ng-0+rolling-py2-none-any.whl 

DAEMON_PORT=8099
DAEMON_WORKERS=2
SSH_ARGS=


# TODO
# - live guard **
# - purge old wheels?
# - purge old installs?
# - error handling?


main() {
  local arg=
  if (($#))
  then
    arg=$1
    shift
    func=${arg//-/_}
    if [[ $(type -t "_do_$func") = function ]]
    then
      _do_$func "$@"
      return 0
    fi
  fi
  test "$arg" && echo "Invalid command '$arg'"
  _usage
  exit 1
}

_check_local() {
  _check_project_root || {
    echo Must be run from project root
    exit 231
  }
  # _check_external_deps || exit 230
}

_check_project_root() {
  local files
  local f
  missing=0
  files=(project.json
         package.json
         gulpfile.js
         Vagrantfile)
  for f in "${files[@]}"
  do
    test -f "$f" || missing=1
  done
  return $missing
}

_check_external_deps() {
  local cmds
  local cmd
  cmds=(node
        python
        virtualenv
        virtualbox
        vagrant
        rsync
        ssh)
  local missing=0
  for cmd in "${cmds[@]}"
  do
    command -v $cmd > /dev/null || {
      echo "'$cmd' missing"
      missing=1
    }
  done
  return $missing
}

_init_local() {
  PUBLISH_HOST=
  PUBLISH_ROOT=$PWD/.cache/publish
}


_init_remote() {
  PUBLISH_HOST=avdd@rev
  PUBLISH_ROOT=carenet-ng
}


_init_vagrant() {
  PUBLISH_HOST=default
  PUBLISH_ROOT=publish
  VAGRANT_SSH_CONFIG=.vagrant/ssh_config
  SSH_ARGS="-F $VAGRANT_SSH_CONFIG"
  export RSYNC_RSH="ssh $SSH_ARGS"
}

_init_target() {
  channel=${1:-}
  case $channel in
    livesim|live)
      install=release
      ;;
    staging)
      install=staging
      ;;
    '')
      echo missing channel
      exit 1
      ;;
    *)
      echo bad channel "'$channel'"
      exit 2
      ;;
  esac

  version=${2:-}
  test "$version" || {
    echo missing version
    exit 1
  }

}


_init_build() {
  #CACHE=.cache #$(readlink -f .cache)
  BUILD=$(readlink -f .cache/build)
  PYTHON=$(readlink -f .cache/python)
  WHEELHOUSE=$(readlink -f .cache/wheelhouse)
  PIP_WHEEL="$PYTHON/bin/pip wheel -f $WHEELHOUSE -w $WHEELHOUSE"
}


_init_install() {
  PUBLISH_ROOT=$(dirname $(readlink -f $0))
  PUBLISH_INST=$PUBLISH_ROOT/$channel/$version
}


_usage() {
  echo Usage:
  echo "$0 COMMAND"
  echo
  echo COMMAND:
  local funcs=$(declare -f | grep ^_do_ | cut -d' ' -f1)
  for func in $funcs
  do
    func=${func##_do_}
    echo "  ${func//_/-}"
  done
}


_do_publish_local() {
  _check_local
  _init_target "$@"
  _init_local
  _init_build
  _build_all
  _rsync
  _install_local
}

_do_publish_vagrant() {
  _check_local
  _init_target "$@"
  _init_vagrant
  _init_build
  _build_all
  _vagrant_up
  _rsync
  _install_remote
}

_do_publish_remote() {
  _check_local
  _init_target "$@"
  _init_remote
  _init_build
  _build_all
  _rsync
  _install_remote
}

_do_build() {
  _check_local
  _init_target "$@"
  _init_build
  _build_all
}

_do_build_python() {
  _check_local
  _init_local
  _init_build
  _build_python
}

_do_build_static() {
  _check_local
  _init_target "$@"
  _init_build
  _build_static
}

_do_build_wheel() {
  _check_local
  _init_local
  _init_build
  _build_this_wheel
}

_do_build_vagrant() {
  _check_local
  _build_wheels_vagrant
}

_do_rsync_local() {
  _check_local
  _init_local
  _init_build
  _rsync
}

_do_rsync_vagrant() {
  _check_local
  _init_vagrant
  _init_build
  _vagrant_up
  _rsync
}

_do_rsync_remote() {
  _check_local
  _init_remote
  _init_build
  _rsync
}

_do_install_local() {
  _check_local
  _init_target "$@"
  _init_local
  _init_build
  _install_local
}

_do_install_vagrant() {
  _check_local
  _init_target "$@"
  _init_vagrant
  _init_build
  _vagrant_up
  _install_remote
}

_do_install_remote() {
  _check_local
  _init_target "$@"
  _init_remote
  _init_build
  _install_remote
}

_do_install_activate()  {
  _init_target "$@"
  _init_install
  _install
  _activate
}

_do_install()    {
  _init_target "$@"
  _init_install
  _install
}

_do_activate() {
  _init_target "$@"
  _init_install
  _activate
}


_do_setup_links() {
  # must be idempotent!
  _check_local
  cwd=$(readlink -f .)
  name=$(basename $cwd)
  cache=~/.cache/$name
  mkdir -p $cache
  ln -sfnv $cache .cache
  ln -sfnv $cwd .cache/src
  ln -sfnv src/.npmrc .cache/
  ln -sfnv src/package.json .cache/
  ln -sfnv src/npm-shrinkwrap.json .cache/

  mkdir -p ~/.cache/pyenv/$name
  ln -sfnv ~/.cache/pyenv/$name .cache/python
  ln -sfnv .cache/python/bin/carenetctl carenetctl

  mkdir -p ~/.local/run/$name
  ln -sfnv ~/.local/run/$name .cache/build

  mkdir -p .cache/node_modules
  ln -sfnv .cache/node_modules .
}


_do_setup() {
  # must be idempotent!
  _check_local
  _do_setup_client
  _do_setup_server
}

_do_setup_client() {
  _check_local
  mkdir -p .cache/publish
  echo 'installing npm deps'
  if [[ -L .cache ]]
  then
    (cd $(readlink -f .cache) && npm install)
  else
    npm install
  fi
  echo 'installing bower deps'
  npm run bower install
  ln -sfv $GULP_JS gulp
  echo 'updating webdriver'
  npm run gulp update-webdriver
}

_do_setup_server() {
  _check_local
  echo 'setting up python environment'
  _init_build
  if [[ "${VIRTUAL_ENV:-}" ]]
  then
    PYTHON=$VIRTUAL_ENV
    ln -sfnv $PYTHON .cache/python
  else
    PYTHON=$(readlink -f .cache/python)
    test -x $PYTHON/bin/python || virtualenv $PYTHON
  fi
  echo 'building python deps'
  _build_wheel_deps
  pip=$PYTHON/bin/pip
  $pip install --no-deps --no-index -f $WHEELHOUSE -r $PYTHON_REQUIRES
  if $pip freeze | grep -q carenet-ng
  then
    $pip uninstall -y carenet-ng
  fi
  (cd src/server && $pip install -e .)
}


_do_test() {
  ./gulp test
  _do_test_vagrant
}


_do_test_vagrant() {
  git=$(git describe --long --first-parent --dirty)
  _do_publish_vagrant livesim $(date +%y%m%d).0.$git.$RANDOM
  sleep 1
  ./gulp test-vagrant
}


_do_check_deps() {
  echo python:
  .cache/python/bin/pip list -o -f .cache/wheelhouse
  echo npm:
  npm outdated
  echo bower:
  node_modules/.bin/bower list
}


_do_pydiff() {
  pip=.cache/python/bin/pip
  pattern='^(carenet-ng)=='
  diff -u $PYTHON_REQUIRES <( $pip freeze |egrep -v "$pattern" )
  return 0
  # or:
  diff -u $PYTHON_REQUIRES \
          <( $pip freeze |egrep -v "$pattern" ) \
        | patch $PYTHON_REQUIRES
  # or
  $pip freeze | egrep -v "$pattern" > $PYTHON_REQUIRES
}


__do_update_bower__wip__() {
  bower=node_modules/.bin/bower
  $bower list
  $bower install -FES $package'#version'
  node clean-bower.js
}


__do__update_npm_dep__wip__() {
  # pasted+adapted from shell history
  (cd $(readlink -f .cache) \
    && npm install --save $package@latest \
    && node src/clean-shrinkwrap.js)

  # check above completed without error, then test
  $GULP_JS test

  for f in npm-shrinkwrap.json package.json  
  do
    diff -u $f .cache/$f || {
      mv -fv $f . && ln -sv src/$f .cache/$f
    } 
  done

}


_do_provision_vagrant_root() {
  a2enmod expires
  a2enmod proxy_http
  ln -sfnv /vagrant/apache-vagrant.conf \
           /etc/apache2/sites-available/default
  /etc/init.d/apache2 force-reload
}

_do_provision_vagrant_user() {
  mkdir -p ~/publish
  psql -l >/dev/null || {
    sudo -u postgres createuser -s vagrant
  }
  dropdb crowdtest || true
  createdb crowdtest
  psql -Xaq1 -v ON_ERROR_STOP=1 -d crowdtest -f /vagrant/crowd-test.sql 
}

_build_all() {
  _build_static
  _build_python
  _build_this_wheel
}


_build_python() {
  _build_wheel_deps
  _check_wheel_deps || {
    _build_wheels_vagrant
    _check_wheel_deps
  }
}


_build_static() {
  CARENET_BUILD_VERSION=$version $GULP_JS html-$channel
}


_build_this_wheel() {
  (cd src/server; $PIP_WHEEL .)
}


_build_wheel_deps() {
  mkdir -p $WHEELHOUSE
  $PIP_WHEEL --no-deps -r $PYTHON_REQUIRES
}


_check_wheel_deps() {
  missing=0
  [[ "$PUBLISH_HOST" ]] || return 0
  for wheel64 in $WHEELHOUSE/*_64.whl
  do
    wheel32=${wheel64/x86_64/i686} 
    test -f "$wheel32" || {
      echo "Missing wheel: $wheel32"
      ((missing++))
    }
  done
  return $missing
}


_build_wheels_vagrant() {
  _vagrant_up
  _vagrant ssh -- \
    /opt/python27/bin/pip wheel --no-deps \
    -f /wheelhouse/ -w /wheelhouse/ \
    -r /vagrant/$PYTHON_REQUIRES
}


_rsync() {
  if [[ "$PUBLISH_HOST" ]]
  then
    rsync_dest=$PUBLISH_HOST:$PUBLISH_ROOT
  else
    rsync_dest=$PUBLISH_ROOT
  fi
  rsync -rav $SELF $PYTHON_REQUIRES $rsync_dest
  rsync -rav $WHEELHOUSE/ $rsync_dest/wheelhouse/
  rsync -rav --delete $BUILD/dist/ $rsync_dest/cached-static/
}


_vagrant() { 
  vagrant "$@"
  status=$?
  rm -rf /tmp/{vagrant,d}$(date +%Y%m%d)-+([0-9])-*
  return $status
}


_vagrant_up() {
  [[ "${VAGRANT_UP:-}" ]] && return 0
  _vagrant up
  _vagrant provision
  _vagrant ssh-config > $VAGRANT_SSH_CONFIG
  VAGRANT_UP=1
}

### install-side

_install_local() {
  $PUBLISH_ROOT/$SCRIPT install-activate $channel $version
}


_install_remote() {
  ssh $SSH_ARGS \
      $PUBLISH_HOST \
      $PUBLISH_ROOT/$SCRIPT \
      install-activate $channel $version
}


_install() {
  _setup_staging
  _install_instance
  _install_static
  _finish_$install
  rm $PUBLISH_ROOT/$PYTHON_REQUIRES $PUBLISH_ROOT/$SCRIPT
}


_activate() {
  _activate_$install
}


_setup_staging() {
  mkdir -pv $PUBLISH_ROOT/{livesim,staging}
  mkdir -pv $PUBLISH_ROOT/staging/wwwroot
  mkdir -pv $PUBLISH_ROOT/wwwroot
  test -L $PUBLISH_ROOT/wwwroot/livesim \
    || ln -sfv ../livesim/current/static $PUBLISH_ROOT/wwwroot/livesim
  test -L $PUBLISH_ROOT/wwwroot/staging \
    || ln -sfv ../staging/wwwroot $PUBLISH_ROOT/wwwroot/staging
}


_install_instance() {
  if [[ -d $PUBLISH_INST ]]
  then
    echo "'$PUBLISH_INST' exists, aborting"
    exit 9
  fi
  test -d /opt/python27/bin \
    && PATH=/opt/python27/bin:$PATH
  virtualenv $PUBLISH_INST
  $PUBLISH_INST/bin/pip install --no-index \
      -f $PUBLISH_ROOT/wheelhouse \
      -r $PUBLISH_ROOT/$PYTHON_REQUIRES \
      $PUBLISH_ROOT/wheelhouse/$CARENET_WHEEL
}


_install_static() {
  rsync -rav $PUBLISH_ROOT/cached-static/ $PUBLISH_INST/static/
}


_finish_staging() {
  mkdir -pv $PUBLISH_INST/var
  ln -sv ../bin/carenetctl $PUBLISH_INST/static/api.cgi
  ln -sv ../$version/static $PUBLISH_ROOT/staging/wwwroot/$version
}


_activate_staging() {
  # TODO
  echo prepare staging DB
  $PUBLISH_INST/bin/carenetctl upgrade
  echo update index.html ...
}


_finish_release() {
  ln -sfv $version $PUBLISH_ROOT/$channel/next
}


_activate_release() {
  var=$PUBLISH_ROOT/$channel/var
  next=$PUBLISH_ROOT/$channel/next
  current=$PUBLISH_ROOT/$channel/current
  pidfile=$var/pid
  logfile=$var/log
  accesslog=$var/access.log
  mkdir -p $var
  ln -sfv ../var $PUBLISH_INST/var

  if [[ -f $pidfile ]]
  then
    echo stopping ...
    kill -TERM $(cat $pidfile) || true
  fi

  if $next/bin/carenetctl upgrade
  then
    previous=$(basename $(readlink -f $current))
    mv -Tfv $next $current
    ln -sfnv $previous $PUBLISH_ROOT/$channel/previous
    rm -fv $previous/var
  fi

  export CARENET_ENV=$channel

  echo starting ...
  $current/bin/gunicorn \
    --bind      127.0.0.1:$DAEMON_PORT \
    --workers   $DAEMON_WORKERS \
    --pid       $pidfile \
    --log-file  $logfile \
    --access-logfile  $accesslog \
    --daemon \
    carenetng.__main__:wsgi
}


main "$@"
exit 0

