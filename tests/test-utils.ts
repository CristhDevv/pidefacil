/**
 * ==============================================================================
 * Test Runner Utility & Assertions for PideFácil Unit Tests
 * ==============================================================================
 */

export interface TestStats {
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

export class TestSuite {
  public name: string;
  public total = 0;
  public passed = 0;
  public failed = 0;
  public errors: string[] = [];

  constructor(name: string) {
    this.name = name;
  }

  assert(condition: boolean, testName: string, details?: string) {
    this.total++;
    if (condition) {
      this.passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      this.failed++;
      const err = `❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`;
      this.errors.push(err);
      console.error(`  ${err}`);
    }
  }

  assertEqual<T>(actual: T, expected: T, testName: string) {
    const isEq = JSON.stringify(actual) === JSON.stringify(expected);
    this.assert(
      isEq,
      testName,
      `Esperado: ${JSON.stringify(expected)}, Obtenido: ${JSON.stringify(actual)}`
    );
  }

  assertThrows(fn: () => void, testName: string) {
    this.total++;
    try {
      fn();
      this.failed++;
      const err = `❌ [FAIL] ${testName} -> Se esperaba que lanzara excepción pero no lanzó ninguna`;
      this.errors.push(err);
      console.error(`  ${err}`);
    } catch {
      this.passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    }
  }

  summary(): TestStats {
    console.log(`\n--- Resumen Suite: ${this.name} ---`);
    console.log(`Total: ${this.total} | Pasadas: ${this.passed} | Falladas: ${this.failed}`);
    if (this.failed > 0) {
      console.error(`Fallos encontrados:\n${this.errors.join('\n')}`);
    }
    return {
      suiteName: this.name,
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      errors: this.errors,
    };
  }
}
