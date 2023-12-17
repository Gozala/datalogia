export const facts = /** @type {const} */ ([
  ["bafy...upload", "issuer", "did:key:zAlice"],
  ["bafy...upload", "audience", "did:key:zBob"],
  ["bafy...upload", "expiration", 1702413523],
  ["bafy...upload", "capabilities", "bafy...upload/capabilities/0"],
  ["bafy...upload/capabilities/0", "can", "upload/add"],
  ["bafy...upload/capabilities/0", "with", "did:key:zAlice"],

  ["bafy...store", "issuer", "did:key:zAlice"],
  ["bafy...store", "audience", "did:key:zBob"],
  ["bafy...store", "expiration", 1702413523],
  ["bafy...store", "capabilities", "bafy...store/capabilities/0"],
  ["bafy...store/capabilities/0", "can", "store/add"],
  ["bafy...store/capabilities/0", "with", "did:key:zAlice"],

  ["bafy...store", "capabilities", "bafy...store/capabilities/1"],
  ["bafy...store/capabilities/1", "can", "store/list"],
  ["bafy...store/capabilities/1", "with", "did:key:zAlice"],
])
