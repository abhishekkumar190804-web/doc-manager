from google import genai
from app.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "models/gemini-embedding-2"


def embed_text(text: str) -> list[float]:
    result = client.models.embed_content(
        model=MODEL,
        contents=text,
    )
    return result.embeddings[0].values


def embed_batch(texts: list[str]) -> list[list[float]]:
    result = client.models.embed_content(
        model=MODEL,
        contents=texts,
    )
    return [e.values for e in result.embeddings]
