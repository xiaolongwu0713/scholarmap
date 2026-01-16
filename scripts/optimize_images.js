#!/usr/bin/env node

/**
 * Image Optimization Script for ScholarMap
 * 
 * This script optimizes landing page images by:
 * 1. Converting PNG to WebP format
 * 2. Resizing to appropriate dimensions
 * 3. Compressing with quality settings
 * 4. Generating multiple sizes for responsive images
 * 
 * Usage: node scripts/optimize_images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../frontend/public/landing_page_figures');
const OUTPUT_DIR = path.join(__dirname, '../frontend/public/landing_page_figures_optimized');

// Image optimization config
const SIZES = [
  { width: 640, suffix: '-sm' },   // Mobile
  { width: 1024, suffix: '-md' },  // Tablet
  { width: 1920, suffix: '-lg' },  // Desktop
];

const QUALITY = 85; // WebP quality (0-100)

console.log('🖼️  ScholarMap Image Optimization');
console.log('================================\n');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✓ Created output directory: ${OUTPUT_DIR}\n`);
}

// Get all PNG files
const files = fs.readdirSync(INPUT_DIR).filter(file => 
  file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
);

console.log(`Found ${files.length} images to optimize\n`);

// Process each file
async function processImage(file) {
  const inputPath = path.join(INPUT_DIR, file);
  const baseName = path.parse(file).name;
  
  console.log(`Processing: ${file}`);
  
  try {
    // Get original image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`  Original: ${metadata.width}x${metadata.height}, ${(metadata.size / 1024).toFixed(2)} KB`);
    
    // Generate optimized versions at different sizes
    for (const size of SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `${baseName}${size.suffix}.webp`);
      
      await sharp(inputPath)
        .webp({ quality: QUALITY })
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .toFile(outputPath);
      
      const stats = fs.statSync(outputPath);
      console.log(`  ✓ ${size.width}px: ${(stats.size / 1024).toFixed(2)} KB`);
    }
    
    // Also create a full-size WebP version
    const fullSizePath = path.join(OUTPUT_DIR, `${baseName}.webp`);
    await sharp(inputPath)
      .webp({ quality: QUALITY })
      .toFile(fullSizePath);
    
    const fullStats = fs.statSync(fullSizePath);
    console.log(`  ✓ Full size: ${(fullStats.size / 1024).toFixed(2)} KB`);
    
    const savings = ((metadata.size - fullStats.size) / metadata.size * 100).toFixed(1);
    console.log(`  💾 Saved: ${savings}%\n`);
    
  } catch (error) {
    console.error(`  ❌ Error processing ${file}:`, error.message, '\n');
  }
}

// Process all images
async function optimizeAll() {
  for (const file of files) {
    await processImage(file);
  }
  
  console.log('================================');
  console.log('✨ Optimization complete!');
  console.log(`\nOptimized images saved to: ${OUTPUT_DIR}`);
  console.log('\nNext steps:');
  console.log('1. Review optimized images');
  console.log('2. Update image references in components');
  console.log('3. Replace <img> tags with Next.js <Image> component');
  console.log('4. Test the website');
}

// Check if sharp is installed
try {
  require.resolve('sharp');
  optimizeAll();
} catch (e) {
  console.error('❌ Error: sharp is not installed');
  console.log('\nPlease install sharp first:');
  console.log('  npm install --save-dev sharp');
  console.log('\nOr if you prefer yarn:');
  console.log('  yarn add --dev sharp');
  process.exit(1);
}

