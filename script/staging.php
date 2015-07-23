<?php

$items = array();
foreach (scandir('.') as $f) {
  if (is_dir($f) && $f != '.' && $f != '..')
    $items[] = (object)array(
      name=>$f,
      timestamp => filemtime($f)
      // TODO tag message, branch type, etc. (colors?)
    );
}
?>



<style>
* {
  box-sizing: border-box;
}
body {
  background-color: #eee;
}
.staging {
  width: 34em;
  margin: 2em auto;
  -webkit-background-clip: padding-box;
          background-clip: padding-box;
  border: 1px solid #999;
  border: 1px solid rgba(0, 0, 0, .2);
  border-radius: 6px;
  -webkit-box-shadow: 0 3px 9px rgba(0, 0, 0, .5);
          box-shadow: 0 3px 9px rgba(0, 0, 0, .5);
  background-color: white;
  padding: 1em;
  font-size: 12px;
}
h4,
 .footer { text-align: center; }
ul {
  list-style: none;
  padding: 0;
  margin: 1em;
}
li {
  margin: 0.7ex 0;
  color: #ccc;
}
ul a {
  text-decoration: none;
  display: block;
  padding: 0.5ex 1ex;
  border: 1px solid #999;
  border-radius: 3px;
  color: #009;
  background-color: #eee;
}
ul a:hover {
  color:blue;
  animation-duration: 2s;
  animation-name: throbber;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}
ul a span {
  margin: 0; padding: 0;
  vertical-align: top;
  width: 48%;
  display: inline-block;
}
.right {
  text-align: right;
}
@keyframes throbber {
from {
    background-color: #ddd;
  }
  to {
    background-color: #fec;
  }
}
</style>

<div class=staging>
  <h4>Select a version:</h4>

  <ul>
  <?foreach ($items as $f):?>
      <li><a href=<?= $f->name ?>/>
          <span class=key><?= $f->name ?></span>
          <span class=right><?= date('d F H:i', $f->timestamp) ?></span>
        </a></li>
  <?endforeach;?>
  </ul>

  <div class=footer>
    <a href=https://travis-ci.org/avdd/carenet-ng>
      <img src=https://travis-ci.org/avdd/carenet-ng.svg>
    </a>
    <br>
    <a href=https://github.com/avdd/carenet-ng>source</a>
  </div>

</div>

