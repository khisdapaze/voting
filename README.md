# Vote

A modern polling application with real-time voting and Google OAuth authentication.

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite
- TailwindCSS 4
- React Router
- React Query (TanStack Query)
- React Hook Form
- QR Code generation

**Backend:**
- Python 3.11
- DigitalOcean Functions (Serverless)
- Redis

**Authentication:**
- Google OAuth

## Prerequisites

- Node.js (with pnpm)
- Python 3.11
- Redis (for local development)
- DigitalOcean CLI (`doctl`) for deployment
- `lftp` for FTP deployment (optional)

## Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd vote
```

2. **Configure environment variables**

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `REDIS_CONNECTION_STRING`: Redis connection string
- `API_BASE_URL`: Backend API URL
- `FRONTEND_URL`: Frontend URL
- FTP credentials (optional, for deployment)

3. **Install dependencies**

Frontend:
```bash
cd client
pnpm install
```

Backend:
```bash
cd server
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Development

**Start the frontend:**

```bash
cd client
pnpm dev
```

The frontend will run on `http://localhost:5173`

**Start the backend:**

```bash
cd server
source .venv/bin/activate
python -m src
```

The backend will run on `http://localhost:8000`

**Start Redis (if running locally):**

```bash
redis-server
```

## Build and Deploy

The project includes an automated build and deployment script:

**Deploy to production:**

```bash
./build_and_deploy.sh production
```

**Deploy with custom environment:**

```bash
./build_and_deploy.sh <mode>
```

This script will:
1. Build the backend and deploy to DigitalOcean Functions
2. Build the frontend Vite app
3. Upload the frontend via FTP (if credentials are configured)
4. Clean up build artifacts

## Project Structure

```
vote/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── data/        # API client and types
│   │   └── utils/       # Utilities
│   └── package.json
├── server/              # Python backend
│   ├── src/             # Source code
│   └── project.yml      # DigitalOcean Functions config
├── .env.example         # Environment variables template
├── .gitignore
└── build_and_deploy.sh  # Deployment script
```

## Environment Files

- `.env` - Local development environment
- `.env.production` - Production environment (not committed to git)
- `.env.example` - Template with all required variables

## License

[Your License]