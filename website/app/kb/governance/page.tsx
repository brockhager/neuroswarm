import Link from 'next/link';
import { ArrowLeft, Vote, FileText, Clock, CheckCircle, XCircle, Users, Trophy, BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Governance System | NeuroSwarm',
  description: 'Learn how NeuroSwarm\'s decentralized governance works with badge-weighted voting, proposal lifecycle, and community decision-making processes.',
  keywords: ['NeuroSwarm', 'decentralized governance', 'badge-weighted voting', 'proposal lifecycle', 'DAO governance', 'community voting', 'blockchain governance'],
  authors: [{ name: 'NeuroSwarm Team' }],
  creator: 'NeuroSwarm',
  publisher: 'NeuroSwarm',
  openGraph: {
    title: 'Governance System | NeuroSwarm',
    description: 'Learn how NeuroSwarm\'s decentralized governance works with badge-weighted voting, proposal lifecycle, and community decision-making processes.',
    url: 'https://getblockchain.tech/neuroswarm/kb/governance',
    siteName: 'NeuroSwarm Knowledge Base',
    images: [
      {
        url: 'https://getblockchain.tech/neuroswarm/og-governance.jpg',
        width: 1200,
        height: 630,
        alt: 'NeuroSwarm Governance System',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Governance System | NeuroSwarm',
    description: 'Learn how NeuroSwarm\'s decentralized governance works with badge-weighted voting, proposal lifecycle, and community decision-making processes.',
    images: ['https://getblockchain.tech/neuroswarm/og-governance.jpg'],
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
    canonical: 'https://getblockchain.tech/neuroswarm/kb/governance',
  },
};

const proposalLifecycle = [
  {
    stage: 'Draft',
    description: 'Proposal is written and reviewed by working groups',
    duration: '1-2 weeks',
    icon: FileText,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-700'
  },
  {
    stage: 'Discussion',
    description: 'Community discusses and provides feedback',
    duration: '1-3 weeks',
    icon: Users,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900'
  },
  {
    stage: 'Voting',
    description: 'Token holders vote on the proposal',
    duration: '1-2 weeks',
    icon: Vote,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900'
  },
  {
    stage: 'Outcome',
    description: 'Results are tallied and implemented if passed',
    duration: 'Ongoing',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-100 dark:bg-green-900'
  }
];

const votingRules = [
  {
    type: 'Technical Proposals',
    approval: '75%',
    discussion: '14 days',
    voting: '7 days',
    quorum: '25%'
  },
  {
    type: 'Strategic Proposals',
    approval: '60%',
    discussion: '21 days',
    voting: '14 days',
    quorum: '25%'
  },
  {
    type: 'Operational Proposals',
    approval: '50% + 1',
    discussion: '7 days',
    voting: '3 days',
    quorum: '15%'
  },
  {
    type: 'Emergency Proposals',
    approval: '60%',
    discussion: '1 day',
    voting: '12 hours',
    quorum: '10%'
  }
];

const workingGroups = [
  {
    name: 'Documentation',
    focus: 'Maintain and improve platform documentation',
    members: '12 active contributors'
  },
  {
    name: 'Community',
    focus: 'Grow and engage the contributor community',
    members: '8 active contributors'
  },
  {
    name: 'Ecosystem Growth',
    focus: 'Partnerships and platform adoption',
    members: '6 active contributors'
  },
  {
    name: 'Security',
    focus: 'Audit and improve platform security',
    members: '5 active contributors'
  }
];

export default function GovernancePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NeuroSwarm Governance System",
    "description": "Comprehensive guide to NeuroSwarm's decentralized governance with badge-weighted voting, proposal lifecycle, and community decision-making",
    "image": "https://getblockchain.tech/neuroswarm/og-governance.jpg",
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
      "@id": "https://getblockchain.tech/neuroswarm/kb/governance"
    },
    "about": [
      {
        "@type": "Thing",
        "name": "Decentralized Autonomous Organization"
      },
      {
        "@type": "Thing",
        "name": "Badge-weighted Voting"
      },
      {
        "@type": "Thing",
        "name": "Blockchain Governance"
      }
    ],
    "mentions": {
      "@type": "Organization",
      "name": "NeuroSwarm DAO",
      "description": "Decentralized AI platform governed by community voting"
    }
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
            Governance System
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Learn how NeuroSwarm's decentralized governance works, from proposal submission to voting and implementation.
          </p>
        </div>

        {/* How Voting Works */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            How Voting Works
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex items-start">
              <Vote className="h-8 w-8 text-blue-600 mr-4 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Badge-Weighted Voting
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Voting power is determined by contributor badges earned through participation and achievements.
                  Higher badge tiers grant more voting influence, rewarding active and skilled contributors.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Trophy className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900 dark:text-white">Bronze</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">1 vote</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Trophy className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900 dark:text-white">Silver</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">3 votes</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Trophy className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900 dark:text-white">Gold</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">5 votes</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Trophy className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900 dark:text-white">Diamond</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">10 votes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Proposal Lifecycle */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Proposal Lifecycle
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proposalLifecycle.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.stage} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-3">
                    <div className={`p-2 rounded-lg ${stage.color} mr-3`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {stage.stage}
                      </h3>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {stage.duration}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {stage.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Voting Rules */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Proposal Categories & Rules
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Approval
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Discussion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Voting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quorum
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {votingRules.map((rule, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {rule.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {rule.approval}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {rule.discussion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {rule.voting}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {rule.quorum}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Working Groups */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Working Groups
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workingGroups.map((group) => (
              <div key={group.name} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {group.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {group.focus}
                </p>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Users className="h-4 w-4 mr-1" />
                  {group.members}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Governance Stats */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Governance Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
              <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">47</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Proposals</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
              <Vote className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">8</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Proposals</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">68.5%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Participation Rate</div>
            </div>
          </div>
        </section>

        {/* Get Involved */}
        <section>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <Vote className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Participate in Governance
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                Your voice matters in shaping NeuroSwarm's future. Join the governance process and help
                build the decentralized AI platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="https://getblockchain.tech/neuroswarm/portal/governance"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Access Governance Portal
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