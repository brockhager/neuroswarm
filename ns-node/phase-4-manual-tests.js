#!/usr/bin/env node

/**
 * Manual Phase 4 Testing Script
 * Tests each feature individually with clear output
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3009';

async function testHealth() {
  console.log('🩺 Testing Health Endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log('✅ Health endpoint working');
    console.log(`   Version: ${data.version}`);
    console.log(`   Uptime: ${Math.floor(data.uptime / 60)} minutes`);
    console.log(`   Knowledge entries: ${data.knowledge.total}`);
    return true;
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
    return false;
  }
}

async function testQueryHistory() {
  console.log('\n🔍 Testing Query History...');
  try {
    // Get history
    const response = await fetch(`${BASE_URL}/api/query-history?limit=5`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log(`✅ Query history API working (${data.history.length} queries)`);

    // Test stats
    const statsResponse = await fetch(`${BASE_URL}/api/query-history/stats`);
    if (!statsResponse.ok) throw new Error(`HTTP ${statsResponse.status}`);
    const stats = await statsResponse.json();
    console.log(`✅ Query stats working (${stats.totalQueries} total queries)`);

    return true;
  } catch (error) {
    console.log('❌ Query history failed:', error.message);
    return false;
  }
}

async function testGovernance() {
  console.log('\n🏛️ Testing Governance...');
  try {
    // Get governance state
    const response = await fetch(`${BASE_URL}/api/governance`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log(`✅ Governance API working (${Object.keys(data.parameters).length} parameters)`);

    // Create test proposal
    const proposalResponse = await fetch(`${BASE_URL}/api/governance/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parameterKey: 'confidenceThreshold',
        proposedValue: 0.9,
        proposerId: 'test-user',
        reason: 'Manual testing'
      })
    });

    if (proposalResponse.ok) {
      console.log('✅ Proposal creation working');
    } else {
      console.log('⚠️ Proposal creation returned:', proposalResponse.status);
    }

    return true;
  } catch (error) {
    console.log('❌ Governance failed:', error.message);
    return false;
  }
}

async function testDashboard() {
  console.log('\n📊 Testing Dashboard...');
  try {
    const response = await fetch(`${BASE_URL}/dashboard`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const hasTabs = html.includes('tab-content');
    const hasGovernance = html.includes('governance');
    const hasQueryHistory = html.includes('query-history');

    console.log('✅ Dashboard accessible');
    console.log(`   Tabs: ${hasTabs ? '✅' : '❌'}`);
    console.log(`   Governance tab: ${hasGovernance ? '✅' : '❌'}`);
    console.log(`   Query history tab: ${hasQueryHistory ? '✅' : '❌'}`);

    return hasTabs && hasGovernance && hasQueryHistory;
  } catch (error) {
    console.log('❌ Dashboard failed:', error.message);
    return false;
  }
}

async function testChat() {
  console.log('\n💬 Testing Chat Functionality...');
  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: 'test-user',
        content: 'Hello, test message'
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log('✅ Chat endpoint working');
    console.log(`   Response: ${data.content.substring(0, 50)}...`);

    return true;
  } catch (error) {
    console.log('❌ Chat failed:', error.message);
    return false;
  }
}

async function runManualTests() {
  console.log('🧪 Manual Phase 4 Testing');
  console.log('=' .repeat(50));

  const results = {
    health: await testHealth(),
    queryHistory: await testQueryHistory(),
    governance: await testGovernance(),
    dashboard: await testDashboard(),
    chat: await testChat()
  };

  console.log('\n' + '=' .repeat(50));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('=' .repeat(50));

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
  });

  console.log(`\nOverall: ${passed}/${total} tests passed (${Math.round(passed/total * 100)}%)`);

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! Phase 4 is ready for production.');
  } else {
    console.log('\n⚠️ Some tests failed. Phase 4 needs attention.');
  }

  return results;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runManualTests().catch(console.error);
}

export { runManualTests };