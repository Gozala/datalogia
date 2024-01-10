import * as API from '../api.js'
import * as Type from './row/type.js'

export { Type }

let LAST_ID = 0

/**
 * @template {API.RowType} Type
 * @param {object} source
 * @param {Type} source.type
 * @param {API.RowID} [source.id]
 */
export const create = ({ type, id = `${++LAST_ID}` }) => new Row({ type, id })

/**
 * @template {API.RowType} Type
 */
class Row {
  /**
   * @param {API.Row<Type>} model
   */
  constructor(model) {
    this.model = model
  }
  get id() {
    return this.model.id
  }
  get type() {
    return this.model.type
  }
}

/**
 * @param {API.Row} row
 * @param {API.Constant} value
 * @returns {API.Result<{}, Error>}
 */
export const check = ({ type }, value) => Type.check(type, value)
