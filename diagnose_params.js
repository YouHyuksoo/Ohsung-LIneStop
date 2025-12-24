const net = require("net");

const HOST = "192.168.151.27";
const PORT = 5012;

function createPacket(network, station, address) {
  const buffer = Buffer.alloc(21);
  let idx = 0;

  // Subheader (50 00)
  buffer.writeUInt8(0x50, idx++);
  buffer.writeUInt8(0x00, idx++);

  // Network No
  buffer.writeUInt8(network, idx++);

  // PC No (Station)
  buffer.writeUInt8(station, idx++);

  // Request Dest. Module I/O No (0x03FF)
  buffer.writeUInt8(0xff, idx++);
  buffer.writeUInt8(0x03, idx++);

  // Request Dest. Module Station No (00)
  buffer.writeUInt8(0x00, idx++);

  // Request Data Length (12)
  buffer.writeUInt16LE(12, idx);
  idx += 2;

  // CPU Monitoring Timer (10 00)
  buffer.writeUInt16LE(0x0010, idx);
  idx += 2;

  // Command (04 01 -> Batch Read)
  buffer.writeUInt16LE(0x0401, idx);
  idx += 2;

  // Subcommand (00 00 -> Word)
  buffer.writeUInt16LE(0x0000, idx);
  idx += 2;

  // Device Number (D7000 -> 0x1B58)
  // 58 1B 00
  // Address logic: D7000
  // We can parameterize this if needed, but fixed for now
  buffer.writeUInt8(0x58, idx++);
  buffer.writeUInt8(0x1b, idx++);
  buffer.writeUInt8(0x00, idx++);

  // Device Code (D Register -> A8)
  buffer.writeUInt8(0xa8, idx++);

  // Number of Device Points (1)
  buffer.writeUInt16LE(1, idx);
  idx += 2;

  return buffer;
}

// Param sets to test: [Network, Station, Description]
const testSets = [
  [0x00, 0xff, "Default (Net:0, Stn:255)"],
  [0x01, 0x00, "Screenshot (Net:1, Stn:0)"],
  [0x01, 0xff, "Mix 1 (Net:1, Stn:255)"],
  [0x00, 0x00, "Mix 2 (Net:0, Stn:0)"],
  [0x01, 1, "Direct (Net:1, Stn:1)"],
];

async function testConnection(network, station, desc) {
  return new Promise((resolve) => {
    console.log(`Testing ${desc}...`);
    const client = new net.Socket();

    let success = false;

    const timeout = setTimeout(() => {
      console.log(` -> Timeout`);
      client.destroy();
      resolve(false);
    }, 2000);

    client.connect(PORT, HOST, () => {
      client.write(createPacket(network, station));
    });

    client.on("data", (data) => {
      clearTimeout(timeout);
      if (data.length >= 11) {
        const endCode = data.readUInt16LE(9);
        if (endCode === 0) {
          console.log(` -> SUCCESS! Data: ${data.slice(11).toString("hex")}`);
          success = true;
        } else {
          console.log(` -> Error Code: ${endCode.toString(16)}`);
        }
      } else {
        console.log(` -> Invalid Response Length: ${data.length}`);
      }
      client.destroy();
      resolve(success);
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.log(` -> Socket Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function run() {
  for (const set of testSets) {
    const result = await testConnection(set[0], set[1], set[2]);
    if (result) {
      console.log("--- FOUND WORKING CONFIG ---");
      console.log(`Network: ${set[0]}, Station: ${set[1]}`);

      // Generate modify suggestion
      console.log("SUGGESTION: Need to pass these params to mcprotocol.");
      break;
    }
  }
  process.exit(0);
}

run();
