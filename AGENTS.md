# ScholarMap Agent Instructions


## Code Quality Standards

### Testing Before Commit
- Always test build locally before pushing to production
- Run `npm run build` for frontend changes
- Verify syntax before committing

### Response Style
- Keep responses concise and direct
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

## Git Commit Style

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
refactor: Code refactoring
perf: Performance improvement
```

Keep commit messages clear and focused on "what" and "why", not "how".
