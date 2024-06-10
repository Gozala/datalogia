import * as Node from '../../src/prolly/node.js'

/**
 * @type {import('entail').Suite}
 */
export const testBoundary = {
  'test boundary calculation': async (assert) => {
    const buffer = new Uint8Array(32)
    const width = 4

    const rounds = 1_000_000
    let sum = 0
    for (const _ of new Uint8Array(rounds)) {
      await crypto.getRandomValues(buffer)
      sum += Node.isBoundary(buffer, width) ? 1 : 0
    }

    console.log(`actual: ${sum} expected: ${rounds / width}`)
  },
}
