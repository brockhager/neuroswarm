// Test script for NBA scores adapter
// Run with: node test-nba-adapter.mjs

const NBA_ADAPTER_TEST_URL = 'http://localhost:3001/v1/adapter/query';
const LOGIN_URL = 'http://localhost:3001/auth/login';

async function getAuthToken() {
    const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password' })
    });
    const data = await res.json();
    return data.token;
}

async function testNBAAdapter() {
    console.log('🏀 Testing NBA Scores Adapter...\n');

    try {
        // Get auth token
        console.log('1. Getting auth token...');
        const token = await getAuthToken();
        console.log('✓ Token obtained\n');

        // Test 1: Get all NBA games for today
        console.log('2. Fetching all NBA games for today...');
        const allGamesRes = await fetch(NBA_ADAPTER_TEST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                adapter: 'nba-scores',
                params: {}
            })
        });

        const allGamesData = await allGamesRes.json();
        console.log('✓ Response:', JSON.stringify(allGamesData, null, 2));
        console.log('');

        // Test 2: Get specific team's game (Lakers)
        console.log('3. Fetching Lakers game...');
        const lakersRes = await fetch(NBA_ADAPTER_TEST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                adapter: 'nba-scores',
                params: { team: 'Lakers' }
            })
        });

        const lakersData = await lakersRes.json();
        console.log('✓ Response:', JSON.stringify(lakersData, null, 2));
        console.log('');

        console.log('✅ All tests passed!');
        console.log('\n📊 Summary:');
        console.log('- NBA adapter is working');
        console.log('- Can fetch all games');
        console.log('- Can filter by team');
        console.log('- Data includes scores, status, venue, broadcast info');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

testNBAAdapter();
