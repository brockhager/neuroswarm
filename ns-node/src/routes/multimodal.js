import express from 'express';
import multer from 'multer';
import MultiModalService from '../services/multimodal.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const service = new MultiModalService();

router.post('/vision/caption', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file provided' });

        const result = await service.processImage(req.file.buffer, req.file.mimetype);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/audio/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

        const result = await service.processAudio(req.file.buffer, req.file.mimetype);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
