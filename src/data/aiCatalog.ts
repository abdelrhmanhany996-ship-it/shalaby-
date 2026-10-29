import { AiCategory } from '../types';

export interface CatalogTool {
  name: string;
  provider: string;
  category: AiCategory;
  domain: string;
  emoji: string;
  description: string;
}

// Popular AI programs offered as ready-made choices when adding a subscription
export const AI_CATALOG: CatalogTool[] = [
  // Chat & Writing
  { name: 'ChatGPT', provider: 'OpenAI', category: 'Chat & Writing', domain: 'openai.com', emoji: '🤖', description: 'Conversational AI for writing, analysis & coding' },
  { name: 'Claude', provider: 'Anthropic', category: 'Chat & Writing', domain: 'claude.ai', emoji: '🧠', description: 'AI assistant for reasoning, writing & coding' },
  { name: 'Gemini', provider: 'Google', category: 'Chat & Writing', domain: 'gemini.google.com', emoji: '✨', description: 'Multimodal AI assistant with Workspace integration' },
  { name: 'Microsoft Copilot', provider: 'Microsoft', category: 'Chat & Writing', domain: 'copilot.cloud.microsoft', emoji: '🪟', description: 'AI assistant across Microsoft 365' },
  { name: 'Grok', provider: 'xAI', category: 'Chat & Writing', domain: 'x.ai', emoji: '✖️', description: 'Conversational AI with real-time X data' },
  { name: 'DeepSeek', provider: 'DeepSeek', category: 'Chat & Writing', domain: 'deepseek.com', emoji: '🐋', description: 'Reasoning & coding language models' },
  { name: 'Mistral Le Chat', provider: 'Mistral AI', category: 'Chat & Writing', domain: 'mistral.ai', emoji: '🌬️', description: 'European AI assistant and models' },
  { name: 'Meta AI', provider: 'Meta', category: 'Chat & Writing', domain: 'meta.ai', emoji: '♾️', description: 'AI assistant across Meta apps' },
  { name: 'Poe', provider: 'Quora', category: 'Chat & Writing', domain: 'poe.com', emoji: '💬', description: 'Access to many AI models in one place' },
  { name: 'Jasper', provider: 'Jasper', category: 'Chat & Writing', domain: 'jasper.ai', emoji: '📝', description: 'AI marketing content platform' },
  { name: 'Copy.ai', provider: 'Copy.ai', category: 'Chat & Writing', domain: 'copy.ai', emoji: '✍️', description: 'AI copywriting & GTM workflows' },
  { name: 'Grammarly', provider: 'Grammarly', category: 'Chat & Writing', domain: 'grammarly.com', emoji: '🟢', description: 'AI writing assistance & editing' },
  { name: 'Notion AI', provider: 'Notion', category: 'Chat & Writing', domain: 'notion.so', emoji: '📓', description: 'AI inside Notion docs & wikis' },
  { name: 'Gamma', provider: 'Gamma', category: 'Chat & Writing', domain: 'gamma.app', emoji: '📊', description: 'AI presentations, docs & websites' },

  // Coding
  { name: 'Cursor', provider: 'Anysphere', category: 'Coding', domain: 'cursor.com', emoji: '💻', description: 'AI-first code editor' },
  { name: 'GitHub Copilot', provider: 'GitHub', category: 'Coding', domain: 'github.com', emoji: '🐙', description: 'AI pair programmer in your IDE' },
  { name: 'Windsurf', provider: 'Windsurf', category: 'Coding', domain: 'windsurf.com', emoji: '🏄', description: 'Agentic AI code editor' },
  { name: 'Replit', provider: 'Replit', category: 'Coding', domain: 'replit.com', emoji: '🌀', description: 'AI app builder & cloud IDE' },
  { name: 'Lovable', provider: 'Lovable', category: 'Coding', domain: 'lovable.dev', emoji: '💜', description: 'Build web apps from a prompt' },
  { name: 'Bolt', provider: 'StackBlitz', category: 'Coding', domain: 'bolt.new', emoji: '⚡', description: 'Prompt-to-app in the browser' },
  { name: 'v0', provider: 'Vercel', category: 'Coding', domain: 'v0.dev', emoji: '▲', description: 'Generate UI & apps with AI' },
  { name: 'Tabnine', provider: 'Tabnine', category: 'Coding', domain: 'tabnine.com', emoji: '🔷', description: 'Private AI code completion' },

  // Image & Video
  { name: 'Midjourney', provider: 'Midjourney', category: 'Image & Video', domain: 'midjourney.com', emoji: '🎨', description: 'Photorealistic & artistic image generation' },
  { name: 'Leonardo AI', provider: 'Leonardo', category: 'Image & Video', domain: 'leonardo.ai', emoji: '🦁', description: 'AI image & asset generation' },
  { name: 'Ideogram', provider: 'Ideogram', category: 'Image & Video', domain: 'ideogram.ai', emoji: '🔤', description: 'Image generation with accurate text' },
  { name: 'Stability AI', provider: 'Stability AI', category: 'Image & Video', domain: 'stability.ai', emoji: '🌌', description: 'Stable Diffusion image models' },
  { name: 'Adobe Firefly', provider: 'Adobe', category: 'Image & Video', domain: 'firefly.adobe.com', emoji: '🔥', description: 'Generative AI for creative work' },
  { name: 'Canva', provider: 'Canva', category: 'Image & Video', domain: 'canva.com', emoji: '🖌️', description: 'Design platform with Magic Studio AI' },
  { name: 'Runway', provider: 'Runway', category: 'Image & Video', domain: 'runwayml.com', emoji: '🎬', description: 'AI video generation & editing' },
  { name: 'Sora', provider: 'OpenAI', category: 'Image & Video', domain: 'sora.com', emoji: '🎥', description: 'Text-to-video generation' },
  { name: 'Kling AI', provider: 'Kuaishou', category: 'Image & Video', domain: 'klingai.com', emoji: '🎞️', description: 'AI video generation' },
  { name: 'Pika', provider: 'Pika Labs', category: 'Image & Video', domain: 'pika.art', emoji: '🐰', description: 'Creative AI video effects' },
  { name: 'HeyGen', provider: 'HeyGen', category: 'Image & Video', domain: 'heygen.com', emoji: '🧑‍💼', description: 'AI avatar & spokesperson videos' },
  { name: 'Synthesia', provider: 'Synthesia', category: 'Image & Video', domain: 'synthesia.io', emoji: '🗣️', description: 'AI video presenters' },
  { name: 'CapCut', provider: 'ByteDance', category: 'Image & Video', domain: 'capcut.com', emoji: '✂️', description: 'Video editing with AI features' },
  { name: 'ElevenLabs', provider: 'ElevenLabs', category: 'Image & Video', domain: 'elevenlabs.io', emoji: '🎙️', description: 'AI voice generation & dubbing' },
  { name: 'Suno', provider: 'Suno', category: 'Image & Video', domain: 'suno.com', emoji: '🎵', description: 'AI music generation' },
  { name: 'Descript', provider: 'Descript', category: 'Image & Video', domain: 'descript.com', emoji: '🎧', description: 'AI audio & video editing' },

  // Workflow & Agents
  { name: 'Zapier', provider: 'Zapier', category: 'Workflow & Agents', domain: 'zapier.com', emoji: '🟧', description: 'AI automation across apps' },
  { name: 'Make', provider: 'Make', category: 'Workflow & Agents', domain: 'make.com', emoji: '🟣', description: 'Visual workflow automation' },
  { name: 'n8n', provider: 'n8n', category: 'Workflow & Agents', domain: 'n8n.io', emoji: '🔗', description: 'Workflow automation with AI agents' },
  { name: 'Dify', provider: 'Dify', category: 'Workflow & Agents', domain: 'dify.ai', emoji: '⚡', description: 'LLM app & agent builder' },
  { name: 'Manus', provider: 'Manus', category: 'Workflow & Agents', domain: 'manus.im', emoji: '🤲', description: 'General-purpose AI agent' },
  { name: 'Otter.ai', provider: 'Otter', category: 'Workflow & Agents', domain: 'otter.ai', emoji: '🦦', description: 'AI meeting notes & transcription' },
  { name: 'Fireflies', provider: 'Fireflies', category: 'Workflow & Agents', domain: 'fireflies.ai', emoji: '🪰', description: 'AI meeting assistant' },
  { name: 'Hugging Face', provider: 'Hugging Face', category: 'Workflow & Agents', domain: 'huggingface.co', emoji: '🤗', description: 'Open models, datasets & inference' },

  // Search & Knowledge
  { name: 'Perplexity', provider: 'Perplexity', category: 'Search & Knowledge', domain: 'perplexity.ai', emoji: '🔍', description: 'AI answer engine with citations' },
  { name: 'NotebookLM', provider: 'Google', category: 'Search & Knowledge', domain: 'notebooklm.google.com', emoji: '📚', description: 'AI research notebook over your sources' },
  { name: 'You.com', provider: 'You.com', category: 'Search & Knowledge', domain: 'you.com', emoji: '🔎', description: 'AI search & assistant' },
  { name: 'Consensus', provider: 'Consensus', category: 'Search & Knowledge', domain: 'consensus.app', emoji: '🎓', description: 'AI search over research papers' },
];

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Longest names first so "GitHub Copilot" wins over "Copilot"-like partial matches
const BY_LENGTH = [...AI_CATALOG].sort((a, b) => normalize(b.name).length - normalize(a.name).length);

export const findCatalogTool = (toolName: string): CatalogTool | undefined => {
  const n = normalize(toolName);
  if (!n) return undefined;
  return (
    BY_LENGTH.find((c) => normalize(c.name) === n) ||
    BY_LENGTH.find((c) => n.includes(normalize(c.name)) || (n.length >= 3 && normalize(c.name).includes(n)))
  );
};

export const toolIconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
