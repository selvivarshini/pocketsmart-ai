"""PocketSmart AI - FastAPI Backend Application.

AI-powered budget planning and recommendations assistant utilizing Google Gemini
models and local deterministic fallback capabilities.
"""

from __future__ import annotations

import io
import json
import logging
import os
import re
import uuid
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from PIL import Image
from pydantic import BaseModel, Field

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pocketsmart")

# Load environment configuration
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="PocketSmart AI",
    description="AI-powered budget planning and recommendation assistant",
    version="1.0.0",
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static asset directories
app.mount("/css", StaticFiles(directory=str(BASE_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(BASE_DIR / "js")), name="js")
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# Templates
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


class HomeRequest(BaseModel):
    budget: float = Field(..., gt=0, description="Total budget in INR")
    rooms: list[str] = Field(default_factory=list, description="Rooms selected for planning")
    lights: int = Field(default=0, ge=0, description="Number of lights / fixtures")
    fans: int = Field(default=0, ge=0, description="Number of ceiling fans")
    furniture: int = Field(default=0, ge=0, description="Number of furniture items")
    dining: int = Field(default=0, ge=0, description="Number of dining tables")
    notes: str = Field(default="", max_length=1500, description="Special requirements or style notes")


class PartyRequest(BaseModel):
    budget: float = Field(..., gt=0, description="Total budget in INR")
    guests: int = Field(..., gt=0, description="Expected guest count")
    type: str = Field(default="Birthday", max_length=100, description="Type of celebration")
    venue: str = Field(default="Home", max_length=100, description="Venue type")
    catering: bool = Field(default=True, description="Whether catering is requested")
    decor: bool = Field(default=True, description="Whether decoration is requested")
    entertainment: bool = Field(default=True, description="Whether entertainment is requested")
    notes: str = Field(default="", max_length=1500, description="Additional event notes")


def is_gemini_configured() -> bool:
    """Check if a valid Gemini API key is configured."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    return bool(key and key != "your_real_key_here" and key != "your_real_gemini_api_key_here")


def get_gemini_client():
    """Retrieve an initialized Google GenAI client or None if unconfigured."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not is_gemini_configured():
        return None
    try:
        from google import genai
        return genai.Client(api_key=key)
    except Exception as err:
        logger.warning(f"Failed to initialize Gemini client: {err}")
        return None


def extract_json(raw_text: str) -> dict[str, Any]:
    """Safely extracts and parses JSON from Gemini output, handling markdown fences."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise ValueError("Gemini returned text that does not contain JSON.")
        return json.loads(match.group(0))


def allocation_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "allocations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string"},
                        "amount": {"type": "number"},
                        "reason": {"type": "string"},
                    },
                    "required": ["label", "amount", "reason"],
                },
            },
            "tips": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["summary", "allocations", "tips"],
    }


def jewelry_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "recommendations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "budget_amount": {"type": "number"},
                        "why": {"type": "string"},
                    },
                    "required": ["name", "description", "budget_amount", "why"],
                },
            },
            "allocations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string"},
                        "amount": {"type": "number"},
                        "reason": {"type": "string"},
                    },
                    "required": ["label", "amount", "reason"],
                },
            },
            "tips": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["summary", "recommendations", "allocations", "tips"],
    }


def generate_home_fallback(data: HomeRequest) -> dict[str, Any]:
    """Generates an accurate, deterministic home interior budget allocation."""
    budget = data.budget
    rooms = data.rooms if data.rooms else ["Living Room"]
    lights = data.lights
    fans = data.fans
    furniture = data.furniture
    dining = data.dining

    allocations = [
        {
            "label": "Modular Furniture & Woodwork",
            "amount": round(budget * 0.40),
            "reason": f"Essential storage, wardrobes, and seating for {', '.join(rooms)}.",
        },
        {
            "label": "Lighting & Electrical Fixtures",
            "amount": round(budget * 0.18),
            "reason": f"Covers {lights} fixtures, wiring points, switches, and ambient lighting.",
        },
        {
            "label": "Ceiling Fans & Climate",
            "amount": round(budget * 0.12),
            "reason": f"Energy-efficient BLDC ceiling fans ({fans} units) with remote controls.",
        },
        {
            "label": "Dining Set & Tableware",
            "amount": round(budget * 0.15),
            "reason": f"Table and chair set ({dining} table setup) and surface protection.",
        },
        {
            "label": "Wall Paint & Decorative Finishes",
            "amount": round(budget * 0.10),
            "reason": "Emulsion coats, curtains, soft furnishings, and wall trim.",
        },
    ]

    total_alloc = sum(a["amount"] for a in allocations)
    diff = budget - total_alloc
    if diff > 0:
        allocations.append({
            "label": "Contingency & Buffer",
            "amount": round(diff),
            "reason": "Reserved for transport, carpenter installation, and hardware items.",
        })

    return {
        "summary": f"Structured budget for {', '.join(rooms)} ({lights} lights, {fans} fans, {furniture} furniture pieces).",
        "allocations": allocations,
        "tips": [
            "Opt for BWP/BWR grade plywood in moisture-prone zones like kitchens and dining areas to prevent swelling.",
            "Choose 5-star rated BLDC fans to save up to 65% on electricity compared to traditional induction motors.",
            "Use layered 3000K-4000K warm white ceiling LEDs for cozy living room ambiance without eye strain.",
            "Procure core hardware fittings (hinges, drawer channels) from certified brands with long warranties.",
        ],
    }


def generate_party_fallback(data: PartyRequest) -> dict[str, Any]:
    """Generates an accurate, deterministic event budget allocation."""
    budget = data.budget
    guests = data.guests
    active_priorities = []
    if data.catering:
        active_priorities.append(("Catering & Multi-Course Menu", 0.50, f"Buffet, live counters, appetizers, and beverages for ~{guests} guests."))
    if data.decor:
        active_priorities.append(("Theme Decor, Backdrop & Lighting", 0.25, f"Custom {data.type} photo backdrop, balloon/floral arches, and table centrepieces at {data.venue}."))
    if data.entertainment:
        active_priorities.append(("Sound, Music & Interactive Entertainment", 0.15, "Sound system rental, curated playlists/DJ setup, and celebration games."))
    if not active_priorities:
        active_priorities.append(("General Celebration Essentials", 0.85, "Venue hospitality, refreshments, and party essentials."))

    total_weight = sum(p[1] for p in active_priorities)
    allocations = []
    for label, weight, reason in active_priorities:
        amount = round(budget * (weight / total_weight))
        allocations.append({"label": label, "amount": amount, "reason": reason})

    total_alloc = sum(a["amount"] for a in allocations)
    diff = budget - total_alloc
    if diff > 0:
        allocations.append({
            "label": "Buffer & On-the-Day Incidentals",
            "amount": round(diff),
            "reason": "Last-minute guest additions, extra ice, takeaway packaging, or service tips.",
        })

    return {
        "summary": f"{data.type} celebration for {guests} guests at {data.venue} with curated hospitality.",
        "allocations": allocations,
        "tips": [
            "Confirm strict RSVPs 48 hours in advance to avoid over-ordering food platters and beverage cases.",
            "Focus your decoration budget on one dramatic photo-booth backdrop where guests capture 90% of memories.",
            "Pre-schedule playlists on streaming apps connected to good bluetooth speakers if hiring a DJ exceeds budget.",
            "Serve family-style grazing platters or dynamic buffet counters to reduce per-plate catering staffing charges.",
        ],
    }


def generate_jewelry_fallback(budget: float, occasion: str, style: str) -> dict[str, Any]:
    """Generates an accurate, deterministic jewelry recommendation ensemble."""
    allocations = [
        {"label": "Necklace / Statement Centerpiece", "amount": round(budget * 0.44), "reason": f"Focal piece coordinated with {occasion} neckline and attire."},
        {"label": "Earrings / Matching Drops", "amount": round(budget * 0.24), "reason": f"Framing {style.lower()} drops or studs echoing the centerpiece design."},
        {"label": "Bangles / Cuff / Hathphool", "amount": round(budget * 0.18), "reason": "Graceful wrist accents complementing your festive movement."},
        {"label": "Statement Ring & Stylist Accents", "amount": round(budget * 0.14), "reason": "Adjustable cocktail ring or subtle hair pins."},
    ]
    recommendations = [
        {
            "name": f"{style} Focal Necklace",
            "description": f"Intricate {style.lower()} craftsmanship with coordinated stone accents and adjustable clasp.",
            "budget_amount": round(budget * 0.44),
            "why": f"Designed to naturally elevate your {occasion} outfit and frame the neckline.",
        },
        {
            "name": "Coordinated Drop Earrings",
            "description": f"Comfort-balanced {style.lower()} earrings matching the metal polish and stones of the main necklace.",
            "budget_amount": round(budget * 0.24),
            "why": "Provides portrait symmetry without feeling heavy on long celebration evenings.",
        },
        {
            "name": "Hand Jewelry / Openable Kada",
            "description": "Textured metallic finish with gemstone highlights designed for easy wear.",
            "budget_amount": round(budget * 0.18),
            "why": "Adds sparkle when greeting guests and holding party clutches.",
        },
    ]
    return {
        "summary": f"Curated {style} jewelry ensemble selected for a {occasion}.",
        "recommendations": recommendations,
        "allocations": allocations,
        "tips": [
            "Ensure gold or silver items carry BIS hallmark inscriptions with valid 6-digit HUID tags.",
            "For heavy occasional statement looks, premium 925 sterling silver with 22K gold vermeil polish gives royal luxury at a fraction of solid gold prices.",
            "Store studded jewelry in velvet-lined boxes away from moisture and direct sunlight.",
            "Always apply makeup and perfume before wearing jewelry to prevent chemical oxidization on metal surfaces.",
        ],
    }


def call_gemini(prompt: str, schema: dict[str, Any], extra_contents: list[Any] | None = None) -> dict[str, Any] | None:
    """Calls Gemini with structured JSON schema configuration, or returns None on failure."""
    client = get_gemini_client()
    if not client:
        return None

    from google.genai import types

    contents: list[Any] = [prompt]
    if extra_contents:
        contents.extend(extra_contents)

    active_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    try:
        response = client.models.generate_content(
            model=active_model,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.35,
                response_mime_type="application/json",
                response_schema=schema,
            ),
        )
        return extract_json(response.text or "")
    except Exception as exc:
        logger.warning(f"Gemini API generation error: {exc}. Switching to fallback mode.")
        return None


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Serve the primary application shell."""
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"request": request},
    )


