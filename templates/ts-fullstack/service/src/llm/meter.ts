// Hook point for the Cost/Latency Tracker (TZ #6). The interface is fixed now
// so llm call sites never have to change; the implementation stays a no-op
// until the tracker service exists.

export interface MeterRecord {
  project: string;
  component: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
}

export class Meter {
  record(_record: MeterRecord): void {
    // No-op until the Meter service exists.
  }
}
