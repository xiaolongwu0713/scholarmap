# Quick Start Guide - Review SEO Pages

**Time Required**: 10-15 minutes  
**Status**: ✅ Build Successful - Ready to Test

---

## 🚀 Start the Development Server

```bash
cd /Users/xiaowu/local_code/scholarmap/frontend
npm run dev
```

Wait for: `✓ Ready in X.Xs`

---

## 🔗 Pages to Review

### 1. Research Jobs Landing Page
**URL**: http://localhost:3000/research-jobs

**What to Check**:
- [ ] All countries display in grid
- [ ] Statistics show (scholars, institutions, papers)
- [ ] Grid is responsive (try resizing browser)
- [ ] Links to country pages work
- [ ] "Open Interactive Map" button works

---

### 2. USA Country Page
**URL**: http://localhost:3000/research-jobs/country/united-states

**What to Check**:
- [ ] Page loads without errors
- [ ] 4 statistics cards display data
- [ ] Content sections are readable (5 sections)
- [ ] Top cities grid shows (12 cities)
- [ ] FAQs display (4 questions)
- [ ] "Open Interactive Map" button works
- [ ] Breadcrumbs work (Home → Research Jobs → United States)
- [ ] Footer displays

**Mobile Test**:
- [ ] Open Chrome DevTools (F12)
- [ ] Click "Toggle device toolbar" (Ctrl+Shift+M)
- [ ] Select "iPhone 12 Pro" or similar
- [ ] Check if layout looks good

---

### 3. Sitemap
**URL**: http://localhost:3000/sitemap.xml

**What to Check**:
- [ ] Shows XML format
- [ ] Contains `/research-jobs`
- [ ] Contains `/research-jobs/country/united-states`

---

## 🔍 SEO Validation (Optional but Recommended)

### Check Metadata (5 minutes)

1. **View Page Source**:
   - Right-click on USA page → "View Page Source"
   - Search for `<title>` - should include "United States" and scholar count
   - Search for `<meta name="description"` - should be 150-160 characters
   - Search for `<meta property="og:` - should have Open Graph tags

2. **Check Structured Data**:
   - Search for `application/ld+json` in page source
   - Should find 3 JSON-LD blocks (Place, BreadcrumbList, FAQPage)

### Lighthouse Audit (5 minutes)

1. Open Chrome DevTools (F12)
2. Click "Lighthouse" tab
3. Select "SEO" only (uncheck others for speed)
4. Click "Analyze page load"
5. Target: **Score > 90**

---

## ✅ Quick Approval Checklist

### Visual
- [ ] Pages look professional
- [ ] Text is readable
- [ ] Colors/spacing are good
- [ ] Mobile layout works

### Data
- [ ] Numbers look reasonable
- [ ] City names are correct
- [ ] Content makes sense

### Functionality
- [ ] All links work
- [ ] No console errors
- [ ] No 404 errors
- [ ] CTA buttons work

---

## 🎯 Decision Points

After reviewing, decide:

### ✅ Approve → Expand to All Countries
- I will enable static generation for 100+ countries
- Update sitemap dynamically
- Deploy to production
- **Time**: ~1-2 hours

### 🔄 Request Changes
- Tell me what to adjust:
  - Content (text, length, tone)
  - Design (colors, spacing, layout)
  - Data (which stats to show)
  - Functionality (new features)

### ⏸️ Pause for Further Discussion
- Discuss strategy
- Review plan
- Consider alternatives

---

## 🐛 Common Issues

### "Cannot connect to server"
```bash
# Make sure backend is running
cd /Users/xiaowu/local_code/scholarmap/backend
python -m uvicorn app.main:app --reload
```

### "No data showing"
- Check if backend is running
- Check console for API errors
- Verify demo run IDs are correct

### "Page not found (404)"
- Make sure you're using the correct URL
- Check if frontend dev server is running

---

## 📞 Questions?

If something doesn't work or looks wrong, let me know:
1. What page/URL
2. What's wrong (screenshot helps)
3. Any console errors (F12 → Console tab)

---

**Ready to review!** 🚀

Start with: `npm run dev` in the frontend directory