@app.get("/health")
async def health():
    """Health check endpoint indicating service and Gemini configuration status."""
    active_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    return {
        "status": "ok",
        "gemini_configured": is_gemini_configured(),
        "model": active_model,
    }


@app.post("/generate-home")
async def generate_home(data: HomeRequest):
    """Generate home interior budget recommendations via Gemini or deterministic fallback."""
    ai_result = None
    if is_gemini_configured():
        prompt = f"""
You are PocketSmart AI, a highly practical Indian home interior budget-planning assistant.
Create a realistic home interior budget allocation. Keep total allocation at or below ₹{data.budget:,.0f}.
Category-level financial planning only (do not invent specific e-commerce store prices).

Client Requirements:
- Total Budget: ₹{data.budget:,.0f}
- Target Rooms: {', '.join(data.rooms) if data.rooms else 'Living Room'}
- Lighting & Fixtures: {data.lights} units
- Ceiling Fans: {data.fans} units
- Furniture Pieces: {data.furniture} items
- Dining Tables: {data.dining} tables
- Special Requests & Style: {data.notes or 'Standard contemporary finish'}

Generate concise JSON with:
1. "summary": A 1-2 sentence executive overview tailored to the rooms and budget.
2. "allocations": 4-7 category allocations (e.g., Modular Furniture, Ambient Lighting, Ceiling Fixtures, Dining Setup, Paint & Decor, Contingency Buffer). Each item must include:
   - "label": category name
   - "amount": integer rupee allocation (sum must be <= budget)
   - "reason": 1 sentence explaining the cost factor
3. "tips": 3-5 smart, practical money-saving or quality-maximizing interior tips for India.
"""
        ai_result = call_gemini(prompt, allocation_schema())

    if ai_result:
        return {
            "type": "home",
            "title": "AI Home Interior Plan",
            "budget": data.budget,
            "is_ai": True,
            **ai_result,
        }

    # Seamless fallback response
    fallback = generate_home_fallback(data)
    return {
        "type": "home",
        "title": "Home Interior Plan",
        "budget": data.budget,
        "is_ai": False,
        **fallback,
    }


