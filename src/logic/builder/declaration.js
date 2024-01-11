import * as API from '../../api.js'
import * as Table from '../table.js'
import * as Row from '../row.js'
import * as Declaration from '../declaration.js'
import * as OrderedSet from '../../relation/ordered-set.js'

/**
 * @template {API.Rows} Rows
 * @template {API.Source} Source
 * @typedef {object} Model
 * @property {API.RelationID} id
 * @property {Rows} rows
 * @property {Source} source
 */

/**
 * @template {API.Source} Source
 * @param {API.RelationID} id
 * @param {Source} source
 */
export const create = (id, source) =>
  new DeclarationBuilder({ id, source, rows: {} })

/**
 * @template {API.Source} Source
 * @template {API.Rows} Rows
 * @param {API.RelationID} id
 * @param {Source} source
 * @param {(builder: DeclarationBuilder<{}, Source>) => DeclarationBuilder<Rows, Source>} assemble
 */
export const build = (id, source, assemble) =>
  assemble(create(id, source)).build()

/**
 * @template {API.Rows} [Rows=API.Rows]
 * @template {API.Source} [Source=API.Source]
 */
class DeclarationBuilder {
  /**
   * @param {Model<Rows, Source>} model
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
  get source() {
    return this.model.source
  }

  /**
   * @template {Record<string, API.RowType>} Extension
   * @param {Extension} extension
   * @returns {DeclarationBuilder<Rows & {[K in keyof Extension]: API.Row<Extension[K]>}, Source>}
   */
  extend(extension) {
    /** @type {API.Rows} */
    const rows = this.rows
    for (const [id, type] of Object.entries(extension)) {
      if (this.model.rows.hasOwnProperty(id)) {
        throw new RangeError(`Duplicate row ${this.model.id}.${id}`)
      }

      rows[id] = Row.create({ type })
    }

    return /** @type {any} */ (this)
  }

  /**
   * @returns {API.Result<API.Declaration<Rows>, Error>}
   */
  build() {
    /** @type {API.Rows} */
    const rows = {}
    for (const [id, row] of Object.entries(this.rows)) {
      rows[id] = row
    }

    const schema = Table.create({
      id: this.id,
      rows: /** @type {Rows} */ (rows),
    })

    const declaration = Declaration.create({
      id: this.id,
      source: this.source,
      schema,
      relation: OrderedSet.create(),
    })

    return { ok: declaration }
  }
}

export { DeclarationBuilder as Builder }
