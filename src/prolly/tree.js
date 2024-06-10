import * as Leaf from './leaf.js'
import * as Node from './node.js'
import * as Branch from './branch.js'

export * from './branch.js'

export const DEFAULT_WIDTH = 32

/**
 * @param {Branch.Settings} settings
 * @returns {Branch.Branch}
 */
export const empty = (settings) => Branch.builder(Node.anchor, settings).build()

/**
 * @param {Iterable<[Uint8Array, Uint8Array]>} entries
 * @param {Branch.Settings} settings
 * @returns {Branch.Branch}
 */
export const fromEntries = (entries, settings) => {
  /** @type {Branch.Child[]} */
  let nodes = Array.from(entries, Leaf.fromEntry).sort(Node.compare)
  let height = 1

  while (nodes.length > 1) {
    const branches = []
    let branch = Branch.builder(Node.anchor, settings)
    for (const node of nodes) {
      if (Node.isBoundary(node.digest, settings.width)) {
        branches.push(branch.build())
        branch = Branch.builder(node, settings)
      } else {
        branch.insert(node)
      }
    }
    branches.push(branch.build())
    height++
    nodes = branches
  }

  return /** @type {Branch.Branch} */ (nodes[0]) ?? empty(settings)
}
