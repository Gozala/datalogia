import * as API from './api.js'
import * as Term from './term.js'
import * as Variable from './variable.js'
import * as Constant from './constant.js'
import * as Bindings from './bindings.js'

/**
 * @template {API.Selector} Selector
 * @param {Selector} selector
 * @param {API.Bindings} bindings
 * @returns {API.InferBindings<Selector>}
 */
export const select = (selector, bindings) =>
  Array.isArray(selector)
    ? selector.map((term) =>
        Term.is(term) ? Bindings.get(bindings, term) : select(term, bindings)
      )
    : Object.fromEntries(
        Object.entries(selector).map(([key, term]) => {
          if (Term.is(term)) {
            const value = Bindings.get(bindings, term)
            return [key, value]
          } else {
            return [key, select(term, bindings)]
          }
        })
      )

/**
 * @template {API.Selector} Selector
 * @param {Selector} selector
 * @param {API.Bindings} bindings
 * @param {string[]} path
 * @returns {API.Result<API.InferBindings<Selector>, Error>}
 */
export const trySelect = (selector, bindings, path = []) => {
  const entries = []
  for (const [key, term] of Object.entries(selector)) {
    if (Term.is(term)) {
      const value = Bindings.get(bindings, term)
      if (value === null) {
        return {
          error: new RangeError(
            `Unbound variable at ${[...path, key].join('.')}`
          ),
        }
      } else {
        entries.push([key, value])
      }
    } else {
      const result = trySelect(term, bindings, [...path, key])
      if (result.error) {
        return result
      } else {
        entries.push([key, result.ok])
      }
    }
  }
  return { ok: Object.fromEntries(entries) }
}

/**
 * @param {API.Selector} selector
 * @returns {Iterable<API.Variable>}
 */
export const variables = function* (selector) {
  for (const term of Object.values(selector)) {
    if (Variable.is(term)) {
      yield term
    } else if (!Constant.is(term)) {
      yield* variables(term)
    }
  }
}

/**
 * @param {API.Selector} selector
 * @returns {Iterable<[string[], API.Term]>}
 */
export const entries = (selector) => entriesIn([], selector)

/**
 * @param {string[]} path
 * @param {API.Selector} selector
 * @returns {Iterable<[string[], API.Term]>}
 */
const entriesIn = function* (path, selector) {
  for (const [key, term] of Object.entries(selector)) {
    if (Variable.is(term) || Constant.is(term)) {
      yield [[...path, key], term]
    } else {
      yield* entriesIn([...path, key], term)
    }
  }
}

/**
 *
 * @param {API.Selector} selector
 * @param {string[]} path
 * @returns {API.Term}
 */
export const at = (selector, path) => {
  /** @type {any} */
  let object = selector
  for (const key of path) {
    object = object[key]
    if (object == null) {
      break
    }
  }
  return object
}

/**
 * @param {API.Selector} selector
 * @returns {API.Selector}
 */
export const toJSON = (selector) =>
  Object.fromEntries(
    Object.entries(selector).map(([id, term]) => [
      id,
      Term.is(term) ? Term.toJSON(term) : toJSON(term),
    ])
  )

/**
 * @param {API.Selector} variables
 * @returns {string}
 */
export const toString = (variables) => {
  const parts = []
  for (const [id, term] of Object.entries(variables)) {
    parts.push(`${id}:${Term.is(term) ? Term.toString(term) : toString(term)}`)
  }

  return `{${parts.join(', ')}}`
}
