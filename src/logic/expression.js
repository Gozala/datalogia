import * as API from '../api.js'

/**
 * @param {API.Association} proposition
 * @returns {API.Expression}
 */
export const proposition = (proposition) => ({ Association: proposition })

/**
 *
 * @param {API.RuleModel} rule
 * @returns {API.Expression}
 */
export const rule = (rule) => ({ Rule: rule })
