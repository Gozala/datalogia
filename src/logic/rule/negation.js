import * as API from '../../api.js'
import { entries } from '../../object.js'
import * as Variable from '../../variable.js'

/**
 * @template {API.Selector} Variables
 * @param {API.Negation<Variables>} source
 */
export const create = (source) => new Negation(source)

/**
 * @template {API.Selector} Variables
 */
class Negation {
  /**
   * @param {API.Negation<Variables>} model
   */
  constructor(model) {
    this.model = model
  }
  get relation() {
    return this.model.relation
  }
  get variables() {
    return this.model.variables
  }
}

/**
 * @param {API.Negation} self
 * @param {Set<API.VariableID>} ids
 */
export const checkBindings = (self, ids) => {
  for (const variable of variables(self)) {
    const id = Variable.id(variable)
    if (!ids.has(id)) {
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
