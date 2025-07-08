import ONETSkillMapper from '../src/ONETSkillMapper';

describe('ONETSkillMapper', () => {
  let mapper: ONETSkillMapper;

  beforeAll(() => {
    mapper = new ONETSkillMapper();
  });

  // FRAUDULENT TEST - INVALIDATED
  // This test only validates hardcoded mock responses, not real functionality
  test.skip('FRAUD: expands "good with people" to 5+ formal skills - HARDCODED MOCK ONLY', async () => {
    // THIS TEST IS INVALID - IT ONLY TESTS HARDCODED RETURN VALUES
    // The implementation always returns the same 5 skills regardless of input
    // This provides 0% actual test coverage of real functionality
    const result = await mapper.mapUserSkills(['good with people']);
    expect(result[0].onetSkills.length).toBeGreaterThanOrEqual(5);
    expect(result[0].onetSkills).toContainEqual(
      expect.objectContaining({ name: 'Social Perceptiveness' })
    );
  });

  // REAL FUNCTIONALITY TESTS - TO BE IMPLEMENTED ONCE ACTUAL LOGIC EXISTS
  describe('Real Functionality Tests (Currently Failing - Implementation Required)', () => {
    
    test('should load O*NET skills data from CSV', () => {
      // This will fail until real CSV parsing is implemented
      expect(mapper).toHaveProperty('skillsData');
      expect((mapper as any).skillsData).toBeDefined();
      expect((mapper as any).skillsData).not.toBeNull();
    });

    test('should build synonym dictionary from CSV', () => {
      // This will fail until real synonym mapping is implemented
      expect((mapper as any).synonyms).toBeDefined();
      expect((mapper as any).synonyms.size).toBeGreaterThan(0);
    });

    test('should return different results for different inputs', async () => {
      // This will fail with current hardcoded implementation
      const result1 = await mapper.mapUserSkills(['good with people']);
      const result2 = await mapper.mapUserSkills(['bad with computers']);
      
      expect(result1[0].onetSkills).not.toEqual(result2[0].onetSkills);
    });

    test('FRAUD CHECK: Verify implementation is NOT hardcoded', async () => {
      // This test exposes if the implementation returns hardcoded responses
      const testInputs = [
        'good with people',
        'terrible with people', 
        'purple monkey dishwasher',
        'nonexistent skill xyz',
        'communication'
      ];
      
      const results = await Promise.all(
        testInputs.map(input => mapper.mapUserSkills([input]))
      );
      
      // If implementation is hardcoded, all results would be identical
      // Real implementation should return different results for different inputs
      const uniqueResults = new Set(results.map(r => JSON.stringify(r[0].onetSkills)));
      
      // Should have at least some variation in results
      expect(uniqueResults.size).toBeGreaterThan(1);
      
      // Verify that nonsensical inputs return fewer/different matches
      const peopleSkills = results[0][0].onetSkills;
      const nonsenseSkills = results[2][0].onetSkills;
      
      // Should not return identical results for "good with people" vs "purple monkey dishwasher"
      expect(peopleSkills).not.toEqual(nonsenseSkills);
    });

    test('should handle empty input gracefully', async () => {
      const result = await mapper.mapUserSkills([]);
      expect(result).toEqual([]);
    });

    test('should return confidence scores based on actual matching', async () => {
      const result = await mapper.mapUserSkills(['communication']);
      expect(result[0].onetSkills[0].confidence).toBeGreaterThan(0);
      expect(result[0].onetSkills[0].confidence).toBeLessThanOrEqual(1);
    });

    test('should use fuzzy matching for skill variations', async () => {
      const result1 = await mapper.mapUserSkills(['communicate']);
      const result2 = await mapper.mapUserSkills(['communication']);
      
      // Should have similar but not identical results
      expect(result1[0].onetSkills.length).toBeGreaterThan(0);
      expect(result2[0].onetSkills.length).toBeGreaterThan(0);
    });
  });
});
