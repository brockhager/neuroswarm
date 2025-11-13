import Link from 'next/link';
import { ArrowLeft, FileText, Vote, Clock, CheckCircle, XCircle, TrendingUp, Eye, ExternalLink, Users, MessageSquare } from 'lucide-react';

export const metadata = {
  title: 'Transparency & Logs | NeuroSwarm',
  description: 'Complete transparency into NeuroSwarm\'s governance process with auditable records, decision logs, and comprehensive charter documentation.',
  keywords: ['NeuroSwarm', 'transparency', 'governance logs', 'audit trails', 'decision records', 'blockchain transparency', 'DAO governance'],
  authors: [{ name: 'NeuroSwarm Team' }],
  creator: 'NeuroSwarm',
  publisher: 'NeuroSwarm',
  openGraph: {
    title: 'Transparency & Logs | NeuroSwarm',
    description: 'Complete transparency into NeuroSwarm\'s governance process with auditable records, decision logs, and comprehensive charter documentation.',
    url: 'https://getblockchain.tech/neuroswarm/kb/transparency',
    siteName: 'NeuroSwarm Knowledge Base',
    images: [
      {
        url: 'https://getblockchain.tech/neuroswarm/og-transparency.jpg',
        width: 1200,
        height: 630,
        alt: 'NeuroSwarm Transparency & Audit Logs',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Transparency & Logs | NeuroSwarm',
    description: 'Complete transparency into NeuroSwarm\'s governance process with auditable records, decision logs, and comprehensive charter documentation.',
    images: ['https://getblockchain.tech/neuroswarm/og-transparency.jpg'],
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
    canonical: 'https://getblockchain.tech/neuroswarm/kb/transparency',
  },
};

const recentDecisions = [
  {
    id: 'prop-47',
    title: 'Q1 Roadmap Priorities Implementation',
    status: 'passed',
    votes: { yes: 234, no: 67, abstain: 12 },
    date: 'November 10, 2025',
    category: 'Strategic'
  },
  {
    id: 'prop-46',
    title: 'Community Working Group Formation',
    status: 'passed',
    votes: { yes: 189, no: 23, abstain: 45 },
    date: 'November 5, 2025',
    category: 'Governance'
  },
  {
    id: 'prop-45',
    title: 'Validator Rewards Adjustment',
    status: 'failed',
    votes: { yes: 145, no: 156, abstain: 31 },
    date: 'October 28, 2025',
    category: 'Economic'
  },
  {
    id: 'prop-44',
    title: 'Security Audit Budget Allocation',
    status: 'passed',
    votes: { yes: 267, no: 45, abstain: 18 },
    date: 'October 20, 2025',
    category: 'Security'
  }
];

const auditTrails = [
  {
    event: 'Proposal Created',
    actor: 'Contributor_0x7423...',
    timestamp: 'November 10, 2025 14:30 UTC',
    details: 'Q1 Roadmap Priorities proposal submitted',
    txHash: '8x7F2kL9mN3pQ5rS8tU1vW4xY6zA9bC2dE4fG6hI8jK0lM2nO4pQ6rS8tU0vW2xY4z'
  },
  {
    event: 'Vote Cast',
    actor: 'Validator_0x9B12...',
    timestamp: 'November 10, 2025 16:45 UTC',
    details: 'Diamond badge vote (10 votes) cast for proposal #47',
    txHash: '2y8G4iK6mO0qS2uW4yA6cE8gI0kM2oQ4sU6wY8aC0eG2iK4mO6qS8uW0yA2cE4g'
  },
  {
    event: 'Proposal Executed',
    actor: 'System',
    timestamp: 'November 11, 2025 09:00 UTC',
    details: 'Proposal #47 passed with 75.2% approval, execution triggered',
    txHash: '4z6B8dF0hJ2lN4pR6tV8xZ0bD2fH4jL6nP8rT0vX2zB4dF6hJ8lN0pR2tV4xZ6b'
  },
  {
    event: 'Badge Awarded',
    actor: 'System',
    timestamp: 'November 11, 2025 09:15 UTC',
    details: 'Early voter badge awarded to 23 contributors for proposal #47',
    txHash: '6b8D0fH2jL4nP6rT8vX0zB2dF4hJ6lN8pR0tV2xZ4bD6fH8jL0nP2rT4vX6zB8d'
  }
];

const transparencyFeatures = [
  {
    title: 'Complete Audit Trail',
    description: 'Every action is recorded on-chain with cryptographic proof',
    icon: FileText,
    details: ['Transaction hashes', 'Timestamp verification', 'Actor identification', 'Action details']
  },
  {
    title: 'Real-time Governance Feed',
    description: 'Live updates on proposals, votes, and decision outcomes',
    icon: TrendingUp,
    details: ['Live vote counting', 'Proposal status updates', 'Community notifications', 'Historical data']
  },
  {
    title: 'Decision Records',
    description: 'Structured documentation of all governance decisions',
    icon: CheckCircle,
    details: ['Proposal summaries', 'Voting results', 'Implementation status', 'Rationale documentation']
  },
  {
    title: 'Public Analytics',
    description: 'Community participation and platform health metrics',
    icon: Eye,
    details: ['Participation rates', 'Voting patterns', 'Badge distribution', 'Proposal success rates']
  }
];

export default function TransparencyPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "NeuroSwarm Governance Transparency Records",
    "description": "Complete transparency into NeuroSwarm's governance process with auditable records of all decisions, votes, and platform activities",
    "url": "https://getblockchain.tech/neuroswarm/kb/transparency",
    "image": "https://getblockchain.tech/neuroswarm/og-transparency.jpg",
    "creator": {
      "@type": "Organization",
      "name": "NeuroSwarm"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NeuroSwarm"
    },
    "datePublished": "2025-11-12",
    "dateModified": "2025-11-12",
    "license": "https://creativecommons.org/licenses/by/4.0/",
    "isAccessibleForFree": true,
    "distribution": [
      {
        "@type": "DataDownload",
        "encodingFormat": "text/html",
        "contentUrl": "https://getblockchain.tech/neuroswarm/kb/transparency"
      }
    ],
    "about": [
      {
        "@type": "Thing",
        "name": "Blockchain Governance"
      },
      {
        "@type": "Thing",
        "name": "Decentralized Autonomous Organization"
      },
      {
        "@type": "Thing",
        "name": "Audit Trails"
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
            Transparency & Logs
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Complete transparency into NeuroSwarm's governance process, with auditable records
            of all decisions, votes, and platform activities.
          </p>
        </div>

        {/* Transparency Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Transparency Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transparencyFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start mb-4">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    {feature.description}
                  </p>
                  <ul className="space-y-1">
                    {feature.details.map((detail, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Decisions */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Recent Governance Decisions
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Proposal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Votes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {recentDecisions.map((decision) => (
                    <tr key={decision.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {decision.title}
                          </div>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            #{decision.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          decision.status === 'passed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {decision.status === 'passed' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {decision.status.charAt(0).toUpperCase() + decision.status.slice(1)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-3">
                          <span className="text-green-600">✓ {decision.votes.yes}</span>
                          <span className="text-red-600">✗ {decision.votes.no}</span>
                          <span className="text-gray-600">− {decision.votes.abstain}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {decision.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {decision.category}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Audit Trail */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Recent Audit Trail
          </h2>
          <div className="space-y-4">
            {auditTrails.map((entry, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {entry.event}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {entry.actor} • {entry.timestamp}
                      </p>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  {entry.details}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  TX: {entry.txHash.slice(0, 16)}...{entry.txHash.slice(-16)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Governance Charter Reference */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Governance Charter & Rules
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <Eye className="h-8 w-8 text-blue-600 mr-4 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Complete Transparency Framework
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  All governance activities are governed by our comprehensive charter, which ensures
                  fairness, transparency, and accountability in all decision-making processes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    href="https://getblockchain.tech/neuroswarm/docs/governance-charter"
                    className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Governance Charter
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Complete rules and procedures
                    </p>
                  </Link>
                  <Link
                    href="https://getblockchain.tech/neuroswarm/docs/badge-system"
                    className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Badge System
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Voting power and rewards
                    </p>
                  </Link>
                  <Link
                    href="https://getblockchain.tech/neuroswarm/docs/transparency"
                    className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      Transparency Guide
                    </h4>
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      How we ensure accountability
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Access Full Transparency */}
        <section>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <Eye className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Full Transparency Portal
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                Access real-time governance data, detailed analytics, and complete audit trails
                through our comprehensive transparency dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="https://getblockchain.tech/neuroswarm/portal/transparency"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  View Transparency Dashboard
                </Link>
                <Link
                  href="https://getblockchain.tech/neuroswarm/docs/transparency"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
                >
                  Transparency Documentation
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Content */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Related Governance Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href="/kb/governance"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <Vote className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Governance System
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Learn how proposals are created and voted on in the governance process.
              </p>
            </Link>

            <Link
              href="/kb/onboarding"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <Users className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Contributor Onboarding
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Start your journey and earn badges to participate in governance.
              </p>
            </Link>

            <Link
              href="/kb/community"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <MessageSquare className="h-8 w-8 text-orange-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Community Resources
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Join discussions and working groups to influence governance decisions.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}