const MC = require("mcprotocol");

const config = {
  host: "192.168.151.27",
  port: 5012,
  ascii: false,
  octalInputOutput: true,
};

async function run() {
  const client = new MC();
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject("Timeout"), 5000);
      client.initiateConnection(config, (err) => {
        clearTimeout(t);
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("Connected.");

    // Try D100
    client.addItems("D100");
    await new Promise((resolve, reject) => {
      client.readAllItems((err, val) => {
        if (err) {
          console.log("Read D100 Failed:", err);
          resolve();
        } else {
          console.log("Read D100 Success:", val);
          resolve();
        }
      });
    });

    // Try D7000 again
    client.dropConnection(); // Reset
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject("Timeout"), 5000);
      client.initiateConnection(config, (err) => {
        clearTimeout(t);
        if (err) reject(err);
        else resolve();
      });
    });

    client.addItems("D7000");
    await new Promise((resolve, reject) => {
      client.readAllItems((err, val) => {
        if (err) {
          console.log("Read D7000 Failed:", err);
          resolve();
        } else {
          console.log("Read D7000 Success:", val);
          resolve();
        }
      });
    });
  } catch (e) {
    console.log("Error:", e);
  }
  process.exit(0);
}

run();
