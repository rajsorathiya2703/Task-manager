import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

// ---------------------------------------------------------------------------
// PolicyDocument — top-level collection ("policy_documents")
// ---------------------------------------------------------------------------

export type PolicyDocumentDoc = PolicyDocument & Document;

/**
 * An immutable compiled snapshot of the current access-control rules.
 *
 * On every Role save the policy compiler:
 *   1. Reads all active Role documents.
 *   2. Serialises them into `roles` (denormalised).
 *   3. Computes a SHA-256 `hash` of the serialised payload.
 *   4. Inserts a new PolicyDocument with an incremented `version`.
 *
 * API requests load the latest document (by version desc) and cache it
 * in memory with a short TTL (~30 s). When `version` increments the cache
 * is invalidated automatically.
 *
 * This matches §5.1 › policy_documents and §5.3 in the access-control plan.
 */
@Schema({ timestamps: false, collection: 'policy_documents' })
export class PolicyDocument {
  /**
   * Monotonically increasing integer. Bumped on every role change.
   * Clients compare their cached version to detect staleness.
   */
  @Prop({ required: true, type: Number })
  version: number;

  /** UTC timestamp when this document was compiled. */
  @Prop({ required: true, type: Date })
  compiledAt: Date;

  /**
   * SHA-256 hex digest of the serialised `roles` array.
   * Used for quick equality checks without reading the full payload.
   */
  @Prop({ required: true, type: String })
  hash: string;

  /**
   * Denormalised snapshot of all Role documents at compile time.
   * Typed as Mixed so the policy compiler can embed the full Role shape
   * (including moduleGrants / fieldGrants) without creating a circular
   * dependency between role.schema.ts and this file.
   *
   * The PDP reads only this array — never the live `roles` collection —
   * ensuring a consistent view within a single compiled version.
   */
  @Prop({ type: [MongooseSchema.Types.Mixed], required: true })
  roles: Record<string, unknown>[];

  /**
   * Module catalog snapshot: the list of modules registered in the
   * application at compile time (module id, label, actions, fields).
   * Populated by the policy compiler from `access/catalog.ts`.
   */
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  moduleCatalog: Record<string, unknown>[];

  /**
   * Field catalog snapshot: the list of fields per module registered
   * at compile time, used by the role editor and the PDP field-invariant check.
   */
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  fieldCatalog: Record<string, unknown>[];
}

export const PolicyDocumentSchema =
  SchemaFactory.createForClass(PolicyDocument);

// Always query the latest compiled policy by descending version.
PolicyDocumentSchema.index({ version: -1 });
