import Link from 'next/link';
import { ArrowLeft, MessageCircle, Calendar, Users, Trophy, ExternalLink, Github, Twitter } from 'lucide-react';

export const metadata = {
  title: 'Community Resources | NeuroSwarm',
  description: 'Connect with the NeuroSwarm community through Discord, GitHub, and Twitter. Join events, earn recognition, and participate in working groups.',
  keywords: ['NeuroSwarm', 'community', 'Discord', 'GitHub', 'Twitter', 'events', 'working groups', 'contributor recognition', 'blockchain community'],
  authors: [{ name: 'NeuroSwarm Team' }],
  creator: 'NeuroSwarm',
  publisher: 'NeuroSwarm',
  openGraph: {
    title: 'Community Resources | NeuroSwarm',
    description: 'Connect with the NeuroSwarm community through Discord, GitHub, and Twitter. Join events, earn recognition, and participate in working groups.',
    url: 'https://getblockchain.tech/neuroswarm/kb/community',
    siteName: 'NeuroSwarm Knowledge Base',
    images: [
      {
        url: 'https://getblockchain.tech/neuroswarm/og-community.jpg',
        width: 1200,
        height: 630,
        alt: 'NeuroSwarm Community Resources',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Community Resources | NeuroSwarm',
    description: 'Connect with the NeuroSwarm community through Discord, GitHub, and Twitter. Join events, earn recognition, and participate in working groups.',
    images: ['https://getblockchain.tech/neuroswarm/og-community.jpg'],
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
    canonical: 'https://getblockchain.tech/neuroswarm/kb/community',
  },
};

const communicationChannels = [
  {
    name: 'Discord Server',
    description: 'Real-time chat for community discussions, support, and coordination',
    link: 'https://discord.gg/neuroswarm',
    icon: MessageCircle,
    color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900',
    members: '2,847 members'
  },
  {
    name: 'GitHub Discussions',
    description: 'Technical discussions, RFCs, and long-form community conversations',
    link: 'https://github.com/neuroswarm/neuroswarm/discussions',
    icon: Github,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-700',
    members: 'Technical community'
  },
  {
    name: 'Forum',
    description: 'Structured discussions, announcements, and knowledge sharing',
    link: 'https://getblockchain.tech/neuroswarm/community/forum',
    icon: MessageCircle,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900',
    members: 'Active discussions'
  },
  {
    name: 'Twitter',
    description: 'News, updates, and community highlights',
    link: 'https://twitter.com/neuroswarm',
    icon: Twitter,
    color: 'text-sky-600 bg-sky-100 dark:bg-sky-900',
    members: '12.5K followers'
  }
];

const upcomingEvents = [
  {
    title: 'Contributor Onboarding Sprint',
    date: 'December 15, 2025',
    time: '10:00 AM UTC',
    type: 'Workshop',
    description: 'Help new contributors get started with NeuroSwarm development'
  },
  {
    title: 'Governance Town Hall',
    date: 'December 18, 2025',
    time: '2:00 PM UTC',
    type: 'Meeting',
    description: 'Monthly governance update and Q&A session'
  },
  {
    title: 'Technical Deep Dive: Swarm Intelligence',
    date: 'December 22, 2025',
    time: '1:00 PM UTC',
    type: 'Presentation',
    description: 'Explore the algorithms powering NeuroSwarm'
  },
  {
    title: 'Community Showcase',
    date: 'January 5, 2026',
    time: '3:00 PM UTC',
    type: 'Showcase',
    description: 'Highlight community projects and achievements'
  }
];

const recognitionItems = [
  {
    type: 'Badge System',
    description: 'Earn badges for contributions, unlocking voting rights and recognition',
    icon: Trophy,
    details: ['Bronze (1 vote)', 'Silver (3 votes)', 'Gold (5 votes)', 'Diamond (10 votes)']
  },
  {
    type: 'Contributor Spotlights',
    description: 'Monthly features highlighting outstanding community contributions',
    icon: Users,
    details: ['Project showcases', 'Interview series', 'Achievement highlights']
  },
  {
    type: 'Working Group Leadership',
    description: 'Lead specialized teams tackling important platform initiatives',
    icon: MessageCircle,
    details: ['Documentation', 'Community Growth', 'Ecosystem Development', 'Security']
  }
];

export default function CommunityPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NeuroSwarm Community Resources",
    "description": "Connect with the NeuroSwarm community through various channels, participate in events, and get recognized for your contributions",
    "image": "https://getblockchain.tech/neuroswarm/og-community.jpg",
    "author": {
      "@type": "Organization",
      "name": "NeuroSwarm Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NeuroSwarm"
    },
    "datePublished": "2025-11-12",
    "dateModified": "2025-11-12",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://getblockchain.tech/neuroswarm/kb/community"
    },
    "about": [
      {
        "@type": "Thing",
        "name": "Open Source Community"
      },
      {
        "@type": "Thing",
        "name": "Blockchain Community"
      },
      {
        "@type": "Thing",
        "name": "Decentralized AI Community"
      }
    ],
    "mentions": [
      {
        "@type": "Organization",
        "name": "NeuroSwarm",
        "sameAs": [
          "https://discord.gg/neuroswarm",
          "https://github.com/neuroswarm/neuroswarm",
          "https://twitter.com/neuroswarm"
        ]
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
            Community Resources
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Connect with the NeuroSwarm community through various channels, participate in events,
            and get recognized for your contributions.
          </p>
        </div>

        {/* Communication Channels */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Communication Channels
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {communicationChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div key={channel.name} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${channel.color} mr-3`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {channel.name}
                        </h3>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {channel.members}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {channel.description}
                  </p>
                  <Link
                    href={channel.link}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
                  >
                    Join Channel →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Upcoming Events
          </h2>
          <div className="space-y-4">
            {upcomingEvents.map((event, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {event.date} at {event.time}
                      </span>
                      <span className="ml-3 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full">
                        {event.type}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {event.description}
                    </p>
                  </div>
                  <button className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    RSVP
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recognition */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Recognition & Rewards
          </h2>
          <div className="space-y-6">
            {recognitionItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {item.type}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {item.description}
                      </p>
                      <ul className="space-y-1">
                        {item.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Community Stats */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Community Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">2,847</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Discord Members</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
              <Github className="h-8 w-8 text-gray-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">156</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Contributors</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
              <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">47</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Proposals</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">1,247</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Badges Earned</div>
            </div>
          </div>
        </section>

        {/* Get Involved */}
        <section>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Join the Conversation
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                NeuroSwarm thrives on community participation. Whether you're a developer, researcher,
                or enthusiast, there's a place for you in our growing ecosystem.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="https://discord.gg/neuroswarm"
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center"
                >
                  Join Discord
                </Link>
                <Link
                  href="/kb/onboarding"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
                >
                  Start Contributing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}