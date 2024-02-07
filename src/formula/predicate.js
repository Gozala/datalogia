import * as API from '../api.js'
import * as Term from '../term.js'
import { entries } from '../object.js'
import * as Bindings from '../bindings.js'
import * as Selector from '../selector.js'

/**
 * @template {API.Selector} Variables
 * @param {API.Predicate<Variables>} source
 */
export const create = (source) => new Predicate(source)

/**
 * @template {API.Selector} Variables
 * @param {API.Predicate<Variables>} predicate
 * @param {API.Bindings} bindings
 * @returns {API.Result<{}, Error>}
 */
export const conform = (predicate, bindings) => {
  const result = Selector.trySelect(predicate.variables, bindings)
  if (result.error) {
    return result
  }

  return check(predicate, result.ok)
}

/**
 * @template {API.Selector} Variables
 * @param {API.Predicate<Variables>} predicate
 * @param {API.InferBindings<Variables>} input
 */
export const check = (predicate, input) => predicate.schema.tryFrom(input)

/**
 * @template {API.Selector} Variables
 * @implements {API.Predicate<Variables>}
 */
class Predicate {
  /**
   * @param {API.Predicate<Variables>} model
   */
  constructor(model) {
    this.model = model
  }
  get variables() {
    return this.model.variables
  }

  get schema() {
    return this.model.schema
  }

  /**
   * @param {API.Bindings} input
   */
  match(input) {
    return conform(this, input)
  }

  /**
   * @param {API.InferBindings<Variables>} input
   */
  isSatisfied(input) {
    return check(this, input)
  }
}

/**
 * @param {API.Predicate} self
 */
export const toString = (self) => `UDF({${Selector.toString(self.variables)}})`
