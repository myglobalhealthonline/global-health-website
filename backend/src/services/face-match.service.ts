import {
  CompareFacesCommand,
  RekognitionClient,
  type CompareFacesCommandOutput,
} from "@aws-sdk/client-rekognition";
import { env } from "../config/env.js";
import { getObject, readObjectBodyToBuffer } from "./object-storage.js";

/**
 * Face match between a patient's live selfie and the photo printed on their
 * government ID, for the Ireland controlled-medication identity check.
 *
 * The score is an ASSIST, never a decision. A human (doctor or admin) always
 * makes the final Verified/Rejected call — see identity-verification.service.
 * Prescribing a controlled medication on the word of a similarity number
 * nobody looked at is exactly the failure mode this workflow exists to stop.
 *
 * Data protection:
 *  - `CompareFaces` is stateless. We never create a Rekognition face
 *    collection, so AWS keeps no face template of our patients between calls.
 *  - Images are passed as bytes from our own private bucket, so the ID/selfie
 *    objects are never exposed through a public URL to reach the API.
 *  - Region is pinned by config; point it at an EU region.
 *  - The raw response is retained only to explain a decision after the fact;
 *    it holds bounding boxes and confidences, not an identity.
 */

let client: RekognitionClient | null = null;

export type FaceMatchResult = {
  /** Similarity 0-100. Null when the provider ran but found no comparable face. */
  score: number | null;
  provider: string;
  raw: Record<string, unknown>;
  ranAt: Date;
};

export function isFaceMatchConfigured(): boolean {
  return Boolean(
    env.REKOGNITION_REGION &&
      env.REKOGNITION_ACCESS_KEY_ID &&
      env.REKOGNITION_SECRET_ACCESS_KEY,
  );
}

function getClient(): RekognitionClient {
  if (!isFaceMatchConfigured()) {
    throw new Error("Rekognition is not configured");
  }
  if (!client) {
    client = new RekognitionClient({
      region: env.REKOGNITION_REGION!,
      credentials: {
        accessKeyId: env.REKOGNITION_ACCESS_KEY_ID!,
        secretAccessKey: env.REKOGNITION_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

async function loadImageBytes(storageKey: string): Promise<Buffer | null> {
  const obj = await getObject(storageKey);
  return readObjectBodyToBuffer(obj.Body);
}

/**
 * Compare the selfie against the ID photo.
 *
 * Returns null when no automated opinion could be formed — provider
 * unconfigured, a PDF-scanned ID Rekognition cannot read, or an API failure.
 * Callers treat null as "human review only", never as a rejection: a patient
 * must not fail identity verification because our vendor had an outage.
 */
export async function compareSelfieToIdDocument(input: {
  selfieKey: string;
  idDocumentKey: string;
}): Promise<FaceMatchResult | null> {
  if (!isFaceMatchConfigured()) return null;

  try {
    const [selfieBytes, idBytes] = await Promise.all([
      loadImageBytes(input.selfieKey),
      loadImageBytes(input.idDocumentKey),
    ]);
    if (!selfieBytes?.length || !idBytes?.length) return null;

    const out: CompareFacesCommandOutput = await getClient().send(
      new CompareFacesCommand({
        SourceImage: { Bytes: selfieBytes },
        TargetImage: { Bytes: idBytes },
        SimilarityThreshold: env.REKOGNITION_MIN_SIMILARITY,
      }),
    );

    // Highest-similarity match wins: an ID card photographed in hand can put a
    // second face in frame, and CompareFaces returns one entry per target face.
    const best = (out.FaceMatches ?? []).reduce<number | null>((acc, m) => {
      const s = m.Similarity ?? null;
      if (s === null) return acc;
      return acc === null || s > acc ? s : acc;
    }, null);

    return {
      score: best,
      provider: "aws_rekognition",
      raw: {
        similarityThreshold: env.REKOGNITION_MIN_SIMILARITY,
        matchCount: out.FaceMatches?.length ?? 0,
        unmatchedFaceCount: out.UnmatchedFaces?.length ?? 0,
        matches: (out.FaceMatches ?? []).map((m) => ({
          similarity: m.Similarity ?? null,
          confidence: m.Face?.Confidence ?? null,
        })),
      },
      ranAt: new Date(),
    };
  } catch (err) {
    // Never surfaced to the patient as a failure — the submission still lands
    // in the review queue, just without a score to help the reviewer.
    console.warn("[face-match] CompareFaces failed; falling back to human review", {
      err: err instanceof Error ? err.message : err,
    });
    return null;
  }
}
