# PocketSmart AI — AI-Powered Personal Budget & Planning Assistant

PocketSmart AI is an intelligent financial planning and budget allocation web application. Built with **FastAPI**, **Jinja2**, **Vanilla JavaScript**, and the official **Google GenAI SDK (`google-genai`)**, PocketSmart AI turns abstract budgets into actionable, category-wise spending plans with zero guesswork.

---

## 🌟 Key Features

### 1. Smart AI Planners
- **🏠 Home Interior Planner**: Intelligently allocates funds across modular woodwork, ambient lighting, BLDC ceiling fans, dining sets, room essentials, and contingency buffers based on selected rooms and preferences.
- **🎉 Party & Event Planner**: Calibrates per-guest budgets across catering, theme decor, venue rentals, and entertainment, guaranteeing you never overspend on celebrations.
- **💎 Jewelry Match & Multimodal Stylist**: Recommends coordinated jewelry sets (chokers, earrings, bangles, rings) based on budget, occasion, and style. Includes **multimodal image analysis** where an uploaded outfit photo is analyzed by Gemini to match colors, neckline cuts, and metal finishes.

### 2. Dashboard Analytics & History
- **📊 Real-time Dashboard**: Tracks total planned amounts in Indian Rupees (`₹`), remaining balances, plan counts, and most-used planners.
- **📈 Budget Distribution Breakdown**: Visualizes aggregate category spending with proportional progress bars.
- **🕒 Local Plan History**: Search, filter by category, inspect previous recommendations, or delete saved plans. All data persists safely in local browser storage.

### 3. Resilience & Fallbacks
- **🛡️ Deterministic Demo Fallback**: If a Gemini API key is missing or the external API is unreachable, the system automatically uses an offline deterministic financial model so the application and API endpoints never crash or become unusable.
- **⚡ AI Connection Indicator**: Live status monitor in the sidebar verifying real-time Gemini connectivity via `/health`.
- **🔄 Polished Loading States**: Animated spinners and button states during AI generation.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic, Jinja2, python-multipart, Pillow (PIL), python-dotenv
- **AI / LLM**: Google Gemini via official `google-genai` Python SDK (Structured JSON schemas)
- **Frontend**: Modern Semantic HTML5, CSS3 (Custom Properties, Glassmorphism, Responsive Grid), Vanilla JavaScript (Modular ES6 architecture)
- **Storage**: Local browser storage for sessions & plans; server-side sanitized storage for uploaded outfit images under `static/uploads/`.

---

## 📂 Project Structure

```text
PocketSmartAI/
│
├── app.py                     # FastAPI application, routing, Pydantic validation & Gemini integration
├── run.bat                    # One-click Windows startup script
├── index.html                 # Root frontend entry point for previewing and direct access
├── requirements.txt           # Python dependencies
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules for virtual environments, secrets and cache
├── README.md                  # Complete documentation and setup guide
│
├── css/
│   ├── style.css              # SaaS dashboard layout, typography, components, and responsive rules
│   └── cartoon-effects.css    # Subtle animated scenes, stickers, and keyframe transitions
│
├── js/
│   ├── app.js                 # App controller, navigation, forms, loading states, and toast system
│   ├── auth.js                # Local browser authentication and SHA-256 password hashing
│   ├── dashboard.js           # Analytics calculator, Indian Rupee formatting, and breakdown chart
│   ├── history.js             # Plan history search, filtering, and deletion
│   └── planner.js             # API request dispatch, deterministic fallback logic, and result modal
│
├── templates/
│   ├── base.html              # Jinja2 base layout with fonts, meta tags, and scripts
│   ├── index.html             # Primary single-page application template
│   ├── dashboard.html         # Modular dashboard template include
│   ├── home_planner.html      # Modular home planner template include
│   ├── party_planner.html     # Modular party planner template include
│   ├── jewelry_planner.html   # Modular jewelry planner template include
│   ├── history.html           # Modular history template include
│   ├── login.html             # Modular login template include
│   └── register.html          # Modular register template include
│
└── static/
    └── uploads/
        └── .gitkeep           # Placeholder for uploaded outfit photos
```

---

## 🚀 Quick Start Guide (Windows)

### Option A: The One-Click Way
Double-click `run.bat` in the project root. It will:
1. Automatically detect or create the Python virtual environment (`.venv`).
2. Activate `.venv`.
3. Install required packages from `requirements.txt`.
4. Launch the Uvicorn server at `http://127.0.0.1:8000`.

---

### Option B: Step-by-Step Terminal Instructions

#### STEP 1: Open Project in VS Code
Open the `PocketSmartAI` directory in VS Code.

#### STEP 2: Open Terminal
Press `Ctrl + ~` (or `Ctrl + Shift + \``) to open the integrated terminal.

#### STEP 3: Create Virtual Environment
```powershell
python -m venv .venv
```

#### STEP 4: Activate Virtual Environment
```powershell
.\.venv\Scripts\activate
```
*(You will see `(.venv)` in your terminal prompt)*

#### STEP 5: Install Dependencies
```powershell
pip install -r requirements.txt
```

#### STEP 6: Start the Server
```powershell
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```
> **IMPORTANT**: Keep this terminal window open while using the application! If you close the terminal, Uvicorn stops, and your browser will display `ERR_CONNECTION_REFUSED`.

#### STEP 7: Open the Application
Open your browser and navigate to:
```text
http://127.0.0.1:8000
```

Health check endpoint:
```text
http://127.0.0.1:8000/health
```

---

## ⚙️ Gemini API Key Configuration (Optional)

The application includes full offline fallback support and **runs completely without a Gemini API key**. If you have an API key and want real-time Gemini generation:

1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Open `.env` and set your key:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualKeyHere
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. Restart the Uvicorn server (`Ctrl+C` and re-run `uvicorn app:app --reload`). The sidebar indicator will turn green and say **Gemini AI Connected**.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Renders the primary PocketSmart AI dashboard application. |
| `GET` | `/health` | Health check returning status, Gemini configuration flag, and active model. |
| `POST` | `/generate-home` | Accepts home planner parameters (`budget`, `rooms`, `lights`, etc.) and returns structured allocations. |
| `POST` | `/generate-party` | Accepts party planner parameters (`budget`, `guests`, `type`, `venue`, priorities) and returns structured allocations. |
| `POST` | `/generate-jewelry` | Accepts multipart form data with `budget`, `occasion`, `style`, and optional `outfit_image` for multimodal analysis. |
| `POST` | `/api/generate-home` | Compatibility endpoint for `/generate-home`. |
| `POST` | `/api/generate-party` | Compatibility endpoint for `/generate-party`. |

---

## ❓ Troubleshooting `ERR_CONNECTION_REFUSED`

If your browser displays:
> **"This site can't be reached. 127.0.0.1 refused to connect. ERR_CONNECTION_REFUSED"**

This means **no web server process is actively listening on port 8000**. To resolve:
1. Check your VS Code terminal. Did the Uvicorn command terminate or was the window closed?
2. Restart the server with:
   ```powershell
   .\.venv\Scripts\activate
   uvicorn app:app --reload --host 127.0.0.1 --port 8000
   ```
   Or double-click `run.bat`.
3. Verify that Uvicorn logs output:
   `INFO: Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)`
4. Refresh `http://127.0.0.1:8000` in your browser.
