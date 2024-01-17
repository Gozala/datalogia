import * as API from './api.js'
import * as Constant from './constant.js'
import * as Link from './link.js'

/**
 * @param {API.Instantiation} source
 * @returns {Generator<API.Fact, API.Entity>}
 */
export const derive = function* (source) {
  /** @type {Record<string, API.Constant|API.Constant[]>} */
  const entity = {}
  /** @type {Array<[API.Attribute, API.Constant]>} */
  const attributes = []
  for (const [key, value] of Object.entries(source)) {
    switch (typeof value) {
      case 'boolean':
      case 'number':
      case 'bigint':
      case 'string':
        entity[key] = value
        attributes.push([key, value])
        break
      case 'object': {
        if (Constant.is(value)) {
          entity[key] = value
          attributes.push([key, value])
        } else if (Array.isArray(value)) {
          const values = []
          for (const member of value) {
            if (Constant.is(member)) {
              attributes.push([key, member])
              values.push(member)
            } else {
              const entity = yield* derive(member)
              attributes.push([key, entity])
              values.push(entity)
            }
            entity[key] = values.sort(Constant.compare)
          }
        } else {
          const link = yield* derive(value)
          entity[key] = link
          attributes.push([key, link])
        }
        break
      }
      default:
        throw new TypeError(`Unsupported value type: ${value}`)
    }
  }

  const link = Link.of(entity)
  for (const [attribute, value] of attributes) {
    yield [link, attribute, value]
  }

  return link
}

/**
 * @param {[API.Entity, API.Attribute, API.Constant, cause?: API.Link[]]} source
 */
export const create = ([entity, attribute, value, cause = []]) =>
  new Fact(entity, attribute, value, sort(cause))

/**
 *
 * @param {API.Link[]} links
 */
const sort = (links) =>
  links.sort((left, right) => left.toString().localeCompare(right.toString()))

/**
 * @param {[API.Entity, API.Attribute, API.Constant, cause?: API.Link[]]} source
 */
export const link = ([entity, attribute, value, cause = []]) =>
  Link.of([entity, attribute, value, sort(cause)])

class Fact extends Array {
  get entity() {
    return this[0]
  }
  get attribute() {
    return this[1]
  }
  get value() {
    return this[2]
  }
  get cause() {
    return this[3]
  }
  get link() {
    if (!this._link) {
      this._link = link(/** @type {any} */ (this))
    }
    return this._link
  }
}
