import Link from 'next/link';
import { BookOpen, Users, Shield, Wrench, MessageSquare, FileText, Search, TrendingUp, Award, Calendar, ChevronRight, Star, Zap, Users as UsersIcon } from 'lucide-react';
import KBSearch from '@/components/KBSearch';

export const metadata = {
  title: 'NeuroSwarm Knowledge Base | Decentralized AI Platform',
  description: 'Comprehensive knowledge base for NeuroSwarm - learn about decentralized AI, governance, community resources, technical documentation, and transparency. Join 25+ contributors building the future.',
  keywords: ['NeuroSwarm', 'knowledge base', 'decentralized AI', 'blockchain', 'governance', 'DAO', 'community', 'documentation', 'contributor onboarding'],
  authors: [{ name: 'NeuroSwarm Team' }],
  creator: 'NeuroSwarm',
  publisher: 'NeuroSwarm',
  openGraph: {
    title: 'NeuroSwarm Knowledge Base | Decentralized AI Platform',
    description: 'Comprehensive knowledge base for NeuroSwarm - learn about decentralized AI, governance, community resources, technical documentation, and transparency. Join 25+ contributors building the future.',
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
    description: 'Comprehensive knowledge base for NeuroSwarm - learn about decentralized AI, governance, community resources, technical documentation, and transparency. Join 25+ contributors building the future.',
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
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900',
    featured: true
  },
  {
    title: 'Contributor Onboarding',
    slug: '/kb/onboarding',
    description: 'Step-by-step guide to becoming a contributor',
    icon: Users,
    color: 'text-green-600 bg-green-100 dark:bg-green-900',
    featured: true
  },
  {
    title: 'Governance System',
    slug: '/kb/governance',
    description: 'How voting works and proposal lifecycle',
    icon: Shield,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900',
    featured: true
  },
  {
    title: 'Community Resources',
    slug: '/kb/community',
    description: 'Communication channels and events',
    icon: MessageSquare,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900',
    featured: false
  },
  {
    title: 'Technical Documentation',
    slug: '/kb/technical',
    description: 'System overview and developer guides',
    icon: Wrench,
    color: 'text-red-600 bg-red-100 dark:bg-red-900',
    featured: false
  },
  {
    title: 'Transparency & Logs',
    slug: '/kb/transparency',
    description: 'Decision records and audit trails',
    icon: FileText,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-700',
    featured: true
  }
];

const contributorStories = [
  {
    name: "Alex Chen",
    badge: "Gold",
    achievement: "Led Documentation WG",
    quote: "From Bronze to Gold in 3 months - the structured onboarding made it possible!",
    avatar: "👨‍💻"
  },
  {
    name: "Sarah Kim",
    badge: "Silver",
    achievement: "50+ Governance Votes",
    quote: "Contributing to NeuroSwarm governance feels like shaping the future of AI.",
    avatar: "👩‍🔬"
  },
  {
    name: "Marcus Rodriguez",
    badge: "Diamond",
    achievement: "Core Developer",
    quote: "The badge system creates real incentives for quality contributions.",
    avatar: "👨‍💻"
  }
];

const recentUpdates = [
  {
    title: "Sprint 1 Launch: Community Building",
    date: "Nov 18-29, 2025",
    type: "sprint",
    description: "Join our first contributor sprint focused on community growth and onboarding."
  },
  {
    title: "Governance Portal MVP Complete",
    date: "Nov 10, 2025",
    type: "achievement",
    description: "Badge-weighted voting system now live with real-time transparency."
  },
  {
    title: "WordPress Automation System",
    date: "Nov 11, 2025",
    type: "technical",
    description: "Automated content publishing enables seamless documentation updates."
  }
];

const governanceStats = {
  totalContributors: 25,
  activeProposals: 3,
  totalVotes: 147,
  badgesAwarded: 89
};

export default function KBHomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "NeuroSwarm Knowledge Base",
    "description": "Comprehensive knowledge base for NeuroSwarm - learn about decentralized AI, governance, community resources, technical documentation, and transparency. Join 25+ contributors building the future.",
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
          {/* Enhanced Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              NeuroSwarm Knowledge Base
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Your gateway to understanding and contributing to the future of decentralized AI.
              Join <strong>25+ contributors</strong> building transparent, democratic AI governance.
            </p>

            {/* Governance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center mb-2">
                  <UsersIcon className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{governanceStats.totalContributors}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Contributors</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="h-6 w-6 text-purple-600 mr-2" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{governanceStats.activeProposals}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Proposals</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-green-600 mr-2" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{governanceStats.totalVotes}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Votes</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center mb-2">
                  <Award className="h-6 w-6 text-yellow-600 mr-2" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{governanceStats.badgesAwarded}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Badges Awarded</p>
              </div>
            </div>
          </div>

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

          {/* Featured Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Main Navigation */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Explore Knowledge Base</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {kbPages.filter(page => page.featured).map((page) => {
                  const Icon = page.icon;
                  return (
                    <Link
                      key={page.slug}
                      href={page.slug}
                      className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:border-blue-300 dark:hover:border-blue-600"
                    >
                      <div className="flex items-center mb-4">
                        <div className={`p-3 rounded-lg ${page.color} mr-4`}>
                          <Icon className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {page.title}
                          </h3>
                          <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                            Read more <ChevronRight className="h-4 w-4 ml-1" />
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {page.description}
                      </p>
                    </Link>
                  );
                })}
              </div>

              {/* Additional Resources */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {kbPages.filter(page => !page.featured).map((page) => {
                    const Icon = page.icon;
                    return (
                      <Link
                        key={page.slug}
                        href={page.slug}
                        className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${page.color} w-fit mb-3`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                          {page.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {page.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contributor Stories */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Star className="h-5 w-5 text-yellow-500 mr-2" />
                  Contributor Stories
                </h3>
                <div className="space-y-4">
                  {contributorStories.map((story, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{story.avatar}</span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{story.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{story.badge} • {story.achievement}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{story.quote}"</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/kb/onboarding"
                  className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
                >
                  Read more stories <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>

              {/* Recent Updates */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                  Recent Updates
                </h3>
                <div className="space-y-4">
                  {recentUpdates.map((update, index) => (
                    <div key={index} className="flex items-start">
                      <div className={`p-1 rounded mr-3 mt-0.5 ${
                        update.type === 'sprint' ? 'bg-blue-100 text-blue-600' :
                        update.type === 'achievement' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {update.type === 'sprint' ? <Calendar className="h-3 w-3" /> :
                         update.type === 'achievement' ? <Award className="h-3 w-3" /> :
                         <Zap className="h-3 w-3" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">{update.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{update.date}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{update.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/updates"
                  className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
                >
                  View all updates <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Get Started Today</h3>
                <div className="space-y-3">
                  <Link
                    href="/kb/onboarding"
                    className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Start Onboarding
                  </Link>
                  <Link
                    href="https://getblockchain.tech/neuroswarm/portal"
                    className="block w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Access Portal
                  </Link>
                  <Link
                    href="https://discord.gg/neuroswarm"
                    className="block w-full bg-indigo-600 text-white text-center py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    Join Discord
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
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
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Last updated: November 12, 2025
            </p>
          </div>
        </div>
      </div>
    </>
  );
}