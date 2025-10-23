# Bug Fixes for Examples 28 & 31 Runtime Errors

## Summary

Fixed 2 runtime errors affecting examples 28-namespaces.som and
31-advanced-type-features.som:

**Results:**

- ✅ Example 28: **FIXED** - Now passes (96% → 98% success rate)
- ⚠️ Example 31: **PARTIALLY FIXED** - Operator precedence bug resolved, but
  uncovered separate pre-existing interface bug

## Issue #1: Example 28-namespaces.som ✅ FIXED

### Root Cause

**Location:** Example code (line 94)  
**Type:** Incorrect namespace reference

### Problem

Inside nested namespace `Барномаи_Мағоза.Фармоиш`, code referenced sibling
namespace `Маҳсулот` without full qualification:

```tajik
ҷамъ += Маҳсулот.нархи_умумӣ(маҳсулот);  // ❌ Sibling not in scope
```

### Fix Applied

Added full namespace qualification:

```tajik
ҷамъ += Барномаи_Мағоза.Маҳсулот.нархи_умумӣ(маҳсулот);  // ✅ Fully qualified
```

**File:** `examples/28-namespaces.som` line 94

### Test Result

```bash
$ node dist/cli.js compile examples/28-namespaces.som -o /tmp/test.js && node /tmp/test.js
✅ SUCCESS - All output displays correctly including order total
```

---

## Issue #2: Example 31-advanced-type-features.som ⚠️ PARTIALLY FIXED

### Root Cause #1: Operator Precedence Bug ✅ FIXED

**Location:** Compiler codegen.ts  
**Type:** Missing operator precedence handling in code generation

### Problem

Binary expressions with parentheses lost them during code generation, changing
operator precedence:

**Source:**

```tajik
чоп.сабт("Рамзҳо баробар? " + (рамзи_беназир === дигар_рамз));
```

**Compiled (BEFORE FIX):**

```javascript
console.log('Рамзҳо баробар? ' + рамзи_беназир === дигар_рамз);
//                                                    ^^^^^^^^^^^
// Wrong! Tries to concat string + Symbol, then compare
```

**Compiled (AFTER FIX):**

```javascript
console.log('Рамзҳо баробар? ' + (рамзи_беназир === дигар_рамз));
//                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Correct! Compares first, then concatenates with string
```

### Fix Applied

**1. Added Operator Precedence Table** (`src/codegen.ts` lines 128-203):

```typescript
private readonly operatorPrecedence: Map<string, number> = new Map([
  [',', 1],        // Lowest precedence
  ['=', 2],        // Assignment
  ['??', 4],       // Nullish coalescing
  ['||', 5],       // Logical OR
  ['&&', 6],       // Logical AND
  ['==', 10],      // Equality
  ['===', 10],
  ['<', 11],       // Relational
  ['+', 13],       // Additive
  ['-', 13],
  ['*', 14],       // Multiplicative
  ['**', 15],      // Exponentiation (highest)
]);
```

**2. Updated generateBinaryExpression** (lines 825-843):

```typescript
private generateBinaryExpression(node: BinaryExpression, parentOperator?: string): string {
  // Recursively generate operands with parent context
  const left = node.left.type === 'BinaryExpression'
    ? this.generateBinaryExpression(node.left as BinaryExpression, node.operator)
    : this.generateExpression(node.left);

  const right = node.right.type === 'BinaryExpression'
    ? this.generateBinaryExpression(node.right as BinaryExpression, node.operator)
    : this.generateExpression(node.right);

  const expr = `${left} ${node.operator} ${right}`;

  // Add parentheses if this has lower precedence than parent
  if (parentOperator && this.needsParentheses(node.operator, parentOperator)) {
    return `(${expr})`;
  }

  return expr;
}
```

**3. Implemented needsParentheses** (lines 1197-1218):

```typescript
private needsParentheses(operator: string, parentOperator: string): boolean {
  const opPrecedence = this.operatorPrecedence.get(operator) || 0;
  const parentPrecedence = this.operatorPrecedence.get(parentOperator) || 0;

  // Lower precedence needs parentheses
  if (opPrecedence < parentPrecedence) {
    return true;
  }

  // Handle right-associative operators like **
  if (opPrecedence === parentPrecedence && parentOperator === '**') {
    return operator !== '**';
  }

  return false;
}
```

### Root Cause #2: Interface Property Generation Bug ⚠️ DISCOVERED (Pre-existing)

**Location:** Compiler codegen.ts  
**Type:** Interface properties incorrectly emitted as standalone statements

### Problem

Interface property declarations are being emitted as executable JavaScript:

**Source (line 68):**

```tajik
интерфейс МаълумотиМахфӣ {
    [рамзи_беназир]: сатр;
    маълумоти_ошкор: сатр;  // ← This property
}
```

