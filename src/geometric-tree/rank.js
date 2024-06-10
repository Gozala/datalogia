/**
 * @typedef {object} Configuration
 * @property {number} mask
 * @property {number} k
 * @property {number} trials
 */

/**
 * @param {object} settings
 * @param {number} settings.width
 * @returns {Configuration}
 */
export const configure = ({ width }) => {
  // Determine the number of bits for each 'trial'
  const k = Math.ceil(Math.log2(width + 1))
  // Number of trials
  const trials = (256 / k) | 0
  // Mask to extract k bits
  const mask = (1 << k) - 1

  return { mask, k, trials }
}

/**
 *
 * @param {Uint8Array} input
 * @param {Configuration} configuration
 */
export const compute = (input, { trials, k, mask }) => {
  for (let trial = 0; trial < trials; trial++) {
    const byteOffset = Math.floor((k * trial) / 8)
    const bitOffset = (k * trial) % 8
    // Extract k bits for this trial
    const bits = (input[byteOffset] >> bitOffset) & mask

    // batch != 0 means we are looking for the failure probability 1 / m
    // whereas batch == 0 means we are looking for the success probability 1 / m
    if (bits !== 0) {
      // +1 because geometric distribution starts at 1
      return trial + 1
    }
  }

  // If no success was found, return the total number of trials + 1
  return trials + 1
}
