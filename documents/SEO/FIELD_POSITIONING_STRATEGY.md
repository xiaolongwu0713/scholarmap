# ScholarMap Field Positioning Strategy

**Date**: 2026-01-19  
**Status**: Active Implementation Plan

---

## 🎯 Core Problem

**Current Issue**:
- ScholarMap uses PubMed data (biomedical/life sciences only)
- SEO content is too generic ("research opportunities")
- Risk of attracting users from non-covered fields (economics, social sciences)
- High bounce rate from mismatched user expectations

**Solution**:
**Position ScholarMap as a specialized biomedical & life sciences research discovery platform**

---

## 📋 Content Strategy

### Brand Positioning

**New Tagline Options** (choose one):
1. "Global Biomedical Research Network" ⭐ (Recommended)
2. "Map Life Sciences Research Worldwide"
3. "Biomedical Scholar Discovery Platform"
4. "PubMed Research Network Visualized"

**Why**:
- Immediately communicates scope
- Attracts right audience
- Builds authority in niche

---

## 🔑 Target Keywords Strategy

### OLD (Too Generic)
❌ "research opportunities"
❌ "academic jobs"
❌ "postdoc positions"
❌ "PhD programs"

### NEW (Field-Specific)
✅ "biomedical research opportunities [country]"
✅ "PubMed researchers in [city]"
✅ "life sciences postdoc [country]"
✅ "medical research collaborators [country]"
✅ "neuroscience research [country]"
✅ "clinical research opportunities [country]"
✅ "pharmacology postdoc [city]"
✅ "biology research institutions [country]"

### Why This Works
- **Lower competition**: Fewer sites targeting these specific terms
- **Higher intent**: Users know exactly what they want
- **Better conversion**: Matches our actual data coverage
- **Easier ranking**: Long-tail + niche = faster SEO wins

---

## 📝 Covered Fields (for messaging)

### Primary Coverage (Excellent) ✅
- Medicine & Clinical Research
- Molecular Biology
- Neuroscience
- Pharmacology & Drug Development
- Public Health & Epidemiology
- Genetics & Genomics
- Biochemistry
- Immunology
- Microbiology
- Physiology
- Pathology

### Secondary Coverage (Good) ⚡
- Biomedical Engineering
- Bioinformatics
- Psychology (biomedical aspects)
- Veterinary Medicine
- Dentistry
- Nursing Research
- Medical Informatics
- Environmental Health

### NOT Covered ❌
- Economics
- Social Sciences (except health policy)
- Engineering (except biomedical)
- Humanities
- Business
- Computer Science (except bioinformatics)
- Physics (except medical physics)
- Mathematics (except biostatistics)

---

## 🛠 Implementation Checklist

### Phase 1A: Core Updates (This Week - 2-4 hours)

#### File 1: `frontend/src/app/layout.tsx`
```typescript
// UPDATE Line 11-14
title: {
  default: "ScholarMap - Global Biomedical Research Network",
  template: "%s | ScholarMap"
},
description: "Map biomedical research opportunities worldwide. Find life sciences researchers, collaborators, and academic institutions by country and city. Based on PubMed data covering medicine, biology, neuroscience, and health sciences.",

// UPDATE Line 15-27 (keywords)
keywords: [
  // Field-specific (NEW)
  "biomedical research opportunities",
  "life sciences research",
  "medical research collaboration",
  "PubMed researchers",
  "biomedical institutions",
  "neuroscience research network",
  "pharmacology research",
  "public health researchers",
  "clinical research opportunities",
  "biology research mapping",
  "medical research visualization",
  
  // Keep relevant general terms
  "academic collaboration",
  "literature search",
  "research mapping",
  "PubMed search",
  "scholar discovery",
],
```

#### File 2: `frontend/src/app/research-jobs/page.tsx`
Add field scope banner before data disclaimer (after line 58):

