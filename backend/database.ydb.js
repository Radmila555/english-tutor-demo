function requireEnv(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} is required for STORAGE_DRIVER=ydb`);
  }

  return value;
}

function createConnectionString() {
  if (process.env.YDB_CONNECTION_STRING) {
    return process.env.YDB_CONNECTION_STRING;
  }

  const endpoint = requireEnv("YDB_ENDPOINT").replace(/\/$/, "");
  const database = requireEnv("YDB_DATABASE");
  return `${endpoint}${database.startsWith("/") ? database : `/${database}`}`;
}

function generateYdbId() {
  const timestamp = BigInt(Date.now()) * 1000n;
  const random = BigInt(Math.floor(Math.random() * 1000));
  return timestamp + random;
}

function normalizeApplication(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    contact: row.contact,
    level: row.level,
    goal: row.goal,
    difficulty: row.difficulty,
    preferred_time: row.preferred_time,
    demo_consent: row.demo_consent ? 1 : 0,
    status: row.status,
    created_at: row.created_at,
  };
}

async function initDatabase() {
  const [{ Driver }, { ServiceAccountCredentialsProvider }, { query }] = await Promise.all([
    import("@ydbjs/core"),
    import("@ydbjs/auth-yandex-cloud"),
    import("@ydbjs/query"),
  ]);

  const connectionString = createConnectionString();
  const serviceAccountKeyFile =
    process.env.YDB_SERVICE_ACCOUNT_KEY_FILE ||
    process.env.YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS;

  if (!serviceAccountKeyFile) {
    throw new Error(
      "YDB_SERVICE_ACCOUNT_KEY_FILE or YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS is required for STORAGE_DRIVER=ydb"
    );
  }

  const driver = new Driver(connectionString, {
    credentialsProvider: ServiceAccountCredentialsProvider.fromFile(serviceAccountKeyFile),
  });

  await driver.ready();

  const sql = query(driver);

  await sql`
    CREATE TABLE IF NOT EXISTS applications (
      id Uint64 NOT NULL,
      name Utf8 NOT NULL,
      contact Utf8 NOT NULL,
      level Utf8 NOT NULL,
      goal Utf8 NOT NULL,
      difficulty Utf8 NOT NULL,
      preferred_time Utf8 NOT NULL,
      demo_consent Bool NOT NULL,
      status Utf8 NOT NULL,
      created_at Utf8 NOT NULL,
      PRIMARY KEY (id)
    )
  `;

  async function createApplication(application) {
    const id = generateYdbId();

    await sql`
      UPSERT INTO applications (
        id,
        name,
        contact,
        level,
        goal,
        difficulty,
        preferred_time,
        demo_consent,
        status,
        created_at
      )
      VALUES (
        ${id},
        ${application.name},
        ${application.contact},
        ${application.level},
        ${application.goal},
        ${application.difficulty},
        ${application.preferred_time},
        ${Boolean(application.demo_consent)},
        ${application.status},
        ${application.created_at}
      )
    `;

    return normalizeApplication({
      id,
      ...application,
      demo_consent: Boolean(application.demo_consent),
    });
  }

  async function getApplications() {
    const resultSets = await sql`
      SELECT
        id,
        name,
        contact,
        level,
        goal,
        difficulty,
        preferred_time,
        demo_consent,
        status,
        created_at
      FROM applications
      ORDER BY created_at DESC, id DESC
    `;

    return (resultSets[0] || []).map(normalizeApplication);
  }

  async function updateApplicationStatus(id, status) {
    const ydbId = BigInt(id);

    const existingResultSets = await sql`
      SELECT id
      FROM applications
      WHERE id = ${ydbId}
    `;

    if (!existingResultSets[0]?.length) {
      return null;
    }

    await sql`
      UPDATE applications
      SET status = ${status}
      WHERE id = ${ydbId}
    `;

    const resultSets = await sql`
      SELECT
        id,
        name,
        contact,
        level,
        goal,
        difficulty,
        preferred_time,
        demo_consent,
        status,
        created_at
      FROM applications
      WHERE id = ${ydbId}
    `;

    return normalizeApplication(resultSets[0]?.[0]);
  }

  return {
    connectionString,
    createApplication,
    getApplications,
    updateApplicationStatus,
  };
}

module.exports = {
  initDatabase,
};
