import React from 'react';
import Link from 'next/link';
import { Server, Database, Cpu, Globe, Lock, Code, Terminal, FileText } from 'lucide-react';

export const metadata = {
    title: 'Documentation | NeuroSwarm',
    description: 'Technical documentation for NeuroSwarm nodes, API, and architecture.',
};

export default function DocsPage() {
    const sections = [
        {
            title: 'Core Concepts',
            description: 'Understand the fundamental architecture of NeuroSwarm.',
            icon: Globe,
            links: [
                { title: 'Architecture Overview', href: '/docs/architecture' },
                { title: 'Consensus Mechanism', href: '/docs/consensus' },
                { title: 'P2P Networking', href: '/docs/p2p' },
                { title: 'Data Availability', href: '/docs/data' }
            ]
        },
        {
            title: 'Node Operations',
            description: 'Guides for running and maintaining NeuroSwarm nodes.',
            icon: Server,
            links: [
                { title: 'Running a Validator', href: '/docs/nodes/validator' },
                { title: 'Running an AI Worker', href: '/docs/nodes/worker' },
                { title: 'Node Configuration', href: '/docs/nodes/config' },
                { title: 'Monitoring & Metrics', href: '/docs/nodes/monitoring' }
            ]
        },
        {
            title: 'API Reference',
            description: 'Complete reference for the NeuroSwarm HTTP and P2P APIs.',
            icon: Code,
            links: [
                { title: 'HTTP API', href: '/docs/api/http' },
                { title: 'P2P Protocol', href: '/docs/api/p2p' },
                { title: 'Gateway Interface', href: '/docs/api/gateway' },
                { title: 'SDKs & Libraries', href: '/docs/api/sdks' }
            ]
        },
        {
            title: 'AI & Compute',
            description: 'Details on the distributed AI compute layer.',
            icon: Cpu,
            links: [
                { title: 'Model Registry', href: '/docs/ai/models' },
                { title: 'Inference Engine', href: '/docs/ai/inference' },
                { title: 'Training Pipelines', href: '/docs/ai/training' },
                { title: 'Verification', href: '/docs/ai/verification' }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Technical Documentation
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Everything you need to build on, contribute to, and run NeuroSwarm.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sections.map((section, idx) => {
                        const Icon = section.icon;
                        return (
                            <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center mb-6">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
                                        <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            {section.title}
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {section.description}
                                        </p>
                                    </div>
                                </div>
                                <ul className="space-y-3">
                                    {section.links.map((link, lIdx) => (
                                        <li key={lIdx}>
                                            <Link
                                                href={link.href}
                                                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                                            >
                                                <FileText className="h-4 w-4 mr-2 text-gray-400 group-hover:text-blue-500" />
                                                {link.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-16 bg-gray-900 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-white mb-4">
                            Can't find what you're looking for?
                        </h2>
                        <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                            Our documentation is open source and constantly improving. If you spot a gap, feel free to open an issue or contribute a PR.
                        </p>
                        <div className="flex justify-center gap-4">
                            <a
                                href="https://github.com/neuroswarm/docs"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <Terminal className="h-5 w-5 mr-2" />
                                Contribute on GitHub
                            </a>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-600 rounded-full opacity-20 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-600 rounded-full opacity-20 blur-3xl"></div>
                </div>
            </div>
        </div>
    );
}
