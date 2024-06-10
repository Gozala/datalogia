export * from '../api.js'

interface Revision {
  live: MemoryStore
  index: DurableStore
  history: unknown
  nextT: unknown
  asOfT: unknown
  sinceT: unknown
}

interface Database {
  /**
   * Facts since last time facts got merged into durable store.
   */
  memory: MemoryStore

  /**
   * Facts that were merged into durable storage.
   */
  storage: DurableStore
}

interface MemoryStore {
  /**
   * Entity (document) based queries.
   */
  eavt: Store
  /**
   * Attribute (columnar) based queries.
   */
  aevt: Store

  /**
   * Reverse index
   */
  vaet: Store

  /**
   * Alternative index
   */
  avet: Store
}

/**
 * Durable storage for data segments.
 */

interface DurableStore {}

interface Store {}

interface Index {
  dirs: Directory[]
}

interface Directory {
  segments: Segment[]
}

interface Segment {
  facts: Fact[]
}

type Fact = [
  entity: unknown,
  attribute: unknown,
  value: unknown,
  tx: number | bigint,
]
