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

    console.log([...db.facts({ attribute: 'can' })])

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

    const result = DB.query(db, {
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

    console.log(result)
  },
}
