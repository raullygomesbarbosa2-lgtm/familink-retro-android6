/**
 * Payload-First Security TDD specification runner for Firestore Rules.
 * Verifies the "Dirty Dozen" adversarial payloads against the Eight Pillars.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  expected: 'PERMISSION_DENIED' | 'ALLOWED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Room Create',
    operation: 'create',
    path: '/rooms/ABC123',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/rooms/ABC123',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Create',
    operation: 'create',
    path: '/rooms/ABC123',
    expected: 'PERMISSION_DENIED',
    payload: { hostUid: 'victim_uid' },
  },
  {
    id: 4,
    name: 'Cross-Region ROM Bypass (JPN room vs USA guest)',
    operation: 'update',
    path: '/rooms/ABC123',
    expected: 'PERMISSION_DENIED',
    payload: { guestRomRegion: 'USA', guestRomHash: 'b'.repeat(64) },
  },
  {
    id: 5,
    name: 'Same-Region Wrong ROM Hash',
    operation: 'update',
    path: '/rooms/ABC123',
    expected: 'PERMISSION_DENIED',
    payload: { guestRomRegion: 'USA', guestRomHash: 'c'.repeat(64) },
  },
  {
    id: 6,
    name: 'P2 Self-Approval Escalation',
    operation: 'update',
    path: '/rooms/ABC123',
    expected: 'PERMISSION_DENIED',
    payload: { guestAccessStatus: 'approved' },
  },
  {
    id: 7,
    name: 'Shadow Field Injection',
    operation: 'create',
    path: '/rooms/ABC123',
    expected: 'PERMISSION_DENIED',
    payload: { isAdmin: true },
  },
  {
    id: 8,
    name: 'Immutable Field Tamper (romHash)',
    operation: 'update',
    path: '/rooms/ABC123',
    expected: 'PERMISSION_DENIED',
    payload: { romHash: 'd'.repeat(64) },
  },
  {
    id: 9,
    name: 'Terminal State Mutation on Closed Room',
    operation: 'update',
    path: '/rooms/CLOSED1',
    expected: 'PERMISSION_DENIED',
    payload: { status: 'playing' },
  },
  {
    id: 10,
    name: 'PII Snooping on /users/{otherUid}',
    operation: 'get',
    path: '/users/other_user',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Outsider WebRTC Signal Injection',
    operation: 'create',
    path: '/rooms/ABC123/signals/sig1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Blanket List Scraping on /users',
    operation: 'list',
    path: '/users',
    expected: 'PERMISSION_DENIED',
  },
];
