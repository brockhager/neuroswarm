const axios = require('axios');
const admin = require('firebase-admin');

async function main() {
  if (!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.SERVICE_ACCOUNT_JSON)) {
    console.error('No Firestore credentials configured. Set GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_JSON to run this script.');
    process.exit(2);
  }

  if (process.env.SERVICE_ACCOUNT_JSON) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT_JSON)) });
  } else {
    admin.initializeApp();
  }

  const db = admin.firestore();

  const now = new Date().toISOString();
  const payload = {
    status: 'firing',
    alerts: [
      {
        labels: { alertname: `E2E-Test-${now}`, severity: 'critical', instance: 'e2e.local' },
        annotations: { summary: 'E2E verification test' },
        startsAt: now
      }
    ]
  };

  console.log('Posting alert to http://localhost:3010/webhook/alerts');
  try {
    const r = await axios.post('http://localhost:3010/webhook/alerts', payload, { headers: { 'Content-Type': 'application/json' } });
    console.log('POST response status:', r.status);
  } catch (err) {
    console.error('Failed to post to alert-sink:', err?.message || err);
    process.exit(2);
  }

  // Allow some time for sink to write
  await new Promise(r => setTimeout(r, 1200));

  const key = `${payload.alerts[0].labels.alertname}:${payload.alerts[0].labels.instance}:${payload.alerts[0].labels.severity}`;
  const doc = await db.collection('alert_incidents').doc(key).get();
  if (!doc.exists) {
    console.error('No document found for dedupKey', key);
    process.exit(2);
  }

  console.log('Found document:', doc.id, doc.data());
  console.log('E2E Firestore verification successful');
  process.exit(0);
}

main();
