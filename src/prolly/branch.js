import * as Node from './node.js'
import * as Leaf from './leaf.js'
import { blake3 as Blake3 } from '@noble/hashes/blake3'

/**
 * @typedef {object} Settings
 * @property {number} width
 */

class Builder {
  /**
   * @param {[Child, ...Child[]]} children
   * @param {Settings} settings
   */
  constructor(children, settings) {
    this.settings = settings
    this.children = children

    this.hash = Blake3.create({})
  }
  /**
   *
   * @param {Child} child
   */
  insert(child) {
    this.children.push(child)
    this.hash.update(child.digest)
  }

  build() {
    const digest = this.hash.digest()
    return new Branch(digest, this.children, this.settings)
  }
}

/**
 * @param {Child} child
 * @param {object} settings
 * @param {number} settings.width
 */
export const builder = (child, settings) => new Builder([child], settings)

/**
 * @typedef {Leaf.Model|Model} Child
 * @typedef {[Child, ...Child[]]} Children
 * @param {[Child, ...Child[]]} children
 * @param {object} settings
 * @param {number} settings.width
 */
export const fromChildren = (children, settings) => {
  const hash = Blake3.create({})
  for (const child of children) {
    hash.update(child.digest)
  }
  const digest = hash.digest()

  return new Branch(digest, children, settings)
}

/**
 *
 * @param {Model} node
 * @param {Leaf.Model} target
 */
const split = ({ children }, target) => {
  // Iterate over child entries if we find a child that has higher sort
  // order we capture all preceding children into left array and found
  // child and all that follow into right array.
  for (const [offset, child] of children.entries()) {
    const order = Node.compare(target, child.anchor)
    if (order <= 0) {
      return {
        left: children.slice(0, offset - 1),
        node: children[offset - 1],
        right: children.slice(offset),
        order,
      }
    }
  }

  return {
    node: children[children.length - 1],
    left: children.slice(0, -1),
    right: [],
    order: 1,
  }
}

/**
 * Unzips a tree along the path leading to a target leaf node and returns list
 * of `{left, right}` pairs where each is a list of nodes that would fall on
 * the left and right of the insertion path. Left side is where target node is
 * expected to fall.
 *
 * @param {Model} tree
 * @param {Leaf.Model} target
 * @returns {IterableIterator<{left:Child[], node: Child, right:Child[], order:number}>}
 */
const unzip = function* (tree, target) {
  /** @type {Child} */
  let cursor = tree
  while (isBranchNode(cursor)) {
    // We split node where the target node where path to target node would
    // lay returning node children that would fall on the `left` and `right`
    // of the path.
    const { left, node, right, order } = split(cursor, target)

    cursor = node
    // node = child

    // If this is branch node we remove the last node on the left as that is
    // where we descend and will rebuild from children. If it is leaf lear we
    // do nothing as we want to keep all leaves.
    // if (isBranchNode(node)) {
    //   left.pop()
    // }

    yield { left: /** @type {Children} */ (left), node, right, order }
  }
}

/**
 * Takes a tree and charts a leaf insertion trail. If tree already contains a
 * leaf return an empty (array) trail, otherwise returns array of `{left,right}`
 * pairs where `left` is a non empty array of children that would fall on the
 * left of the insertion path and `right` is potentially empty array of children
 * that fall on the right of the insertion path. Please note that `left` is a
 * non-empty array because whenever leaf falls between existing branches we
 * always choose left branch to chart a path through (because first child of the
 * right node has a boundary). Only exception where we could have no nodes on
 * the left would be if `leaf` was falling into a first position, however that
 * can not happen because (currently) we use special anchor node that is always
 * the first item which ensures that we always have a node on the left.
 *
 * @typedef {{left:Child[], node: Child, right:Child[]}[]} Trail
 * @param {Model} tree
 * @param {Leaf.Model} leaf
 * @returns {Trail}
 */
const createInsertionTrail = (tree, leaf) => {
  const trail = []
  for (const entry of unzip(tree, leaf)) {
    // If order is `0` tree contains a leaf with a same digest making an
    // insertion a noop.
    if (entry.order === 0) {
      return []
    }
    // Otherwise we collect entries in the reverse order so tree could be built
    // up by iterating the trail.
    else {
      trail.unshift(entry)
    }
  }
  return trail
}

/**
 * @param {Model} tree
 * @param {Leaf.Model} leaf
 */
export const insert = (tree, leaf) => {
  const trail = createInsertionTrail(tree, leaf)
  // If trail is empty insertion is a noop and we simply return tree back.
  return trail.length === 0
    ? tree
    : zip({ leaf, trail, settings: tree.settings })
}

/**
 * @param {object} input
 * @param {Child} input.leaf
 * @param {Trail} input.trail
 * @param {Settings} input.settings
 * @returns {Branch}
 */
const zip = ({ leaf, trail, settings }) => {
  leaf.settings
  // Now we rebuild a tree by following the insertion trail
  /** @type {Children} */
  let nodes = [leaf]
  for (const { left, node, right } of trail) {
    // At branch layer we drop node leading to the leaf because it will
    // be assembled from child nodes, but on the leaf layer we keep node
    // as it is not going to be replaced
    const children =
      node.height > 0
        ? [...left, ...nodes, ...right]
        : [...left, node, ...nodes, ...right]

    nodes = join(/** @type {Children} */ (children), settings)
  }

  return nodes.length === 1 ? nodes[0] : fromChildren(nodes, settings)
}

/**
 *
 * @param {Children} nodes
 * @param {Settings} settings
 */
const join = ([anchor, ...nodes], settings) => {
  const branches = []

  let branch = builder(anchor, settings)
  for (const node of nodes) {
    if (Node.isBoundary(node.digest, settings.width)) {
      branches.push(branch.build())
      branch = builder(node, settings)
    } else {
      branch.insert(node)
    }
  }
  branches.push(branch.build())

  return /** @type {[Model, ...Model[]]} */ (branches)
}

/**
 * @template T
 * @param {T[]} list
 * @param {number} offset
 * @param {T} item
 * @returns {[T, ...T[]]}
 */
const splice = (list, offset, item) => {
  const copy = list.slice(0)
  copy.splice(offset, 0, item)
  return /** @type {[T, ...T[]]} */ (copy)
}

/**
 *
 * @param {Child} node
 * @returns {node is Model}
 */
const isBranchNode = (node) => node.height > 0

/**
 * @typedef {object} Model
 * @property {Uint8Array} key
 * @property {Uint8Array} digest
 * @property {number} height
 * @property {[Child, ...Child[]]} children
 * @property {Leaf.Model} anchor
 * @property {Settings} settings
 */

export class Branch {
  /**
   * @param {Uint8Array} digest
   * @param {[Child, ...Child[]]} children
   * @param {object} settings
   * @param {number} settings.width
   */
  constructor(digest, children, settings) {
    this.digest = digest
    this.children = children
    this.height = children[0].height + 1
    this.anchor = children[0].anchor
    this.key = children[0].key
    this.settings = settings
  }

  /**
   * @returns {IterableIterator<Leaf.Leaf>}
   */
  *[Symbol.iterator]() {
    for (const child of this.children) {
      if (child.height === 0) {
        if (child !== Node.anchor) {
          yield child
        }
      } else {
        yield* child
      }
    }
  }
}
