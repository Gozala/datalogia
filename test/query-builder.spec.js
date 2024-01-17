import * as DB from 'datalogia'
import { select } from '../src/query-builder.js'
import * as proofs from './proof-facts.js'
const proofsDB = DB.Memory.create(proofs)

/**
 * @type {import('entail').Suite}
 */
export const testQueryBuilder = {
  'test query builder': async (assert) => {
    const query = select({
      uploadLink: DB.string(),
      storeLink: DB.string(),
    }).where(({ uploadLink, storeLink }) => {
      const space = DB.string()
      const uploadID = DB.string()
      const storeID = DB.string()

      return [
        DB.match([uploadLink, 'capabilities', uploadID]),
        DB.match([uploadID, 'can', 'upload/add']),
        DB.match([uploadID, 'with', space]),
        DB.match([storeLink, 'capabilities', storeID]),
        DB.match([storeID, 'can', 'store/add']),
        DB.match([storeID, 'with', space]),
      ]
    })

    assert.deepEqual(query.execute(proofsDB), [
      {
        uploadLink: 'bafy...upload',
        storeLink: 'bafy...store',
      },
    ])
  },
}
