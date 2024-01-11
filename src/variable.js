import * as API from './api.js'
import * as Row from './logic/row.js'
export const VARIABLE_ID = Symbol.for('propertyKey')

let LAST_ID = 0

/**
 * @template {API.Constant} T
 * @template {API.RowType} Type
 * @param {Type & API.Variable<T>} type
 */

export const create = (type) => new Variable(type)

/**
 * Predicate function that checks if given `term` is a {@link Variable}.
 *
 * @template {API.Constant} T
 * @param {unknown|API.Variable<T>} term
 * @returns {term is API.Variable<T>}
 */
export const is = (term) => {
  return (
    typeof term === 'object' &&
    term !== null &&
    'tryFrom' in term &&
    typeof term.tryFrom === 'function'
  )
}

/**
 * @template {API.Constant} T
 * @template {API.RowType} Type
 * @implements {API.Variable<T>}
 */
class Variable {
  /**
   * @param {Type & API.Variable<T>} type
   */
  constructor(type) {
    this.type = type
    this.id = ++LAST_ID
  }

  [Symbol.toPrimitive]() {
    return getPropertyKey(this)
  }
  get [VARIABLE_ID]() {
    return this.id
  }
  /**
   * @param {API.Constant} value
   */
  tryFrom(value) {
    return this.type.tryFrom(value)
  }

  toString() {
    return toString(this)
  }
}

/**
 * @param {API.Variable} variable
 * @returns {PropertyKey}
 */
export const getPropertyKey = (variable) => `$${getVariableID(variable)}`

/**
 * @param {API.Variable} variable
 * @returns {API.VariableID}
 */
const getVariableID = (variable) => {
  const id = variable[VARIABLE_ID]
  if (id != null) {
    return id
  } else {
    const id = ++LAST_ID
    variable[VARIABLE_ID] = id
    return id
  }
}

export const key = getPropertyKey
export const id = getVariableID

/**
 * @param {API.Variable} variable
 * @returns {API.RowType}
 */
export const type = (variable) => variable.type

/**
 * @param {API.Variable} variable
 * @returns {string}
 */
export const toString = (variable) => {
  const type = Row.Type.toString(variable.type)
  const id = String(getPropertyKey(variable))

  return `{variable:{type:${type}, id:"${id}"}}`
}

/**
 * @param {API.Variable} variable
 */
export const inspect = (variable) => ({
  Variable: {
    type: Row.Type.inspect(variable.type),
    id: getVariableID(variable),
  },
})
