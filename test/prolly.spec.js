import * as Prolly from '../src/prolly.js'
import * as CBOR from '@ipld/dag-cbor'

/**
 * @type {import('entail').Suite}
 */
export const testProllyTree = {
  async fromEntries(assert) {
    const tree = Prolly.fromEntries(
      [
        [1, 'one'],
        [2, 'two'],
        [3, 'three'],
        [4, 'four'],
        [5, 'five'],
        [6, 'six'],
        [7, 'seven'],
        [8, 'eight'],
        [9, 'nine'],
        [10, 'ten'],
        [11, 'eleven'],
        [12, 'twelve'],
        [13, 'thirteen'],
        [14, 'fourteen'],
        [15, 'fifteen'],
        [16, 'sixteen'],
        [17, 'seventeen'],
        [18, 'eighteen'],
        [19, 'nineteen'],
        [20, 'twenty'],
        [21, 'twenty-one'],
      ],
      { width: 4 }
    )

    assert.deepEqual(decodeEntries(tree), [
      [1, 'one'],
      [2, 'two'],
      [3, 'three'],
      [4, 'four'],
      [5, 'five'],
      [6, 'six'],
      [7, 'seven'],
      [8, 'eight'],
      [9, 'nine'],
      [10, 'ten'],
      [11, 'eleven'],
      [12, 'twelve'],
      [13, 'thirteen'],
      [14, 'fourteen'],
      [15, 'fifteen'],
      [16, 'sixteen'],
      [17, 'seventeen'],
      [18, 'eighteen'],
      [19, 'nineteen'],
      [20, 'twenty'],
      [21, 'twenty-one'],
    ])
  },

  'insertion in revers results in same tree': async (assert) => {
    const entries = [...new Uint8Array(10240).keys()].map((k) => [k, k])

    let map = new Map()
    for (const [key] of entries) {
      map.set(key, key)
    }

    let left = Prolly.fromEntries([])
    for (const [key] of entries) {
      left = Prolly.set(left, key, key)
    }

    assert.deepEqual(decodeEntries(left), entries)

    let right = Prolly.fromEntries([])
    for (const [key] of entries.reverse()) {
      right = Prolly.set(left, key, key)
    }

    assert.deepEqual(left, right)
  },
}

/**
 *
 * @param {Prolly.Tree.Branch} tree
 * @returns
 */
const decodeEntries = (tree) =>
  [...tree].map((leaf) => [CBOR.decode(leaf.key), CBOR.decode(leaf.value)])
