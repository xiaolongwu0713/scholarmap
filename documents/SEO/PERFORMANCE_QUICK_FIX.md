# 🚀 Performance Quick Fix Guide

## Current Status
- ✅ **SEO**: 100 (Perfect!)
- ✅ **Best Practices**: 100 (Perfect!)
- ✅ **Accessibility**: 95 (Excellent!)
- ⚠️ **Performance**: 56 (Needs Improvement)

**Goal**: Improve Performance from 56 to 85+ ⭐

---

## 🎯 Quick Wins (Execute in Order)

### 1. Optimize Images (Biggest Impact - 30+ points)

#### Step 1: Install Dependencies
```bash
cd /Users/osb3922/local_code/scholarmap/frontend
npm install --save-dev sharp
```

#### Step 2: Run Optimization Script
```bash
cd /Users/osb3922/local_code/scholarmap
node scripts/optimize_images.js
```

#### Step 3: Update Hero Component

**File**: `frontend/src/components/landing/Hero.tsx`

Replace lines 30-39:
```tsx
// BEFORE
<img
  src="/landing_page_figures/0.png"
  alt="Global research network visualization"
  className="w-full h-auto"
/>

// AFTER
import Image from 'next/image';

<Image
  src="/landing_page_figures_optimized/0.webp"
  alt="Global research network visualization"
  width={1200}
  height={630}
  priority
  quality={85}
  className="w-full h-auto"
/>
```

Replace lines 60-76:
```tsx
// BEFORE
<img
  src="/landing_page_figures/10.png"
  alt="ScholarMap use case"
  style={{...}}
/>

// AFTER
<Image
  src="/landing_page_figures_optimized/10.webp"
  alt="ScholarMap use case"
  width={1030}
  height={940}
  quality={80}
  style={{...}}
/>
```

### 2. Lazy Load Below-the-Fold Components (10+ points)

**File**: `frontend/src/app/page.tsx`

```tsx
import dynamic from 'next/dynamic';
import { Hero } from "@/components/landing/Hero";
import { WhatYouCanDo } from "@/components/landing/WhatYouCanDo";
import { Footer } from "@/components/landing/Footer";
import { LandingCTAs } from "@/components/landing/LandingCTAs";
import { LandingNavbar } from "@/components/landing/LandingNavbar";

// Lazy load HowItWorks (large component below the fold)
const HowItWorks = dynamic(
  () => import('@/components/landing/HowItWorks').then(mod => ({ default: mod.HowItWorks })),
  {
    loading: () => <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg text-gray-600">Loading...</div>
    </div>,
    ssr: true // Keep SSR for SEO
  }
);

// Lazy load structured data (not critical for initial render)
const StructuredData = dynamic(
  () => import('@/components/StructuredData').then(mod => ({ default: mod.StructuredData })),
  { ssr: true }
);

// ... rest remains the same
```

### 3. Defer Non-Critical Scripts (5+ points)

**File**: `frontend/src/app/layout.tsx`

Change Google Analytics loading strategy:

```tsx
// BEFORE
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
  strategy="afterInteractive"
/>

// AFTER
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
  strategy="lazyOnload"  // Changed to lazyOnload
/>
```

### 4. Add Preconnect Hints (3+ points)

**File**: `frontend/src/app/layout.tsx`

Add in the `<head>` section:

```tsx
<head>
  <link rel="preconnect" href="https://www.googletagmanager.com" />
  <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#2563eb" />
  {/* ... rest of head */}
</head>
```

### 5. Optimize HowItWorks Images (5+ points)

**File**: `frontend/src/components/landing/HowItWorks.tsx`

Replace all image tags with Next.js Image:

```tsx
import Image from 'next/image';

// For Phase 1 images (lines ~176-180)
<Image
  src="/landing_page_figures_optimized/1-md.webp"
  alt="Step 1"
  width={600}
  height={400}
  loading="lazy"
  quality={80}
  style={{width: '100%', height: '100%', objectFit: 'contain'}}
/>

// Repeat for all images (1.png through 9.png)
```

---

## 📋 Implementation Checklist

### Phase 1: Image Optimization (1 hour)
- [ ] Install `sharp`: `cd frontend && npm install --save-dev sharp`
- [ ] Run optimization: `node scripts/optimize_images.js`
- [ ] Verify optimized images in `frontend/public/landing_page_figures_optimized/`
- [ ] Update Hero.tsx image references
- [ ] Test locally: `npm run dev`

### Phase 2: Code Optimization (30 mins)
- [ ] Add dynamic imports in page.tsx
- [ ] Update GA script strategy in layout.tsx
- [ ] Add preconnect hints in layout.tsx
- [ ] Test locally

### Phase 3: Component Images (1 hour)
- [ ] Update HowItWorks.tsx images
- [ ] Update WhatYouCanDo.tsx if needed
- [ ] Test all image loading

### Phase 4: Testing (30 mins)
- [ ] Build production: `npm run build`
- [ ] Test locally: `npm run start`
- [ ] Check all images load correctly
- [ ] Check all functionality works

### Phase 5: Deploy and Verify
- [ ] Commit changes
- [ ] Deploy to Render.com
- [ ] Wait for deployment (~5 mins)
- [ ] Test on PageSpeed Insights
- [ ] **Target**: Performance > 85

---

## 🧪 Testing Commands

```bash
# Local build and test
cd /Users/osb3922/local_code/scholarmap/frontend
npm run build
npm run start

# Open browser to http://localhost:3000
# Check:
# 1. All images load correctly
# 2. No broken layouts
# 3. All functionality works

# After deployment, test with:
# https://pagespeed.web.dev/
```

---

## 📊 Expected Results

### Before Optimization
- Performance: 56 🟠
- First Contentful Paint: ~3.5s
- Largest Contentful Paint: ~5.2s
- Total Blocking Time: ~800ms

### After Optimization (Target)
- Performance: 85-92 🟢
- First Contentful Paint: ~1.2s
- Largest Contentful Paint: ~2.5s
- Total Blocking Time: ~200ms

---

## 🆘 Troubleshooting

### If images don't load after optimization:
1. Check file paths are correct
2. Verify WebP files exist in `landing_page_figures_optimized/`
3. Clear Next.js cache: `rm -rf .next`
4. Rebuild: `npm run build`

### If performance doesn't improve:
1. Check image optimization actually ran
2. Verify images are actually being lazy-loaded
3. Use Chrome DevTools Network tab to confirm WebP format
4. Check bundle size with: `npm run build` (look for bundle sizes)

---

## 💡 Pro Tips

1. **Test incrementally**: Make changes, test, then proceed
2. **Keep original images**: Don't delete PNG originals yet
3. **Use WebP with fallback**: Next.js Image handles this automatically
4. **Monitor bundle size**: Run `npm run build` to see bundle sizes
5. **Check mobile**: Test on mobile devices or Chrome DevTools mobile view

---

## 📞 Next Steps After Deployment

1. **Monitor PageSpeed Insights**: Test daily for a week
2. **Check Core Web Vitals**: In Google Search Console
3. **User Testing**: Ask users if site feels faster
4. **Further Optimization**: If needed, optimize CSS and fonts

---

**Created**: 2026-01-16  
**Target Performance**: 85+  
**Estimated Time**: 3-4 hours total  
**Difficulty**: ⭐⭐⭐ (Moderate)