```typescript
{/* Field Scope Banner */}
<div className="max-w-4xl mx-auto mb-8">
  <div className="bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-600 rounded-r-lg p-5 shadow-sm">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm text-green-900">
          <strong className="font-semibold">Biomedical & Life Sciences Focus:</strong>{' '}
          ScholarMap uses PubMed data, covering biomedical research including medicine, 
          biology, neuroscience, pharmacology, public health, and related fields. 
          Not suitable for economics, social sciences, or engineering.{' '}
          <Link href="/about/coverage" className="underline hover:text-green-700 font-medium">
            See full coverage
          </Link>
        </p>
      </div>
    </div>
  </div>
</div>
```

Update metadata (line 8-26):
```typescript
export const metadata: Metadata = {
  title: 'Global Biomedical Research Opportunities by Country | ScholarMap',
  description: 'Explore biomedical and life sciences research opportunities across 150+ countries. Find PubMed researchers, medical institutions, and academic collaborations in medicine, biology, neuroscience, and health sciences.',
  keywords: [
    'biomedical research opportunities worldwide',
    'life sciences postdoc positions',
    'medical research collaborations',
    'PubMed global researchers',
    'neuroscience research network',
    'clinical research opportunities',
    'biomedical academic jobs',
    'pharmacology research positions',
    'public health researchers',
    'biology research institutions',
  ],
  // ... rest
};
```

#### File 3: `frontend/src/app/research-jobs/country/[countrySlug]/page.tsx`
Update generateMetadata (line 41-71):

```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { countrySlug } = await params;
  const countryName = slugToCountryName(countrySlug);
  const stats = await fetchCountryStats(countryName);

  if (!stats) {
    return { title: 'Country Not Found | ScholarMap' };
  }

  return {
    title: `${countryName} Biomedical Research - ${stats.scholar_count.toLocaleString()} Researchers | ScholarMap`,
    description: `Explore biomedical and life sciences research in ${countryName}. ${stats.scholar_count.toLocaleString()} PubMed researchers across ${stats.city_count} cities in medicine, biology, neuroscience, and health sciences. Find postdoc positions and research collaborations.`,
    keywords: [
      `biomedical research ${countryName}`,
      `life sciences ${countryName}`,
      `medical research ${countryName}`,
      `PubMed researchers ${countryName}`,
      `neuroscience postdoc ${countryName}`,
      `clinical research opportunities ${countryName}`,
      `pharmacology research ${countryName}`,
      `biology institutions ${countryName}`,
      `health sciences ${countryName}`,
      `biomedical collaboration ${countryName}`,
    ],
    // ... rest
  };
}
```

Add field banner in page body (after line 208, before page header):

```typescript
{/* Field Scope Banner - Country Level */}
<div className="mb-8">
  <div className="bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-600 rounded-r-lg p-4 shadow-sm">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm text-green-900">
          <strong className="font-semibold">Biomedical Research Data:</strong>{' '}
          Showing life sciences and medical research in {countryName} from PubMed database.{' '}
          <Link href="/about/coverage" className="underline hover:text-green-700 font-medium">
            Learn more
          </Link>
        </p>
      </div>
    </div>
  </div>
</div>
```

#### File 4: `frontend/src/lib/seoContent.ts`
Update content generation to include biomedical context:

```typescript
export function generateCountryContent(stats: CountryStats): CountryContent {
  const { country, scholar_count, city_count, institution_count, top_cities } = stats;
  const topCitiesNames = top_cities.slice(0, 5).map(c => c.city).join(', ');
  
  return {
    introduction: `
${country} is a significant contributor to global biomedical and life sciences research, with ${scholar_count.toLocaleString()} active researchers publishing in PubMed. The biomedical research community in ${country} spans ${city_count} major cities, including ${topCitiesNames}, covering fields such as medicine, biology, neuroscience, pharmacology, and public health.

Whether you're a PhD student seeking postdoctoral positions in the life sciences, a medical researcher looking for international collaborations, or a biomedical professional exploring academic opportunities, this page provides comprehensive insights into ${country}'s research landscape based on PubMed publication data.

