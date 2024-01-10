import * as API from '../../api.js'
import { entries } from '../../object.js'
import * as Variable from '../../variable.js'

/**
 * @template {API.Selector} Variables
 * @param {API.RelationPredicate<Variables>} source
 */
export const create = (source) => new RelationPredicate(source)

/**
 * @template {API.Selector} Variables
 */
class RelationPredicate {
  /**
   * @param {API.RelationPredicate<Variables>} model
   */
  constructor(model) {
    this.model = model
  }
  get relation() {
    return this.model.relation
  }
  get link() {
    return this.model.link
  }
  get variables() {
    return this.model.variables
  }
}

/**
 * @param {API.RelationPredicate} self
 */
export const variables = function* (self) {
  for (const [, term] of entries(self.variables)) {
    if (Variable.is(term)) {
      yield term
    }
  }
}

/**
 * @param {API.RelationPredicate} self
 * @param {Set<API.VariableID>} ids
 */
export const boundVariables = function* (self, ids) {
  const result = new Set()

  if (Variable.is(self.link)) {
    const id = Variable.id(self.link)
    if (ids.has(id)) {
      result.add(id)
    }
  }

  for (const variable of variables(self)) {
    const id = Variable.id(variable)
    if (ids.has(id)) {
      result.add(id)
    }
  }

  return result
}
