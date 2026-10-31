import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('extrait les réponses aux avis en SQL', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'ardv-'));
  try {
    const sortie = join(dossier, 'out.sql');
    execFileSync('python', ['-I', 'outils/extraire-exemples.py', 'tests/fixtures/mini-export.json', sortie]);
    const sql = readFileSync(sortie, 'utf8');
    const inserts = sql.match(/insert into ardv_exemples/gi) || [];
    assert.equal(inserts.length, 3);
    assert.match(sql, /Merci Meldy/);
    assert.ok(!sql.includes("not supported"));
    assert.match(sql, /C''est un plaisir/);
    assert.match(sql, /Chère Lulu/);
    assert.ok(!sql.includes('Voici une réponse'));
    assert.ok(!sql.includes('PC'));
  } finally { rmSync(dossier, { recursive: true, force: true }); }
});
