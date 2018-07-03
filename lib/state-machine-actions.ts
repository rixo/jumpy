'use babel'

import {Data} from './state-machine'
import {filterLabels} from './label-matcher'

const applyKeys = (data: Data, event, {dispatch}) => {
  const nextData = filterLabels(data)
  const {visibleLabels: {length: n0}} = data
  const {
    config: {numKeys},
    keys: {length: nKeys},
    visibleLabels: {length: n1},
  } = nextData
  if (event.type === 'BACK') {
    dispatch({...event, type: 'MATCH'})
  } else if (n1 === 1 && nKeys === numKeys) {
    const label = nextData.visibleLabels[0]
    dispatch({type: 'JUMP', label})
    return nextData
  } else if (n1 === 0 || n1 >= n0) {
    // no match
    dispatch({...event, type: 'NO_MATCH'})
    return {
      ...nextData,
      keys: data.keys,
      visibleLabels: data.visibleLabels,
      hiddenLabels: data.hiddenLabels,
    }
  } else {
    dispatch({...event, type: 'MATCH'})
  }
  return nextData
}

const statusActions = {
  statusIdle: () => {},
  statusClear: () => {},
  statusMatch: () => {},
  statusNoMatch: () => {},
}

const ifConfigStatus = ({}, handler) => (data: Data, event) => {
  const {config: {statusBar}} = data
  if (statusBar) {
    return handler(data, event)
  }
}
const statusWrappers = Object.keys(statusActions)
  .reduce((wrappers, action) => {
    wrappers[action] = ifConfigStatus
    return wrappers
  }, {})

const callbackActions = {
  setCallbacks: (data, {onJump, onCancel}) => ({
    ...data,
    callbacks: {onJump, onCancel},
  }),
  clearCallbacks: (data) => ({...data, callbacks: {}}),
}

const keyActions = {
  pushKey: (data, {key}) => ({...data, keys: [...data.keys, key]}),
  popKey: (data) => ({...data, keys: [...data.keys.slice(0, -1)]}),
  resetKeys: (data) => ({...data, keys: []}),
}

export const defaultActions = {
  ...statusActions,
  ...callbackActions,
  ...keyActions,
  applyKeys,
  resetLabels: (data) => ({
    ...data,
    visibleLabels: data.labels,
    hiddenLabels: [],
  }),
  maybeFlashNoMatch: (data, event, utils) => {
    const {getHandler} = utils
    if (data.config.flashNoMatch) {
      const handler = getHandler('flashNoMatch')
      if (handler) {
        return handler(data, event, utils)
      }
    }
  },
  maybeAnimateBeacon: (data, event, utils) => {
    const {getHandler} = utils
    if (data.config.useHomingBeaconEffectOnJumps) {
      const handler = getHandler('animateBeacon')
      if (handler) {
        return handler(data, event, utils)
      }
    }
  },
}

export const actionWrappers = {
  ...statusWrappers,
  jump: ({}, handler) => (data, event) => {
    const {onJump} = data.callbacks
    if (onJump) {
      const abort = onJump(event) === false
      if (abort) {
        return
      }
    }
    return handler(data, event)
  },
}
