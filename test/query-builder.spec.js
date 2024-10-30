import * as DB from 'datalogia'
import { select } from '../src/query-builder.js'
import db from './proofs.db.js'

/**
 * @type {import('entail').Suite}
 */
export const testQueryBuilder = {
  'test query builder': async (assert) => {
    const query = select({
      uploadLink: DB.string(),
      storeLink: DB.string(),
    }).where(({ uploadLink, storeLink }) => {
      const upload = DB.link()
      const store = DB.link()
      const space = DB.string()
      const uploadCapabilities = DB.link()
      const storeCapabilities = DB.link()
      const uploadAdd = DB.link()
      const storeAdd = DB.link()

      return [
        DB.match([upload, 'cid', uploadLink]),
        DB.match([upload, 'capabilities', uploadCapabilities]),
        DB.match([uploadCapabilities, DB._, uploadAdd]),
        DB.match([uploadAdd, 'can', 'upload/add']),
        DB.match([uploadAdd, 'with', space]),
        DB.match([store, 'cid', storeLink]),
        DB.match([store, 'capabilities', storeCapabilities]),
        DB.match([storeCapabilities, DB._, storeAdd]),
        DB.match([storeAdd, 'can', 'store/add']),
        DB.match([storeAdd, 'with', space]),
      ]
    })

    assert.deepEqual(await query.execute(db), [
      {
        uploadLink: 'bafy...upload',
        storeLink: 'bafy...store',
      },
    ])
  },
}
