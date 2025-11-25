// batch-embed.js
// Batch generate embeddings for existing knowledge-index entries
// Usage: node batch-embed.js

import fs from 'fs';
import { embed } from './src/services/embedding.js';
import { queryKnowledge } from './src/services/knowledge-store.js';

const INDEX_FILE = './data/knowledge-index.json';

async function batchEmbed() {
    console.log('Starting batch embedding generation...');

    if (!fs.existsSync(INDEX_FILE)) {
        console.log('No knowledge index found. Nothing to embed.');
        return;
    }

    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    const startTime = Date.now();

    console.log(`Processing ${Object.keys(index).length} knowledge entries...`);

    for (const [hash, entry] of Object.entries(index)) {
        if (entry.embedding && Array.isArray(entry.embedding)) {
            console.log(`⏭️  Skipping ${hash} - already has embedding`);
            skipped++;
            continue;
        }

        try {
            console.log(`🔍 Retrieving knowledge for: "${entry.question}" (${hash})`);

            // Retrieve full knowledge from IPFS
            const knowledge = await queryKnowledge(entry.question);

            if (!knowledge || !knowledge.answer) {
                console.warn(`⚠️  No answer found for entry ${hash} - skipping`);
                failed++;
                continue;
            }

            console.log(`📝 Generating embedding for answer (${knowledge.answer.length} chars)`);
            const embedding = await embed(knowledge.answer);

            if (!embedding || !Array.isArray(embedding)) {
                console.warn(`⚠️  Invalid embedding generated for entry ${hash}`);
                failed++;
                continue;
            }

            // Update the index entry with embedding
            entry.embedding = embedding;
            updated++;

            console.log(`✅ Successfully embedded entry ${hash} (${embedding.length} dimensions)`);

        } catch (e) {
            console.error(`❌ Failed to embed entry ${hash}:`, e.message);
            failed++;
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (updated > 0) {
        fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
        console.log(`💾 Saved ${updated} updated entries to index`);
    }

    console.log(`\n📊 Batch embedding complete in ${duration}s:`);
    console.log(`  ✅ Updated: ${updated} entries`);
    console.log(`  ❌ Failed: ${failed} entries`);
    console.log(`  ⏭️  Skipped: ${skipped} entries`);
    console.log(`  📈 Success rate: ${((updated / (updated + failed)) * 100).toFixed(1)}%`);
}

batchEmbed().catch(console.error);