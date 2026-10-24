/**
 * Pending online challenges. The answer stays here, never on the badge, until the
 * player submits. Records expire on their own (DynamoDB TTL, 30 min).
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { randomBytes } from "node:crypto";

export const MAX_TRIES = 3;
export const TTL_SECONDS = 30 * 60;

export interface ChallengeRecord {
  id: string;
  answer: number;
  hint: string;
  explain: string;
  tries: number;
  /** Epoch seconds; DynamoDB deletes the item after this. */
  ttl: number;
}

export interface ChallengeStore {
  put(rec: ChallengeRecord): Promise<void>;
  get(id: string): Promise<ChallengeRecord | undefined>;
  /** Atomically add a try; returns the new count, or undefined if the record is gone. */
  addTry(id: string): Promise<number | undefined>;
  delete(id: string): Promise<void>;
}

/** 16 random bytes → 22-char base64url id (unguessable; matches AnswerRequest). */
export const newChallengeId = (): string => randomBytes(16).toString("base64url");

export class DynamoChallengeStore implements ChallengeStore {
  private readonly doc: DynamoDBDocumentClient;
  constructor(
    private readonly table: string,
    client = new DynamoDBClient({}),
  ) {
    this.doc = DynamoDBDocumentClient.from(client);
  }
  async put(rec: ChallengeRecord): Promise<void> {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: rec, ConditionExpression: "attribute_not_exists(id)" }));
  }
  async get(id: string): Promise<ChallengeRecord | undefined> {
    const r = await this.doc.send(new GetCommand({ TableName: this.table, Key: { id }, ConsistentRead: true }));
    const item = r.Item as ChallengeRecord | undefined;
    // TTL deletion is lazy; treat expired items as gone
    return item && item.ttl > Date.now() / 1000 ? item : undefined;
  }
  async addTry(id: string): Promise<number | undefined> {
    try {
      const r = await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { id },
          UpdateExpression: "ADD tries :one",
          ConditionExpression: "attribute_exists(id)",
          ExpressionAttributeValues: { ":one": 1 },
          ReturnValues: "UPDATED_NEW",
        }),
      );
      return r.Attributes?.tries as number | undefined;
    } catch (e) {
      if ((e as { name?: string }).name === "ConditionalCheckFailedException") return undefined;
      throw e;
    }
  }
  async delete(id: string): Promise<void> {
    await this.doc.send(new DeleteCommand({ TableName: this.table, Key: { id } }));
  }
}

/** In-memory store for tests and local runs. */
export class MemoryChallengeStore implements ChallengeStore {
  readonly items = new Map<string, ChallengeRecord>();
  constructor(private readonly now: () => number = () => Date.now() / 1000) {}
  async put(rec: ChallengeRecord): Promise<void> {
    if (this.items.has(rec.id)) throw new Error("exists");
    this.items.set(rec.id, { ...rec });
  }
  async get(id: string): Promise<ChallengeRecord | undefined> {
    const r = this.items.get(id);
    return r && r.ttl > this.now() ? { ...r } : undefined;
  }
  async addTry(id: string): Promise<number | undefined> {
    const r = this.items.get(id);
    if (!r) return undefined;
    r.tries++;
    return r.tries;
  }
  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
