import * as API from './api.js'

/**
 * @template {Record<API.RowID, API.Row>} Rows
 * @param {object} source
 * @param {API.RelationID} source.id
 * @param {API.Table<Rows>} source.rows
 * @param {API.Source} source.source
 * @param {API.Relation} source.relation
 */
export const create = (source) => new Declaration(source)

/**
 * @template {Record<API.RowID, API.Row>} Rows
 */
class Declaration {
  /**
   * @param {object} source
   * @param {API.RelationID} source.id
   * @param {API.Table<Rows>} source.rows
   * @param {API.Source} source.source
   * @param {API.Relation} source.relation
   */
  constructor({ id, rows, source, relation }) {
    this.id = id
    this.rows = rows
    this.source = source
    this.relation = relation
  }
}
