# -*- mode: ruby -*-
# vi: set ft=ruby :

$project = JSON.load(open('project.json'))
$http_port = $project['ports']['vagrant']

$provision = <<SCRIPT
  a2enmod expires
  a2enmod proxy_http
  ln -sfnv /vagrant/apache-vagrant.conf \
           /etc/apache2/sites-available/default
  /etc/init.d/apache2 force-reload
SCRIPT

Vagrant.configure(2) do |config|

  config.vm.box = "ubuntu804-python27-carenet"
  config.vm.box_check_update = false
  config.vm.synced_folder ".cache/wheelhouse", "/wheelhouse"
  config.vm.network "forwarded_port", guest: 80, host: $http_port

  #config.vm.provision "shell", inline: $provision
  config.vm.provision "shell", path: "build.sh", args: "provision-vagrant"
  config.vm.provision "shell", privileged: false, inline: "mkdir -p publish"

end
