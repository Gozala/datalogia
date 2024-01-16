import * as API from './api.js'
import * as Variable from './variable.js'
import * as Constant from './constant.js'

/**
 * @returns {{}}
 */
export const create = () => ({})

/**
 * @template {API.Bindings} Bindings
 * @template {PropertyKey} Key
 * @template {API.Constant} Value
 * @param {Bindings} bindings
 * @param {Key} key
 * @param {Value} value
 * @returns {Bindings & {[K in Key]: Value}}
 */
export const set = (bindings, key, value) => ({ ...bindings, [key]: value })

/**
 * @template {API.Bindings} Bindings
 * @param {Bindings} bindings
 * @template {API.Constant} Value
 * @param {API.BindingKey} key
 * @param {Value} value
 */
export const insert = (bindings, key, value) =>
  set(bindings, formatKey(key), value)

/**
 *
 * @param {API.BindingKey} key
 * @returns
 */
const formatKey = (key) => {
  if (key.Relation) {
    return `?${key.Relation.alias ?? ''}@${key.Relation.id}${key.Relation.row}}`
  } else if (key.Link) {
    return `/${key.Link.alias ?? ''}@${key.Link.id}`
  } else {
    return `*${key.Aggregate.alias ?? ''}@${key.Aggregate.id}${String(
      Variable.toKey(key.Aggregate.variable)
    )}`
  }
}

/**
 * @param {API.VariableVariant} variable
 * @returns {API.BindingKey}
 */
export const toBindingKey = (variable) => {
  if (variable.Row) {
    return { Relation: variable.Row }
  } else if (variable.Link) {
    return { Link: variable.Link }
  } else {
    return { Aggregate: variable.Aggregate }
  }
}

/**
 * @template {API.Bindings} Bindings
 * @template {API.Constant} T
 * @param {Bindings} bindings
 * @param {API.Term<T>} term
 * @returns {T|undefined}
 */
export const get = (bindings, term) => {
  // If term is a variable we attempt to resolve the value bound to it.
  // If the variable is unbound we return a range error.
  if (Variable.is(term)) {
    const key = Variable.toKey(term)
    if (key in bindings) {
      return /** @type {T|undefined} */ (bindings[key])
    } else {
      return undefined
    }
  }
  // If the term is a constant we simply return the term
  else {
    return term
  }

  // PomoDB also seems to handle CID and aggregator terms differently. As far
  // as I can understand it simply uses separate key space in the map for them.
  // we may have to adopt some of that here as well.
}

/**
 * @template {API.Bindings} Bindings
 * @template {API.Constant} T
 * @param {Bindings} bindings
 * @param {API.ExtendedTerm} term
 * @returns {API.Result<T, RangeError>}
 */
export const resolve = (bindings, term) => {
  if (Constant.is(term)) {
    return { ok: /** @type {T} */ (term) }
  } else {
    const binding = get(bindings, formatKey(toBindingKey(term)))
    if (binding != null) {
      return { ok: /** @type {T} */ (binding) }
    } else {
      return { error: new RangeError(`Unbound variable ${term}`) }
    }
  }
}
