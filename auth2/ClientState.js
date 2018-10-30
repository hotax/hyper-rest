const randomstring = require("randomstring");

function ClientState(){
}

ClientState.prototype.generate = function () {
    this.state = randomstring.generate();
    return this.state;
}

ClientState.prototype.check = function (val) {
  return this.state === val;
}

const clientStateFactory = function(){
    return new ClientState();
}

module.exports = clientStateFactory;