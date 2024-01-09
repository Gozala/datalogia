import { isLink } from 'multiformats/link'
import { base64 } from 'multiformats/bases/base64'
import * as API from './api.js'

/**
 * @param {object} source
 * @param {API.RelationID} source.id
 * @param {Record<API.RowID, API.Constant>} source.rows
 * @param {API.Link} [source.link]
 */
export const create = (source) => new Instance(source)

/**
 * @param {API.Instance} instance
 * @param {API.RowID} id
 * @returns {API.Row|undefined}
 */
export const row = (instance, id) => instance.rows[id]

/**
 * @param {API.Instance} instance
 */
export const toString = (instance) => {
  const rows = []
  for (const [id, row] of Object.entries(instance.rows)) {
    if (isLink(row)) {
      rows.push(`${id}: {"/": "${row}"}`)
    } else if (row instanceof Uint8Array) {
      rows.push(`${id}: {"/": {bytes: "${base64.baseEncode(row)}"}}`)
    } else {
      rows.push(`${id}: ${row}`)
    }
  }

  if (instance.link) {
    rows.push(`"/": "${instance.link}"`)
  }

  return `${instance.id}({${rows.join(', ')}})`
}

class Instance {
  /**
   * @param {object} source
   * @param {API.RelationID} source.id
   * @param {Record<API.RowID, API.Constant>} source.rows
   * @param {API.Link} [source.link]
   */

  constructor({ id, rows, link }) {
    this.id = id
    this.rows = rows
    this.link = link
  }
}
