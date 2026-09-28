/**
 * Internal test helpers. Prefer importing from `ngxsmk-socket-io/testing` in apps.
 * Kept here so unit specs can import without the secondary entry path mapping.
 */
export {
  MockManager,
  MockSocket,
  createMockSocketFactory,
  type MockFactoryState,
} from '../../../testing/src/mock-socket';
