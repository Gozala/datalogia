import * as API from './api.js'
import * as Constant from './constant.js'
import * as Link from './link.js'

/**
 * @template {API.Bindings} Attributes
 * @param {API.Association<Attributes>} source
 */
export const create = (source) => new Association(source)

/**
 * @param {API.Association} instance
 * @param {API.RowID} id
 * @returns {API.Constant|undefined}
 */
export const get = (instance, id) => instance.attributes[id]

/**
 * @param {API.Association} instance
 */
export const toString = (instance) => {
  const rows = []
  for (const [id, value] of Object.entries(instance.attributes)) {
    rows.push(`${id}:${Constant.toString(value)}`)
  }

  if (instance.link) {
    rows.push(`"/": "${instance.link}"`)
  }

  return `${instance.head}({${rows.join(', ')}})`
}

/**
 * @template {API.Bindings} Attributes
 */
class Association {
  /**
   * @param {API.Association<Attributes>} model
   */

  constructor(model) {
    this.model = model
  }

  get head() {
    return this.model.head
  }
  get attributes() {
    return this.model.attributes
  }
  get link() {
    return this.model.link
  }
}

/**
 * @param {API.Association} instance
 */
export const link = (instance) => {
  return instance.link ?? Link.of(instance.attributes)
}
