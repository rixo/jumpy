'use babel'

import {Machine} from 'xstate'
import {
  StateMachine as GenericStateMachine,
  Api as GenericApi,
  Event,
  createStatefulMachine,
} from './state-machine/util'
import {Config} from './config'
import {Label} from './label-interface'
import {filterLabels} from './label-matcher'

export type Data = {
  config: Config
  keys: string[]
  labels: Label[]
  visibleLabels: Label[]
  hiddenLabels: Label[]
}

interface Api extends GenericApi {
  activate(): void
  cancel(): void
  back(): void
  reset(): void
  key(key): void
}

type StateMachine = GenericStateMachine<Data, Api>

type ActionHandler = (data: Data, event: Event) => Data | void

export type Adapter = {
  grabKeyboard: ActionHandler
  releaseKeyboard: ActionHandler
  createLabels: ActionHandler
  destroyLabels: ActionHandler
  filterLabels?: ActionHandler
  // update labels elements (css classes)
  updateLabels: ActionHandler
  jump: ActionHandler
  statusIdle: ActionHandler
  statusMatch: ActionHandler
  statusNoMatch: ActionHandler
}

const fsm = Machine({
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

const ApiSpec = ({dispatch}) => ({
  activate: 'ACTIVATE',
  back: 'BACK',
  reset: 'RESET',
  cancel: 'CANCEL',
  key: key => {
    dispatch({type: 'KEY', key})
  },
})

const Data = (config: Config): Data => ({
  config,
  keys: [],
  labels: [],
  hiddenLabels: [],
  visibleLabels: [],
})

type Params = {
  config: Config,
  adapter: Adapter
}

// lower level than Api, useful for testing
export const createStateMachine: (params: Params) => StateMachine =
  ({config, adapter}) => createStatefulMachine({
    fsm,
    defaultActions,
    actionWrappers,
    adapter,
    ApiSpec,
    data: Data(config),
  })

export const createStateMachineApi: (params: Params) => Api = params =>
  createStateMachine(params).api
