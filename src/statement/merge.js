import * as API from '../api.js'

/**
 * @param {API.Merge} statement
 */
export const toString = (statement) => JSON.stringify(statement, null, 2)

/**
 * @param {API.Merge} self
 * @returns {API.Result<{}, Error>}
 */
export const perform = (self) => {
  self.into.merge(self.from)

  return { ok: self }
}
