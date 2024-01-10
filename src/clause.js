import * as API from './api.js'
import * as Variable from './variable.js'
import * as Bindings from './bindings.js'

/**
 * @param {API.Clause} query
 * @returns {Iterable<API.Variable>}
 */
export const variables = function* (query) {
  if (query.and) {
    for (const conjunct of query.and) {
      yield* variables(conjunct)
    }
  } else if (query.or) {
    for (const disjunct of query.or) {
      yield* variables(disjunct)
    }
  } else if (query.not) {
    yield* variables(query.not)
  } else if (query.when) {
  } else if (query.apply) {
    for (const binding of Object.values(query.apply.input)) {
      if (Variable.is(binding)) {
        yield binding
      }
    }
  } else {
    const [entity, attribute, value] = query.match
    if (Variable.is(entity)) {
      yield entity
    }
    if (Variable.is(attribute)) {
      yield attribute
    }
    if (Variable.is(value)) {
      yield value
    }
  }
}

/**
 * @param {API.Clause} clause
 * @param {API.Variable} variable
 * @param {API.Bindings} frame
 */
export const isDependent = (clause, variable, frame) => {
  for (const each of variables(clause)) {
    if (each === variable) {
      return true
    } else {
      const binding = Bindings.get(frame, each)
      if (binding != null) {
        // @ts-ignore - not sure how can we resolve variable to a query
        if (isDependent(binding.ok, variable, frame)) {
          return true
        }
      }
    }
  }
  return false
}
