import { readFile } from "fs/promises";

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
    error: {
      code,
      message,
      details,
    },
  };
}

async function loadWordlist(path: string): Promise<string[] | AppError> {
  try {
    const content = await readFile(path, "utf8");
    return content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (err) {
    return formatError(
      "Failed to read wordlist file",
      "WORDLIST_READ_ERROR",
      err
    );
  }
}

async function checkSubdomain(
  domain: string,
  sub: string
): Promise<{ found: boolean; status?: number }> {
  const url = `https://${sub}.${domain}`;

  try {
    const res = await fetch(url, { method: "GET" });
    return {
      found: res.status >= 200 && res.status < 400,
      status: res.status,
    };
  } catch {
    return { found: false };
  }
}

async function run() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      JSON.stringify(
        formatError(
          "Usage: subdomain-finder <domain> <wordlist.txt>",
          "INVALID_ARGUMENTS"
        ),
        null,
        2
      )
    );
    process.exit(1);
  }

  const domain = args[0];
  const wordlistPath = args[1];

  const wordlist = await loadWordlist(wordlistPath);

  if ("error" in wordlist) {
    console.error(JSON.stringify(wordlist, null, 2));
    process.exit(1);
  }

  const found: string[] = [];
  let tested = 0;

  console.log(`\nTarget domain: ${domain}`);
  console.log(`Total subdomains: ${wordlist.length}\n`);

  for (const sub of wordlist) {
    tested++;
    process.stdout.write(
      `[${tested}/${wordlist.length}] Testing ${sub}.${domain} ... `
    );

    const result = await checkSubdomain(domain, sub);

    if (result.found) {
      const full = `${sub}.${domain}`;
      found.push(full);
      console.log(`FOUND (${result.status})`);
    } else {
      console.log(`NOT FOUND${result.status ? ` (${result.status})` : ""}`);
    }
  }

  console.log("\n===== Scan Complete =====");
  console.log(
    JSON.stringify(
      {
        success: true,
        domain,
        tested,
        foundCount: found.length,
        found,
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
