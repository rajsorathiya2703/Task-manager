/**
 * Scratch verification script for P0-02.
 * Run: npx ts-node -r tsconfig-paths/register src/access/catalog.check.ts
 */
import { MODULE_CATALOG, getSensitiveFields } from './catalog';

const count = MODULE_CATALOG.length;
console.log(`\nModule count: ${count} (expected: 12)`);

if (count !== 12) {
  console.error(`❌  FAIL — expected 12, got ${count}`);
  process.exit(1);
}

console.log('\nModules registered:');
MODULE_CATALOG.forEach((m, i) => {
  const fieldCount = m.fields.length;
  const sensitiveCount = m.fields.filter((f) => f.sensitive).length;
  console.log(
    `  ${String(i + 1).padStart(2)}. ${m.id.padEnd(22)} ` +
      `actions=${m.actions.length}  fields=${fieldCount}` +
      (sensitiveCount ? `  sensitive=${sensitiveCount}` : ''),
  );
});

// Verify payroll fields on employees are marked sensitive
const empSensitive = getSensitiveFields('employees');
console.log(`\nemployees sensitive fields (${empSensitive.length}):`, empSensitive);
if (empSensitive.length !== 6) {
  console.error(`❌  FAIL — expected 6 sensitive employee fields, got ${empSensitive.length}`);
  process.exit(1);
}

console.log('\n✅  All assertions passed.');
