const Promise = require('bluebird');
//const _ = require('lodash');

module.exports = function (fsm, stateRepository) {
    return {
        entry: function (source) {
            return stateRepository.init(source, fsm.init);
        },
        dealWith: function (event) {
            var me = this;
            return stateRepository.current(event.source)
                .then(function (currentState) {
                    return me.doTrans(event, currentState);
                });
        },
        doTrans: function (event, currentState) {
            var transition = _.find(fsm.transitions, function (item) {
                return item.name == event.name && item.from == currentState;
            });
            if (transition) {
                stateRepository.update(event.source, transition.to);
                return fsm.methods['on' + _.capitalize(event.name)](event.source, event.data);
            }
        }
    }
}