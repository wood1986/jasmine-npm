var newJasmine = require("./new"),
    runJasmine = require('./run');

module.exports = exports = function() {
  process.on('message', function(env) {
    var jasmine = newJasmine();
    jasmine.onComplete(function () {});
    runJasmine(jasmine, env, console.log);
  });
};