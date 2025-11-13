import Link from 'next/link';
import { ArrowLeft, Brain, Users, ShieldCheck, Eye, Target, Heart } from 'lucide-react';

export const metadata = {
  title: 'Getting Started with NeuroSwarm | Decentralized AI Platform',
  description: 'Learn about NeuroSwarm\'s vision for decentralized AI, core principles of transparency and collective intelligence, and how to get involved in building the future of AI governance.',
  keywords: ['NeuroSwarm', 'decentralized AI', 'collective intelligence', 'blockchain AI', 'swarm coordination', 'governance', 'contributor onboarding'],
  authors: [{ name: 'NeuroSwarm Team' }],
  creator: 'NeuroSwarm',
  publisher: 'NeuroSwarm',
  openGraph: {
    title: 'Getting Started with NeuroSwarm | Decentralized AI Platform',
    description: 'Learn about NeuroSwarm\'s vision for decentralized AI, core principles of transparency and collective intelligence, and how to get involved in building the future of AI governance.',
    url: 'https://getblockchain.tech/neuroswarm/kb/getting-started',
    siteName: 'NeuroSwarm Knowledge Base',
    images: [
      {
        url: 'https://getblockchain.tech/neuroswarm/og-getting-started.jpg',
        width: 1200,
        height: 630,
        alt: 'NeuroSwarm - Getting Started Guide',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Getting Started with NeuroSwarm | Decentralized AI Platform',
    description: 'Learn about NeuroSwarm\'s vision for decentralized AI, core principles of transparency and collective intelligence, and how to get involved in building the future of AI governance.',
    images: ['https://getblockchain.tech/neuroswarm/og-getting-started.jpg'],
    creator: '@neuroswarm',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://getblockchain.tech/neuroswarm/kb/getting-started',
  },
};

export default function GettingStartedPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Getting Started with NeuroSwarm",
    "description": "Learn about NeuroSwarm's vision for decentralized AI, core principles of transparency and collective intelligence, and how to get involved in building the future of AI governance.",
    "image": "https://getblockchain.tech/neuroswarm/og-getting-started.jpg",
    "author": {
      "@type": "Organization",
      "name": "NeuroSwarm Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NeuroSwarm",
      "logo": {
        "@type": "ImageObject",
        "url": "https://getblockchain.tech/neuroswarm/logo.png"
      }
    },
    "datePublished": "2025-11-12",
    "dateModified": "2025-11-12",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://getblockchain.tech/neuroswarm/kb/getting-started"
    },
    "about": [
      {
        "@type": "Thing",
        "name": "Decentralized AI"
      },
      {
        "@type": "Thing", 
        "name": "Collective Intelligence"
      },
      {
        "@type": "Thing",
        "name": "Blockchain Governance"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Navigation */}
        <Link
          href="/kb"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Knowledge Base
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Getting Started with NeuroSwarm
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Learn about NeuroSwarm&apos;s vision, principles, and how to get involved in building the decentralized AI platform.
          </p>
        </div>

        {/* What is NeuroSwarm */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            What is NeuroSwarm?
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <Brain className="h-8 w-8 text-blue-600 mr-4 mt-1" />
              <div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  NeuroSwarm is a decentralized AI platform that enables collective intelligence through swarm coordination.
                  Unlike traditional AI systems controlled by single entities, NeuroSwarm distributes intelligence across
                  a network of contributors, creating a more robust, transparent, and democratic AI ecosystem.
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Our platform combines blockchain technology, decentralized storage, and swarm intelligence algorithms
                  to create AI systems that are owned and governed by their community.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Principles */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Core Principles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-3">
                <Eye className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Transparency
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                All decisions, data flows, and algorithmic processes are auditable and verifiable by the community.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-3">
                <ShieldCheck className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Auditability
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Every contribution and decision is recorded on-chain, ensuring complete traceability and accountability.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-3">
                <Users className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Contributor Empowerment
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Contributors have real governance power and economic incentives aligned with the platform&apos;s success.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-3">
                <Target className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Collective Intelligence
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Intelligence emerges from coordinated action across diverse contributors, not centralized control.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="https://getblockchain.tech/neuroswarm/portal"
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Contributor Portal</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Access governance and contribution tools</p>
                </div>
              </div>
            </Link>

            <Link
              href="/kb/onboarding"
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg mr-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Contributor Onboarding</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Step-by-step guide to get started</p>
                </div>
              </div>
            </Link>

            <Link
              href="/kb/governance"
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg mr-4">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Governance System</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Learn how decisions are made</p>
                </div>
              </div>
            </Link>

            <Link
              href="/kb/community"
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg mr-4">
                  <Heart className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Community Resources</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Connect with other contributors</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Next Steps */}
        <section>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Join thousands of contributors building the future of decentralized AI. Start your journey today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/kb/onboarding"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Start Onboarding Process
              </Link>
              <Link
                href="https://getblockchain.tech/neuroswarm/portal"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
              >
                Explore Contributor Portal
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}