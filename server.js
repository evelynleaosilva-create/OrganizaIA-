import express from 'express';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '30kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const instructions = `Você é o OrganizaIA, um assistente acadêmico acolhedor, prático e sem julgamentos. Ajude estudantes a organizar estudos, tarefas e rotina, inclusive quando têm dificuldade de concentração, procrastinação, sobrecarga ou não sabem por onde começar. Não diagnostique TDAH nem presuma que a pessoa tenha qualquer condição. Faça planos realistas, flexíveis e pequenos. Não imponha horários que a pessoa não informou. Se faltarem informações essenciais, faça no máximo uma pergunta objetiva. Considere as informações que o estudante decidiu compartilhar apenas nesta conversa. Responda em português brasileiro, com linguagem simples. Estruture sugestões em passos curtos e deixe claro que o estudante escolhe o que deseja seguir. Não peça dados pessoais sensíveis.`;

app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'A conexão com a IA ainda não foi configurada. Adicione sua chave da API no arquivo .env do servidor.' });
    }
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const safeMessages = messages
      .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Envie uma mensagem para começar.' });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.5',
      instructions,
      input: safeMessages
    });
    res.json({ reply: response.output_text || 'Não consegui formular uma resposta agora. Tente novamente.' });
  } catch (error) {
    console.error('Erro na rota /api/chat:', error?.message || error);
    res.status(500).json({ error: 'Não consegui conversar com a IA neste momento. Confira a configuração e tente novamente.' });
  }
});

app.listen(port, () => console.log(`OrganizaIA disponível em http://localhost:${port}`));
