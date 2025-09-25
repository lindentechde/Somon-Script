# AGENTS Guidelines

## Code Style

- Use the existing ESLint and Prettier configurations.
- Format code before committing.

## Commit Messages

- Follow [Conventional Commits](https://www.conventionalcommits.org/).
- Keep commit headers under 100 characters.

## Testing

- Run `npm run lint`, `npm test`, and `npm run audit:examples` before pushing
  changes.

## Production Readiness Assessment

### Critical Methodology: Failure Mode Analysis First

**NEVER assess production readiness based on happy path testing alone.**

When evaluating production readiness:

1. **Start with failure mode analysis** - "What happens when this breaks?"
2. **Examine actual implementation patterns** - Look for anti-patterns
3. **Focus on operational concerns** - Resource management, error handling
4. **Verify architectural consistency** - Do all components follow same
   patterns?
5. **Check platform-specific robustness** - File system, concurrency, memory

## Implementation Analysis Standards

### Required Checks for Any Production Assessment

**File System Operations:**

- ✅ Check for robust cross-platform file watching
- ✅ Verify proper error handling for file operations
- ✅ Look for race conditions in file access

**Resource Management:**

- ✅ Verify proper cleanup of resources (files, connections, timers)
- ✅ Check if optional components are actually optional
- ✅ Look for memory leaks in long-running processes

**Configuration Handling:**

- ✅ Verify fail-fast vs. silent failure patterns
- ✅ Check for proper validation and error reporting
- ✅ Ensure configuration changes don't require restarts

**Error Handling:**

- ✅ Follow "Good Exception Handling" pattern:
  ```python
  except Exception as e:
    logger.error(f"Error loading: {str(e)}")
    raise RuntimeError(f"Failed to load: {str(e)}")
  ```
- ❌ Avoid "Bad Exception Handling" pattern:
  ```python
  except Exception as e:
    logger.error(f"Error: {str(e)}")
    return {}  # NEVER mask failures
  ```

**Health/Monitoring:**

- ✅ Verify accuracy of health reporting
- ✅ Check for hardcoded values that become stale
- ✅ Ensure metrics reflect actual system state

## Architecture Review Requirements

### Component Consistency Checks

**Every component must:**

- Follow same error handling patterns
- Use consistent logging approaches
- Handle resources with same cleanup patterns
- Implement same configuration validation

### Anti-Pattern Detection

**Watch for these red flags:**

- Direct file system operations without error handling
- Hardcoded values that should be configurable
- Silent failures that mask underlying problems
- Resource leaks in error paths
- Inconsistent behavior between similar components

## Plan/Implement/Review Approach

Following AI Developer Guide methodology:

### Plan Phase

- Define specific implementation requirements
- Identify potential failure modes
- Plan error handling and resource management
- Consider operational concerns

### Implement Phase

- Write fail-fast code that reports errors clearly
- Implement proper resource cleanup
- Add comprehensive error handling
- Include operational monitoring

### Review Phase

- Test failure modes, not just happy paths
- Verify resource cleanup under error conditions
- Check consistency with existing patterns
- Validate operational behavior

## Context7 Usage Guidelines

**For Production Assessment:**

```
Use context7 to research:
- Production software quality criteria
- Robustness assessment standards
- Industry best practices for [specific technology]
- Known failure patterns in [programming language/framework]
```

**Key Libraries to Consult:**

- `/grammarly/perseverance` - Robust error handling patterns
- `/microsoft/psrule` - Production validation criteria
- `/dwmkerr/ai-developer-guide` - Development best practices

## Sequential Thinking Applications

**Use sequential thinking for:**

- Complex production readiness assessments
- Multi-component architectural analysis
- Failure mode analysis
- Implementation planning with multiple dependencies

**Template for Production Assessment:**

1. Examine core implementation for anti-patterns
2. Analyze resource management and cleanup
3. Check error handling consistency
4. Verify operational monitoring accuracy
5. Test failure modes and edge cases
6. Validate architectural consistency
7. Document specific issues found
8. Provide remediation roadmap

## Next Steps Roadmap

**Before any production deployment, address in order:**

1. **Critical Fixes (Required)**
   - Replace `fs.watch()` with Chokidar
   - Route bundling through full compiler pipeline
   - Honor production flags in ModuleLoader
   - Fix health reporting accuracy

2. **High Priority**
   - Implement fail-fast configuration validation
   - Stabilize bundle IDs (remove process.cwd() dependency)
   - Complete module system watch API

3. **Medium Priority**
   - Add comprehensive operational monitoring
   - Implement graceful degradation patterns
   - Add performance regression detection

## Collaboration Guidelines

- **Be explicit when using guides**: Reference specific sections or principles
- **Raise clarity issues**: If anything is unclear, discuss and improve
  documentation
- **Fail fast, fail clearly**: Never mask errors or return partial results
- **Test failure modes**: Always test what happens when things go wrong
- **Document operational concerns**: Include deployment and monitoring
  considerations

## Remember

**Production readiness ≠ Feature completeness**

A system is production-ready when it:

- Handles failures gracefully
- Provides accurate operational visibility
- Follows consistent architectural patterns
- Manages resources properly
- Reports errors clearly and fails fast

**Always examine implementation, never trust documentation alone.**
