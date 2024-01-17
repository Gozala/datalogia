import * as API from '../api.js'

/**
 * @template {API.Selector} Variables
 * @param {API.RuleModel<Variables>} source
 */
export const create = (source) => new Rule(source)

/**
 * @template {API.Selector} Variables
 */
class Rule {
  /**
   * @param {API.RuleModel<Variables>} model
   */
  constructor(model) {
    this.model = model
  }
  get head() {
    return this.model.head
  }
  get variables() {
    return this.model.variables
  }
  get body() {
    return this.model.body
  }
}

/**
 * @param {API.RuleModel} self
 */
export const variablePredicates = function* (self) {
  for (const term of self.body) {
    if (term.VariablePredicate) {
      yield term.VariablePredicate
    }
  }
}

/**
 * @param {API.RuleModel} self
 */
export const relationPredicates = function* (self) {
  for (const term of self.body) {
    if (term.RelationPredicate) {
      yield term.RelationPredicate
    }
  }
}

/**
 * @param {API.RuleModel} self
 */
export const negations = function* (self) {
  for (const term of self.body) {
    if (term.Negation) {
      yield term.Negation
    }
  }
}

/**
 * @param {API.RuleModel} self
 */
export const aggregations = function* (self) {
  for (const term of self.body) {
    if (term.Aggregation) {
      yield term.Aggregation
    }
  }
}
