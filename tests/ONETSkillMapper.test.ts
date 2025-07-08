import ONETSkillMapper from '../src/ONETSkillMapper';

describe('ONETSkillMapper', () => {
  let mapper: ONETSkillMapper;

  beforeAll(() => {
    mapper = new ONETSkillMapper();
  });

  test('expands "good with people" to 5+ formal skills', async () => {
    const result = await mapper.mapUserSkills(['good with people']);
    expect(result[0].onetSkills.length).toBeGreaterThanOrEqual(5);
    expect(result[0].onetSkills).toContainEqual(
      expect.objectContaining({ name: 'Social Perceptiveness' })
    );
  });
});
