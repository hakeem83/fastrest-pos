# Security Specification: FastRest POS Cloud Sync (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: No collection or document outside `/cloud_businesses/{businessId}` and `/admins/{adminUid}` is readable or writable.
2. **Verified Identity**: Only signed-in users with `request.auth.token.email_verified == true` may read or write cloud business snapshots.
3. **Strict Ownership**: Every document in `/cloud_businesses/{businessId}` must have `ownerUid == request.auth.uid`, and `businessId` in the document body must strictly match the `{businessId}` path variable.
4. **Immutable Core Fields**: Upon update, `businessId`, `ownerUid`, and `createdAt` must never change (`incoming().ownerUid == existing().ownerUid`, `incoming().businessId == existing().businessId`, `incoming().createdAt == existing().createdAt`).
5. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
6. **Zero Blanket Reads**: `allow list` on `/cloud_businesses/{businessId}` strictly requires `resource.data.ownerUid == request.auth.uid || isAdmin()`.
7. **Schema & Volumetric Bounds**: All strings and numbers are strictly type-checked and bounded according to `firebase-blueprint.json` (`businessId` <= 128, `ownerUid` <= 128, `ownerEmail` <= 256, `businessName` <= 200, `branchName` <= 200, `currency` <= 20).

## 2. The "Dirty Dozen" Payloads
1. **Unverified Email Spoof**: Authenticated user with `email: "magwwad@gmail.com"` but `email_verified: false` attempting `create`.
2. **Identity Spoofing on Create**: Setting `ownerUid: "victim-uid"` when `request.auth.uid == "attacker-uid"`.
3. **Path-Body ID Mismatch**: Creating `/cloud_businesses/biz-1` with body `businessId: "biz-2"`.
4. **ID Poisoning**: Attempting to write to `/cloud_businesses/invalid$id!with*spaces` or a 500-char ID.
5. **Shadow Field Injection on Create**: Sending extra field `isSuperAdmin: true` not in `hasOnly()` allowlist.
6. **Shadow Field Injection on Update**: Updating document with an undeclared field `hacked: 1`.
7. **Ownership Hijack on Update**: Modifying `ownerUid` from existing owner to another UID during `update`.
8. **CreatedAt Tampering on Update**: Modifying `createdAt` timestamp during `update`.
9. **Client Timestamp Forgery**: Providing a past/future timestamp instead of `request.time` for `updatedAt`.
10. **Value Poisoning (Oversized String)**: Setting `businessName` to a 10,000-character string (> 200 max).
11. **Invalid Enum Injection**: Setting `businessType: "crypto_exchange"` instead of `'restaurant'` or `'retail'`.
12. **Unauthorized Blanket List**: Querying `/cloud_businesses` without filtering by `ownerUid == request.auth.uid`.
