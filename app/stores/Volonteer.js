'use strict';
var createStore  = require('fluxible/addons').createStore;

var VolonteerStore = createStore({
    storeName: 'Volonteers',
    handlers: {
      'LOAD_VOLONTEER'  : 'load'
    },

    initialize: function () {
        //
    },

    load: function(data) {
      this.rehydrate(data)
      this.emitChange();
    },

    createVolonteer: function(volonteer) {
        return volonteer
    },

    getState: function () {
      var state = {}
      Object.keys(this).forEach(function(attr) {
        if(this.hasOwnProperty(attr) &&
           attr !== 'dispatcher') {
          state[attr] = this[attr]
        }
      }, this)
      return state
    },

    // Returns a serializable object containing the state of the Fluxible and
    // passed FluxibleContext instances. This is useful for serializing the
    // state of the application to send it to the client.
    dehydrate: function () {
        return this.getState();
    },

    // Takes an object representing the state of the Fluxible and
    // FluxibleContext instances (usually retrieved from dehydrate) to
    // rehydrate them to the same state as they were on the server
    rehydrate: function (state) {
      var keys = Object.keys(state)
      keys.forEach(function(attr) {
        this[attr] = state[attr]
      }, this)
    }
});

VolonteerStore.attributes = function() {
  return [
    'id',
    'first_name',
    'last_name',
    'city',
    'profile_picture',
    'background_picture',
    'interests',
    'departments',
    'my_dream'
  ]
}

module.exports = VolonteerStore;
