import * as Rank from '../../src/geometric-tree/rank.js'
import * as CBOR from '@ipld/dag-cbor'

/**
 * @type {import('entail').Suite}
 */
export const testRanks = {
  'test rank calculation': async (assert) => {
    const buffer = new Uint8Array(32)
    const width = 4

    const rank = Rank.configure({ width })
    const rounds = 100_000
    let sum = 0
    for (const _ of new Uint8Array(rounds)) {
      await crypto.getRandomValues(buffer)
      const value = rank(buffer)
      sum += value
    }

    const probability = 1 - 1 / width

    console.log(`average: ${sum / rounds} expected: ${1 / probability}`)
  },
}
