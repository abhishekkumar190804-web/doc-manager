from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "models/gemini-2.5-flash"

TOOLS = [
    types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name="create_task",
            description="Create a task in the workspace",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "title": types.Schema(
                        type=types.Type.STRING,
                        description="Task title",
                    ),
                    "notes": types.Schema(
                        type=types.Type.STRING,
                        description="Optional notes for the task",
                    ),
                },
                required=["title"],
            ),
        ),
        types.FunctionDeclaration(
            name="send_notification",
            description="Send a notification to the team (Discord)",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "message": types.Schema(
                        type=types.Type.STRING,
                        description="The notification message to send",
                    ),
                },
                required=["message"],
            ),
        ),
    ]),
]

SYSTEM_PROMPT = """You are a document assistant. Answer questions based ONLY on the provided document context.

Rules:
1. If the context contains the answer, answer using it and cite sources as [Source N].
2. If the context does NOT contain the answer, say "I couldn't find that information in your documents." — do not make up an answer.
3. You can create tasks (create_task) and send notifications (send_notification) when the user asks.
4. Be concise."""  # noqa: E501


def ask_gemini(
    user_message: str,
    context: str,
    conversation_history: list[dict],
) -> tuple[str, list[dict]]:
    contents = []

    for msg in conversation_history[-20:]:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=msg["content"])],
        ))

    augmented = f"""Context from documents:
{context}

Question: {user_message}

Answer using ONLY the context above. If the context has no relevant info, say so. Cite sources as [Source N]."""  # noqa: E501

    contents.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=augmented)],
    ))

    response = client.models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            tools=TOOLS,
            temperature=0.3,
            max_output_tokens=2048,
        ),
    )

    tool_calls = []
    text_response = ""

    if response.candidates:
        for part in response.candidates[0].content.parts:
            if part.text:
                text_response += part.text
            if part.function_call:
                tool_calls.append({
                    "name": part.function_call.name,
                    "args": {k: v for k, v in part.function_call.args.items()},
                })

    return text_response or "I couldn't process that request.", tool_calls