@app.post("/generate-party")
async def generate_party(data: PartyRequest):
    """Generate party and event budget recommendations via Gemini or deterministic fallback."""
    ai_result = None
    if is_gemini_configured():
        prompt = f"""
You are PocketSmart AI, a savvy Indian event budget-planning assistant.
Create a realistic event budget breakdown. Keep total allocations at or below ₹{data.budget:,.0f}.
Ensure cost per guest makes practical sense for the selected event type and venue.

Client Requirements:
- Total Budget: ₹{data.budget:,.0f}
- Number of Guests: {data.guests}
- Event Type: {data.type}
- Venue: {data.venue}
- Priority - Catering: {'Yes' if data.catering else 'No'}
- Priority - Decoration: {'Yes' if data.decor else 'No'}
- Priority - Entertainment/Music: {'Yes' if data.entertainment else 'No'}
- Special Requests: {data.notes or 'None'}

Generate concise JSON with:
1. "summary": 1-2 sentences summarizing the guest budget and event strategy.
2. "allocations": 4-7 category allocations (e.g., Food & Beverages, Decor & Theme, Entertainment & Sound, Venue & Hospitality, Photography, Contingency Buffer).
   - "label": category name
   - "amount": integer rupee allocation (sum <= budget)
   - "reason": 1 sentence reason explaining cost allocation per guest
3. "tips": 3-5 practical planning tips to maximize fun and avoid budget overruns.
"""
        ai_result = call_gemini(prompt, allocation_schema())

    if ai_result:
        return {
            "type": "party",
            "title": "AI Party Budget Plan",
            "budget": data.budget,
            "is_ai": True,
            **ai_result,
        }

    # Seamless fallback response
    fallback = generate_party_fallback(data)
    return {
        "type": "party",
        "title": "Party Budget Plan",
        "budget": data.budget,
        "is_ai": False,
        **fallback,
    }


