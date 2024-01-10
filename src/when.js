import * as API from './api.js'
import * as Bindings from './bindings.js'

/**
 * Creates a dynamic predicate that can be used to filter results that do
 * not satisfy the given bindings.
 *
 * @template {API.Variables} Variables
 * @param {Variables} bindings
 * @param {API.TryFrom<{Input: API.InferBindings<Variables>, Self:{}}>} schema
 * @returns {API.When<Variables>}
 */
export const when = (bindings, schema) => new When(bindings, schema)

/**
 * @template {API.Variables} Variables
 * @implements {API.When<Variables>}
 */
class When {
  /**
   * @param {Variables} bindings
   * @param {API.TryFrom<{Input: API.InferBindings<Variables>, Self:{}}>} schema
   */
  constructor(bindings, schema) {
    this.bindings = bindings
    this.schema = schema
  }
  /**
   * @param {API.InferBindings<Variables>} input
   */
  match(input) {
    const payload = /** @type {Record<PropertyKey, API.Constant>} */ ({})

    for (const [key, variable] of Object.entries(this.bindings)) {
      const value = Bindings.get(input, variable)
      if (value == null) {
        return { error: new RangeError(`Unbound variable ${key}`) }
      } else {
        payload[key] = value
      }
    }

    return this.schema.tryFrom(
      /** @type {API.InferBindings<Variables>} */ (payload)
    )
  }
}
