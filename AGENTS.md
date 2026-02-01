# ScholarMap Agent Instructions

## Documentation Management

**IMPORTANT: Minimize Documentation File Creation**

When documenting changes, follow this priority:

1. **First Priority**: Update existing relevant markdown files
   - Check if related documentation already exists
   - Append new information to existing files
   - Update existing sections rather than creating new files

2. **Second Priority**: Only create new documentation files when:
   - No existing file is relevant
   - The topic is completely new and substantial
   - The user explicitly requests a new document

3. **Never Create**:
   - Duplicate documentation
   - Single-purpose files for minor changes
   - Temporary "change log" files
   - Redundant README files

**Example Approach**:
```
✓ GOOD: Update documents/PERFORMANCE_OPTIMIZATION.md to add mobile optimization section
✗ BAD:  Create documents/MOBILE_OPTIMIZATION.md for minor mobile changes

✓ GOOD: Append to documents/USER_QUOTA_SYSTEM.md when adding new quota features
✗ BAD:  Create documents/NEW_QUOTA_FEATURE.md

✓ GOOD: Update README.md or documents/DEPLOYMENT_CHECKLIST.md for deployment changes
✗ BAD:  Create DEPLOYMENT_NOTES_2024.md
```

## Code Quality Standards

### Testing Before Commit
- Always test build locally before pushing to production
- Run `npm run build` for frontend changes
- Verify syntax before committing

### Response Style
- Keep responses concise and direct
- Prioritize Chinese for communication when appropriate
- Focus on actionable solutions

## Technology Stack

### Frontend (Next.js 15 + React)
- Use TypeScript for all new files
- Prefer server components over client components
- Use Tailwind CSS for styling
- Mobile-first responsive design (breakpoints: 640px, 768px, 1024px)

### Backend (FastAPI + Python)
- Use async/await for database operations
- Follow existing quota system patterns
- Maintain backwards compatibility

### Database (PostgreSQL + SQLAlchemy)
- Use migrations for schema changes
- Follow existing model patterns in `backend/app/db/models.py`

## ScholarMap-Specific Patterns

### SEO Optimization
- All public pages must have proper meta tags
- Generate sitemaps for new routes
- Mobile optimization is critical

### Quota System
- Check user tier before allowing operations
- Use functions from `backend/app/quota.py`
- Follow patterns in `config.py` USER_QUOTAS

### Deployment
- Changes auto-deploy via Render when pushed to main
- Frontend and backend deploy separately
- Health checks available via `/healthz` endpoints

## Git Commit Style

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
refactor: Code refactoring
perf: Performance improvement
```

Keep commit messages clear and focused on "what" and "why", not "how".
