import * as API from '../api.js'

/**
 * @template {API.Rows} Rows
 * @param {API.Table<Rows>} source
 */
export const create = (source) => new Table(source)

/**
 * @param {API.Table} table
 */
export const id = (table) => table.id

/**
 * @param {API.Table} table
 */
export const rows = (table) => table.rows

/**
 * @param {API.Table} table
 * @param {API.RowID} id
 */
export const hasRow = (table, id) => table.rows.hasOwnProperty(id)

/**
 * @param {API.Table} table
 * @param {API.RowID} id
 * @returns {API.Row|undefined}
 */
export const getRow = (table, id) => table.rows[id]

/**
 * @template {API.Rows} Rows
 */
class Table {
  /**
   * @param {API.Table<Rows>} model
   */
  constructor(model) {
    this.model = model
  }
  get id() {
    return this.model.id
  }
  get rows() {
    return this.model.rows
  }
}
