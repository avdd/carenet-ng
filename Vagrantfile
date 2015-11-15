# -*- mode: ruby -*-
# vi: set ft=ruby :

$project = JSON.load(open('project.json'))
$http_port = $project['ports']['vagrant']

Vagrant.configure(2) do |config|

  config.vm.box = "ubuntu804-python27-carenet"
  config.vm.box_check_update = false
  config.vm.synced_folder ".cache/wheelhouse", "/wheelhouse"
  config.vm.network "forwarded_port", guest: 80, host: $http_port

  config.vm.provision "shell", path: "build.sh",
                               args: "provision-vagrant-root"
  config.vm.provision "shell", path: "build.sh",
                               args: "provision-vagrant-user",
                               privileged: false
end
