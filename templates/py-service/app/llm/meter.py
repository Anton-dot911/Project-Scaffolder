"""Hook point for the Cost/Latency Tracker (TZ #6).

The interface is fixed now so llm call sites never have to change; the
implementation stays a no-op until the tracker service exists.
"""


class Meter:
    def record(
        self,
        *,
        project: str,
        component: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: float,
        success: bool,
    ) -> None:
        """Record one LLM call. No-op until the Meter service exists."""
