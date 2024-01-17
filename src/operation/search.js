import * as API from '../api.js'
import { entries } from '../object.js'
import * as Bindings from '../bindings.js'
import * as Formula from '../formula.js'

/**
 * @param {API.Search} source
 */
export const create = (source) => new Search(source)

/**
 *
 * @param {API.Search} search
 * @param {API.Bindings} bindings
 * @param {(instance: API.Bindings) => API.Result<{}, Error>} check
 * @returns {API.Result<{}, Error>}
 */
export const apply = (search, bindings, check) => {
  // First we resolve all the attributes we need.
  /** @type {API.Bindings} */
  const bound = {}
  for (const [name, term] of entries(search.variables)) {
    const binding = Bindings.get(bindings, term)
    if (!binding) {
      return { error: new RangeError(`Unbound variable ${String(name)}`) }
    }

    bound[name] = binding
  }

  // Then iterate over instances returned by the relation search.
  let next = bindings
  for (const instance of search.relation.search(bound)) {
    // Add links only when required ?
    if (instance.link) {
      next = Bindings.insert(
        next,
        { Link: { id: search.relationKey[0], alias: search.alias } },
        instance.link
      )
    }

    // For every instance we add all the attributes to our bindings
    for (const [id, value] of entries(instance.attributes)) {
      next = Bindings.set(next, id, value)
    }

    /** @type {API.Result<{}, Error>} */
    let conforms = { ok: {} }
    for (const formula of search.when) {
      conforms = Formula.conform(formula, next)
      if (conforms.error) {
        break
      }
    }

    // If instance does not satisfy the conditions we skip it.
    if (conforms.error) {
      continue
    }

    const result = check(next)
    if (result.error) {
      return result
    }
  }

  // If non of the instances satisfy the conditions we succeed.
  return { ok: {} }
}

class Search {
  /**
   * @param {API.Search} model
   */
  constructor(model) {
    this.model = model
  }

  get operation() {
    return this.model.operation
  }
  get variables() {
    return this.model.variables
  }
}
