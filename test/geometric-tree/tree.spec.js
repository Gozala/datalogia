import * as Tree from '../../src/geometric-tree/lib.js'
import { range } from '../../src/geometric-tree/for.js'
import * as CBOR from '@ipld/dag-cbor'

/**
 * @type {import('entail').Suite}
 */
export const testProllyTree = {
  async fromEntries(assert) {
    const source = [...range(1, 10240)]
    const tree = Tree.from(toEntries(source), { width: 4 })

    assert.deepEqual(decodeTree(tree), source)
  },

  'insertion in revers results in same tree': async (assert) => {
    const source = [...range(0, 4015 - 1)]
    const entries = toEntries(source)

    let left = Tree.from([])
    for (const [n, entry] of entries.entries()) {
      left = Tree.insert(left, entry)
    }
    assert.deepEqual(decodeTree(left), source)

    let right = Tree.from([])
    for (const entry of entries.reverse()) {
      right = Tree.insert(right, entry)
    }
    assert.deepEqual(decodeTree(right), source)

    assert.deepEqual(left, right)

    // console.log(source.at(-1))

    // console.log(JSON.stringify(left.toJSON().children[1].children, null, 2))
    // console.log(JSON.stringify(right.toJSON().children[1].children, null, 2))
    // console.log(left.children.at(-1).toJSON(), right.children.at(-1).toJSON())
  },

  'remove inserted nodes': async (assert) => {},
}

/**
 * @param {Tree.TreeView} tree
 * @returns {unknown[]}
 */
const decodeTree = (tree) => [...tree].map((leaf) => CBOR.decode(leaf.key))

/**
 *
 * @param {Iterable<unknown>} entries
 * @returns {Tree.Entry[]}
 */
const toEntries = (entries) =>
  [...entries].map((value) => ({ toKey: () => CBOR.encode(value) }))