The researchers and institutions shown here are actively publishing in biomedical and health sciences journals, making ${country} an important hub for those interested in medical research, biological sciences, clinical studies, and related fields.
    `.trim(),

    researchLandscape: `
The life sciences research ecosystem in ${country} comprises ${institution_count.toLocaleString()} institutions actively publishing in biomedical fields. From medical schools and research hospitals to specialized institutes focusing on neuroscience, pharmacology, and public health, ${country} offers diverse opportunities for biomedical researchers at all career stages.

Major research hubs include ${topCitiesNames}, each with distinct strengths in different areas of biomedical research. These cities host leading medical centers, university hospitals, and research institutes that contribute significantly to global health sciences knowledge.

The research output from ${country} spans multiple disciplines within biomedicine, including clinical trials, basic biological research, translational medicine, drug development, and epidemiological studies. This diversity creates numerous collaboration opportunities for researchers across the biomedical spectrum.
    `.trim(),
    
    // ... update other sections similarly
  };
}
```

---

### Phase 1B: Additional Content (Next Week - 4-6 hours)

#### New Page: `/about/coverage`
Create comprehensive coverage explanation page.

#### Updated FAQs
Add to country page FAQs:

```typescript
{
  question: "What research fields does ScholarMap cover?",
  answer: "ScholarMap uses PubMed data, covering biomedical and life sciences research including medicine, biology, neuroscience, pharmacology, public health, genetics, immunology, and related health sciences. It does not include social sciences, economics, engineering (except biomedical), or humanities."
},
{
  question: "Can I find researchers in economics or social sciences?",
  answer: "Currently no. ScholarMap focuses exclusively on biomedical and life sciences research using PubMed data. For economics, we recommend EconPapers or RePEc. For social sciences, try SSRN or Google Scholar. We may expand to other fields in the future."
},
{
  question: "Why only PubMed data?",
  answer: "PubMed is the world's most comprehensive biomedical literature database, with over 35 million citations. This allows us to provide the most accurate and complete picture of biomedical research networks. We chose to specialize in this domain to provide the best possible experience for life sciences researchers."
}
```

---

## 📊 Monitoring & Success Metrics

### Track These Metrics

**User Behavior** (expect improvements):
- ⬇️ Bounce Rate: Should decrease 10-20%
- ⬆️ Time on Page: Should increase
- ⬆️ Pages per Session: Should increase
- ⬆️ Conversion Rate: Should increase (more qualified traffic)

**SEO Performance** (2-4 weeks):
- 🎯 Rankings for "biomedical research [country]"
- 🎯 Rankings for "PubMed researchers [city]"
- 🎯 Long-tail biomedical keywords ranking

**Traffic Quality**:
- Monitor GA4 for user engagement by landing page
- Check which keywords drive highest conversion
- Identify which countries/cities have best engagement

---

## 🚀 Quick Start Checklist

**Today** (2 hours):
- [ ] Update `layout.tsx` metadata
- [ ] Add field banner to research-jobs landing page
- [ ] Update research-jobs metadata

**Tomorrow** (2 hours):
- [ ] Update country page metadata generation
- [ ] Add field banner to country pages
- [ ] Update seoContent.ts with biomedical context

**This Week**:
- [ ] Test all changes locally
- [ ] Deploy to production
- [ ] Monitor bounce rate changes
- [ ] Check GA4 for user behavior changes

**Next Week**:
- [ ] Create /about/coverage page
- [ ] Add FAQs about field coverage
- [ ] Request re-crawl of sitemap in GSC
- [ ] Monitor keyword rankings

---

## 💡 Future Considerations

### Potential Expansions (3-6 months):
1. **Add arXiv data** → Physics, Math, CS researchers
2. **Add SSRN data** → Social sciences, Economics
3. **Add EconPapers** → Economics specifically
4. **Multi-source toggle** → Let users choose data source

### Alternative: Create Separate Brands
- ScholarMap Bio (current - PubMed)
- ScholarMap Social (future - SSRN)
- ScholarMap Tech (future - arXiv)

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-19  
**Next Review**: 2026-02-19 (monitor metrics)
