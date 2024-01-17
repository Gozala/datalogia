import * as API from '../api.js'

/**
 * @param {API.Purge} statement
 */
export const toString = (statement) => JSON.stringify(statement, null, 2)

/**
 * @param {API.Purge} self
 * @returns {API.Result<{}, Error>}
 */
export const perform = (self) => {
  self.relation.purge()

  return { ok: self }
}
