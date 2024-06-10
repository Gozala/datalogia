/**
 * Provides equivalent of Rust's std::ops::Range so we don't have
 * to use a for of instead of old school for loops.
 *
 * @param {number} start
 * @param {number} end
 */
export const range = (start, end) => new RangeView({ start, end })

/**
 * @typedef {object} Range
 * @property {number} start
 * @property {number} end
 */
class RangeView {
  /**
   * @param {Range} model
   */
  constructor({ start, end }) {
    this.start = start
    this.end = end
  }

  get length() {
    return this.end - this.start
  }

  /**
   * @param {Range} range
   */
  static isEmpty(range) {
    return range.start >= range.end ? true : false
  }

  isEmpty() {
    return RangeView.isEmpty(this)
  }
  toJSON() {
    return { start: this.start, end: this.end }
  }

  [Symbol.iterator]() {
    return new RangeIterator(this)
  }
}

/**
 * @implements {IterableIterator<number>}
 */
class RangeIterator {
  /**
   * @param {Range} range
   */
  constructor({ start, end }) {
    this.start = start
    this.end = end
  }
  get length() {
    return this.end - this.start
  }
  /**
   * @returns {IteratorResult<number>}
   */
  next() {
    if (this.start >= this.end) {
      return { done: true, value: undefined }
    } else {
      return { done: false, value: this.start++ }
    }
  }

  [Symbol.iterator]() {
    return this
  }
}
