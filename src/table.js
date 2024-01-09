import * as API from './api.js'

/**
 * @template {Record<API.RowID, API.Row>} Rows
 * @param {object} source
 * @param {API.RowID} source.id
 * @param {Rows} source.rows
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
 * @template Fallback
 * @param {API.Table} table
 * @param {API.RowID} id
 * @returns {API.Row|undefined}
 */
export const getRow = (table, id) => table.rows[id]

/**
 * @template {Record<API.RowID, API.Row>} Rows
 */
class Table {
  /**
   * @param {object} source
   * @param {API.RowID} source.id
   * @param {Rows} source.rows
   */
  constructor({ id, rows }) {
    this.id = id
    this.rows = rows
  }
}
