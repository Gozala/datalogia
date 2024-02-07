import * as API from '../api.js'
import { entries } from '../object.js'
import * as Bindings from '../bindings.js'
import * as Term from '../term.js'

/**
 * @template {API.Variables} Rows
 * @param {object} source
 * @param {Rows} source.rows
 * @param {API.RelationKey} source.relationKey
 * @param {API.Relation} source.relation
 * @returns {API.NotIn<Rows>}
 */
export const create = (source) => new NotIn(source)

/**
 * @template {API.Variables} Rows
 */
class NotIn {
  /**
   * @param {object} source
   * @param {Rows} source.rows
   * @param {API.RelationKey} source.relationKey
   * @param {API.Relation} source.relation
   */
  constructor(source) {
    this.model = source
  }

  get relationKey() {
    return this.model.relationKey
  }

  get relation() {
    return this.model.relation
  }

  get rows() {
    return rows(this.model)
  }

  /**
   * @param {API.Bindings} bindings
   */
  match(bindings) {
    return conform(this.model, bindings)
  }
}

/**
 * @template {API.Variables} Rows
 * @param {API.NotIn<Rows>} model
 * @returns {Rows}
 */
export const rows = (model) => model.rows

/**
 * @template {API.Variables} Rows
 * @param {API.NotIn<Rows>} model
 * @param {API.Bindings} bindings
 * @returns {API.Result<{}, Error>}
 */
export const conform = (model, bindings) => {
  const bound = /** @type {API.Bindings} */ ({})
  for (const [key, row] of entries(rows(model))) {
    const value = Bindings.get(bindings, row)
    if (value == null) {
      return { error: new Error(`Binding ${String(row)} not found`) }
    } else {
      bound[key] = value
    }
  }

  if (!model.relation.contains(bound)) {
    return { ok: {} }
  } else {
    return { error: new Error(`NotIn does not match`) }
  }
}

/**
 * @param {API.NotIn} self
 */
export const toString = (self) => {
  const members = []
  for (const [key, row] of entries(rows(self))) {
    members.push(`${String(key)}: ${Term.toString(row)}`)
  }

  return `{ ${members.join(', ')} no in ${self.relationKey.join('_')} }`
}
