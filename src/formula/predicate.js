import * as API from '../api.js'
import * as Term from '../term.js'
import { entries } from '../object.js'
import * as Bindings from '../bindings.js'

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
  /** @type {API.Bindings} */
  const input = {}
  for (const [name, term] of entries(predicate.variables)) {
    const binding = Bindings.get(bindings, term)
    if (binding == null) {
      return {
        error: new RangeError(
          `Failed to resolve ${Term.toString(
            term
          )} binding required by the predicate`
        ),
      }
    } else {
      input[name] = binding
    }
  }

  return check(predicate, /** @type {API.InferBindings<Variables>} */ (input))
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
   * @param {API.InferBindings<Variables>} input
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
export const toString = (self) => {
  const variable = []
  for (const [name, term] of entries(self.variables)) {
    variable.push(`${String(name)}: ${Term.toString(term)}`)
  }

  return `UDF({${variable.join(', ')}})`
}
