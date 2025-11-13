import Link from 'next/link';
import { ArrowLeft, Wallet, Trophy, BookOpen, Users, CheckCircle, HelpCircle, ExternalLink, Vote, MessageSquare, BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Contributor Onboarding | NeuroSwarm',
  description: 'Step-by-step guide to become an active contributor in the NeuroSwarm ecosystem. Learn about wallet setup, earning badges, learning paths, and joining working groups.',
  keywords: ['NeuroSwarm', 'contributor onboarding', 'blockchain badges', 'governance participation', 'learning paths', 'working groups', 'Solana wallet'],
  authors: [{ name: 'NeuroSwarm Team' }],
  creator: 'NeuroSwarm',
  publisher: 'NeuroSwarm',
  openGraph: {
    title: 'Contributor Onboarding | NeuroSwarm',
    description: 'Step-by-step guide to become an active contributor in the NeuroSwarm ecosystem. Learn about wallet setup, earning badges, learning paths, and joining working groups.',
    url: 'https://getblockchain.tech/neuroswarm/kb/onboarding',
    siteName: 'NeuroSwarm Knowledge Base',
    images: [
      {
        url: 'https://getblockchain.tech/neuroswarm/og-onboarding.jpg',
        width: 1200,
        height: 630,
        alt: 'NeuroSwarm Contributor Onboarding',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contributor Onboarding | NeuroSwarm',
    description: 'Step-by-step guide to become an active contributor in the NeuroSwarm ecosystem. Learn about wallet setup, earning badges, learning paths, and joining working groups.',
    images: ['https://getblockchain.tech/neuroswarm/og-onboarding.jpg'],
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
    canonical: 'https://getblockchain.tech/neuroswarm/kb/onboarding',
  },
};

const onboardingSteps = [
  {
    step: 1,
    title: 'Set Up Your Wallet',
    description: 'Connect a Solana-compatible wallet to interact with the platform',
    details: 'We recommend Phantom or Solflare wallets for the best experience.',
    icon: Wallet,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900'
  },
  {
    step: 2,
    title: 'Earn Your First Badge',
    description: 'Complete basic tasks to earn Bronze badge and voting rights',
    details: 'Badges determine your voting power and access to governance features.',
    icon: Trophy,
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900'
  },
  {
    step: 3,
    title: 'Follow a Learning Path',
    description: 'Choose a specialization and complete guided learning modules',
    details: 'Paths include Developer, Validator, Community Manager, and Governance roles.',
    icon: BookOpen,
    color: 'text-green-600 bg-green-100 dark:bg-green-900'
  },
  {
    step: 4,
    title: 'Join a Working Group',
    description: 'Contribute to active projects and collaborate with the community',
    details: 'Working groups focus on specific areas like documentation, development, or outreach.',
    icon: Users,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900'
  }
];

const playbooks = [
  {
    title: 'Validator Playbook',
    description: 'Learn to run and maintain validator nodes',
    link: '/docs/playbooks/validator',
    difficulty: 'Advanced'
  },
  {
    title: 'Indexer Playbook',
    description: 'Build and maintain data indexing services',
    link: '/docs/playbooks/indexer',
    difficulty: 'Intermediate'
  },
  {
    title: 'Developer Playbook',
    description: 'Contribute code and technical improvements',
    link: '/docs/playbooks/developer',
    difficulty: 'Intermediate'
  },
  {
    title: 'Governance Playbook',
    description: 'Master proposal creation and community governance',
    link: '/docs/playbooks/governance',
    difficulty: 'Beginner'
  }
];

const faqs = [
  {
    question: 'How do I claim a badge?',
    answer: 'Complete onboarding tasks and contribute to the platform. Badges are automatically awarded based on your activity and achievements.'
  },
  {
    question: 'What\'s a learning path?',
    answer: 'Learning paths are guided curricula that teach you specific skills needed for different contributor roles in NeuroSwarm.'
  },
  {
    question: 'How do working groups work?',
    answer: 'Working groups are focused teams tackling specific projects. Join based on your skills and interests to collaborate on meaningful work.'
  },
  {
    question: 'What are the badge tiers?',
    answer: 'Bronze (1 vote), Silver (3 votes), Gold (5 votes), and Diamond (10 votes). Higher tiers unlock more governance influence.'
  }
];

export default function OnboardingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "NeuroSwarm Contributor Onboarding Guide",
    "description": "Complete step-by-step guide to become an active contributor in the NeuroSwarm ecosystem",
    "image": "https://getblockchain.tech/neuroswarm/og-onboarding.jpg",
    "totalTime": "P7D",
    "supply": [
      {
        "@type": "HowToSupply",
        "name": "Solana-compatible wallet (Phantom or Solflare recommended)"
      }
    ],
    "step": [
      {
        "@type": "HowToStep",
        "name": "Set Up Your Wallet",
        "text": "Connect a Solana-compatible wallet to interact with the platform",
        "position": 1
      },
      {
        "@type": "HowToStep", 
        "name": "Earn Your First Badge",
        "text": "Complete basic tasks to earn Bronze badge and voting rights",
        "position": 2
      },
      {
        "@type": "HowToStep",
        "name": "Follow a Learning Path",
        "text": "Choose a specialization and complete guided learning modules",
        "position": 3
      },
      {
        "@type": "HowToStep",
        "name": "Join a Working Group",
        "text": "Contribute to active projects and collaborate with the community",
        "position": 4
      }
    ],
    "author": {
      "@type": "Organization",
      "name": "NeuroSwarm Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NeuroSwarm"
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
            Contributor Onboarding
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Follow this step-by-step guide to become an active contributor in the NeuroSwarm ecosystem.
          </p>
        </div>

        {/* Step-by-Step Guide */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Step-by-Step Guide
          </h2>
          <div className="space-y-6">
            {onboardingSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full ${step.color} flex items-center justify-center mr-4`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-medium mr-3">
                          Step {step.step}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-2">
                        {step.description}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {step.details}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Playbooks */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Contributor Playbooks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {playbooks.map((playbook) => (
              <div key={playbook.title} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {playbook.title}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    playbook.difficulty === 'Beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    playbook.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {playbook.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {playbook.description}
                </p>
                <Link
                  href="https://getblockchain.tech/neuroswarm/portal"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Read Playbook
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Getting Started CTA */}
        <section>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                Join thousands of contributors building the future of decentralized AI.
                Your contributions help shape the platform and earn you governance rights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="https://getblockchain.tech/neuroswarm/portal"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Access Contributor Portal
                </Link>
                <Link
                  href="/kb/governance"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
                >
                  Learn About Governance
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Content */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Continue Your Journey
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
                Understand how your badges translate to voting power in governance decisions.
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
                Connect with other contributors and join working groups.
              </p>
            </Link>

            <Link
              href="/kb/transparency"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <BarChart3 className="h-8 w-8 text-gray-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Transparency & Logs
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Track your progress and see how governance decisions are made.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}