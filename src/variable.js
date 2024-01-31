import * as API from './api.js'
import * as Type from './type.js'
import * as Bindings from './bindings.js'

/**
 * Predicate function that checks if given `term` is a {@link API.Variable}.
 *
 * @param {unknown} term
 * @returns {term is API.Variable}
 */
export const is = (term) =>
  typeof (/** @type {{['?']?: {id?:unknown}}} */ (term)?.['?']?.id) === 'number'

/**
 * @template {API.Constant} T
 * @param {API.Variable<T>} variable
 * @returns {API.Type<T>|undefined}
 */
export const toType = (variable) => variable['?'].type

/**
 * @param {API.Variable} variable
 * @returns {API.VariableID}
 */
export const id = (variable) => variable['?'].id

/**
 * @param {API.Variable} variable
 * @returns
 */
export const toKey = (variable) => `$${id(variable)}`

/**
 *
 * @param {API.Variable} variable
 * @param {API.Constant} term
 */
export const check = (variable, term) => {
  const type = toType(variable)
  if (type) {
    return Type.check(type, term)
  } else {
    return { ok: Type.infer(term) }
  }
}

/**
 * @template {API.Constant} T
 * @param {API.Variable<T>} variable
 * @returns {API.Variable<T>}
 */
export const toJSON = (variable) => {
  const { type, id } = variable['?']
  const instance = {}
  if (type != null) {
    instance.type = Type.toJSON(type)
  }
  if (id != null) {
    instance.id = id
  }

  return { ['?']: instance }
}

export { toJSON as inspect }

/**
 * @param {API.Variable} variable
 */
export const toString = (variable) => JSON.stringify(toJSON(variable))

/**
 * @template {API.Constant} T
 * @param {API.Type<T>} [type]
 * @returns {Variable<T>}
 */
export const variable = (type) => new Variable(type)
export const boolean = Object.assign(() => variable(Type.Boolean), Type.Boolean)
export const int32 = Object.assign(() => variable(Type.Int32), Type.Int32)
export const int64 = () => Object.assign(variable(Type.Int64), Type.Int64)
export const float32 = () => Object.assign(variable(Type.Float32), Type.Float32)
export const string = Object.assign(() => variable(Type.String), Type.String)

export const bytes = Object.assign(() => variable(Type.Bytes), Type.Bytes)
export const link = Object.assign(() => variable(Type.Link), Type.Link)
export { int32 as integer, float32 as float }

/**
 * @template {API.Constant} T
 * @implements {API.Variable<T>}
 */
class Variable {
  static id = 0

  /**
   * @param {API.Type<T>} [type]
   */
  constructor(type, id = ++Variable.id) {
    this.type = type
    this.id = id
    this['?'] = this
  }
  toJSON() {
    return toJSON(this)
  }

  /**
   * @param {(value: T) => boolean} predicate
   * @returns {API.Clause}
   */
  confirm(predicate) {
    return new Constraint({ variable: this, predicate })
  }
}

/**
 * @template {API.Constant} T
 * @param {API.Variable<T>} variable
 * @param {(value:T) => boolean} predicate
 * @returns {API.Clause}
 */
export const confirm = (variable, predicate) =>
  new Constraint({ variable, predicate })

/**
 * @template {API.Constant} T
 */
class Constraint {
  /**
   * @param {object} model
   * @param {API.Variable<T>} model.variable
   * @param {(value: T) => boolean} model.predicate
   */
  constructor(model) {
    this.model = model
  }
  get Form() {
    return this
  }
  /**
   * @param {API.Bindings} bindings
   * @returns {API.Result<API.Unit, Error>}
   */
  confirm(bindings) {
    const value = Bindings.get(bindings, this.model.variable)
    if (value == null) {
      return { error: new RangeError(`Unbound variable`) }
    }

    if (this.model.predicate(value)) {
      return { ok: Type.Unit }
    } else {
      return { error: new Error(`Skip`) }
    }
  }
}

/**
 * @type {Variable<any>}
 */
export const _ = new Variable(undefined, 0)

/**
 * @param {API.Variable} variable
 * @returns {boolean}
 */
export const isBlank = (variable) => id(variable) === 0
