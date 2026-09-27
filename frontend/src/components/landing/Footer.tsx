"use client";

import Link from 'next/link';

export function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 pb-8 border-b border-gray-800">
          {/* About Section */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">LabScout</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Mapping global biomedical research networks to help researchers discover opportunities and collaborations.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/research-jobs" className="hover:text-blue-400 transition-colors">
                  Research Opportunities
                </Link>
              </li>
              <li>
                <Link href="/use-cases" className="hover:text-blue-400 transition-colors">
                  Use Cases
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-blue-400 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/about/methodology" className="hover:text-blue-400 transition-colors">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-blue-400 transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-blue-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-blue-400 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/sitemap-page" className="hover:text-blue-400 transition-colors">
                  Sitemap
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-blue-400 transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="text-white font-semibold mb-4">Get in Touch</h4>
            <p className="text-sm text-gray-400 mb-3">
              Have questions or feedback? We'd love to hear from you.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href="mailto:contact@labscout.io" className="hover:text-blue-400 transition-colors break-all">
                contact@labscout.io
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-400">
            © 2026 LabScout. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

