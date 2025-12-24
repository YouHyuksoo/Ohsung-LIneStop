const MC = require("mcprotocol");

const config = {
  host: "192.168.151.27",
  port: 5012,
  ascii: false,
  octalInputOutput: true,
};

async function testCurrentAddress() {
  console.log(
    `[TEST] Connecting to ${config.host}:${config.port} (ASCII: ${config.ascii})...`
  );

  const client = new MC();

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject("Connection Timeout"), 5000);
      client.initiateConnection(config, (err) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("[TEST] Connection established!");

    // Try Requesting D7000
    console.log("[TEST] Reading D7000...");
    client.addItems("D7000");
    await new Promise((resolve, reject) => {
      client.readAllItems((err, values) => {
        if (err) {
          console.error("[TEST] Read Error:", err);
          // The error object might differ, let's print it fully
          // resolve(); // Continue to next test
          reject(err);
        } else {
          console.log("[TEST] Read Success:", values);
          resolve();
        }
      });
    });
  } catch (e) {
    console.error("[TEST] Failed:", e);
  } finally {
    client.dropConnection();
  }
}

async function testDoubleWord() {
  console.log(`[TEST] Double Word Test (D7000, 2 words)...`);
  const client = new MC();
  try {
    await new Promise((resolve, reject) => {
      client.initiateConnection(config, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Some mcprotocol implementations support 'D7000,2' or similar for array read
    // Or we add two items?
    // Let's try to infer if the library supports multiple items
    console.log("[TEST] Reading D7000 and D7001...");
    client.addItems("D7000");
    client.addItems("D7001");

    await new Promise((resolve, reject) => {
      client.readAllItems((err, values) => {
        if (err) console.error("[TEST] Read Error:", err);
        else console.log("[TEST] Read Success:", values);
        resolve();
      });
    });
  } catch (e) {
    console.error("[TEST] Failed:", e);
  } finally {
    client.dropConnection();
  }
}

(async () => {
  await testCurrentAddress();
  console.log("---");
  // await testDoubleWord();
})();
