import * as API from './api.js'
import * as Bindings from './bindings.js'
import * as Term from './term.js'

/**
 *
 * @param {API.Term<string>} text
 * @param {API.Term<string>} prefix
 * @returns {API.Clause}
 */
export const startsWith = (text, prefix) => ({
  when: {
    /**
     * @param {API.Bindings} bindings
     */
    match(bindings) {
      const source = Bindings.get(bindings, text)
      if (source == null) {
        return {
          error: new RangeError(`Unbound variable ${Term.toString(text)}`),
        }
      }
      const slice = Bindings.get(bindings, prefix)
      if (slice == null) {
        return {
          error: new RangeError(`Unbound variable ${Term.toString(prefix)}`),
        }
      }

      if (source.startsWith(slice)) {
        return { ok: {} }
      } else {
        return {
          error: new RangeError(`${source} does not start with ${slice}`),
        }
      }
    },
  },
})
