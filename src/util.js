/**
 * @template {Record<string, unknown>} Object
 * @param {Object} object
 * @returns {{[Key in keyof Object]: [Key, Object[Key]]}[keyof Object][]}
 */
export const entries = (object) => /** @type {any} */ (Object.entries(object))
