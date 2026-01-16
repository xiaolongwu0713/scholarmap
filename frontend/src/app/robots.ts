import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/projects/*/runs/*/edit'],
    },
    sitemap: 'https://scholarmap-frontend.onrender.com/sitemap.xml',
  };
}

