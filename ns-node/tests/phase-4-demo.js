#!/usr/bin/env node

/**
 * NeuroSwarm Phase 4 Demonstration Script
 *
 * This script demonstrates the new Phase 4 features:
 * - Query History & Replay
 * - Governance System
 * - Performance Optimization
 */

import fetch from 'node-fetch';
import PerformanceOptimizer from './src/services/performance-optimizer.js';

const BASE_URL = 'http://localhost:3009';

async function testQueryHistory() {
    console.log('\n🔍 Testing Query History Features');

    try {
        // Get query history
        const historyResponse = await fetch(`${BASE_URL}/api/query-history?limit=5`);
        if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            console.log(`✅ Found ${historyData.history.length} recent queries`);

            if (historyData.history.length > 0) {
                const latestQuery = historyData.history[0];
                console.log(`📝 Latest query: "${latestQuery.query.substring(0, 50)}..."`);
                console.log(`⏱️  Response time: ${latestQuery.metadata.responseTime}ms`);
                console.log(`💾 Cache hit: ${latestQuery.metadata.cacheHit ? 'Yes' : 'No'}`);
                console.log(`🎯 Confidence: ${latestQuery.metadata.confidence}`);

                // Test query replay
                const replayResponse = await fetch(`${BASE_URL}/api/query-history/${latestQuery.id}/replay`, {
                    method: 'POST'
                });
                if (replayResponse.ok) {
                    console.log('✅ Query replay successful');
                }
            }
        } else {
            console.log('⚠️  No query history available (no queries processed yet)');
        }

        // Get query stats
        const statsResponse = await fetch(`${BASE_URL}/api/query-history/stats`);
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log(`📊 24h Stats: ${stats.totalQueries} queries, ${stats.cacheHits} cache hits`);
        }

    } catch (error) {
        console.log(`❌ Query history test failed: ${error.message}`);
    }
}

async function testGovernance() {
    console.log('\n🏛️ Testing Governance Features');

    try {
        // Get governance state
        const govResponse = await fetch(`${BASE_URL}/api/governance`);
        if (govResponse.ok) {
            const govData = await govResponse.json();
            console.log(`✅ Governance system active`);
            console.log(`📋 Parameters: ${Object.keys(govData.parameters).length}`);
            console.log(`🗳️ Active proposals: ${govData.activeProposals.length}`);

            // Show current parameters
            Object.entries(govData.parameters).forEach(([key, param]) => {
                console.log(`   ${param.name}: ${param.current} ${param.unit}`);
            });

            // Create a test proposal if none exist
            if (govData.activeProposals.length === 0) {
                console.log('📝 Creating a test proposal...');
                const proposalResponse = await fetch(`${BASE_URL}/api/governance/proposals`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        parameterKey: 'confidenceThreshold',
                        proposedValue: 0.9,
                        proposerId: 'demo-user',
                        reason: 'Testing Phase 4 governance system'
                    })
                });

                if (proposalResponse.ok) {
                    console.log('✅ Test proposal created successfully');
                }
            }
        } else {
            console.log('❌ Governance system not available');
        }

    } catch (error) {
        console.log(`❌ Governance test failed: ${error.message}`);
    }
}

async function testPerformanceOptimization() {
    console.log('\n⚡ Testing Performance Optimization');

    try {
        const optimizer = new PerformanceOptimizer();
        console.log('🚀 Running performance benchmark...');
        await optimizer.runFullBenchmark();
    } catch (error) {
        console.log(`❌ Performance test failed: ${error.message}`);
        console.log('💡 Make sure Ollama is running: ollama serve');
    }
}

async function testDashboard() {
    console.log('\n📊 Testing Enhanced Dashboard');

    try {
        const dashboardResponse = await fetch(`${BASE_URL}/dashboard`);
        if (dashboardResponse.ok) {
            console.log('✅ Enhanced dashboard accessible');
            const html = await dashboardResponse.text();
            const hasTabs = html.includes('tab-content');
            const hasGovernance = html.includes('governance');
            const hasQueryHistory = html.includes('query-history');

            console.log(`📑 Tabs system: ${hasTabs ? '✅' : '❌'}`);
            console.log(`🏛️ Governance tab: ${hasGovernance ? '✅' : '❌'}`);
            console.log(`🔍 Query history: ${hasQueryHistory ? '✅' : '❌'}`);
        } else {
            console.log('❌ Dashboard not accessible');
        }
    } catch (error) {
        console.log(`❌ Dashboard test failed: ${error.message}`);
    }
}

async function runPhase4Demo() {
    console.log('🚀 NeuroSwarm Phase 4 Feature Demonstration');
    console.log('=' .repeat(50));

    // Test server connectivity
    try {
        const healthResponse = await fetch(`${BASE_URL}/health`);
        if (!healthResponse.ok) {
            throw new Error(`Server not responding: ${healthResponse.status}`);
        }
        const health = await healthResponse.json();
        console.log(`✅ Server online: ${health.version}`);
        console.log(`🤖 Semantic features: ${health.semantic.available ? 'Available' : 'Offline'}`);
        console.log(`📚 Knowledge entries: ${health.knowledge.total}`);
    } catch (error) {
        console.log(`❌ Cannot connect to server: ${error.message}`);
        console.log('💡 Make sure the server is running: node server.js');
        return;
    }

    // Run all tests
    await testQueryHistory();
    await testGovernance();
    await testDashboard();
    await testPerformanceOptimization();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Phase 4 demonstration complete!');
    console.log('\n📋 Summary of new features:');
    console.log('   • Query History & Replay system');
    console.log('   • Community Governance for system parameters');
    console.log('   • Enhanced Dashboard with tabs and analytics');
    console.log('   • Performance optimization benchmarking');
    console.log('\n🔗 Access the dashboard: http://localhost:3009/dashboard');
}

// Run the demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runPhase4Demo().catch(console.error);
}

export { runPhase4Demo };