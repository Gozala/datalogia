import * as API from '../api.js'
import { entries } from '../object.js'
import * as Term from '../term.js'
import * as Formula from '../formula.js'
import * as Bindings from '../bindings.js'
import * as Association from '../association.js'
import * as Selector from '../selector.js'
import * as Where from '../where.js'

/**
 * @template {API.Selector} Rows
 * @param {API.Select<Rows>} source
 */
export const create = (source) => new Select(source)

/**
 * Takes the `Select` operation and executes it against the given `bindings`.
 * If successful `select.relation` will be updated with the new `instance`
 * corresponding to this select otherwise an error will be returned.
 *
 * @template {API.Selector} Rows
 * @param {API.Select<Rows>} select
 * @param {API.Bindings} bindings
 */
export const apply = ({ formulae, rows, relation, relationKey }, bindings) => {
  // If bindings fail to conform to the formulae, we error.
  for (const formula of formulae) {
    const result = Formula.conform(formula, bindings)
    if (result.error) {
      return result
    }
  }

  /** @type {API.Bindings} */
  const attributes = {}
  for (const [id, term] of entries(rows)) {
    const binding = Bindings.get(bindings, term)
    if (binding == null) {
      return {
        error: new RangeError(
          `Failed to resolve ${Term.toString(
            term
          )} binding required by the select`
        ),
      }
    } else {
      attributes[id] = binding
    }
  }

  const [id] = relationKey
  const association = Association.create({
    head: id,
    attributes: attributes,
  })

  // 💣 Doing mutation does not seem ideal but we can fix that later.
  relation.insert(attributes, association)

  return { ok: {} }
}

/**
 * @param {API.Select} model
 */
export const toString = (model) => {
  const select = Selector.toString(model.rows)
  const where = Where.toString(model.formulae)

  return `{select:${select} where:${where}}`
}

/**
 * @template {API.Selector} Rows
 * @param {API.Select<Rows>} source
 */
class Select {
  /**
   * @param {API.Select<Rows>} model
   */
  constructor(model) {
    this.model = model
  }

  get relationKey() {
    return this.model.relationKey
  }
  get rows() {
    return this.model.rows
  }
  get relation() {
    return this.model.relation
  }
  get formulae() {
    return this.model.formulae
  }
}
