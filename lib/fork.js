var cluster = require('cluster');
var path = require('path');
var numCPUs = 1;
var ClusterReporter = require('./reporters/cluster_reporter');


module.exports = function(newJasmine, env, print) {
  if (cluster.isMaster) {
    var jasmine = newJasmine();
    var absoluteConfigFilePath = path.resolve(jasmine.projectBaseDir, env.configPath || process.env.JASMINE_CONFIG_PATH || 'spec/support/jasmine.json');

    delete require.cache[require.resolve(absoluteConfigFilePath)];
    var config = require(absoluteConfigFilePath);

    jasmine.specDir = config.spec_dir || jasmine.specDir;
    jasmine.addSpecFiles(config.spec_files);

    if (env.files && env.files.length > 0) {
      jasmine.specFiles = [];
      jasmine.addSpecFiles(env.files);
    }

    var files = jasmine.specFiles.slice(0).reverse();

    var onJasmineDone = function(worker) {
      if (files.length) {
        console.log(files.length);
        worker.process.send(files.pop());
      } else {
        worker.kill()
      }
    }

    if (env.reporter !== undefined) {
      try {
        var Report = require(env.reporter);
        var reporter = new Report();
        jasmine.clearReporters();
        ClusterReporter.Master(cluster, reporter, onJasmineDone);
      } catch(e) {
        print('failed to register reporter "' + env.reporter + '"');
        print(e.message);
        print(e.stack);
      }
    } else {
      jasmine.configureDefaultReporter({ showColors: env.color });
      ClusterReporter.Master(cluster, jasmine.reporter, onJasmineDone);
    }

    for (var i = 0; i < numCPUs && files.length > 0; i++) {
      cluster.fork().send(files.pop());
    }
  } else if (cluster.isWorker) {
    process.on('message', function(file) {
      console.log(file);
      var jasmine = newJasmine();
      jasmine.loadConfigFile(env.configPath);

      if (env.stopOnFailure !== undefined) {
        jasmine.stopSpecOnExpectationFailure(env.stopOnFailure);
      }
      if (env.failFast !== undefined) {
        jasmine.stopOnSpecFailure(env.failFast);
      }
      if (env.seed !== undefined) {
        jasmine.seed(env.seed);
      }
      if (env.random !== undefined) {
        jasmine.randomizeTests(env.random);
      }
      if (env.helpers !== undefined && env.helpers.length) {
        jasmine.addHelperFiles(env.helpers);
      }
      if (env.requires !== undefined && env.requires.length) {
        jasmine.addRequires(env.requires);
      }

      jasmine.clearReporters();
      jasmine.addReporter(new ClusterReporter.Worker());
      jasmine.execute([file], env.filter);
    })
  }
}