@app.post("/generate-jewelry")
async def generate_jewelry(
    budget: float = Form(...),
    occasion: str = Form(...),
    style: str = Form(...),
    outfit_image: UploadFile | None = File(default=None),
):
    """Generate jewelry recommendations with optional outfit image analysis via Gemini or fallback."""
    if budget <= 0:
        raise HTTPException(status_code=400, detail="Budget must be greater than zero.")

    saved_image_url: str | None = None
    extra_contents: list[Any] = []

    if outfit_image and outfit_image.filename:
        raw_bytes = await outfit_image.read()
        if len(raw_bytes) > 8 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="Image size exceeds the 8 MB limit. Please upload a smaller image.",
            )

        # Validate image format using Pillow
        try:
            image = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid image.",
            ) from exc

        # Sanitize extension
        raw_ext = Path(outfit_image.filename).suffix.lower()
        if raw_ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raw_ext = ".jpg"

        filename = f"{uuid.uuid4().hex}{raw_ext}"
        saved_path = UPLOAD_DIR / filename
        image.save(saved_path, format="JPEG", quality=88)
        saved_image_url = f"/static/uploads/{filename}"
        extra_contents.append(image)

    ai_result = None
    if is_gemini_configured():
        prompt = f"""
You are PocketSmart AI, an expert jewelry styling and budgeting assistant for Indian and modern occasions.
Recommend a coordinated jewelry collection matching the client's budget, occasion, and preferred style.
Keep the total allocated budget at or below ₹{budget:,.0f}.

Client Details:
- Budget: ₹{budget:,.0f}
- Occasion: {occasion}
- Preferred Style: {style}
"""
        if extra_contents:
            prompt += """
An outfit image is provided. Examine only visible stylistic details: colors, fabric tones, neckline shape, embroidery, and whether it is traditional, fusion, or western.
Tailor the jewelry metals, gemstones, and silhouettes to harmoniously complement this outfit. Do not identify any person in the photo.
"""
        prompt += """
Generate concise JSON with:
1. "summary": 1-2 sentence styling assessment and budget overview.
2. "recommendations": 3-5 specific jewelry pieces (e.g., Choker / Necklace, Statement Earrings, Kada / Bangles, Ring).
   - "name": piece name
   - "description": specific design, metal finish, stone or embellishment details
   - "budget_amount": estimated rupee target
   - "why": styling reason why it pairs with this occasion and style/outfit
3. "allocations": category budget allocations (sum <= budget)
   - "label": category name
   - "amount": integer rupee amount
   - "reason": explanation of allocation
4. "tips": 3-4 styling and purchasing tips (hallmarking, certifications, rental vs buy, care).
"""
        ai_result = call_gemini(prompt, jewelry_schema(), extra_contents=extra_contents)

    if ai_result:
        return {
            "type": "jewelry",
            "title": "AI Jewelry Recommendation",
            "budget": budget,
            "image_saved": saved_image_url,
            "is_ai": True,
            **ai_result,
        }

    # Seamless fallback response
    fallback = generate_jewelry_fallback(budget, occasion, style)
    return {
        "type": "jewelry",
        "title": "Jewelry Recommendation",
        "budget": budget,
        "image_saved": saved_image_url,
        "is_ai": False,
        **fallback,
    }


# Compatibility API endpoints
@app.post("/api/generate-home")
async def api_generate_home(data: HomeRequest):
    return await generate_home(data)


@app.post("/api/generate-party")
async def api_generate_party(data: PartyRequest):
    return await generate_party(data)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status": "error"},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception("Internal error")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred while processing the plan.",
            "status": "error",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
