import { Router, Request, Response } from 'express';
import { chatService } from '../services/chat-service';
import { timelineService } from '../services/timeline-service';
import { anchorService } from '../services/anchor-service';
import { governanceLogger } from '../services/governance-logger';
import { logger } from '../index';

const router = Router();

// POST /v1/chat/send
router.post('/send', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const contributorId = body.contributorId as string;
    const text = body.text as string;
    const channel = body.channel;
    const threadId = body.threadId;
    const attachments = body.attachments as Array<{ filename: string; sha256: string }> | undefined;

    if (!contributorId || !text) {
      return res.status(400).json({ error: 'contributorId and text required' });
    }

    // Save message in chat service
    const messageId = chatService.sendMessage({ contributorId, text, channel, threadId, attachments });
    const message = chatService.getMessage(messageId)!;

    // Check for command parsing
    const parsed = chatService.parseCommand(text);

    // If command is submit, create submission and anchor request
    if (parsed.command === 'submit') {
      const sha256 = chatService.computeMessageHash(message);

      const timelineId = timelineService.addSubmissionEntry({
        timestamp: new Date().toISOString(),
        action: 'submission',
        actor: contributorId,
        fingerprints: { submission_sha256: sha256 },
        verificationStatus: 'pending',
        details: { source: 'chat', text, channel, threadId },
        contributorId,
        submissionType: 'chat',
        sha256,
        anchored: false,
      });

      const anchorResult = anchorService.prepareSubmissionAnchor(sha256, contributorId, 'chat', { messageId, channel, threadId });

      governanceLogger.log('chat_submission_created', { messageId, timelineId, sha256, contributorId });

      // Bot response (simulate message) - return anchor result in response
      return res.json({ success: true, messageId, timelineId, anchorResult, timestamp: new Date().toISOString() });
    }

    // For upload command, trigger submissions route by calling anchorService similarly (CLI handles files)
    if (parsed.command === 'upload' && parsed.args && parsed.args.file) {
      const fileHash = parsed.args.file; // assume sha256 string or IPFS hash; in real flow we'd validate
      const sha256 = fileHash; // treat it as sha256 for now if hex

      const timelineId = timelineService.addSubmissionEntry({
        timestamp: new Date().toISOString(),
        action: 'submission',
        actor: contributorId,
        fingerprints: { submission_sha256: sha256 },
        verificationStatus: 'pending',
        details: { source: 'chat', uploadFile: parsed.args.file },
        contributorId,
        submissionType: 'file',
        sha256,
        anchored: false,
      });

      const anchorResult = anchorService.prepareSubmissionAnchor(sha256, contributorId, 'file', { messageId, channel, threadId });
      governanceLogger.log('chat_upload_submission', { messageId, timelineId, sha256, contributorId });

      return res.json({ success: true, messageId, timelineId, anchorResult, timestamp: new Date().toISOString() });
    }

    // Not a command -> normal chat message
    return res.json({ success: true, messageId, timestamp: new Date().toISOString() });

  } catch (error) {
    logger.error('Chat send error:', error);
    governanceLogger.log('error', { endpoint: '/v1/chat/send', error: (error as Error).message });
    res.status(500).json({ error: 'Failed to process chat message', timestamp: new Date().toISOString() });
  }
});

// POST /v1/chat/react
router.post('/react', async (req: Request, res: Response) => {
  try {
    const { messageId, emoji, actor } = req.body;
    if (!messageId || !emoji || !actor) return res.status(400).json({ error: 'messageId, emoji, actor required' });

    // Only process pin reaction (📌)
    if (emoji === '📌') {
      const msg = chatService.getMessage(messageId);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      const sha256 = chatService.computeMessageHash(msg);

      // add submission entry and anchor
      const timelineId = timelineService.addSubmissionEntry({
        timestamp: new Date().toISOString(),
        action: 'submission',
        actor: msg.contributorId,
        fingerprints: { submission_sha256: sha256 },
        verificationStatus: 'pending',
        details: { source: 'chat', messageId, pinnedBy: actor },
        contributorId: msg.contributorId,
        submissionType: 'chat',
        sha256,
        anchored: false,
      });

      const anchorResult = anchorService.prepareSubmissionAnchor(sha256, msg.contributorId, 'chat', { messageId, channel: msg.channel });

      // Bot response or immediate return
      governanceLogger.log('chat_message_pinned', { messageId, timelineId, pinnedBy: actor });
      return res.json({ success: true, messageId, timelineId, anchorResult, timestamp: new Date().toISOString() });
    }

    // ignore other reactions
    return res.json({ success: true, message: 'Reaction processed (no action)' });
  } catch (error) {
    logger.error('Chat react error:', error);
    governanceLogger.log('error', { endpoint: '/v1/chat/react', error: (error as Error).message });
    res.status(500).json({ error: 'Failed to process reaction', timestamp: new Date().toISOString() });
  }
});

export { router as chatRoutes };
