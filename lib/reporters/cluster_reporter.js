module.exports = exports = ClusterReporter = {
  Worker: Worker,
  Master: Master
};

var kinds = ["jasmineDone", "specDone", "suiteDone"]

function Worker() {
  var self = this;
  kinds.forEach(function(kind) {
    self[kind] = function(result) {
      process.send({
        kind: kind,
        result: result
      });
    }
  })
}

function Master(cluster, reporter, onJasmineDone) {
  cluster.on("message", function(worker, message) {
    if (message.kind === "jasmineDone") {
      onJasmineDone(worker);
    } else {
      reporter[message.kind](message.result);
    }
  });
}
