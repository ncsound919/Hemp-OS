# THC Brain Informatics Core (Hemp OS)

## Setup & Local Deployment (No Docker Needed)

You can run this application entirely on your local laptop without Docker by relying on `node`.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and provide the required API keys.
   - Set `ADMIN_API_KEY=your_secret_password` to protect sensitive endpoints.
   - Set `GEMINI_API_KEY` for the AI model kernel.

3. **Build & Start:**
   ```bash
   # Compile the backend and frontend
   npm run build

   # Start the production server
   npm run start
   ```

4. **Security & HTTPS (Optional):**
   - The server enforces basic API Key auth on sensitive routes (`/api/lab/*`, `/api/ingestion/*`, `/api/integration/*`).
   - You must pass the API key either via query param `?api_key=your_secret_password` or header `x-api-key: your_secret_password`.
   - To serve securely on your LAN, we recommend using a reverse proxy like Caddy or Nginx to wrap the local `http://localhost:3000` with an SSL certificate.

5. **Linting & Formatting:**
   - Prettier and ESLint are fully set up.
   - Run `npm run lint` and `npm run format:check` to verify your codebase.
   - A GitHub Action (`.github/workflows/ci.yml`) is automatically configured.

## Data Scientist Mode (API & Export)

Hemp OS exposes several REST APIs for local analytical querying and exporting:

- `GET /api/db/studies`, `GET /api/db/omics`, `GET /api/db/imaging`, `GET /api/db/risk-profiles`: Pull all core BigQuery tables as JSON arrays.
- `GET /api/graph`: Returns the entire Knowledge Graph (Nodes and Edges).
- `POST /api/export/artifact`: Takes `{ "type": "studies", "format": "csv" }` and returns a flat CSV file for external Python/R analysis. Supports types: `studies`, `omics`, `imaging`.
- `POST /api/export/local-flyer`: Writes generated text summaries directly to the local filesystem (e.g. `C:\Users\User\Documents\HempOS Local`).

See the `examples/` directory for Jupyter Notebook templates demonstrating how to fetch and plot data.

## Architecture
The application runs as a Node.js Express server (`server.ts`) which serves the Vite-built React frontend. The UI has been partially refactored into modular components (e.g. `OrchestratorPanel.tsx`) and includes Hemp OS Playbook Guided Sessions.
