# Archive

This folder contains documentation and scripts that have been archived but not deleted. They may contain useful reference material.

## Contents

### /docs
Archived documentation files that have been consolidated into `/docs/`:
- Version control documentation
- Deployment guides (consolidated)
- Setup guides (consolidated)
- Stripe integration notes
- Feature-specific docs

### /scripts
One-off backend analysis scripts used during development:
- MRR analysis and validation scripts
- Customer data comparison tools
- Interval/subscription checking utilities

## Restoration

If you need to restore any of these files:

```bash
# Restore a doc file
cp archive/docs/FILE_NAME.md ./

# Restore a script
cp archive/scripts/script_name.py backend/
```

## Why Archived?

These files were archived rather than deleted because:
1. They contain historical context that may be useful
2. Some scripts may be needed for debugging
3. Documentation may contain edge case information
4. Allows easy restoration if needed

The main documentation has been consolidated into `/docs/` for better organization.

