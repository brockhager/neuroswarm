import { query } from './sources/adapters/web-search.js';

const testQuery = "when was peru independance";

console.log(`Testing web-search adapter with query: "${testQuery}"`);

query({ query: testQuery, maxResults: 3 })
    .then(result => {
        console.log('\n=== ADAPTER RESULT ===');
        console.log('Source:', result.source);
        console.log('Error:', result.error || 'none');
        console.log('Results count:', result.value?.results?.length || 0);

        if (result.value?.results && result.value.results.length > 0) {
            console.log('\n=== FIRST RESULT ===');
            console.log('Title:', result.value.results[0].title);
            console.log('URL:', result.value.results[0].url);
            console.log('Description:', result.value.results[0].description.substring(0, 150));
        }

        if (result.value?.answer?.text) {
            console.log('\n=== ANSWER TEXT ===');
            console.log(result.value.answer.text);
        } else {
            console.log('\n=== NO ANSWER TEXT ===');
        }
    })
    .catch(err => console.error('Error:', err));
