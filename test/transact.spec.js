import * as DB from 'datalogia'

/**
 * @type {import('entail').Suite}
 */
export const testTransact = {
  'test transact': async (assert) => {
    const alice = 'did:key:z6Mkqa4oY9Z5Pf5tUcjLHLUsDjKwMC95HGXdE1j22jkbhz6r'
    const bob = 'did:key:z6MkffDZCkCTWreg8868fG1FGFogcJj5X6PY93pPcWDn9bob'
    const mallory = 'did:key:z6MktafZTREjJkvV5mfJxcLpNBoVPwDLhTuMg9ng7dY4zMAL'

    const ucans = [
      {
        iss: alice,
        aud: bob,
        exp: 1702413523,
        att: [
          {
            can: 'upload/add',
            with: alice,
          },
        ],
      },
      {
        iss: alice,
        aud: bob,
        exp: 1702413523,
        att: [
          {
            can: 'store/add',
            with: alice,
          },
          {
            can: 'store/list',
            with: alice,
          },
        ],
      },
    ]

    const db = DB.Memory.create()
    await db.transact(ucans.map((ucan) => ({ Add: ucan })))

    const Capability = DB.entity({
      can: DB.string,
      with: DB.string,
    })

    const UCAN = DB.entity({
      att: Capability,
    })

    const space = DB.string()
    const storeUCAN = new UCAN()
    const uploadUCAN = new UCAN()
    const storeAdd = new Capability()
    const uploadAdd = new Capability()

    // const WritePermission = DB.entity({
    //   space: DB.string,
    //   storeAdd: DB.link,
    //   uploadAdd: DB.link,
    // })

    // Write = Rule(
    //   { space: DB.string, store: DB.string, upload: DB.string },
    //   ({ space, store, upload }) => [
    //     UCAN({
    //       id: upload,
    //       att: Capability({ can: 'upload/add', with: space }),
    //     }),
    //     UCAN({ id: store, att: Capability({ can: 'store/add', with: space }) }),
    //   ]
    // )

    // WritePermission = DB.rule({
    //   match: {
    //     space,
    //     storeUCAN,
    //     uploadUCAN,
    //   },
    //   where: [
    //     UCAN({
    //       id: uploadID,
    //       att: Capability({ can: 'upload/add', with: space }),
    //     }),
    //     UCAN({
    //       id: storeID,
    //       att: Capability({ can: 'store/add', with: space }),
    //     }),
    //   ],
    // })

    const result = await DB.query(db, {
      select: {
        space,
        storeUCAN,
        uploadUCAN,
        storeAdd,
        uploadAdd,
      },
      where: [
        storeUCAN.att.is(storeAdd),
        uploadUCAN.att.is(uploadAdd),
        uploadAdd.can.is('upload/add'),
        uploadAdd.with.is(space),
        storeAdd.can.is('store/add'),
        storeAdd.with.is(space),
      ],
    })

    assert.equal(result.length, 1)
    assert.equal(result[0].space, alice)
  },
}
