const sqliteStorage = require("./database.sqlite");

const drivers = {
  sqlite: sqliteStorage,
  ydb: null,
};

function getStorageDriverName() {
  return String(process.env.STORAGE_DRIVER || "sqlite").trim().toLowerCase();
}

async function initDatabase() {
  const driverName = getStorageDriverName();

  if (driverName === "ydb") {
    drivers.ydb = drivers.ydb || require("./database.ydb");
  }

  const driver = drivers[driverName];

  if (!driver) {
    throw new Error(`Unsupported STORAGE_DRIVER: ${driverName}`);
  }

  const storage = await driver.initDatabase();

  return {
    ...storage,
    driverName,
  };
}

module.exports = {
  initDatabase,
};
