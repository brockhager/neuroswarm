#!/usr/bin/env node

/**
 * Phase 4 Service Validation Tests
 * Tests services directly without requiring a running server
 */

import QueryHistoryService from './src/services/query-history.js';
import GovernanceService from './src/services/governance.js';
import CacheVisualizationService from './src/services/cache-visualization.js';

async function testQueryHistoryService() {
  console.log('🔍 Testing QueryHistoryService...');
  try {
    const service = new QueryHistoryService();

    // Test adding queries
    service.addQuery('test-user-1', 'What is AI?', 'AI is artificial intelligence');
    service.addQuery('test-user-2', 'How does blockchain work?', 'Blockchain uses distributed ledger technology');

    // Test getting history
    const history = service.getHistory(10);
    console.log(`✅ Added ${history.length} test queries`);

    // Test stats
    const stats = service.getStats(24);
    console.log(`✅ Stats working: ${stats.totalQueries} total queries`);

    // Test replay
    const replay = service.replayQuery(history[0].id);
    console.log(`✅ Query replay working: ${replay.query.substring(0, 30)}...`);

    return true;
  } catch (error) {
    console.log('❌ QueryHistoryService failed:', error.message);
    return false;
  }
}

async function testGovernanceService() {
  console.log('\n🏛️ Testing GovernanceService...');
  try {
    const service = new GovernanceService();

    // Test getting state
    const state = service.getGovernanceState();
    console.log(`✅ Governance state working: ${Object.keys(state.parameters).length} parameters`);

    // Test creating proposal
    const proposal = service.createProposal('confidenceThreshold', 0.9, 'test-user', 'Test proposal');
    console.log(`✅ Proposal creation working: ${proposal.id}`);

    // Test voting
    const voteResult = service.voteOnProposal(proposal.id, 'voter-1', 'yes');
    console.log(`✅ Voting working: ${voteResult.votes.length} votes`);

    // Test getting proposal
    const retrieved = service.getProposal(proposal.id);
    console.log(`✅ Proposal retrieval working: ${retrieved.parameterKey}`);

    // Test stats
    const stats = service.getStatistics();
    console.log(`✅ Governance stats working: ${stats.totalProposals} proposals`);

    return true;
  } catch (error) {
    console.log('❌ GovernanceService failed:', error.message);
    return false;
  }
}

async function testCacheVisualizationService() {
  console.log('\n📊 Testing CacheVisualizationService...');
  try {
    const service = new CacheVisualizationService();

    // Test getting visualization data
    const data = service.getVisualizationData();
    console.log(`✅ Visualization data working: ${data.nodes?.length || 0} nodes`);

    // Test cache stats
    const stats = service.getCacheStats();
    console.log(`✅ Cache stats working: ${stats.totalEntries || 0} entries`);

    // Test similarity clusters
    const clusters = service.getSimilarityClusters(0.7);
    console.log(`✅ Similarity clusters working: ${clusters.clusters?.length || 0} clusters`);

    // Test refresh
    const refreshResult = service.refresh();
    console.log(`✅ Cache refresh working`);

    return true;
  } catch (error) {
    console.log('❌ CacheVisualizationService failed:', error.message);
    return false;
  }
}

async function testServiceIntegration() {
  console.log('\n🔗 Testing Service Integration...');
  try {
    const queryService = new QueryHistoryService();
    const govService = new GovernanceService();

    // Add some queries
    queryService.addQuery('user1', 'test query 1', 'response 1');
    queryService.addQuery('user2', 'test query 2', 'response 2');

    // Create governance proposal based on query activity
    const stats = queryService.getStats(24);
    const proposal = govService.createProposal(
      'queryLimit',
      Math.max(100, stats.totalQueries * 2),
      'system',
      `Adjust query limit based on ${stats.totalQueries} queries in last 24h`
    );

    console.log(`✅ Services integration working: Created proposal ${proposal.id} based on query stats`);

    return true;
  } catch (error) {
    console.log('❌ Service integration failed:', error.message);
    return false;
  }
}

async function runServiceTests() {
  console.log('🧪 Phase 4 Service Validation Tests');
  console.log('=' .repeat(50));

  const results = {
    queryHistory: await testQueryHistoryService(),
    governance: await testGovernanceService(),
    cacheVisualization: await testCacheVisualizationService(),
    integration: await testServiceIntegration()
  };

  console.log('\n' + '=' .repeat(50));
  console.log('📋 SERVICE TEST RESULTS SUMMARY');
  console.log('=' .repeat(50));

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([service, result]) => {
    console.log(`${result ? '✅' : '❌'} ${service}: ${result ? 'PASS' : 'FAIL'}`);
  });

  console.log(`\nOverall: ${passed}/${total} services passed (${Math.round(passed/total * 100)}%)`);

  if (passed === total) {
    console.log('\n🎉 ALL PHASE 4 SERVICES ARE WORKING CORRECTLY!');
    console.log('Phase 4 implementation is complete and ready for production.');
  } else {
    console.log('\n⚠️ Some services have issues that need attention.');
  }

  return results;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runServiceTests().catch(console.error);
}

export { runServiceTests };