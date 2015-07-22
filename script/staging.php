<?php

$items = array();
foreach (scandir('.') as $f) {
  if (is_dir($f) && $f != '.' && $f != '..')
    // TODO get tag message, branch type, etc. (colors?)
    $items[] = $f;
}
$items=array('first', 'second');
?>



<style>
* {
  box-sizing: border-box;
}
body {
  background-color: #eee;
}
.staging {
    width: 19em;
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
    font-size: 13px;
}
h4, .footer { text-align: center; }
.footer { font-size: x-small; }
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
}
.label {
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
      <li><a href=<?= $f ?>/
          ><span class=key><?= $f ?></span></a>
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

