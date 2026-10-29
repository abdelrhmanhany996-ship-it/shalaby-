import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || 'demo-key';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI Assistant Chat API Endpoint
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { prompt, platformContext } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemInstruction = `
You are the AI Assistant for the AI Resource Management Platform (منصة إدارة موارد الذكاء الاصطناعي).
You have access to real platform data supplied in JSON format.
Your task is to answer user questions concisely, accurately, and professionally in Arabic (or English if prompted).
Always ground your answers in the provided real platform data.
If asked about costs, usage, unallocated seats, or renewals, summarize exact figures from the platform context.
Do NOT reveal sensitive secrets or credentials.

Platform Real Context Data:
${JSON.stringify(platformContext || {}, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const reply = response.text || 'عذراً، لم أستطع تحليل البيانات بشكل دقيق حالياً.';
    res.json({ reply });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI response',
      details: error?.message || 'Server error' 
    });
  }
});

// Serve Vite in dev mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteDevServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(viteDevServer.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
