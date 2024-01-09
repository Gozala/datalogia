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
      uploadLink: DB.Schema.string(),
      storeLink: DB.Schema.string(),
    }).where(({ uploadLink, storeLink }) => {
      const space = DB.Schema.string()
      const uploadID = DB.Schema.string()
      const storeID = DB.Schema.string()

      return [
        [uploadLink, 'capabilities', uploadID],
        [uploadID, 'can', 'upload/add'],
        [uploadID, 'with', space],
        [storeLink, 'capabilities', storeID],
        [storeID, 'can', 'store/add'],
        [storeID, 'with', space],
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
