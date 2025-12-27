#!/usr/bin/env node

import net from "net";

interface AppError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function formatError(
  message: string,
  code = "UNKNOWN_ERROR",
  details?: unknown
): AppError {
  return {
    success: false,
    error: { code, message, details },
  };
}

function scanPort(
  host: string,
  port: number,
  timeout = 1500
): Promise<{ port: number; open: boolean }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let open = false;

    socket.setTimeout(timeout);

    socket.once("connect", () => {
      open = true;
      socket.destroy();
    });

    socket.once("timeout", () => socket.destroy());
    socket.once("error", () => {});
    socket.once("close", () => resolve({ port, open }));

    socket.connect(port, host);
  });
}

async function run() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error(
      JSON.stringify(
        formatError(
          "Usage: network-scan <host> <startPort> <endPort>",
          "INVALID_ARGUMENTS"
        ),
        null,
        2
      )
    );
    process.exit(1);
  }

  const host = args[0];
  const startPort = parseInt(args[1], 10);
  const endPort = parseInt(args[2], 10);

  if (isNaN(startPort) || isNaN(endPort)) {
    console.error(
      JSON.stringify(
        formatError("Ports must be numbers", "INVALID_PORTS"),
        null,
        2
      )
    );
    process.exit(1);
  }

  const openPorts: number[] = [];
  const total = endPort - startPort + 1;
  let scanned = 0;

  console.log(`\nTarget: ${host}`);
  console.log(`Scanning ports ${startPort} → ${endPort}\n`);

  for (let port = startPort; port <= endPort; port++) {
    scanned++;
    process.stdout.write(`[${scanned}/${total}] Scanning port ${port} ... `);

    const result = await scanPort(host, port);

    if (result.open) {
      openPorts.push(port);
      console.log("OPEN");
    } else {
      console.log("CLOSED");
    }
  }

  console.log("\n===== Scan Complete =====");
  console.log(
    JSON.stringify(
      {
        success: true,
        target: host,
        scannedPorts: total,
        openPortsCount: openPorts.length,
        openPorts,
      },
      null,
      2
    )
  );
}

run().catch((err) => {
  console.error(
    JSON.stringify(
      formatError(
        "Unhandled application error",
        "UNHANDLED_ERROR",
        err
      ),
      null,
      2
    )
  );
  process.exit(1);
});
