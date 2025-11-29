// fix-public-key.js
import fs from 'fs';
import crypto from 'crypto';

// Load your existing private key
const privatePem = fs.readFileSync('secrets/admin-node.jwt.key', 'utf8');
const privateKey = crypto.createPrivateKey(privatePem);

const dest = 'secrets/admin-node.jwt.pub';
const force = process.argv.includes('--force') || process.env.OVERWRITE_KEYS === 'true';
if (!force && fs.existsSync(dest)) {
	console.log(`Skipping re-export: ${dest} already exists (use --force to overwrite)`);
} else {
	// Export public key in SPKI PEM (BEGIN PUBLIC KEY)
	const publicPem = privateKey.export({ type: 'spki', format: 'pem' });
	fs.writeFileSync(dest, publicPem);
	console.log('✅ Public key re-exported in SPKI format:', dest);
}
