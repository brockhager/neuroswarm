import Link from 'next/link';
import { ArrowLeft, Server, Database, Code, GitBranch, Shield, Zap, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Technical Documentation | NeuroSwarm',
  description: 'Comprehensive technical documentation for developers working with NeuroSwarm. Learn about system architecture, APIs, smart contracts, and development workflows.',
  keywords: ['NeuroSwarm', 'technical documentation', 'API reference', 'smart contracts', 'Solana', 'blockchain development', 'decentralized AI', 'developer guide'],
  authors: [{ name: 'NeuroSwarm Team' }],
  creator: 'NeuroSwarm',
  publisher: 'NeuroSwarm',
  openGraph: {
    title: 'Technical Documentation | NeuroSwarm',
    description: 'Comprehensive technical documentation for developers working with NeuroSwarm. Learn about system architecture, APIs, smart contracts, and development workflows.',
    url: 'https://getblockchain.tech/neuroswarm/kb/technical',
    siteName: 'NeuroSwarm Knowledge Base',
    images: [
      {
        url: 'https://getblockchain.tech/neuroswarm/og-technical.jpg',
        width: 1200,
        height: 630,
        alt: 'NeuroSwarm Technical Documentation',
      },
    ],
    locale: 'en_US',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Technical Documentation | NeuroSwarm',
    description: 'Comprehensive technical documentation for developers working with NeuroSwarm. Learn about system architecture, APIs, smart contracts, and development workflows.',
    images: ['https://getblockchain.tech/neuroswarm/og-technical.jpg'],
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
    canonical: 'https://getblockchain.tech/neuroswarm/kb/technical',
  },
};

const systemOverview = [
  {
    component: 'Contributor Portal',
    description: 'Web interface for governance participation, badge management, and community features',
    technologies: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'Solana Web3.js'],
    icon: Server,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900'
  },
  {
    component: 'Governance Engine',
    description: 'Smart contracts and services handling proposals, voting, and badge-weighted decisions',
    technologies: ['Anchor', 'Rust', 'Solana Programs', 'TypeScript Services'],
    icon: Shield,
    color: 'text-green-600 bg-green-100 dark:bg-green-900'
  },
  {
    component: 'Data Layer',
    description: 'Decentralized storage and indexing for proposals, votes, and transparency records',
    technologies: ['IPFS', 'PostgreSQL', 'Redis', 'Solana RPC'],
    icon: Database,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900'
  },
  {
    component: 'Observability Stack',
    description: 'Monitoring, logging, and analytics for platform health and user activity',
    technologies: ['Prometheus', 'Grafana', 'ELK Stack', 'Custom Metrics'],
    icon: Zap,
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900'
  }
];

const developerGuides = [
  {
    title: 'API Reference',
    description: 'Complete REST and GraphQL API documentation for integrations',
    link: 'https://getblockchain.tech/neuroswarm/docs/api',
    difficulty: 'Intermediate'
  },
  {
    title: 'Smart Contract Development',
    description: 'Guide to building and deploying Solana programs for NeuroSwarm',
    link: 'https://getblockchain.tech/neuroswarm/docs/contracts',
    difficulty: 'Advanced'
  },
  {
    title: 'Frontend Integration',
    description: 'How to integrate NeuroSwarm components into your application',
    link: 'https://getblockchain.tech/neuroswarm/docs/frontend',
    difficulty: 'Beginner'
  },
  {
    title: 'Testing Framework',
    description: 'Writing and running tests for NeuroSwarm components',
    link: 'https://getblockchain.tech/neuroswarm/docs/testing',
    difficulty: 'Intermediate'
  }
];

