import Link from 'next/link';
import { ArrowRight, BookOpen, Users, Shield, Zap, Globe } from 'lucide-react';

export const metadata = {
  title: 'NeuroSwarm | Decentralized AI Platform',
  description: 'Join the future of decentralized AI. NeuroSwarm is a community-owned platform where contributors shape the evolution of artificial intelligence through transparent governance and collective intelligence.',
  keywords: ['NeuroSwarm', 'decentralized AI', 'blockchain', 'DAO', 'collective intelligence', 'governance', 'open source'],
  authors: [{ name: 'NeuroSwarm Team' }],
  creator: 'NeuroSwarm',
  publisher: 'NeuroSwarm',
  openGraph: {
    title: 'NeuroSwarm | Decentralized AI Platform',
    description: 'Join the future of decentralized AI. Community-owned platform with transparent governance and collective intelligence.',
    url: 'https://getblockchain.tech/neuroswarm',
    siteName: 'NeuroSwarm',
    images: [
      {
        url: 'https://getblockchain.tech/neuroswarm/og-home.jpg',
        width: 1200,
        height: 630,
        alt: 'NeuroSwarm - Decentralized AI Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeuroSwarm | Decentralized AI Platform',
    description: 'Join the future of decentralized AI. Community-owned platform with transparent governance and collective intelligence.',
    images: ['https://getblockchain.tech/neuroswarm/og-home.jpg'],
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
    canonical: 'https://getblockchain.tech/neuroswarm',
  },
};

const features = [
  {
    icon: Shield,
    title: 'Transparent Governance',
    description: 'Every decision is recorded on-chain with complete audit trails and real-time transparency.',
  },
  {
    icon: Users,
    title: 'Community Owned',
    description: 'Contributors earn voting rights through badges and actively shape the platform\'s direction.',
  },
  {
    icon: Zap,
    title: 'Collective Intelligence',
    description: 'Swarm coordination algorithms harness the power of distributed AI systems.',
  },
  {
    icon: Globe,
    title: 'Decentralized Architecture',
    description: 'Built on blockchain technology ensuring censorship resistance and data sovereignty.',
  },
];

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "NeuroSwarm",
    "description": "Decentralized AI platform where contributors shape the evolution of artificial intelligence through transparent governance and collective intelligence",
    "url": "https://getblockchain.tech/neuroswarm",
    "logo": "https://getblockchain.tech/neuroswarm/logo.png",
    "sameAs": [
      "https://github.com/neuroswarm",
      "https://twitter.com/neuroswarm"
    ],
    "foundingDate": "2024",
    "knowsAbout": [
      "Decentralized AI",
      "Blockchain Technology",
      "Collective Intelligence",
      "Open Source Software",
      "DAO Governance"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "NeuroSwarm Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Decentralized AI Platform",
            "description": "Community-owned AI platform with transparent governance"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Knowledge Base",
            "description": "Comprehensive documentation and learning resources"
          }
        }
      ]
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  NeuroSwarm
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                The future of decentralized AI, built by the community, for the community.
                Join thousands of contributors shaping the evolution of artificial intelligence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/kb"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Explore Knowledge Base
                  <BookOpen className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/kb/onboarding"
                  className="inline-flex items-center px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                >
                  Become a Contributor
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Mission, Vision, Values Section */}
        <div className="py-24 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Our Mission & Vision
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Building the foundation for a decentralized AI future where technology serves humanity&apos;s collective intelligence.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
              {/* Mission */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Globe className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  To democratize artificial intelligence by creating an open, decentralized platform where AI development is collaborative, transparent, and accessible to everyone. We believe AI should serve humanity&apos;s collective intelligence, not centralized interests.
                </p>
              </div>

              {/* Vision */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Vision</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  A future where AI is developed collectively by humanity, for humanity. Where every person can contribute to AI advancement, every AI decision is auditable, and every benefit is shared equitably. NeuroSwarm will become the foundation for a global brain - a distributed intelligence that enhances human potential while respecting individual sovereignty.
                </p>
              </div>

              {/* Values */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Values</h3>
                <ul className="text-gray-600 dark:text-gray-300 space-y-2 text-left max-w-xs mx-auto">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Decentralization:</strong> Power distributed across the network, not concentrated in corporations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Transparency:</strong> All AI decisions and training data auditable and verifiable</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Collaboration:</strong> Open participation in AI development and governance</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Ethics:</strong> Human values and safety built into the core architecture</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Accessibility:</strong> AI tools available to individuals, not just institutions</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Why We Exist */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-8 mb-16">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Why We Exist</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <div className="text-left">
                    <h4 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">The Problem</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      Current AI development is dominated by centralized entities, creating black-box systems that prioritize profit over transparency, ethics, and user control. This concentration of power leads to biased algorithms, privacy violations, and unequal access to AI benefits.
                    </p>
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3">Our Purpose</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      To democratize artificial intelligence by creating an open, decentralized platform where AI development is collaborative, transparent, and accessible to everyone. We believe AI should serve humanity&apos;s collective intelligence, not centralized interests.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contributor Pathways */}
            <div className="text-center mb-16">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Contributor Journey</h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                Whether you&apos;re new to open source or an experienced developer, NeuroSwarm offers clear pathways to contribute and grow within our community.
              </p>
              <Link
                href="/kb/pathways"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Explore Contributor Pathways
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>

            {/* Quick Links to KB */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link
                href="/kb/faq"
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">FAQ</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Common questions and answers for contributors</p>
              </Link>

              <Link
                href="/kb/getting-started"
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ArrowRight className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Getting Started</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Complete setup guide for new contributors</p>
              </Link>

              <Link
                href="/kb/governance"
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Governance Dashboard</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Live metrics and community health indicators</p>
              </Link>

              <Link
                href="/docs"
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Technical Docs</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Deep dives into our architecture and systems</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-white/50 dark:bg-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why NeuroSwarm?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                We&apos;re building the next generation of AI infrastructure that&apos;s transparent,
                community-owned, and designed for the decentralized future.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to Join the Swarm?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Start your journey as a NeuroSwarm contributor. Learn about our governance system,
              earn badges, and help shape the future of decentralized AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kb/getting-started"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/kb/governance"
                className="inline-flex items-center px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
              >
                Learn About Governance
                <Shield className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">NeuroSwarm</h3>
                <p className="text-gray-400">
                  Decentralized AI platform for the community, by the community.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Resources</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/kb" className="text-gray-400 hover:text-white transition-colors">
                      Knowledge Base
                    </Link>
                  </li>
                  <li>
                    <Link href="/kb/governance" className="text-gray-400 hover:text-white transition-colors">
                      Governance
                    </Link>
                  </li>
                  <li>
                    <Link href="/kb/transparency" className="text-gray-400 hover:text-white transition-colors">
                      Transparency
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Community</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/kb/community" className="text-gray-400 hover:text-white transition-colors">
                      Join Community
                    </Link>
                  </li>
                  <li>
                    <Link href="/kb/onboarding" className="text-gray-400 hover:text-white transition-colors">
                      Become Contributor
                    </Link>
                  </li>
                  <li>
                    <Link href="https://github.com/neuroswarm" className="text-gray-400 hover:text-white transition-colors">
                      GitHub
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 NeuroSwarm. Building the future of decentralized AI.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
