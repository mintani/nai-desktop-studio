function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseSseChunk(chunk: string) {
  const lines = chunk
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);
  if (lines.length === 0) return null;

  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  return { event, raw: dataLines.join("\n") };
}

/** Read an SSE stream one message (event + data) at a time. */
export async function* iterateSseMessages(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const parsed = parseSseChunk(chunk);
      if (parsed) yield parsed;
    }
  }

  buffer += decoder.decode();
  for (const chunk of buffer.split(/\r?\n\r?\n/)) {
    const parsed = parseSseChunk(chunk);
    if (parsed) yield parsed;
  }
}

/** A single frame of the NovelAI generation stream. */
export type StreamFrame = {
  /** The SSE event name. */
  event: string;
  /** The kind NovelAI attaches: intermediate / final. May be absent. */
  eventType?: string;
  /** Frame image (base64). When present, an intermediate or final image. */
  image?: string;
  /** The parsed raw payload. */
  payload: unknown;
};

/** Read the generation stream normalized into {@link StreamFrame} units. */
export async function* iterateStreamFrames(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<StreamFrame> {
  for await (const message of iterateSseMessages(stream)) {
    const payload = tryParseJson(message.raw);

    let eventType: string | undefined;
    let image: string | undefined;
    if (payload && typeof payload === "object") {
      if (
        "event_type" in payload &&
        typeof (payload as { event_type: unknown }).event_type === "string"
      ) {
        eventType = (payload as { event_type: string }).event_type;
      }
      if (
        "image" in payload &&
        typeof (payload as { image: unknown }).image === "string"
      ) {
        image = (payload as { image: string }).image;
      }
    }

    yield { event: message.event, eventType, image, payload };
  }
}

/** Build one SSE message string (event + data + blank line). */
export function encodeSseMessage(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
