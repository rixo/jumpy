'use babel'

import {Machine} from 'xstate'
import {
  StateMachine as StatefulMachine,
  Api as GenericApi,
  Event,
  createStatefulMachine,
} from './util/stateful-machine'
import {Config} from './config'
import {Label} from './label-interface'
import {defaultActions, actionWrappers} from './state-machine-actions'

export type Data = {
  config: Config
  keys: string[]
  labels: Label[]
  visibleLabels: Label[]
  hiddenLabels: Label[]
  callbacks: {onJump?: Function, onCancel?: Function}
}

interface Api extends GenericApi {
  activate(): void
  cancel(): void
  back(): void
  reset(): void
  key(key: string): void
}

type StateMachine = StatefulMachine<Data, Api>

type ActionHandler = (data: Data, event: Event) => Data | void

export interface LabelAdapter {
  createLabels: ActionHandler
  destroyLabels: ActionHandler
  updateLabels: ActionHandler // update labels elements (css classes)
  jump: ActionHandler
  animateBeacon: ActionHandler
}

export interface FlashAdapter {
  flashNoMatch: ActionHandler
}

export interface StatusAdapter {
  statusIdle?: ActionHandler
  statusClear?: ActionHandler
  statusMatch?: ActionHandler
  statusNoMatch?: ActionHandler
}

export interface KeyboardAdapter {
  grabKeyboard: ActionHandler
  releaseKeyboard: ActionHandler
}

// manages jumpy classes to workspace
export interface FocusAdapter {
  focus: ActionHandler
  blur: ActionHandler
}

export interface Adapter extends
  FocusAdapter,
  LabelAdapter,
  KeyboardAdapter,
  FlashAdapter,
  StatusAdapter {}

const reset = ['resetKeys', 'resetLabels', 'statusClear']
const fsm = Machine({
  key: 'jumpy',
  initial: 'idle',
  strict: true,
  states: {
    idle: {
      onEntry: ['clearCallbacks'],
      on: {
        ACTIVATE: 'input',
      },
    },
    input: <any> {
      onEntry: [
        'setCallbacks',
        ...reset,
        'focus',
        'grabKeyboard',
        'createLabels',
      ],
      onExit: [
        'blur',
        'releaseKeyboard',
        'destroyLabels',
        'statusIdle',
      ],
      on: {
        CANCEL: 'idle',
        RESET: {'.wait_key': {actions: [...reset, 'updateLabels']}},
        KEY: {'.new_key': {actions: ['pushKey']}},
        BACK: [{
          target: '.wait_key',
          actions: [...reset, 'updateLabels'],
          cond: ({keys}) => keys.length === 1,
        }, {
          target: '.new_key',
          actions: ['popKey'],
          cond: ({keys}) => keys.length > 0,
        }, {
          target: 'idle',
        }],
        NO_MATCH: '.no_match',
        MATCH: '.partial_match',
        JUMP: {idle: {actions: ['maybeAnimateBeacon', 'jump']}},
      },
      initial: 'wait_key',
      states: {
        wait_key: {},
        // applyKey will reroute to partial_match/no_match
        new_key: {
          onEntry: ['applyKeys'],
        },
        no_match: {
          onEntry: [
            'popKey',
            'maybeFlashNoMatch',
            'updateLabels',
            'statusNoMatch',
          ],
        },
        partial_match: {
          onEntry: ['updateLabels', 'statusMatch'],
        }
      },
    },
  },
})

const ApiSpec = ({dispatch}) => ({
  activate: (onJump, onCancel) => {
    dispatch({type: 'ACTIVATE', onJump, onCancel})
  },
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
  callbacks: {},
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
