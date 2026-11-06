import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { CONTRACTS } from '../../src/schemas/index.js';

/**
 * docs/schemas/ holds the Zod contracts exported as JSON Schema. This fails when a contract changes
 * and the published file doesn't, so the two can't drift. Regenerate with `npm run schemas:update`.
 */
const DIR = 'docs/schemas';
const UPDATE = process.env.UPDATE_SCHEMAS === '1';

function render(name: string, schema: z.ZodType): object {
  return { title: name, ...z.toJSONSchema(schema, { target: 'draft-2020-12' }) };
}

test.describe('published JSON Schemas', () => {
  test.beforeAll(() => {
    if (!UPDATE) return;
    mkdirSync(DIR, { recursive: true });
    for (const [name, schema] of Object.entries(CONTRACTS)) {
      writeFileSync(
        `${DIR}/${name}.schema.json`,
        `${JSON.stringify(render(name, schema), null, 2)}\n`,
      );
    }
  });

  for (const [name, schema] of Object.entries(CONTRACTS)) {
    test(`${name}.schema.json matches its Zod contract`, () => {
      const file = `${DIR}/${name}.schema.json`;
      const expected = render(name, schema);
      expect(existsSync(file), `${file} is missing; run npm run schemas:update`).toBe(true);
      // Compare content, not bytes: Prettier is free to reformat the published files.
      expect(
        JSON.parse(readFileSync(file, 'utf8')),
        `${file} is stale; run npm run schemas:update`,
      ).toEqual(expected);
    });
  }

  test('no file is published for a contract that no longer exists', () => {
    const published = readdirSync(DIR).filter((f) => f.endsWith('.schema.json'));
    expect(published.sort()).toEqual(
      Object.keys(CONTRACTS)
        .map((n) => `${n}.schema.json`)
        .sort(),
    );
  });
});
