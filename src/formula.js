import * as API from './api.js'
import * as Predicate from './formula/predicate.js'
import * as NotIn from './formula/not-in.js'
import * as Equality from './formula/equality.js'
import * as Bindings from './bindings.js'

/**
 *
 * @param {API.Term} operand
 * @param {API.Term} modifier
 * @returns {API.Formula}
 */
export const equality = (operand, modifier) => ({
  Equality: Equality.create({ operand, modifier }),
})

/**
 * @template {API.Variables} Rows
 * @param {API.RelationID} id
 * @param {API.Version} version
 * @param {Rows} rows
 * @param {API._Relation} relation
 * @returns {API.Formula}
 */
export const notIn = (id, version, rows, relation) => ({
  NotIn: NotIn.create({ relationKey: [id, version], rows, relation }),
})

/**
 * @template {API.Selector} Variables
 * @param {Variables} variables
 * @param {API.TryFrom<{Self:{}, Input: API.InferBindings<Variables>}>} schema
 * @returns {API.Formula}
 */

export const predicate = (variables, schema) => ({
  Predicate: Predicate.create(
    /** @type {API.Predicate} */ ({ variables, schema })
  ),
})

/**
 * @param {API.Formula} formula
 */
export const toString = (formula) => {
  if (formula.Equality) {
    return Equality.toString(formula.Equality)
  } else if (formula.NotIn) {
    return NotIn.toString(formula.NotIn)
  } else {
    return Predicate.toString(formula.Predicate)
  }
}

/**
 *
 * @param {API.Formula} formula
 * @param {API.Bindings} bindings
 * @returns {API.Result<{}, Error>}
 */
export const conform = (formula, bindings) => {
  if (formula.Equality) {
    return Equality.conform(formula.Equality, bindings)
  } else if (formula.NotIn) {
    return NotIn.conform(formula.NotIn, bindings)
  } else if (formula.Predicate) {
    return Predicate.conform(formula.Predicate, bindings)
  }

  return { error: new RangeError(`Unrecognized formula ${formula}`) }
}
