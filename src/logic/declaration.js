import * as API from '../api.js'

/**
 * @template {Record<API.RowID, API.Row>} Rows
 * @param {API.Declaration<Rows>} source
 */
export const create = (source) => new Declaration(source)

/**
 * @template {Record<API.RowID, API.Row>} Rows
 */
class Declaration {
  /**
   * @param {API.Declaration<Rows>} model
   */
  constructor(model) {
    this.model = model
  }
  get id() {
    return this.model.id
  }
  get schema() {
    return this.model.schema
  }
  get source() {
    return this.model.source
  }
  get relation() {
    return this.model.relation
  }
}
