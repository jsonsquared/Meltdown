require 'capistrano/ext/multistage'
load 'deploy' if respond_to?(:namespace) # cap2 differentiator
set :stages, %w(prod dev)
set :default_stage, "dev"

##################################
# Edit these
set :application, "jelly-butter-peanut"
set :node_file, "app.js"
set :host, "96.126.98.97"

set :repository, "git@github.com:nko2/jelly-butter-peanut.git"
set :branch, "master"
set :deploy_to, "/var/www/#{application}"
####################################

set :scm, :git
set :deploy_via, :remote_cache
role :app, host
set :user, "root"
set :use_sudo, false
set :admin_runner, 'root'
default_run_options[:pty] = true

namespace :deploy do
  task :start, :roles => :app, :except => { :no_release => true } do
    run "#{try_sudo :as => 'root'} start #{application}"
  end

  task :stop, :roles => :app, :except => { :no_release => true } do
    run "#{try_sudo :as => 'root'} stop #{application}"
  end

  task :restart, :roles => :app, :except => { :no_release => true } do
    run "#{try_sudo :as => 'root'} restart #{application} || #{try_sudo :as => 'root'} start #{application}"
  end

  task :setup_monit, :roles => :app do
    run "#{try_sudo :as => 'root'} monit -d 60 -c /etc/monit/#{application}_monit"
  end

  task :create_deploy_to_with_sudo, :roles => :app do
    run "#{try_sudo :as => 'root'} mkdir -p #{deploy_to}"
    run "#{try_sudo :as => 'root'} chown #{admin_runner}:#{admin_runner} #{deploy_to}"
  end

  task :write_upstart_script, :roles => :app do
    upstart_script = <<-UPSTART
    description "#{application}"
    author      "JCBarry"

    start on startup
    stop  on shutdown

    respawn                # restart when job dies
    respawn limit 5 60     # give up restart after 5 respawns in 60 seconds

    script
      export HOME="/home/#{admin_runner}"
      export NODE_ENV="#{express_env}"
      export EXPRESS_ENV="#{express_env}"
      cd #{current_path}
      exec /usr/local/bin/node #{current_path}/#{node_file} >> #{shared_path}/log/#{application}.log 2>&1
    end script
    UPSTART
    put upstart_script, "/tmp/#{application}_upstart.conf"
    run "#{try_sudo :as => 'root'} mv /tmp/#{application}_upstart.conf /etc/init/#{application}.conf"
  end

  task :write_monit_script, :roles => :app do
    monit_script = <<-MONIT
    #!monit
    set logfile #{shared_path}/log/#{application}_monit.log

    check host #{application} with address 127.0.0.1
        start program = "/sbin/start #{application}"
        stop program  = "/sbin/stop #{application}"
        if failed port #{express_port} protocol HTTP
            request /
            with timeout 10 seconds
            then restart
    MONIT
    put monit_script, "/tmp/#{application}_monit"
    run "#{try_sudo :as => 'root'} mv /tmp/#{application}_monit /etc/monit/#{application}_monit"
    run "chmod 700 /etc/monit/#{application}_monit"
  end

  task :install_dependent_packages, :roles => :app do
    run "cd #{release_path} && npm install"
  end
end

before 'deploy:setup', 'deploy:create_deploy_to_with_sudo'
after 'deploy:update_code', 'deploy:write_upstart_script', 'deploy:write_monit_script'
after 'deploy:update_code', 'deploy:install_dependent_packages'
after 'deploy:start', 'deploy:setup_monit'