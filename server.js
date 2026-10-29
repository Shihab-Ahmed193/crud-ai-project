const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2));
}

function readTasks() {
  const raw = fs.readFileSync(TASKS_FILE, 'utf8');
  return JSON.parse(raw || '[]');
}

function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function generateTaskSummary(task) {
  const priority = task.status === 'done' ? 'completed' : task.priority || 'medium';
  return `Task: "${task.title}" is ${priority} priority. ${task.description || 'No description provided yet.'}`;
}

function buildFallbackSuggestions(input) {
  const text = `${input.title || ''} ${input.description || ''}`.trim();
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const urgencyWords = ['urgent', 'asap', 'deadline', 'release', 'critical', 'bug'];
  const hasUrgency = words.some((word) => urgencyWords.includes(word));

  const recommendedPriority = hasUrgency ? 'high' : 'medium';
  const suggestedStatus = input.status === 'done' ? 'done' : 'in-progress';

  return {
    summary: `This task should focus on ${input.title || 'the main objective'} with a ${recommendedPriority} priority. Keep the scope tight and break work into 2–3 deliverable steps.`,
    priority: recommendedPriority,
    status: suggestedStatus,
    nextStep: `Start by outlining the minimum viable outcome, then validate the result before moving to any additional enhancements.`,
    tags: ['productivity', 'planning', 'execution']
  };
}

async function generateAISuggestions(input) {
  const promptText = input.title || input.description || 'Create a task plan';

  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackSuggestions(input);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a project planning assistant. Return valid JSON with keys: summary, priority, status, nextStep, tags. Keep responses concise and practical.'
        },
        {
          role: 'user',
          content: `Task information:\nTitle: ${input.title || 'Untitled'}\nDescription: ${input.description || 'No description provided'}\nCurrent status: ${input.status || 'todo'}\nContext: ${promptText}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return buildFallbackSuggestions(input);
    }

    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || 'AI summary unavailable.',
      priority: parsed.priority || 'medium',
      status: parsed.status || 'todo',
      nextStep: parsed.nextStep || 'Start with a clear first milestone.',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['ai', 'planning']
    };
  } catch (error) {
    console.error('AI generation failed:', error.message);
    return buildFallbackSuggestions(input);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CRUD AI service is running.' });
});

app.get('/api/tasks', (req, res) => {
  const tasks = readTasks();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, status = 'todo' } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Task title is required.' });
  }

  const tasks = readTasks();
  const newTask = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description?.trim() || '',
    status,
    priority: 'medium',
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  writeTasks(tasks);

  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority } = req.body;
  const tasks = readTasks();
  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  tasks[index] = {
    ...tasks[index],
    title: title?.trim() || tasks[index].title,
    description: description !== undefined ? description.trim() : tasks[index].description,
    status: status || tasks[index].status,
    priority: priority || tasks[index].priority,
    updatedAt: new Date().toISOString()
  };

  writeTasks(tasks);
  res.json(tasks[index]);
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const tasks = readTasks();
  const filteredTasks = tasks.filter((task) => task.id !== id);

  if (filteredTasks.length === tasks.length) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  writeTasks(filteredTasks);
  res.json({ message: 'Task deleted successfully.' });
});

app.post('/api/ai/suggest', async (req, res) => {
  const { title, description, status } = req.body;

  const suggestions = await generateAISuggestions({ title, description, status });
  res.json({
    message: 'AI suggestions generated successfully.',
    suggestions,
    taskSummary: generateTaskSummary({ title, description, status, priority: suggestions.priority })
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
