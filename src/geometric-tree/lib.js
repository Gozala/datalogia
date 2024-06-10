import * as API from './api.js'
import * as Bytes from '../bytes.js'
import * as Rank from './rank.js'
import { blake3 } from '@noble/hashes/blake3'
import * as Branch from './branch.js'
export * from './api.js'

const EMPTY = Object.freeze({
  rank: 1,
  key: new Uint8Array(0),
  children: Object.freeze([]),
})

/**
 *
 * @param {Settings} [settings]
 */
export const empty = (settings) => ({
  ...EMPTY,
  configuration: configure(settings),
})

/**
 * @typedef {object} Settings
 * @property {number} width
 * @property {API.RankDistribution} [rank]
 * @property {(payload: Uint8Array) => Uint8Array} [digest]
 *
 * @param {object} [settings]
 * @param {number} [settings.width]
 * @param {(payload: Uint8Array) => Uint8Array} [settings.digest]
 * @param {API.RankDistribution} [settings.rank]
 * @returns {API.Configuration}
 */
export const configure = ({
  width = 32,
  digest = blake3,
  rank = Rank.configure({ width }),
} = {}) => ({
  width,
  digest,
  rank,
})

/**
 *
 * @param {Iterable<API.Entry>} source
 * @param {Settings} [settings]
 * @returns {API.TreeView}
 */
export const from = (source, settings) => {
  const configuration = configure(settings)
  const leaves = []
  /** @type {Set<number>} */
  const levels = new Set([Rank.compute(EMPTY.key, configuration.rank)])

  // We loop over the entries, rank them sort them into the `nodes` array. Doing
  // map, sort, filter would have been a lot simpler, but we would be looping
  // over the entries multiple times, by doing it this way we only loop over the
  // entries once.
  for (const entry of source) {
    const key = entry.toKey()
    const rank = Rank.compute(configuration.digest(key), configuration.rank)
    const node = { rank, key, entry }

    // Add the node rank to the set of ranks
    levels.add(rank)

    // If we have no nodes we just stick the node in the array
    if (leaves.length === 0) {
      leaves.push(node)
    }
    // Otherwise we asses where should we insert the node in order to keep
    // the nodes sorted by key.
    else {
      const last = leaves[leaves.length - 1]
      const order = Bytes.compare(key, last.key)
      if (order < 0) {
        leaves.splice(leaves.length - 2, 0, node)
      } else if (order > 0) {
        leaves.push(node)
      } else {
        leaves[leaves.length - 1] = node
      }
    }
  }

  // Define empty tree as a tree with no children for which the key is an empty
  // byte array.
  if (leaves.length === 0) {
    return { ...EMPTY, configuration }
  }

  const ranks = [...levels].sort()
  /** @type {(API.Node)[]} */
  let nodes = leaves
  for (const rank of ranks) {
    const branches = []
    let branch = null
    for (const node of nodes) {
      if (branch === null) {
        branch = Branch.builder(configuration, node)
      } else {
        branch.insert(node)
      }

      if (node.rank > rank) {
        branches.push(branch.build())
        branch = null
      }
    }

    if (branch) {
      branches.push(branch.build())
    }

    nodes = branches
  }

  return /** @type {API.TreeView} */ (nodes[0])
}

/**
 *
 * @param {API.TreeView} tree
 * @param {API.Entry} entry
 */
export const insert = (tree, entry) => {
  const key = entry.toKey()
  const digest = tree.configuration.digest(key)
  const rank = Rank.compute(digest, tree.configuration.rank)
  return Branch.insert(tree, { key, rank }, tree.configuration)
}

/**
 *
 * @param {API.Key} key
 * @param {API.Tree | null} root
 * @returns {API.Tree | null}
 */
export const remove = (key, root) => {
  if (root === null) {
    return null
  }

  // Search the current node
  const [lefts, item, rights] = root.left.split((item) => item.key >= key)
  if (item) {
    if (item.key === key) {
      // Found it, remove it and zip the children
      const left = norm({ ...root, items: lefts, next: item.child })
      const right = norm({ ...root, items: rights })
      return zip(left, right)
    }
    // Search left
    const child = remove(key, item.child)
    const items = lefts.push({ ...item, child }).join(rights)
    return norm({ ...root, items })
  }
  // Search right
  const next = remove(key, root.next)
  const items = lefts.join(rights)
  return norm({ ...root, items, next })
}

/**
 * @template T
 * @param {Iterable<T>} items
 * @param {*} by
 */
export const split = (items, by) => {}