**Compiled Output:**

```javascript
// Interface: МаълумотиМахфӣ
маълумоти_ошкор; // ❌ Invalid standalone statement
```

### Status

- **Not fixed in this PR** - This is a separate pre-existing bug in interface
  compilation
- Interfaces should generate only comments, not executable code
- Property declarations should be completely stripped
- Requires investigation of interface property parsing/generation logic

---

## Test Results

### Unit Tests

```bash
$ npm test
✅ Test Suites: 49 passed
✅ Tests: 1,137 passed
✅ No regressions introduced
```

### Example Audit

```bash
$ npm run audit:examples
Before: 43 working (96%), 2 partial (4%)
After:  44 working (98%), 1 partial (2%)
✅ Example 28: Fixed
⚠️  Example 31: Operator precedence fixed, interface bug remains
```

### Verification

**Example 28:**

```bash
$ node dist/cli.js run examples/28-namespaces.som
✅ Фармоиш #1001
✅ Маблағи умумӣ: 225.00 сомонӣ
```

**Example 31:**

```bash
$ node dist/cli.js compile examples/31-advanced-type-features.som -o /tmp/test.js
$ grep "console.log.*Рамзҳо баробар" /tmp/test.js
console.log("Рамзҳо баробар? " + (рамзи_беназир === дигар_рамз));
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
✅ Parentheses correctly preserved
```

---

## Impact Analysis

### Severity: **HIGH** (Operator Precedence) / **LOW** (Namespace)

**Operator Precedence Bug:**

- **Critical compiler defect** affecting ALL nested binary expressions
- Could cause silent logic errors in any code using:
  - String concatenation with comparisons: `"text" + (a === b)`
  - Complex conditionals: `a || b && c`
  - Mixed arithmetic/comparison: `x + y > z`
- **Production Impact:** High - incorrect runtime behavior without compile
  errors

**Namespace Bug:**

- Simple example code error
- Easy to identify and fix
- No compiler changes needed

### Files Changed

1. `examples/28-namespaces.som` - 1 line (namespace qualification)
2. `src/codegen.ts` - 3 areas:
   - Added precedence table (+75 lines)
   - Updated `generateBinaryExpression` (+18 lines modified)
   - Replaced `needsParentheses` (+22 lines)

### Backward Compatibility

✅ All existing tests pass  
✅ No breaking changes to API  
✅ Code generation improvements are transparent

---

## Recommendations

### Immediate Actions

1. ✅ **DONE:** Fix operator precedence bug
2. ✅ **DONE:** Fix example 28 namespace reference
3. ⚠️ **TODO:** Investigate interface property generation bug

### Follow-up Work

1. **Interface Compilation Bug:**
   - Review interface property parsing in parser.ts
   - Verify interface body generation in codegen.ts
   - Add test cases for interfaces with computed property names
   - Ensure interface declarations generate zero runtime code

2. **Additional Testing:**
   - Add regression tests for operator precedence
   - Test edge cases: `a ** b ** c` (right-associative)
   - Test mixed precedence: `a + b * c === d && e`

3. **Documentation:**
   - Document operator precedence in language guide
   - Add examples of complex expressions
   - Note that parentheses are always preserved

---

## Technical Details

### Operator Precedence Reference

Based on
[MDN JavaScript Operator Precedence](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence)

| Precedence | Operators             | Associativity |
| ---------- | --------------------- | ------------- |
| 15         | `**`                  | Right         |
| 14         | `*` `/` `%`           | Left          |
| 13         | `+` `-`               | Left          |
| 12         | `<<` `>>` `>>>`       | Left          |
| 11         | `<` `<=` `>` `>=`     | Left          |
| 10         | `==` `!=` `===` `!==` | Left          |
| 9          | `&`                   | Left          |
| 8          | `^`                   | Left          |
| 7          | `\|`                  | Left          |
| 6          | `&&`                  | Left          |
| 5          | `\|\|`                | Left          |
| 4          | `??`                  | Left          |

### Implementation Strategy

Followed AGENTS.md fail-fast principles:

- ✅ Used context7 for TypeScript operator precedence research
- ✅ Used sequential thinking for systematic investigation
- ✅ Identified root causes before implementing fixes
- ✅ Minimal, targeted fixes avoiding over-engineering
- ✅ Comprehensive testing before declaring complete

---

## Conclusion

**✅ Primary Objective Achieved:**

- Operator precedence bug fixed (critical compiler defect)
- Example 28 now working (98% success rate)
- All 1,137 tests still passing
- No regressions introduced

**⚠️ Additional Finding:**

- Discovered pre-existing interface compilation bug in example 31
- Requires separate investigation and fix
- Does not block current PR
