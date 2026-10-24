import { expect } from "@playwright/test";
import { Pool, type PoolClient } from "pg";

/** Holds the move lock until both browser requests are waiting in PostgreSQL. */
export class SubjectMoveLock {
  private released = false;

  private constructor(
    private readonly pool: Pool,
    private readonly client: PoolClient,
    private readonly backendPid: number,
  ) {}

  static async acquire(userId: string): Promise<SubjectMoveLock> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ pid: number }>(
        "SELECT pg_backend_pid() AS pid, pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`subject-move:${userId}`],
      );
      return new SubjectMoveLock(pool, client, result.rows[0].pid);
    } catch (error) {
      client.release(true);
      await pool.end();
      throw error;
    }
  }

  async waitForMoves(expected: number): Promise<void> {
    await expect
      .poll(async () => {
        const result = await this.pool.query<{ count: string }>(
          `SELECT count(*) FROM pg_locks waiting
         JOIN pg_locks held ON waiting.locktype = held.locktype
           AND waiting.database = held.database
           AND waiting.classid = held.classid AND waiting.objid = held.objid
           AND waiting.objsubid = held.objsubid
         WHERE held.pid = $1 AND held.locktype = 'advisory'
           AND held.granted AND NOT waiting.granted`,
          [this.backendPid],
        );
        return Number(result.rows[0].count);
      })
      .toBe(expected);
  }

  async release(): Promise<void> {
    if (this.released) return;
    this.released = true;
    try {
      await this.client.query("ROLLBACK");
    } finally {
      this.client.release();
      await this.pool.end();
    }
  }
}
