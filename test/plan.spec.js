import * as DB from 'datalogia'

/**
 * @type {import('entail').Suite}
 */
export const testPlan = {
  'test planning logic': (assert) => {
    const $entity = DB.link()
    const $attribute = DB.string()
    const $value = DB.variable()

    const object = DB.Link.of({ entity: {} })

    const q = /** @type {const} */ ({
      fullScan: { Case: [$entity, $attribute, $value] },
      objectLookup: { Case: [object, $attribute, $value] },
      tableLookup: { Case: [$entity, 'column', $attribute] },
      reverseTableLookup: { Case: [$entity, $attribute, object] },

      valueLookup: { Case: [object, 'link', $value] },
      entityLookup: { Case: [$entity, 'link', object] },
      linkSearch: { Case: [object, $attribute, object] },
    })

    assert.deepEqual(DB.plan([q.fullScan, q.tableLookup]), [
      q.tableLookup,
      q.fullScan,
    ])
  },
}
