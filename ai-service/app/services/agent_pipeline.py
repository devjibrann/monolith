"""Multi-step agenting pipeline: plan -> ground -> synthesize.

Each stage is surfaced as a structured event so callers can stream pipeline
progress to end users:

    {"type": "step", "step": "plan", "status": "running" | "done", "detail": str}
    {"type": "token", "token": str}
    {"type": "done"}

The pipeline reuses the configured chat provider for both the planning call
and the final streamed answer, and works with every provider (including mock).
"""

from typing import Any, Dict, Iterator, List

from app.providers import stream_chat_reply

MAX_PLAN_CHARS = 600
MAX_GROUNDED_SNIPPETS = 4
MIN_SNIPPET_SCORE = 0.35

PLANNER_PROMPT = (
    "You are the planning step of an AI agent. Given the user's question, "
    "write a numbered plan of 2-4 short steps describing how to answer it "
    "using the retrieved workspace documents. Reply with the plan only, no "
    "preamble.\n\nQuestion:\n{message}"
)

SYNTHESIS_PROMPT = (
    "You are the final step of an AI agent. Follow this plan while answering:\n"
    "{plan}\n\nNow answer the user's question:\n{message}"
)


def run_agent_pipeline(
    message: str, context: List[Dict[str, Any]]
) -> Iterator[Dict[str, Any]]:
    # Step 1: plan
    yield _step("plan", "running", "Analyzing the question and drafting a plan")
    plan = _draft_plan(message)
    yield _step("plan", "done", plan)

    # Step 2: ground
    yield _step("ground", "running", "Selecting relevant document context")
    grounded = _ground_context(context)
    yield _step("ground", "done", _grounding_summary(context, grounded))

    # Step 3: synthesize
    yield _step("synthesize", "running", "Composing the final answer")
    prompt = SYNTHESIS_PROMPT.format(plan=plan, message=message)
    for token in stream_chat_reply(prompt, grounded):
        yield {"type": "token", "token": token}
    yield _step("synthesize", "done", "Answer complete")

    yield {"type": "done"}


def _draft_plan(message: str) -> str:
    try:
        plan = "".join(stream_chat_reply(PLANNER_PROMPT.format(message=message), []))
    except Exception:
        plan = ""
    plan = plan.strip()
    if not plan:
        plan = "1. Review the retrieved context.\n2. Answer the question directly."
    if len(plan) > MAX_PLAN_CHARS:
        plan = plan[:MAX_PLAN_CHARS].rstrip() + "…"
    return plan


def _ground_context(context: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    scored = sorted(
        context, key=lambda item: float(item.get("score") or 0.0), reverse=True
    )
    strong = [
        item for item in scored if float(item.get("score") or 0.0) >= MIN_SNIPPET_SCORE
    ]
    # Never drop everything: fall back to the best snippets when scores are weak.
    return (strong or scored)[:MAX_GROUNDED_SNIPPETS]


def _grounding_summary(
    context: List[Dict[str, Any]], grounded: List[Dict[str, Any]]
) -> str:
    if not context:
        return "No document context available; answering from general knowledge"
    titles = sorted(
        {
            str(item.get("document_title"))
            for item in grounded
            if item.get("document_title")
        }
    )
    summary = f"Using {len(grounded)} of {len(context)} retrieved snippet(s)"
    if titles:
        summary += f" from: {', '.join(titles[:3])}"
        if len(titles) > 3:
            summary += f" (+{len(titles) - 3} more)"
    return summary


def _step(step: str, status: str, detail: str) -> Dict[str, Any]:
    return {"type": "step", "step": step, "status": status, "detail": detail}
