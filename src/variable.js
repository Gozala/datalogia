import * as API from './api.js'
export const PROPERTY_KEY = Symbol.for('propertyKey')

let LAST_KEY = 0

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
    this.id = `$${++LAST_KEY}`
  }

  [Symbol.toPrimitive]() {
    return this.id
  }
  get [PROPERTY_KEY]() {
    return this.id
  }
  /**
   * @param {API.Constant} value
   */
  tryFrom(value) {
    return this.type.tryFrom(value)
  }
}

/**
 * @param {API.Variable & {[PROPERTY_KEY]?: PropertyKey}} variable
 * @returns {PropertyKey}
 */
export const getPropertyKey = (variable) => {
  const propertyKey = variable[PROPERTY_KEY]
  if (propertyKey) {
    return propertyKey
  } else {
    const bindingKey = `$${++LAST_KEY}`
    variable[PROPERTY_KEY] = bindingKey
    return bindingKey
  }
}

export const id = getPropertyKey

/**
 *
 * @param {API.Variable} variable
 * @returns {API.RowType}
 */
export const type = (variable) => variable.type
