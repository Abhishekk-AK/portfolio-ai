# Portfolio-AI Frontend

A simple React + Tailwind CSS frontend for a personal AI portfolio.

## Stack

- React
- Vite
- Tailwind CSS v4
- Lucide React

## Run locally

```bash
npm install
npm run dev
```

The current frontend uses mock responses. No FastAPI backend is required yet.

## Next backend integration

Create an API service layer and replace the mock block inside `sendMessage()` with a request to your FastAPI backend.

Suggested endpoints:

- `POST /chat`
- `POST /upload`
- `GET /conversations`
- `GET /conversations/{id}`

Use `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

For production, set the same variable to the deployed FastAPI URL in Vercel.

## Notes

- PDF, DOCX and TXT selection is implemented.
- Browser speech recognition is implemented where supported.
- Chat history is currently mock/in-memory.
- The frontend does not process documents or perform AI/RAG logic.
