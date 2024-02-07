import * as DB from 'datalogia'
import * as Link from '../src/link.js'
import proofsDB from './proofs.db.js'
import moviesDB from './movie.db.js'
import employeeDB from './microshaft.db.js'

/**
 * @type {import('entail').Suite}
 */
export const testSelector = {
  'nested selection': async (assert) => {
    const space = DB.string()
    const upload = {
      ucan: DB.link(),
      cid: DB.string(),
      capability: DB.link(),
      space,
    }

    const store = {
      ucan: DB.link(),
      cid: DB.string(),
      capability: DB.link(),
      space,
    }

    const result = DB.query(proofsDB, {
      select: {
        upload: {
          cid: upload.cid,
          space: upload.space,
        },
        store: {
          cid: store.cid,
          space: store.space,
        },
      },
      where: [
        DB.match([upload.ucan, 'cid', upload.cid]),
        DB.match([upload.ucan, 'capabilities', upload.capability]),
        DB.match([upload.capability, 'can', 'upload/add']),
        DB.match([upload.capability, 'with', upload.space]),

        DB.match([store.ucan, 'cid', store.cid]),
        DB.match([store.ucan, 'capabilities', store.capability]),
        DB.match([store.capability, 'can', 'store/add']),
        DB.match([store.capability, 'with', store.space]),
      ],
    })

    assert.deepEqual(result, [
      {
        upload: {
          cid: 'bafy...upload',
          space: 'did:key:zAlice',
        },
        store: {
          cid: 'bafy...store',
          space: 'did:key:zAlice',
        },
      },
    ])
  },
  'deeply nested selection': async (assert) => {
    const space = DB.string()
    const upload = {
      ucan: DB.link(),
      cid: DB.string(),
      capability: DB.link(),
      space,
    }

    const store = {
      ucan: DB.link(),
      cid: DB.string(),
      capability: DB.link(),
      space,
    }

    const result = DB.query(proofsDB, {
      select: {
        result: {
          upload: {
            cid: upload.cid,
            space: upload.space,
          },
          store: {
            cid: store.cid,
            space: store.space,
          },
        },
      },
      where: [
        DB.match([upload.ucan, 'cid', upload.cid]),
        DB.match([upload.ucan, 'capabilities', upload.capability]),
        DB.match([upload.capability, 'can', 'upload/add']),
        DB.match([upload.capability, 'with', upload.space]),

        DB.match([store.ucan, 'cid', store.cid]),
        DB.match([store.ucan, 'capabilities', store.capability]),
        DB.match([store.capability, 'can', 'store/add']),
        DB.match([store.capability, 'with', store.space]),
      ],
    })

    assert.deepEqual(result, [
      {
        result: {
          upload: {
            cid: 'bafy...upload',
            space: 'did:key:zAlice',
          },
          store: {
            cid: 'bafy...store',
            space: 'did:key:zAlice',
          },
        },
      },
    ])
  },

  'array selection': async (assert) => {
    const space = DB.string()
    const upload = {
      ucan: DB.link(),
      cid: DB.string(),
      capability: DB.link(),
      space,
    }

    const store = {
      ucan: DB.link(),
      cid: DB.string(),
      capability: DB.link(),
      space,
    }

    const result = DB.query(proofsDB, {
      select: {
        result: [
          {
            cid: upload.cid,
            space: upload.space,
          },
          {
            cid: store.cid,
            space: store.space,
          },
        ],
      },
      where: [
        DB.match([upload.ucan, 'cid', upload.cid]),
        DB.match([upload.ucan, 'capabilities', upload.capability]),
        DB.match([upload.capability, 'can', 'upload/add']),
        DB.match([upload.capability, 'with', upload.space]),

        DB.match([store.ucan, 'cid', store.cid]),
        DB.match([store.ucan, 'capabilities', store.capability]),
        DB.match([store.capability, 'can', 'store/add']),
        DB.match([store.capability, 'with', store.space]),
      ],
    })

    assert.deepEqual(result, [
      {
        result: [
          {
            cid: 'bafy...upload',
            space: 'did:key:zAlice',
          },
          {
            cid: 'bafy...store',
            space: 'did:key:zAlice',
          },
        ],
      },
    ])
  },
}
