const net = require("net");

const HOST = "192.168.151.27";
const PORT = 5012;

// MC Protocol 3E Binary Batch Read Request (D7000, 1 word)
// Targeting: Network 1, Station 0, I/O 0x03FF
const buffer = Buffer.alloc(21);
let idx = 0;

// 1. Subheader (50 00)
buffer.writeUInt8(0x50, idx++);
buffer.writeUInt8(0x00, idx++);

// 2. Network No (01) - User Setting
buffer.writeUInt8(0x01, idx++);

// 3. PC No (Station) (00) - User Setting
buffer.writeUInt8(0x00, idx++);

// 4. Request Dest. Module I/O No (FF 03 -> 0x03FF) - User Setting
buffer.writeUInt8(0xff, idx++);
buffer.writeUInt8(0x03, idx++);

// 5. Request Dest. Module Station No (00)
buffer.writeUInt8(0x00, idx++);

// 6. Request Data Length (12 bytes: Timer(2) + Cmd(2) + Sub(2) + Dev(3) + DevCode(1) + Points(2))
// Fix: 2+2+2+3+1+2 = 12 (0x0C)
buffer.writeUInt16LE(12, idx);
idx += 2;

// 7. CPU Monitoring Timer (10 00 -> 4sec approx)
buffer.writeUInt16LE(0x0010, idx);
idx += 2;

// 8. Command (04 01 -> Batch Read)
buffer.writeUInt16LE(0x0401, idx);
idx += 2;

// 9. Subcommand (00 00 -> Word)
buffer.writeUInt16LE(0x0000, idx);
idx += 2;

// 10. Device Number (D7000 -> 0x1B58) - 3 Bytes Little Endian
// 58 1B 00
buffer.writeUInt8(0x58, idx++);
buffer.writeUInt8(0x1b, idx++);
buffer.writeUInt8(0x00, idx++);

// 11. Device Code (D Register -> A8)
buffer.writeUInt8(0xa8, idx++);

// 12. Number of Device Points (1)
buffer.writeUInt16LE(1, idx);
idx += 2;

console.log("Sending Raw Hex:", buffer.toString("hex").toUpperCase());

const client = new net.Socket();
client.connect(PORT, HOST, () => {
  console.log("Connected to PLC");
  client.write(buffer);
});

client.on("data", (data) => {
  console.log("Received:", data.toString("hex").toUpperCase());

  // Parse Response
  // D0 00 (Subheader) + Net + Stn + IO + Multi + Len + EndCode(2) + Data...
  if (data.length >= 11) {
    const endCode = data.readUInt16LE(9);
    console.log("End Code:", endCode.toString(16));
    if (endCode === 0) {
      console.log("Success! Data:", data.slice(11).toString("hex"));
    } else {
      console.log("PLC returned error:", endCode.toString(16));
      if (endCode === 0xc059 || endCode === 0x58)
        console.log(" -> Address Out of Range / Routing Error suspected");
    }
  }

  client.destroy();
});

client.on("error", (err) => {
  console.error("Socket Error:", err);
  client.destroy();
});

client.on("close", () => {
  console.log("Connection closed");
});