const ciCdWorkflows = [
  {
    name: 'Automated Testing',
    description: 'CI pipeline runs unit, integration, and e2e tests on every PR',
    tools: ['GitHub Actions', 'Jest', 'Playwright', 'Anchor Test']
  },
  {
    name: 'Code Quality',
    description: 'Linting, formatting, and security scanning for all contributions',
    tools: ['ESLint', 'Prettier', 'CodeQL', 'Dependabot']
  },
  {
    name: 'Deployment Pipeline',
    description: 'Automated deployment to staging and production environments',
    tools: ['Vercel', 'Railway', 'Docker', 'Kubernetes']
  },
  {
    name: 'Documentation',
    description: 'Auto-generated API docs and deployment previews',
    tools: ['TypeDoc', 'Storybook', 'Vercel Preview', 'GitBook']
  }
];

export default function TechnicalPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": "NeuroSwarm Technical Documentation",
    "description": "Comprehensive technical documentation for developers, architects, and contributors working with the NeuroSwarm platform",
    "image": "https://getblockchain.tech/neuroswarm/og-technical.jpg",
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
      "@id": "https://getblockchain.tech/neuroswarm/kb/technical"
    },
    "about": [
      {
        "@type": "Thing",
        "name": "Software Development"
      },
      {
        "@type": "Thing",
        "name": "Blockchain Technology"
      },
      {
        "@type": "Thing",
        "name": "Decentralized Systems"
      },
      {
        "@type": "SoftwareApplication",
        "name": "NeuroSwarm",
        "applicationCategory": "DeveloperApplication"
      }
    ],
    "proficiencyLevel": "Advanced"
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
            Technical Documentation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Comprehensive technical documentation for developers, architects, and contributors
            working with the NeuroSwarm platform.
          </p>
        </div>

        {/* System Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            System Architecture
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {systemOverview.map((component) => {
              const Icon = component.icon;
              return (
                <div key={component.component} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start mb-4">
                    <div className={`p-2 rounded-lg ${component.color} mr-3`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {component.component}
                      </h3>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {component.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {component.technologies.map((tech) => (
                      <span key={tech} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Developer Guides */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Developer Guides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {developerGuides.map((guide) => (
              <div key={guide.title} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {guide.title}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    guide.difficulty === 'Beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    guide.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {guide.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {guide.description}
                </p>
                <Link
                  href={guide.link}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Read Guide
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Repository Structure */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Repository Structure
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <GitBranch className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Monorepo Architecture</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    NeuroSwarm uses a monorepo structure with multiple packages for different components
                  </p>
                </div>
              </div>

              <div className="ml-8 space-y-2">
                <div className="flex items-center text-sm">
                  <Code className="h-4 w-4 text-green-600 mr-2" />
                  <span className="font-medium text-gray-900 dark:text-white">neuro-web:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">Next.js frontend and governance portal</span>
                </div>
                <div className="flex items-center text-sm">
                  <Code className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="font-medium text-gray-900 dark:text-white">neuro-program:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">Solana smart contracts and programs</span>
                </div>
                <div className="flex items-center text-sm">
                  <Code className="h-4 w-4 text-purple-600 mr-2" />
                  <span className="font-medium text-gray-900 dark:text-white">neuro-services:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">Backend services and APIs</span>
                </div>
                <div className="flex items-center text-sm">
                  <Code className="h-4 w-4 text-orange-600 mr-2" />
                  <span className="font-medium text-gray-900 dark:text-white">neuro-shared:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">Shared types and utilities</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CI/CD Workflows */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            CI/CD & Quality Assurance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ciCdWorkflows.map((workflow) => (
              <div key={workflow.name} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {workflow.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {workflow.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {workflow.tools.map((tool) => (
                    <span key={tool} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Getting Started for Developers */}
        <section>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <Code className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Start Developing
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                Ready to contribute to NeuroSwarm? Our comprehensive documentation and developer resources
                will help you get started with development, testing, and deployment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="https://github.com/neuroswarm/neuroswarm"
                  className="bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors text-center"
                >
                  View on GitHub
                </Link>
                <Link
                  href="https://getblockchain.tech/neuroswarm/docs/getting-started"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Developer Guide
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