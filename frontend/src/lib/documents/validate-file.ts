import { DOCUMENT_UPLOAD } from "./constants";

export type FileValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateDocumentFile(file: File): FileValidationResult {
  const name = file.name.toLowerCase();
  const extOk = DOCUMENT_UPLOAD.extensions.some((ext) => name.endsWith(ext));
  const mimeOk =
    file.type === "" ||
    (DOCUMENT_UPLOAD.mimeTypes as readonly string[]).includes(file.type);

  if (!extOk && !mimeOk) {
    return {
      ok: false,
      message: `Choose a ${DOCUMENT_UPLOAD.humanLabel} file.`,
    };
  }

  if (file.size > DOCUMENT_UPLOAD.maxBytes) {
    return {
      ok: false,
      message: `File must be ${DOCUMENT_UPLOAD.maxBytes / (1024 * 1024)} MB or smaller.`,
    };
  }

  if (file.size === 0) {
    return { ok: false, message: "File is empty." };
  }

  return { ok: true };
}
