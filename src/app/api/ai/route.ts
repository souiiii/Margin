import { randomUUID } from "node:crypto";
import { logAIFailure } from "@/lib/diagnostics";
import { z } from "zod";
import { guard, bodyJson } from "@/lib/security";
import { runTask, aiInput } from "@/lib/ai";
import { AppError, errorPayload } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const globalAI = globalThis as unknown as { marginAIRunning?: number };
export async function POST(request: Request) {
  const diagnosticId = randomUUID();
  let action = "request";
  try {
    guard(request);
    const input = aiInput.parse(await bodyJson(request));
    action = input.action;
    if ((globalAI.marginAIRunning || 0) >= 2)
      throw new AppError(
        "Two requests are already running. Let them finish first.",
        429,
        "busy",
      );
    globalAI.marginAIRunning = (globalAI.marginAIRunning || 0) + 1;
    const encoder = new TextEncoder();
    const abort = new AbortController();
    const signal = AbortSignal.any([request.signal, abort.signal]);
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          if (!signal.aborted)
            try {
              controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            } catch {
              abort.abort();
            }
        };
        const heartbeat = setInterval(() => send({ type: "heartbeat" }), 10000);
        try {
          send({ type: "status", message: "Preparing your lesson" });
          const result = await runTask(input, signal, send);
          send({ type: "done", result });
        } catch (e) {
          if (!signal.aborted) logAIFailure(e, action, diagnosticId);
          send({
            diagnosticId,
            type: "error",
            ...(e instanceof z.ZodError
              ? {
                  error: "Some request details are invalid.",
                  code: "validation",
                }
              : errorPayload(e)),
          });
        } finally {
          clearInterval(heartbeat);
          globalAI.marginAIRunning = Math.max(
            0,
            (globalAI.marginAIRunning || 1) - 1,
          );
          try {
            controller.close();
          } catch {}
        }
      },
      cancel() {
        abort.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    logAIFailure(e, action, diagnosticId);
    return Response.json(
      {
        diagnosticId,
        ...(e instanceof z.ZodError
          ? { error: "Some request details are invalid.", code: "validation" }
          : errorPayload(e)),
      },
      {
        status:
          e instanceof AppError
            ? e.status
            : e instanceof z.ZodError
              ? 400
              : 500,
      },
    );
  }
}
