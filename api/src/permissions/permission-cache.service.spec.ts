import { PermissionCacheService } from './permission-cache.service';

describe('PermissionCacheService', () => {
  let cacheService: PermissionCacheService;

  beforeEach(() => {
    cacheService = new PermissionCacheService();
  });

  it('should return undefined for a non-existent or uncached user', () => {
    expect(cacheService.get('user1')).toBeUndefined();
  });

  it('should store and retrieve user groups from cache', () => {
    const mockGroups = [{ name: 'Employee', permissions: ['tasks:read'] }];
    cacheService.set('user1', mockGroups);

    const retrieved = cacheService.get('user1');
    expect(retrieved).toEqual(mockGroups);
    expect(cacheService.size()).toBe(1);
  });

  it('should invalidate cache for a specific user', () => {
    cacheService.set('user1', [{ name: 'Group1' }]);
    cacheService.set('user2', [{ name: 'Group2' }]);

    expect(cacheService.get('user1')).toBeDefined();
    expect(cacheService.get('user2')).toBeDefined();

    cacheService.invalidate('user1');

    expect(cacheService.get('user1')).toBeUndefined();
    expect(cacheService.get('user2')).toBeDefined();
    expect(cacheService.size()).toBe(1);
  });

  it('should clear entire cache when invalidate is called without userId', () => {
    cacheService.set('user1', [{ name: 'Group1' }]);
    cacheService.set('user2', [{ name: 'Group2' }]);

    cacheService.invalidate();

    expect(cacheService.get('user1')).toBeUndefined();
    expect(cacheService.get('user2')).toBeUndefined();
    expect(cacheService.size()).toBe(0);
  });

  it('should expire entries after TTL', () => {
    jest.useFakeTimers();
    try {
      cacheService.set('user1', [{ name: 'Group1' }]);
      expect(cacheService.get('user1')).toBeDefined();

      // Advance time by 61 seconds (past 60s TTL)
      jest.advanceTimersByTime(61_000);

      expect(cacheService.get('user1')).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
