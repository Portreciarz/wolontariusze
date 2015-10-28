'use strict'

var VolonteerStore = require('./stores/Volonteer')

module.exports = {
  showVolonteer: function(context, payload, cb) {
    // Pobierz dane wolontariusza z bazy danych
    context.service.read('Volonteers', payload, {
      store: 'Volonteer',
      // Przekaż obiekt zalogowanego użytkownia niezbędy do podjęcia
      // decyzji o tym jakie dane mają być zwrócone.
      user: context.getUser()
    }, function (err, data) {
      if (err) { console.log(err) }
      else { context.dispatch('LOAD_VOLONTEER', data) }
      cb()
    })
  },

  showVolonteers: function(context, payload, cb) {
    // Pobierz dane wolontariusza z bazy danych
    context.service.read('Volonteers', payload, {
      // Przekaż obiekt zalogowanego użytkownia niezbędy do podjęcia
      // decyzji o tym jakie dane mają być zwrócone.
      user: context.getUser()
    }, function (err, data) {
      if(err) { console.log(err) }
      else { context.dispatch('LOAD_VOLONTEERS', data) }
      cb()
    })
  },

  createVolonteer: function(context, payload, cb) {
    var volonteerStore = context.getStore(VolonteerStore)
    var volonteer = volonteerStore.createVolonteer(payload)

    context.service.create('Volonteers', {}, volonteer, function (err) {
      if (err) { // Błąd po stronie serwera
        context.dispatch('VOLONTEER_CREATION_FAILURE', [volonteer])
      } else {
        context.dispatch('VOLONTEER_CREATION_SUCCESS', [volonteer])
      }
      cb()
    })
  },

  updateVolonteer: function(context, payload, cb) {
    var volonteerStore = context.getStore(VolonteerStore)
    var volonteer = volonteerStore.createVolonteer(payload)

    context.service.update('Volonteers', {}, volonteer, function (err) {
      if (err) { // Błąd po stronie serwera
        context.dispatch('VOLONTEER_UPDATE_FAILURE', [volonteer])
      } else {
        context.dispatch('VOLONTEER_UPDATE_SUCCESS', [volonteer])
      }
      cb()
    })
  },

  showActivity: function(context, payload, cb) {
    // Pobierz dane aktywności z bazy danych
    context.service.read('Activities', payload, {
      store: 'Activity',
      // Przekaż obiekt zalogowanego użytkownia niezbędy do podjęcia
      // decyzji o tym jakie dane mają być zwrócone.
      user: context.getUser()
    }, function (err, data) {
      if(err) { console.log(err) }
      else { context.dispatch('LOAD_ACTIVITY', data) }
      cb()
    })
  },

  showComments: function(context, payload, cb) {
    console.log('profile comment read')
    context.service.read('Comments', payload, {}, function (err, data) {
      context.dispatch('LOAD_COMMENTS', data);
      cb()
    })
  },

  createComment: function(context, payload, cb) {
    console.log('profile comment create')
    context.service.create('Comments', payload, {}, function (err, data) {
      if(err) { console.log(err) }
      else { context.dispatch('COMMENT_CREATED', data) }
      cb()
    })
  },

  profileCommentsUpdate: function(context, payload, cb) {
    console.log('profile comment update')
    context.service.update('Comments', payload, {}, function (err, data) {
      if(err) { console.log(err) }
      else { context.dispatch('COMMENT_UPDATED', payload) }
      cb()
    })
  },

  profileCommentsDelete: function(context, payload, cb) {
    console.log('profile comment delete')
    context.service.delete('Comments', payload, {}, function (err, data) {
      if(err) { console.log(err) }
      else { context.dispatch('COMMENT_DELETED', payload) }
      cb()
    })
  },

  showResults: function(context, state, cb) {

    var age_from = parseInt(state['age-from'])
    var age_to = parseInt(state['age-to'])

    var languages

    var query = {
      size: 100,
      query : {
        function_score: {
          query : {
            filtered : {
              query: {
                bool: {
                  should: [
                    { bool: {
                    should: [
                      { match: { first_name: state.name } },
                      { match: { last_name: state.name } },
                    ]
                  }},
                  { match: { email: state.email } },
                  { match: { address: state.address } },
                  { match: { address2: state.address } },
                  { match: { parish: state.parish } },
                  { match: { education: state.education } },
                  { match: { study_field: state.studies } },
                  { match: { departments: state.departments } },
                  { match: { comments: state.comments } },
                  { bool: {
                    should: [
                      { match: { interests: state.interests } },
                      { match: { experience: state.interests } }
                    ]
                  }}
                  ],
                  must: []
                },
              },
              filter : { },
            }
          },
          functions: [],
          score_mode: "avg"
        }
      },
      //explain: true,
      highlight : {
        fields : {
          experience: {},
          interests: {},
          departments: {},
          comments: {}
        }
      }
    }

    // Jęzkyki
    var language = state.language
    var language_keys = language ? Object.keys(language) : []
    language_keys.forEach(function(key){
      if(language[key]) {
        var range = {}
        range['languages.'+key+'.level'] = { gte: 1, lte: 10 }
        query.query.function_score.query.filtered.query.bool.must.push({range: range})
        query.query.function_score.functions.push({
          field_value_factor: {
            "field" : "languages."+key+".level",
            "modifier" : "square"
          }
        })
      }
    })

    if(state['other_val']) {
      var val = state['other_val']
      var range = {}
      range['languages.'+val+'.level'] = { gte: 1, lte: 10 }
      query.query.function_score.query.filtered.query.bool.must.push({range: range})
      query.query.function_score.functions.push({
        field_value_factor: {
          "field" : "languages."+val+".level",
          "modifier" : "square"
        }
      })
    }

    // Uczestnictwo w poprzednich Światowych Dniach Młodzieży
    var wyds = state.wyd
    var wyds_keys = wyds ? Object.keys(wyds) : []
    if(wyds_keys.length) {
      query.query.function_score.query.filtered.filter.and = []
      wyds_keys.forEach(function(key){
        if(wyds[key]) {
          query.query.function_score.query.filtered.filter.and.push({
            exists: { field: 'previous_wyd.'+key }
          })
        }
      })
    }

    if(age_from || age_to) {
      var today = new Date()
      var range = {
        range: {
          birth_date: {} }}

          if(age_from)
            range.range.birth_date.lte = new Date(new Date().setMonth(today.getMonth() - 12*(age_from-1)))
          if(age_to)
            range.range.birth_date.gte = new Date(new Date().setMonth(today.getMonth() - 12*age_to))

          if(query.query.filtered.filter.and) {
            query.query.filtered.filter.and.push(range)
          } else {
            query.query.filtered.filter.and = [range]
          }
    }

    var request = new XMLHttpRequest()
    request.open('POST', '/search', true)
    request.setRequestHeader('Content-Type', 'application/json')
    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        var resp = request.responseText;
        var json = JSON.parse(resp)

        console.log(json) // TODO: wyświetl wyniki

        context.dispatch('LOAD_RESULTS', json)
      } else {
        // We reached our target server, but it returned an error
      }
    }

    request.onerror = function() {
      // There was a connection error of some sort
    }

    request.send(JSON.stringify(query))

    // Usuń parametry
    var base = window.location.toString().replace(new RegExp("[?](.*)$"), '')
    var attributes = Object.keys(state).map(function(key) {
        return key + '=' + state[key];
    }).join('&')
    history.replaceState({}, "", base +'?'+ attributes)
  }
}
