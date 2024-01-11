import * as API from '../../api.js'
import { entries } from '../../object.js'
import * as Variable from '../../variable.js'

/**
 * @template {API.Selector} Variables
 * @param {API.VariablePredicate<Variables>} source
 */
export const create = (source) => new VariablePredicate(source)

/**
 * @template {API.Selector} Variables
 */
class VariablePredicate {
  /**
   * @param {API.VariablePredicate<Variables>} model
   */
  constructor(model) {
    this.model = model
  }
  get predicate() {
    return this.model.predicate
  }
  get variables() {
    return this.model.variables
  }
}

/**
 * @param {API.VariablePredicate} self
 */
export const variables = function* (self) {
  for (const [id, term] of entries(self.variables)) {
    if (Variable.is(term)) {
      yield term
    }
  }
}

/**
 * @param {API.VariablePredicate} self
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
