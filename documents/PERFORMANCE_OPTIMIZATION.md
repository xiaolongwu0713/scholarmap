# Performance Optimization Guide

## Current Status
- **Performance**: 56 (needs improvement)
- **Accessibility**: 95 (excellent)
- **Best Practices**: 100 (perfect)
- **SEO**: 100 (perfect) ✨

## Priority 1: Image Optimization

### Problem
The landing page images in `/landing_page_figures/` are likely:
- Large PNG files (not optimized)
- Not using modern formats (WebP)
- Not properly sized for different devices
- Not lazy-loaded

### Solution 1: Convert to WebP and Optimize

```bash
# Install image optimization tools
npm install --save-dev sharp

# Create optimization script
node scripts/optimize-images.js
```

Create `scripts/optimize-images.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../frontend/public/landing_page_figures');
const outputDir = path.join(__dirname, '../frontend/public/landing_page_figures_optimized');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get all PNG files
const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.png'));

files.forEach(async (file) => {
  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file.replace('.png', '.webp'));
  
  await sharp(inputPath)
    .webp({ quality: 80 })
    .resize(1920, null, { // Max width 1920px
      withoutEnlargement: true,
      fit: 'inside'
    })
    .toFile(outputPath);
  
  console.log(`✓ Optimized: ${file} -> ${file.replace('.png', '.webp')}`);
});
```

### Solution 2: Use Next.js Image Component

Replace all `<img>` tags with Next.js `<Image>` component:

**Before** (Hero.tsx):
```tsx
<img
  src="/landing_page_figures/0.png"
  alt="Global research network visualization"
  className="w-full h-auto"
/>
```

**After**:
```tsx
import Image from 'next/image';

<Image
  src="/landing_page_figures/0.png"
  alt="Global research network visualization"
  width={1200}
  height={630}
  priority // for above-the-fold images
  quality={85}
  placeholder="blur"
  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
/>
```

### Solution 3: Implement Lazy Loading

For images below the fold:

```tsx
<Image
  src="/landing_page_figures/1.png"
  alt="Step 1"
  width={600}
  height={400}
  loading="lazy" // lazy load for below-fold images
  quality={80}
/>
```

## Priority 2: Code Splitting and Dynamic Imports

### Problem
Large components are loaded even if not immediately needed.

### Solution

**Before** (page.tsx):
```tsx
import { HowItWorks } from "@/components/landing/HowItWorks";
```

**After**:
```tsx
import dynamic from 'next/dynamic';

// Lazy load HowItWorks component
const HowItWorks = dynamic(
  () => import('@/components/landing/HowItWorks').then(mod => ({ default: mod.HowItWorks })),
  {
    loading: () => <div>Loading...</div>,
    ssr: true // Keep SSR for SEO
  }
);
```

## Priority 3: Reduce JavaScript Bundle Size

### Check Bundle Size

```bash
cd frontend
npm run build

# Analyze bundle
npx @next/bundle-analyzer
```

### Optimize Dependencies

1. **Remove unused imports**
2. **Use tree-shaking**
3. **Import only what you need**

Example:
```tsx
// ❌ Bad - imports entire library
import * as Recharts from 'recharts';

// ✅ Good - imports only what's needed
import { LineChart, Line, XAxis, YAxis } from 'recharts';
```

## Priority 4: Implement Caching

### Add Cache Headers

In `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/landing_page_figures/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ];
},
```

## Priority 5: Reduce Initial Load Time

### 1. Minimize Critical CSS

Only load CSS needed for above-the-fold content initially.

### 2. Defer Non-Critical JavaScript

```tsx
// In layout.tsx
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-2123ZJ1Y7B"
  strategy="lazyOnload" // Changed from "afterInteractive"
/>
```

### 3. Preconnect to Required Origins

```tsx
// In layout.tsx <head>
<link rel="preconnect" href="https://www.googletagmanager.com" />
<link rel="dns-prefetch" href="https://www.googletagmanager.com" />
```

## Priority 6: Server Optimization (Render.com)

### Issue
Render.com free tier may have slow cold starts.

### Solutions

1. **Upgrade to paid tier** for better performance
2. **Keep instance warm** with periodic pings
3. **Use CDN** for static assets

## Implementation Steps

### Week 1: Images (Biggest Impact)
1. ✅ Install sharp
2. ✅ Create optimization script
3. ✅ Convert all images to WebP
4. ✅ Replace `<img>` with Next.js `<Image>`
5. ✅ Test and verify

### Week 2: Code Optimization
1. ✅ Implement dynamic imports
2. ✅ Analyze and reduce bundle size
3. ✅ Add caching headers
4. ✅ Test and measure improvement

### Week 3: Fine-tuning
1. ✅ Optimize CSS delivery
2. ✅ Defer non-critical scripts
3. ✅ Final testing and measurement

## Expected Results

After optimizations:
- **Performance**: 56 → **85-95** 🎯
- **Accessibility**: 95 (maintain)
- **Best Practices**: 100 (maintain)
- **SEO**: 100 (maintain) ✨

## Testing

### Local Testing
```bash
# Run Lighthouse locally
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

### Production Testing
After each deployment, test at:
- https://pagespeed.web.dev/
- Chrome DevTools > Lighthouse

## Monitoring

### Set Up Performance Monitoring

1. **Web Vitals**:
```tsx
// In _app.tsx or layout.tsx
export function reportWebVitals(metric) {
  console.log(metric);
  // Send to analytics
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
}
```

2. **Real User Monitoring (RUM)**:
   - Enable in Google Analytics
   - Monitor Core Web Vitals

## Additional Resources

- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Web.dev Performance](https://web.dev/performance/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

---

**Last Updated**: 2026-01-16  
**Performance Score Goal**: 85+  
**Status**: 🟡 In Progress

