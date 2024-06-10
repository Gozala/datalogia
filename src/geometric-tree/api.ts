export type uint64 = bigint
export type Key = Uint8Array

export interface RankDistribution {
  trials: number
  k: number
  mask: number
}

export interface Configuration {
  width: number
  rank: RankDistribution
  digest: (key: Uint8Array) => Uint8Array
}

export interface Entry {
  toKey(): Key
}

export interface Leaf {
  rank: number
  key: Key
  children?: undefined
}

export interface Branch {
  rank: number
  key: Key
  children: readonly Node[]
}

export type Node = Leaf | Branch
export type Tree = Branch

export interface TreeView extends Branch, Iterable<Leaf> {
  configuration: Configuration
}
