import { anchorService } from '../src/services/anchor-service';

async function main() {
  try {
    const status = await anchorService.getAnchorStatus();
    console.log(JSON.stringify(status, null, 2));
  } catch (err) {
    console.error('Error calling anchorService.getAnchorStatus:', err);
  }
}

main();
