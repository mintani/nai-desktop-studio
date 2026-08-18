import {
  ZIP_CENTRAL_DIRECTORY_SIGNATURE,
  ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE,
  ZIP_LOCAL_FILE_HEADER_SIGNATURE,
} from "./constants";
import type { GenerateImageBody } from "./schemas";

/** Detect a ZIP response from the local file header or the content-type. */
export function isZipPayload(bytes: Uint8Array, contentType: string | null) {
  return (
    contentType?.includes("zip") === true ||
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      0,
      true
    ) === ZIP_LOCAL_FILE_HEADER_SIGNATURE
  );
}

function detectImageContentType(
  filename: string,
  fallbackFormat?: GenerateImageBody["image_format"]
) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png") || fallbackFormat === "png") return "image/png";
  if (lower.endsWith(".webp") || fallbackFormat === "webp") return "image/webp";
  return "application/octet-stream";
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.byteLength - 65_557);

  for (
    let offset = bytes.byteLength - 22;
    offset >= minimumOffset;
    offset -= 1
  ) {
    if (
      view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE
    ) {
      return offset;
    }
  }

  throw new Error("Invalid ZIP: end of central directory not found");
}

async function inflateRaw(data: Uint8Array) {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const stream = new Blob([copy])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).arrayBuffer();
}

/** A single decompressed ZIP entry. */
export type ZipEntry = {
  data: ArrayBuffer;
  filename: string;
  contentType: string;
};

/** One central-directory record, plus where the next record starts. */
type CentralDirectoryRecord = {
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
  filename: string;
  nextOffset: number;
};

/**
 * Read one central-directory record. Variable-length filename/extra/comment
 * fields mean records are not fixed-size, so nextOffset is derived from their
 * lengths rather than assumed.
 */
function readCentralDirectoryRecord(
  view: DataView,
  bytes: Uint8Array,
  offset: number
): CentralDirectoryRecord {
  if (view.getUint32(offset, true) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
    throw new Error("Invalid ZIP: central directory header not found");
  }

  const filenameLength = view.getUint16(offset + 28, true);
  const extraLength = view.getUint16(offset + 30, true);
  const commentLength = view.getUint16(offset + 32, true);

  return {
    compressionMethod: view.getUint16(offset + 10, true),
    compressedSize: view.getUint32(offset + 20, true),
    localHeaderOffset: view.getUint32(offset + 42, true),
    filename: new TextDecoder().decode(
      bytes.slice(offset + 46, offset + 46 + filenameLength)
    ),
    nextOffset: offset + 46 + filenameLength + extraLength + commentLength,
  };
}

/** Decompress the file body a central-directory record points at. */
async function readRecordData(
  view: DataView,
  bytes: Uint8Array,
  record: CentralDirectoryRecord
): Promise<ArrayBuffer> {
  const { localHeaderOffset, compressedSize, compressionMethod } = record;

  if (
    view.getUint32(localHeaderOffset, true) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE
  ) {
    throw new Error("Invalid ZIP: local file header not found");
  }

  const localFilenameLength = view.getUint16(localHeaderOffset + 26, true);
  const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
  const dataStart =
    localHeaderOffset + 30 + localFilenameLength + localExtraLength;
  const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) {
    return compressedData.buffer.slice(
      compressedData.byteOffset,
      compressedData.byteOffset + compressedData.byteLength
    );
  }
  if (compressionMethod === 8) return inflateRaw(compressedData);
  throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
}

/**
 * NovelAI sometimes returns generated images as a ZIP. Extract just the first
 * file.
 *
 * Reads and decompresses only the first central-directory record. It does not
 * delegate to {@link extractAllFilesFromZip}, which would decompress every
 * entry just to return one and slow the single-image path down.
 */
export async function extractFirstFileFromZip(
  bytes: Uint8Array,
  fallbackFormat?: GenerateImageBody["image_format"]
): Promise<ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(bytes);
  const record = readCentralDirectoryRecord(
    view,
    bytes,
    view.getUint32(eocdOffset + 16, true)
  );

  return {
    data: await readRecordData(view, bytes, record),
    filename: record.filename,
    contentType: detectImageContentType(record.filename, fallbackFormat),
  };
}

/**
 * Extract every file from a NovelAI ZIP response, in central-directory order.
 * Used for batched (n_samples > 1) generation, where NovelAI packs all samples
 * into one ZIP.
 */
export async function extractAllFilesFromZip(
  bytes: Uint8Array,
  fallbackFormat?: GenerateImageBody["image_format"]
): Promise<ZipEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(bytes);
  const totalEntries = view.getUint16(eocdOffset + 10, true);

  const entries: ZipEntry[] = [];
  let offset = view.getUint32(eocdOffset + 16, true);
  for (let i = 0; i < totalEntries; i++) {
    const record = readCentralDirectoryRecord(view, bytes, offset);
    entries.push({
      data: await readRecordData(view, bytes, record),
      filename: record.filename,
      contentType: detectImageContentType(record.filename, fallbackFormat),
    });
    offset = record.nextOffset;
  }
  return entries;
}
