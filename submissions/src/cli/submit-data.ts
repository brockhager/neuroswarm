#!/usr/bin/env ts-node

import axios from 'axios';
import fs from 'fs';
import crypto from 'crypto';
import yargs from 'yargs';

const argv = yargs
  .option('file', { type: 'string', describe: 'Path to file to submit' })
  .option('tag', { type: 'string', describe: 'Primary tag for submission' })
  .option('tags', { type: 'array', describe: 'Tags' })
  .option('description', { type: 'string' })
  .option('contributorId', { type: 'string', demandOption: true })
  .option('token', { type: 'string', demandOption: true, describe: 'Bearer token for authentication' })
  .option('url', { type: 'string', default: 'http://localhost:8080/v1/brain/submit' })
  .help()
  .argv as any;

async function main() {
  try {
    let sha256 = '';
    let submissionType = 'json';

    if (argv.file) {
      if (!fs.existsSync(argv.file)) {
        console.error('File not found:', argv.file);
        process.exit(1);
      }
      const buffer = fs.readFileSync(argv.file);
      sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      submissionType = 'file';
    }

    const body: any = {
      contributorId: argv.contributorId,
      tags: argv.tags || (argv.tag ? [argv.tag] : []),
      description: argv.description || '',
      sha256,
      submissionType,
    };

    const res = await axios.post(argv.url, body, {
      headers: { Authorization: `Bearer ${argv.token}` },
    });

    console.log(JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('Submission failed:', error?.response?.data || error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
