import * as API from '../api.js'

/**
 * @param {API.Stratum} source
 * @returns
 */
export const create = (source) => new Stratum(source)

class Stratum {
  /**
   * @param {API.Stratum} model
   */
  constructor(model) {
    this.model = model
  }
  get recursive() {
    return this.model.recursive
  }
  get relations() {
    return this.model.relations
  }
  get expressions() {
    return this.model.expressions
  }

  propositions() {
    return propositions(this)
  }

  rules() {
    return rules(this)
  }
}

/**
 * @param {API.Stratum} self
 */
export const propositions = function* (self) {
  for (const expression of self.expressions) {
    if (expression.Association) {
      yield expression.Association
    }
  }
}

/**
 * @param {API.Stratum} self
 */
export const rules = function* (self) {
  for (const expression of self.expressions) {
    if (expression.Rule) {
      yield expression.Rule
    }
  }
}
