# Security Specification — FamiLink Netplay

## 1. Data Invariants
1. **PII Isolation**: User email addresses reside exclusively in `/users/{userId}` and are readable/writable only when `request.auth.uid == userId` with verified email. Public gamer names/avatars live in `/publicProfiles/{userId}` with zero PII.
2. **Host Authority (P1)**: A room cannot exist without a valid `hostUid == request.auth.uid`, valid 64-char SHA-256 `romHash`, and valid `romRegion` (`USA`, `JPN`, `EUR`, `WORLD`). `hostUid`, `romHash`, `romRegion`, `romSize`, `roomCode`, and `createdAt` are immutable after creation.
3. **Strict ROM & Region Matching (P2 Join Gate)**: P2 can only join an open room (`guestUid == ""` and `guestAccessStatus == "empty"`) if `guestRomHash == existing().romHash` AND `guestRomRegion == existing().romRegion`. Cross-region (e.g., `JPN` vs `USA`) or mismatched SHA-256 ROMs are rejected at the Firestore rule layer.
4. **P1 Approval Gate**: When P2 joins, `guestAccessStatus` MUST be `'pending'`. P2 cannot set `guestAccessStatus` to `'approved'`; only `hostUid` (P1) can approve or deny P2 access.
5. **Terminal State Locking**: Once a room reaches `status == 'closed'`, no subsequent updates are allowed.
6. **Subcollection Master Gate**: `/rooms/{roomId}/signals` and `/rooms/{roomId}/messages` verify parent room membership (`hostUid` or `guestUid`) via `get()`.
7. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must equal `request.time`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unauthenticated Room Create**: `request.auth == null` creating `/rooms/ABC123`.
2. **Unverified Email Write**: `request.auth.token.email_verified == false` writing `/rooms/ABC123`.
3. **Identity Spoofing on Create**: User A creates `/rooms/ABC123` with `hostUid: "user_B"`.
4. **Cross-Region ROM Bypass (JPN vs USA)**: Room has `romRegion: "JPN"` and `romHash: "<64hex_jpn>"`; P2 sends update with `guestRomRegion: "USA"` and `guestRomHash: "<64hex_usa>"`.
5. **Same-Region Wrong ROM Hash**: Room has `romRegion: "USA"` and `romHash: "<hashA>"`; P2 sends update with `guestRomRegion: "USA"` and `guestRomHash: "<hashB>"`.
6. **P2 Self-Approval Escalation**: P2 sends update setting `guestAccessStatus: "approved"` directly.
7. **Shadow Field Injection**: P1 creates room with extra ghost field `isAdmin: true`.
8. **Immutable Field Tamper**: P1 updates `romHash` or `hostUid` after room creation.
9. **Terminal State Mutation**: P1 updates `status: "playing"` on a room that is already `status: "closed"`.
10. **PII Snooping**: User B attempts `get` on `/users/user_A` containing email PII.
11. **Outsider Signal Injection**: User C (neither `hostUid` nor `guestUid`) creates a WebRTC signal in `/rooms/ABC123/signals/sig1`.
12. **Blanket List Scraping**: User B attempts to `list` `/rooms` without matching waiting/participant constraints, or tries `list` on `/users`.
