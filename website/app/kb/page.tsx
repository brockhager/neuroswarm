import Link from 'next/link';
import { BookOpen, Users, Shield, Wrench, MessageSquare, FileText, Search } from 'lucide-react';
import KBSearch from '@/components/KBSearch';

export const metadata = {
  title: 'NeuroSwarm Knowledge Base | Decentralized AI Platform',
  description: 'Comprehensive knowledge base for NeuroSwarm - learn about decentralized AI, governance, community resources, technical documentation, and transparency.',
  keywords: ['NeuroSwarm', 'knowledge base', 'decentralized AI', 'blockchain', 'governance', 'DAO', 'community', 'documentation'],
  authors: [{ name: 'NeuroSwarm Team' }],
  creator: 'NeuroSwarm',
  publisher: 'NeuroSwarm',
  openGraph: {
    title: 'NeuroSwarm Knowledge Base | Decentralized AI Platform',
    description: 'Comprehensive knowledge base for NeuroSwarm - learn about decentralized AI, governance, community resources, technical documentation, and transparency.',
    url: 'https://getblockchain.tech/neuroswarm/kb',
    siteName: 'NeuroSwarm Knowledge Base',
    images: [
      {
        url: 'https://getblockchain.tech/neuroswarm/og-kb-home.jpg',
        width: 1200,
        height: 630,
        alt: 'NeuroSwarm Knowledge Base Homepage',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeuroSwarm Knowledge Base | Decentralized AI Platform',
    description: 'Comprehensive knowledge base for NeuroSwarm - learn about decentralized AI, governance, community resources, technical documentation, and transparency.',
    images: ['https://getblockchain.tech/neuroswarm/og-kb-home.jpg'],
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
    canonical: 'https://getblockchain.tech/neuroswarm/kb',
  },
};

const kbPages = [
  {
    title: 'Getting Started',
    slug: '/kb/getting-started',
    description: 'Learn what NeuroSwarm is and our core principles',
    icon: BookOpen,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900'
  },
  {
    title: 'Contributor Onboarding',
    slug: '/kb/onboarding',
    description: 'Step-by-step guide to becoming a contributor',
    icon: Users,
    color: 'text-green-600 bg-green-100 dark:bg-green-900'
  },
  {
    title: 'Governance System',
    slug: '/kb/governance',
    description: 'How voting works and proposal lifecycle',
    icon: Shield,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900'
  },
  {
    title: 'Community Resources',
    slug: '/kb/community',
    description: 'Communication channels and events',
    icon: MessageSquare,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900'
  },
  {
    title: 'Technical Documentation',
    slug: '/kb/technical',
    description: 'System overview and developer guides',
    icon: Wrench,
    color: 'text-red-600 bg-red-100 dark:bg-red-900'
  },
  {
    title: 'Transparency & Logs',
    slug: '/kb/transparency',
    description: 'Decision records and audit trails',
    icon: FileText,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-700'
  }
];

export default function KBHomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "NeuroSwarm Knowledge Base",
    "description": "Comprehensive knowledge base for NeuroSwarm - learn about decentralized AI, governance, community resources, technical documentation, and transparency",
    "url": "https://getblockchain.tech/neuroswarm/kb",
    "image": "https://getblockchain.tech/neuroswarm/og-kb-home.jpg",
    "publisher": {
      "@type": "Organization",
      "name": "NeuroSwarm"
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Knowledge Base Articles",
      "numberOfItems": 6,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Getting Started",
          "description": "Learn what NeuroSwarm is and our core principles",
          "url": "https://getblockchain.tech/neuroswarm/kb/getting-started"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Contributor Onboarding",
          "description": "Step-by-step guide to becoming a contributor",
          "url": "https://getblockchain.tech/neuroswarm/kb/onboarding"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Governance System",
          "description": "How voting works and proposal lifecycle",
          "url": "https://getblockchain.tech/neuroswarm/kb/governance"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Community Resources",
          "description": "Communication channels and events",
          "url": "https://getblockchain.tech/neuroswarm/kb/community"
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "Technical Documentation",
          "description": "System overview and developer guides",
          "url": "https://getblockchain.tech/neuroswarm/kb/technical"
        },
        {
          "@type": "ListItem",
          "position": 6,
          "name": "Transparency & Logs",
          "description": "Decision records and audit trails",
          "url": "https://getblockchain.tech/neuroswarm/kb/transparency"
        }
      ]
    },
    "about": [
      {
        "@type": "Thing",
        "name": "Decentralized AI"
      },
      {
        "@type": "Thing",
        "name": "Blockchain Technology"
      },
      {
        "@type": "Thing",
        "name": "Open Source Software"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Launch Announcement Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">🎉 Governance System Now Live!</h2>
              <p className="text-blue-100 mb-4">
                NeuroSwarm's comprehensive Knowledge Base and governance system are now available.
                Join thousands of contributors shaping the future of decentralized AI.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">📚 Complete KB</span>
                <span className="bg-white/20 px-3 py-1 rounded-full">🏛️ Governance System</span>
                <span className="bg-white/20 px-3 py-1 rounded-full">🔍 Smart Search</span>
                <span className="bg-white/20 px-3 py-1 rounded-full">📊 Real-time Transparency</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-4xl">🚀</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <KBSearch />

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kbPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.slug}
                href={page.slug}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <div className={`p-2 rounded-lg ${page.color} mr-3`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {page.title}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {page.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            Need help? Check out our{' '}
            <Link href="https://getblockchain.tech/neuroswarm/portal" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              contributor portal
            </Link>{' '}
            or join our{' '}
            <Link href="https://getblockchain.tech/neuroswarm/community" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              community forum
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
    </>
  );
}