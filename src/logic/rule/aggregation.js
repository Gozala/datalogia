import * as API from '../../api.js'
import { entries } from '../../object.js'
import * as Variable from '../../variable.js'

/**
 * @template {API.Constant} T
 * @template {API.Selector} Variables
 * @param {API.Aggregation<T, Variables>} source
 */
export const create = (source) => new Aggregation(source)

/**
 * @template {API.Constant} T
 * @template {API.Selector} Variables
 */
class Aggregation {
  /**
   * @param {API.Aggregation<T, Variables>} model
   */
  constructor(model) {
    this.model = model
  }
  get target() {
    return this.model.target
  }
  get relation() {
    return this.model.relation
  }
  get variables() {
    return this.model.variables
  }
  get aggregator() {
    return this.model.aggregator
  }
}

/**
 * @param {API.Negation} self
 * @param {Record<API.VariableID, {}>} from
 */
export const checkBindings = (self, from) => {
  for (const variable of variables(self)) {
    const id = Variable.key(variable)
    if (!(id in from)) {
      return false
    }
  }
  return true
}

/**
 * @param {API.Negation} self
 */
export const variables = function* (self) {
  for (const [id, term] of entries(self.variables)) {
    if (Variable.is(term)) {
      yield term
    }
  }
}

/**
 * @param {API.Aggregation} self
 * @param {Set<API.VariableID>} ids
 */
export const boundVariables = function* (self, ids) {
  const result = new Set()

  for (const variable of variables(self)) {
    const id = Variable.key(variable)
    if (ids.has(id)) {
      result.add(id)
    }
  }

  return result
}
