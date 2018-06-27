'use babel'

export type Api = {[method: string]: Function}

type State = Object

export interface StateMachine<Data, A extends Api> {
  state: State
  data: Data
  api: A
  dispatch: (event: Event) => void
  // helper for tests
  getStatePath: () => string
}

type AnyStateMachine = StateMachine<any, any>

export type Event = {type: string, [prop: string]: any}

type Params = {
  fsm,
  defaultActions,
  actionWrappers,
  adapter,
  ApiSpec,
  data,
}

// Assembles a stateful state machine from a stateless xstate Machine,
// action handlers, and initial data
export const createStatefulMachine = <Data, A extends Api> (params: Params) => {
  const {fsm, data, ApiSpec} = params

  const stateMachine = <StateMachine<Data, A>> {
    state: fsm.initialState,
    data,
    getStatePath: () => getFirstPath(stateMachine.state.value),
  }

  stateMachine.dispatch = createDispatch(stateMachine, params)

  stateMachine.api = <A> createApi(stateMachine, ApiSpec)

  return stateMachine
}

// Creates dispatch function for the given sateful machine
// and action handlers.
//
// The `dispatch` accepts events that are used to transition
// its internal state, and it executes resulting actions &
// activities.
//
const createDispatch = (sm: AnyStateMachine, {
  fsm: machine,
  defaultActions,
  actionWrappers,
  adapter,
}) => {
  const processActions = createActionProcessor({
    defaultActions,
    actionWrappers,
    adapter,
  })

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
  const dispatch = function(event: Event) {
    sm.state = machine.transition(sm.state, event, sm.data)
    const queue = []
    const dispatchAfter = (...args) => {
      queue.push(args)
    }
    sm.data = processActions(
      sm.state,
      sm.data,
      event,
      dispatchAfter,
    )
    queue.forEach(args => {
      (<any> dispatch)(...args)
    })
  }

  return dispatch
}

const createActionProcessor = ({
  defaultActions,
  actionWrappers,
  adapter,
}) => {
  const getHandler = (action, dispatch) => {
    let handler = adapter[action] || defaultActions[action]
    const wrapper = actionWrappers[action]
    if (wrapper) {
      return wrapper(dispatch, handler)
    } else if (handler) {
      return handler
    } else {
      throw new Error('Missing handler for action: ' + action)
    }
  }
  return (state, data, event, dispatch) => {
    for (const action of state.actions) {
      if (typeof action !== 'string') {
        throw new Error('Unsuppoted action type: ' + typeof action)
      }
      const handler = getHandler(action, dispatch)
      const result = handler(data, event, {state, dispatch})
      if (result !== undefined) {
        data = result
      }
    }
    return data
  }
}

// Utility to get a path string from a state value object (useful
// for testing).
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

const concatAll = (a, b) => [...a, ...b]

// [name, value][] => {[name]: [value]}
const mergeObject = (o, [name, value]) => {
  o[name] = value
  return o
}

const resolveDispatchStrings = ({dispatch}) => entry => {
  const [name, handler] = entry
  if (typeof handler === 'string') {
    const fn = () => {dispatch(handler)}
    return [name, fn]
  } else {
    return entry
  }
}

type SpecCreator = (stateMachine: AnyStateMachine) => {[name: string]: Function|string}

// Resolves shortcut notations {name: 'EVENT'}
// to {name: () => {dispatch('EVENT')}}
export const createApi = (
  stateMachine: AnyStateMachine,
  ...specCreators: SpecCreator[]
) =>
  specCreators
    .map(createSpec => createSpec(stateMachine)) // => [{}, {}]
    .map(Object.entries) // => [[name, handler][], [name, handler][]]
    .reduce(concatAll, []) // => [name, handler][]
    .map(resolveDispatchStrings(stateMachine))
    .reduce(mergeObject, {}) // => {a: () => {}, b: () => {}, ...}
