import * as API from './api.js'
import * as Node from './node.js'
import * as Bytes from '../bytes.js'
import { configure } from './rank.js'

/**
 * @param {API.Configuration} configuration
 * @param {API.Node} node
 */
export const builder = (configuration, node) => new Builder(configuration, node)

/**
 *
 * @param {API.Configuration} configuration
 */
export const empty = (configuration) =>
  new Tree({ configuration, rank: 1, children: [] })

class Builder {
  /**
   * @param {API.Configuration} configuration
   * @param {API.Node} node
   */
  constructor(configuration, node) {
    this.configuration = configuration
    /** @type {[API.Node, ...API.Node[]]} */
    this.children = [node]
    this.rank = node.rank
  }

  /**
   *
   * @param {API.Node & {rank: number}} child
   */
  insert(child) {
    this.children.push(child)
    // Last child may have a lower rank than the prior children, which happens
    // when right side of the tree has a lower ranking node. This is why we
    // capture the highest rank of all children.
    if (child.rank > this.rank) {
      this.rank = child.rank
    }
  }

  build() {
    const tree = new Tree(this)
    // @ts-expect-error
    delete this.children
    // @ts-expect-error
    delete this.rank

    return tree
  }
}

/**
 * @implements {API.TreeView}
 */
class Tree {
  /**
   * @param {object} source
   * @param {API.Configuration} source.configuration
   * @param {number} source.rank
   * @param {[API.Node, ...API.Node[]]} source.children
   */
  constructor({ configuration, rank, children }) {
    this.configuration = configuration
    this.children = children
    this.rank = rank

    this.key = children[children.length - 1].key
  }

  [Symbol.iterator]() {
    return Node.iterate(this)
  }

  toJSON() {
    return {
      rank: this.rank,
      key: this.key.join(''),
      children: this.children.map((child) =>
        child instanceof Tree
          ? child.toJSON()
          : { key: child.key.join(''), rank: child.rank }
      ),
    }
  }
}

/**
 * Unzips a tree along the path leading to a target leaf node and returns list
 * of `{left, right}` pairs where each is a list of nodes that would fall on
 * the left and right of the insertion path. Left side is where target node is
 * expected to fall.
 *
 * @param {API.Tree} tree
 * @param {API.Key} key
 * @returns {Iterable<{left:readonly API.Node[], node: null|API.Node, right:readonly API.Node[]}>}
 */
export const unzip = function* (tree, key) {
  /** @type {API.Node} */
  let root = tree
  while (root?.children) {
    // We split node at the desired key
    const { left, node, right } = split(root, key)

    yield { left, node, right }
    // If we there is key falls under some node boundary we yield this layer and
    // descend into the child node where key would fall.
    if (node) {
      root = node
    }
    // Otherwise we fall out of the bounds and we just descend into the left
    // most child node to produce a trace for a new limb.
    else {
      root = left[0]
      while (root?.children) {
        yield { left: [], node: null, right: [] }
        root = root.children[0]
      }
    }
  }
}

/**
 *
 * @param {Iterable<{left:readonly API.Node[], node: null|API.Node, right:readonly API.Node[]}>} trail
 * @param {API.Node[]} nodes
 * @param {API.Configuration} configuration
 * @return {API.TreeView}
 */
export const zip = (trail, nodes, configuration) => {
  for (const { left, node, right } of trail) {
    // At branch layer we drop node leading to the leaf because it will
    // be assembled from child nodes, but on the leaf layer we keep node
    // as it is not going to be replaced
    const children =
      node == null
        ? [...left, ...nodes, ...right]
        : [...left, ...nodes, ...right]

    nodes = join(
      /** @type {[API.Node, ...API.Node[]]} */ (children),
      configuration
    )
  }

  if (nodes.length === 1 && nodes[0].children) {
    return /** @type {API.TreeView} */ (nodes[0])
  } else {
    const tree = builder(configuration, nodes[0])
    for (const node of nodes.slice(1)) {
      tree.insert(node)
    }
    return tree.build()
  }
}

/**
 * @param {API.Tree} tree
 * @param {API.Key} key
 * @returns {{left:readonly API.Node[], node: API.Node|null, right: readonly API.Node[]}}
 */
const split = ({ children, rank }, key) => {
  // Iterate over child entries if we find a child that has higher sort
  // order we capture all preceding children into left children, found
  // child as middle node and all that following nodes as right children.
  for (const [offset, child] of children.entries()) {
    const order = Bytes.compare(key, child.key)
    if (order === 0) {
      return {
        left: children.slice(0, offset),
        node: child,
        right: children.slice(offset + 1),
      }
    } else if (order < 0) {
      if (child.children) {
        return {
          left: children.slice(0, offset),
          node: child,
          right: children.slice(offset + 1),
        }
      } else {
        return {
          left: children.slice(0, offset),
          node: null,
          right: children.slice(offset),
        }
      }
    }
  }

  const last = children[children.length - 1]

  // If we got here it means key falls after the last high ranking child of the
  // node. If last child has a same rank as the tree being split key falls out
  // of the bounds and we put all children on the left side.
  // Note: If tree is empty it will have no children.
  return last?.children == null
    ? { left: children, node: null, right: [] }
    : { left: children.slice(0, -1), node: last, right: [] }
}

/**
 *
 * @param {[API.Node, ...API.Node[]]} nodes
 * @param {API.Configuration} configuration
 */
const join = (nodes, configuration) => {
  const branches = []

  let branch = null
  for (const node of nodes) {
    if (branch === null) {
      branch = builder(configuration, node)
    } else if (node.rank > branch.rank) {
      branch.insert(node)
      branches.push(branch.build())
      branch = null
    } else {
      branch.insert(node)
    }
  }

  if (branch) {
    branches.push(branch.build())
  }

  return /** @type {[Tree, ...Tree[]]} */ (branches)
}

/**
 * @param {API.Tree} tree
 * @param {API.Leaf} leaf
 * @param {API.Configuration} configuration
 */
export const insert = (tree, leaf, configuration) => {
  const trail = [...unzip(tree, leaf.key)].reverse()
  return zip(trail, [leaf], configuration)
}

/**
 * @param {API.Tree} tree
 * @param {API.Key} key
 * @param {API.Configuration} configuration
 */
export const remove = (tree, key, configuration) => {
  const trail = [...unzip(tree, key)].reverse()
  return zip(trail, [], configuration)
}
