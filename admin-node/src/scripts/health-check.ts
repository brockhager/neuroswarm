import { discordService } from '../services/discord-service';
import { config } from 'dotenv';

// Load environment variables
config();

async function runHealthCheck() {
  console.log('Running health check...');

  try {
    // Initialize Discord service
    await discordService.start();

    // Wait a bit for connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send system health notification
    await discordService.sendSystemHealth({
      adminNode: true,
      governanceLogging: true,
      blockchainAnchor: false, // Not configured yet
      alerts: 0
    });

    console.log('✅ Health check notification sent to Discord');

    // Stop Discord service
    await discordService.stop();
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

// Run the health check
runHealthCheck();