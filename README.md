# Smart CRUD Dashboard

A simple CRUD project with a lightweight AI-powered recommendation engine. It lets you create, read, update, and delete tasks while also generating smart suggestions based on a task title and description.

## Features

- Add, edit, and delete tasks
- Filter tasks by status
- AI-generated planning suggestions
- Responsive front-end UI
- JSON-based data persistence

## Tech Stack

- Node.js
- Express
- JavaScript front-end
- Optional OpenAI API integration

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment example:

   ```bash
   cp .env.example .env
   ```

3. Optionally add your OpenAI API key to `.env`:

   ```bash
   OPENAI_API_KEY=your_key_here
   ```

4. Start the app:

   ```bash
   npm start
   ```

5. Open the browser at:

   ```text
   http://localhost:3000
   ```

## Project Structure

- `server.js` – Express API and AI logic
- `public/` – Front-end HTML/CSS/JS
- `data/tasks.json` – Persists task data
- `.env.example` – Example environment configuration

## Notes

- If no `OPENAI_API_KEY` is provided, the app automatically falls back to a built-in suggestion engine.
- Data is saved in a local JSON file for simplicity.

## GitHub Repository

- https://github.com/Shihab-Ahmed193/crud-ai-project

## License

This project is licensed under the MIT License.












































