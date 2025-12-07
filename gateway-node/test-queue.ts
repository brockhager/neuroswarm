import fetch from 'node-fetch';

async function testQueue() {
    console.log('🧪 Testing Queue Integration...');

    const payload = {
        type: 'ARTIFACT_SUBMIT',
        payload: {
            content: 'This is a test artifact for queue integration',
            metadata: {
                title: 'Queue Test Artifact',
                contentType: 'text'
            }
        }
    };

    try {
        const response = await fetch('http://localhost:8080/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer mock.jwt.token'
            },
            body: JSON.stringify(payload)
        });

        console.log(`Response Status: ${response.status}`);
        const data = await response.json();
        console.log('Response Body:', JSON.stringify(data, null, 2));

        if (response.status === 202 && data.status === 'queued') {
            console.log('✅ Test Passed: Artifact successfully queued');
        } else {
            console.log('❌ Test Failed: Unexpected response');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Test Error:', error);
        process.exit(1);
    }
}

testQueue();
