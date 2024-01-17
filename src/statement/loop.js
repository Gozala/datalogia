import * as API from '../api.js'

/**
 * @param {API.Loop} statement
 */
export const toString = (statement) => JSON.stringify(statement, null, 2)
