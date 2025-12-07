// test-file-upload.js
// Test script for file upload functionality

import fetch from 'node-fetch';
import fs from 'fs';

async function testFileUpload() {
  try {
    console.log('Testing file upload...');

    // Create a test file
    const testContent = 'This is a test file for upload functionality.';
    fs.writeFileSync('test-upload.txt', testContent);

    // Read file as buffer
    const fileBuffer = fs.readFileSync('test-upload.txt');

    // Create multipart form data manually
    const boundary = '----FormBoundary' + Date.now();
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test-upload.txt"',
      'Content-Type: text/plain',
      '',
      fileBuffer.toString(),
      `--${boundary}`,
      'Content-Disposition: form-data; name="metadata"',
      '',
      JSON.stringify({ description: 'Test file upload' }),
      `--${boundary}--`
    ].join('\r\n');

    // Upload the file
    const response = await fetch('http://localhost:8080/v1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Upload successful:', result);

    // Clean up
    fs.unlinkSync('test-upload.txt');

  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}

testFileUpload();