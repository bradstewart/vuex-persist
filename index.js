import Vuex from 'vuex'

const DEFAULT_STORAGE_KEY = '_vuex'
const REHYDRATE_STATE     = 'REHYDRATE_STATE'

/**
 * Creates a default storage object which persists JSON
 * strings to localStorage. 
 * 
 * @param  {String} key  storage key
 * @return {Object}      a storage object
 */
function createStorage (key) {
  return {
    key, 

    /**
     * Persists the state object.
     * 
     * @param  {Object} state 
     */
    write (state) {
      let data 

      try {
        data = JSON.stringify(state)
      } catch (err) {
        console.err(err)
        data = '{}'
      }

      localStorage.setItem(this.key, data)
    },

    /**
     * Reads the state object. 
     * 
     * @return {Object} 
     */
    read () {
      let data = localStorage.getItem(this.key) 

      return data 
        ? JSON.parse(data)
        : {}
    },
  }
}

/**
 * Create a new middleware object to persist state.
 * 
 * @param  {Object}            storage  needs #read() and #write(obj) methods
 * @param  {Function|String[]} filter   an array of keys or function to filter state
 * @return {Object}                     a Vuex mutation object
 */
function createMiddleware (storage, filter) {
  /**
   * Creates a new object containing only the specified keys
   * with the corresponding values of the original object. 
   */
  function filterByKeys (obj, keys) {
    let result = {}

    keys.forEach((key) => {
      let value = obj[key]
      if (value) result[key] = value
    })

    return result
  }

  return {
    onMutation ({ type, payload }, state) {
      // Skip the rehydration mutation and empty payloads.
      if (type === REHYDRATE_STATE || payload.length === 0) return 

      let filteredState = (typeof filter === 'function')
        ? filter(state)
        : filterByKeys(state, filter)

      storage.write(filteredState)
    }
  }
}

/**
 * Mutations used by VuexPersist. Do not create mutations with the same names. 
 */
const persistMutations = {
  [REHYDRATE_STATE] (state, storedState) {
    Object.assign(state, storedState)
  }
}

/**
 * Creates actions used by VuexPersist. Do not create actions with the same names.
 * 
 * @param  {Object} storage needs #read() and #write(obj) methods
 * @return {Object}         actions 
 */
function createActions (storage) {
  return {
    rehydrateState ({dispatch}) {
      dispatch(REHYDRATE_STATE, storage.read())
    }
  }
}

/**
 * Subclass of Vuex.Store which simply appends the required mutations
 * and middlewares to the arguments, and triggers the REHYDRATE_STATE 
 * mutation. 
 */
class Store extends Vuex.Store {
  constructor (options = {}) {
    let {
      actions     = {},
      mutations   = {},
      middlewares = [],
      key         = DEFAULT_STORAGE_KEY, // Storage key for the default storage adapter
      storage     = createStorage(key),  // Custom storage object with #read() and #write(state) methods
      filter      = (state) => state,    // Array of keys or filter function to limit persisted state
      rehydrate   = true,                // Automatically rehydrate state
    } = options

    super(Object.assign(options, {
      actions     : [createActions(storage)].concat(actions),
      mutations   : [persistMutations].concat(mutations),
      middlewares : [createMiddleware(storage, filter)].concat(middlewares),
    }))

    if (rehydrate) {
      this.actions.rehydrateState()
    }
  }
}

export default Store 
