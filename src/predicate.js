import * as API from './api.js'
import { resolveBinding } from './lib.js'

/**
 * Creates a dynamic predicate that can be used to filter results that do
 * not satisfy the given bindings.
 *
 * @template {API.Bindings} Input
 * @param {Input} bindings
 * @param {API.TryFrom<{Input: API.InferBindings<Input>, Self:{}}>} schema
 * @returns {API.Predicate<Input>}
 */
export const when = (bindings, schema) => new When(bindings, schema)

/**
 * @template {API.Bindings} Input
 * @implements {API.Predicate<Input>}
 */
class When {
  /**
   * @param {Input} bindings
   * @param {API.TryFrom<{Input: API.InferBindings<Input>, Self:{}}>} schema
   */
  constructor(bindings, schema) {
    this.bindings = bindings
    this.schema = schema
  }
  /**
   * @param {Input} input
   */
  match(input) {
    const payload = /** @type {Record<PropertyKey, API.Constant>} */ ({})

    for (const [key, value] of Object.entries(this.bindings)) {
      const result = resolveBinding(value, input)
      if (result.error) {
        return result
      } else {
        payload[key] = result.ok
      }
    }

    return this.schema.tryFrom(
      /** @type {API.InferBindings<Input>} */ (payload)
    )
  }
}
