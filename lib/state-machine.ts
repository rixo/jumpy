'use babel'

import {Machine} from 'xstate'
import {Config} from './config'
import {createLabelMatcher} from './label-matcher'

type Label = any

type Data = {
  config: Config
  keys: string[]
  labels: Label[]
  hiddenLabels: Label[]
  visibleLabels: Label[]
}

type Adapter = {
  grabKeyboard: (data: Data) => Data | void
  releaseKeyboard: (data: Data) => Data | void
  createLabels: (data: Data) => Data | void
  destroyLabels: (data: Data) => Data | void
  filterLabels?: (data: Data) => Data | void
  // update labels elements (css classes)
  updateLabels: (data: Data) => Data | void
  jump: (data: Data) => Data | void
  statusIdle: (data: Data) => Data | void
  statusMatch: (data: Data) => Data | void
  statusNoMatch: (data: Data) => Data | void
}

type Api = {
  getState(): any // for tests
  activate(): void
  cancel(): void
  back(): void
  reset(): void
  key(key): void
}

type Params = {
  config: Config,
  adapter: Adapter
}

const fsm = Machine(<any> {
  key: 'jumpy',
  initial: 'idle',
  strict: true,
  states: {
    idle: {
      on: {
        ACTIVATE: 'input',
      },
    },
    input: {
      onEntry: ['grabKeyboard', 'createLabels', 'resetKeys'],
      onExit: ['releaseKeyboard', 'destroyLabels', 'statusIdle'],
      on: {
        CANCEL: 'idle',
        RESET: {'.first_key': {actions: ['resetKeys', 'filterLabels', 'updateLabels']}},
        JUMP: [
          {target: 'idle', actions: ['jump']},
        ],
        NO_MATCH: {'.no_match': {actions: ['statusNoMatch']}},
        MATCH: {'.partial_match': {actions: ['statusMatch']}},
      },
      initial: 'first_key',
      states: {
        first_key: {
          on: {
            // BACK: '#jumpy.idle',
            KEY: {first_key: {actions: ['pushKey', 'filterLabels', 'updateLabels']}},
          },
        },
        partial_match: {
          on: {
            KEY: {partial_match: {actions: ['pushKey', 'filterLabels', 'updateLabels']}},
          },
        },
        no_match: {
          on: {
            KEY: {no_match: {actions: ['popKey', 'pushKey', 'filterLabels', 'updateLabels']}},
          },
        },
      },
    },
  },
})

const defaultActions = {
  pushKey: (data, {key}) => ({...data, keys: [...data.keys, key]}),
  popKey: (data) => ({...data, keys: [...data.keys.slice(0, -1)]}),
  resetKeys: (data) => ({...data, keys: []}),
}

const actionWrappers = {
  filterLabels: (dispatch, handler) => (data, event) => {
    const {visibleLabels: {length: n0}} = data
    // if filterLabels is provided in adapter, it completely
    // overrides filtering logic (only)
    const actualFilterLabels = handler || filterLabels
    const newData = actualFilterLabels(data, event)
    const {
      config: {numKeys},
      keys: {length: nKeys},
      visibleLabels: {length: n1},
    } = newData
    if (nKeys > 0) {
      if (n1 === 1 && nKeys === numKeys) {
        const label = newData.visibleLabels[0]
        dispatch({type: 'JUMP', label})
      } else if (n0 <= n1) {
        dispatch({...event, type: 'NO_MATCH'})
      } else {
        dispatch({...event, type: 'MATCH'})
      }
    }
    return newData
  }
}

export const createStateMachine: (config: Params) => Api = ({
  config,
  adapter,
}) => {
  let state = fsm.initialState

  let data: Data = {
    config,
    keys: [],
    labels: [],
    hiddenLabels: [],
    visibleLabels: [],
  }

  // We want to keep our dispatch chain synchronous.
  //
  // For example, api.key() transisions by emitting KEY event, that in turn
  // fires filterLabels action, in which we will emit MATCH/NO_MATCH/JUMP. This
  // will trigger a transition from current state to partial_match/no_match.
  //
  // Here's an example dispatch chain that we get:
  //
  //     KEY@first_key -> MATCH@first_key -> partial_match
  //
  // We won't have "background" treatments, like downloading, in Jumpy. On
  // the contrary, this state machine is just for UI actions that we would
  // want instantaneous. So we don't want to needlessly introduce complexity
  // by making api.* methods or dispatch return asynchronously.
  //
  // We're still using a dispatch queue to ensure that the "extended state"
  // (named data here) returned by a given action has been updated
  // *before* any nested dispatch is executed.
  //
  const dispatch = event => {
    // console.log('dispatch', event)
    state = fsm.transition(state, event)
    const queue = []
    const dispatchAfter = (...args) => {
      queue.push(args)
    }
    data = processActions(adapter, state, data, event, dispatchAfter)
    queue.forEach(args => {
      (<any> dispatch)(...args)
    })
  }

  const api = <Api> dispatcher(dispatch, {
    getState: () => state.value,
    getFirstState: () => getFirstPath(state.value),
    activate: 'ACTIVATE',
    back: 'BACK',
    reset: 'RESET',
    cancel: 'CANCEL',
    key: key => {
      dispatch({type: 'KEY', key})
    },
  })

  return api
}

const dispatcher = (
  dispatch: Function,
  o: {[name: string]: Function|string},
): {[name: string]: Function} => {
  Object.entries(o).forEach(([method, handler]) => {
    if (typeof handler === 'string') {
      o[method] = () => {
        dispatch(handler)
      }
    }
  })
  return <{[name: string]: Function}> o
}

const filterLabels = data => {
  const {labels, keys} = data
  let visibleLabels, hiddenLabels
  if (keys.length === 0) {
    visibleLabels = labels
    hiddenLabels = []
  } else {
    const test = createLabelMatcher(data)
    visibleLabels = labels
    hiddenLabels = []
    visibleLabels = data.visibleLabels.filter(label => {
      if (test(label)) {
        return true
      } else {
        hiddenLabels.push(label)
        return false
      }
    })
  }
  return {
    ...data,
    visibleLabels,
    hiddenLabels,
  }
}

const processActions = (
  adapter,
  state,
  data: Data,
  event,
  dispatch,
): Data => {
  for (const action of state.actions) {
    if (typeof action !== 'string') {
      throw new Error('Unsuppoted action type: ' + typeof action)
    }
    let handler = adapter[action] || defaultActions[action]
    const wrapper = actionWrappers[action]
    if (wrapper) {
      handler = wrapper(dispatch, handler)
    } else if (!handler) {
      throw new Error('Missing handler for action: ' + action)
    }
    const result = handler(data, event, dispatch)
    if (result !== undefined) {
      data = result
    }
  }
  return data
}

const getFirstPath = obj => {
  let cursor = obj
  const steps = []
  while (typeof cursor === 'object') {
    const entry = Object.entries(cursor)[0]
    if (!entry) {
      break
    }
    const [step, next] = entry
    steps.push(step)
    cursor = next
  }
  if (typeof cursor === 'string') {
    steps.push(cursor)
  }
  return steps.join('.')
}
