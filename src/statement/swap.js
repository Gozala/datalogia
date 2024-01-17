import * as API from '../api.js'

/**
 * @param {API.Swap} statement
 */
export const toString = (statement) => JSON.stringify(statement, null, 2)

/**
 *
 * @param {API.Swap} self
 */
export const perform = (self) => {
  throw new Error('We can not swap without boxing relations')
}
