import React from 'react';
import { HelpCircle, MessageCircle, Shield, Coins } from 'lucide-react';

export const metadata = {
  title: 'FAQ | NeuroSwarm Knowledge Base',
  description: 'Frequently asked questions about NeuroSwarm, tokens, governance, and technical requirements.',
};

export default function FAQPage() {
  const faqs = [
    {
      category: 'General',
      icon: HelpCircle,
      questions: [
        {
          q: 'What is NeuroSwarm?',
          a: 'NeuroSwarm is a decentralized AI platform where contributors shape the evolution of artificial intelligence through transparent governance and collective intelligence. It aims to democratize AI development and ensure it serves humanity.'
        },
        {
          q: 'How do I get started?',
          a: 'You can start by exploring our Knowledge Base, joining our Discord community, or running a local node. Check out the "Getting Started" guide for step-by-step instructions.'
        }
      ]
    },
    {
      category: 'Governance & Tokens',
      icon: Shield,
      questions: [
        {
          q: 'How does governance work?',
          a: 'Governance is handled through a DAO structure where token holders and active contributors can propose and vote on changes. Voting power is earned through contribution badges and token staking.'
        },
        {
          q: 'What is the NEURO token?',
          a: 'NEURO is the native utility token of the platform. It is used for governance, staking for validator nodes, and accessing premium AI services.'
        }
      ]
    },
    {
      category: 'Technical',
      icon: Coins,
      questions: [
        {
          q: 'What are the system requirements for running a node?',
          a: 'Requirements vary by node type. A basic Validator node requires 4GB RAM and 2 CPU cores. An AI Compute node requires a GPU with at least 8GB VRAM (NVIDIA recommended).'
        },
        {
          q: 'Is NeuroSwarm open source?',
          a: 'Yes, the core components of NeuroSwarm are open source and available on GitHub. We believe in transparency and community collaboration.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Everything you need to know about NeuroSwarm.
          </p>
        </div>

        <div className="space-y-8">
          {faqs.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center bg-gray-50 dark:bg-gray-800/50">
                  <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {section.category}
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {section.questions.map((item, qIdx) => (
                    <div key={qIdx} className="p-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {item.q}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center bg-blue-50 dark:bg-blue-900/20 rounded-xl p-8">
          <MessageCircle className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Still have questions?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Join our community chat to get help from the team and other contributors.
          </p>
          <a
            href="https://discord.gg/neuroswarm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Join Discord
          </a>
        </div>
      </div>
    </div>
  );
}
