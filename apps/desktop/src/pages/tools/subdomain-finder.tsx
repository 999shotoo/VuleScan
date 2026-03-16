import * as React from "react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"

const seedConsoleOutput = [
  "[11:34:33.523] Connecting to streamerFreebies.com...",
  "[11:34:33.643] Processing results...",
  "[11:34:33.764] Processing results...",
  "[11:34:34.003] Connecting to streamerFreebies.com...",
  "[11:34:34.006] Sending probe packet #472",
  "[11:34:34.248] Initializing module...",
  "[11:34:34.361] Processing results...",
  "[11:34:34.489] Handshake complete",
  "[11:34:35.271] Scan initiated - Module: VULN-SCAN | Target: StreamerFreebies.com",
  "[11:34:36.214] Checking CVE-2024-1067...",
  "[11:34:36.983] Testing XSS vector on /api/search",
  "[11:34:39.219] VULNERABLE: CVE-2024-9294 (CVSS: 7.3)",
]

const wordlists = ["common.txt", "top1m-subdomains.txt", "assetnote-subdomains.txt"]
const threadOptions = [25, 50, 100, 200]
const resolverPresets = [
  { name: "Google + Cloudflare", value: "8.8.8.8, 1.1.1.1" },
  { name: "Quad9", value: "9.9.9.9, 149.112.112.112" },
  { name: "OpenDNS", value: "208.67.222.222, 208.67.220.220" },
  { name: "Custom", value: "" },
]

const findings = [
  {
    severity: "Critical",
    title: "RCE via deserialization",
    port: "Port 8080",
    className: "text-destructive",
    detail: "Deserialization endpoint allows attacker-controlled payload execution.",
  },
  {
    severity: "High",
    title: "SQL Injection on /login",
    port: "Port 443",
    className: "text-amber-500",
    detail: "Input filtering can be bypassed with boolean-based payloads.",
  },
  {
    severity: "Medium",
    title: "Missing HSTS header",
    port: "Port 80",
    className: "text-blue-500",
    detail: "Strict-Transport-Security header is absent, allowing downgrade risk.",
  },
] as const

const getTimestamp = () => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  const ss = String(now.getSeconds()).padStart(2, "0")
  const ms = String(now.getMilliseconds()).padStart(3, "0")
  return `[${hh}:${mm}:${ss}.${ms}]`
}

export default function SubdomainFinderPage() {
  const [target, setTarget] = React.useState("StreamerFreebies.com")
  const [wordlist, setWordlist] = React.useState(wordlists[0])
  const [threads, setThreads] = React.useState(50)
  const [resolverPreset, setResolverPreset] = React.useState(resolverPresets[0].name)
  const [resolvers, setResolvers] = React.useState(resolverPresets[0].value)
  const [scanStatus, setScanStatus] = React.useState<"IDLE" | "RUNNING">("IDLE")
  const [consoleOutput, setConsoleOutput] = React.useState(seedConsoleOutput)
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = React.useState(false)
  const [isResolverDialogOpen, setIsResolverDialogOpen] = React.useState(false)
  const [resolverDraft, setResolverDraft] = React.useState(resolverPresets[0].value)
  const [selectedFinding, setSelectedFinding] = React.useState<(typeof findings)[number] | null>(null)

  const telemetry = React.useMemo(
    () => [
      ["PACKETS/S", scanStatus === "RUNNING" ? String(threads * 3) : "0"],
      ["THREADS", scanStatus === "RUNNING" ? String(threads) : "0"],
      ["LATENCY", scanStatus === "RUNNING" ? "14MS" : "0MS"],
      ["CPU", scanStatus === "RUNNING" ? "22%" : "3%"],
      ["MEMORY", scanStatus === "RUNNING" ? "26%" : "12%"],
      ["BANDWIDTH", scanStatus === "RUNNING" ? "1.4 MB/S" : "0.0 MB/S"],
    ],
    [scanStatus, threads]
  )

  const startScan = () => {
    const runLines = [
      `${getTimestamp()} Scan started by user`,
      `${getTimestamp()} Target set to ${target}`,
      `${getTimestamp()} Wordlist ${wordlist} with ${threads} threads`,
      `${getTimestamp()} Resolvers ${resolvers}`,
    ]
    setScanStatus("RUNNING")
    setConsoleOutput((prev) => [...runLines, ...prev])
    setIsExecuteDialogOpen(false)

    window.setTimeout(() => {
      setScanStatus("IDLE")
      setConsoleOutput((prev) => [`${getTimestamp()} Scan finished successfully`, ...prev])
    }, 2200)
  }

  const applyResolverPreset = (presetName: string) => {
    const preset = resolverPresets.find((entry) => entry.name === presetName)
    if (!preset) {
      return
    }
    setResolverPreset(preset.name)
    if (preset.name === "Custom") {
      setResolverDraft(resolvers)
      setIsResolverDialogOpen(true)
      return
    }
    setResolvers(preset.value)
  }

  return (
    <div className="h-full overflow-auto bg-background p-4 md:p-5">
      <div className="mx-auto h-full w-full max-w-350 rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="grid h-full min-h-190 grid-cols-1 xl:grid-cols-[1fr_280px]">
          <section className="flex min-h-0 flex-col border-b xl:border-b-0 xl:border-r">
            <div className="border-b px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-[0.08em]">SUBDOMAIN FINDER</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    DNS subdomain brute and passive enum
                  </p>
                </div>
                <Button className="h-8 rounded-sm px-5 text-xs tracking-[0.12em]" onClick={() => setIsExecuteDialogOpen(true)}>
                  EXECUTE
                </Button>
              </div>
            </div>

            <div className="border-b px-4 py-2.5">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                <div className="flex h-8 items-center gap-2 rounded-sm border bg-background px-2 text-sm">
                  <span className="text-muted-foreground">https://</span>
                  <Input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="h-6 border-0 bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button className="h-8 rounded-sm px-4 text-xs tracking-[0.12em]" onClick={() => setIsExecuteDialogOpen(true)}>
                  EXECUTE
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 border-b px-4 py-2.5 md:grid-cols-3">
              <div className="rounded-sm border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">WORDLIST</p>
                <select
                  value={wordlist}
                  onChange={(e) => setWordlist(e.target.value)}
                  className="mt-1 w-full bg-transparent text-sm font-medium text-foreground outline-none"
                >
                  {wordlists.map((file) => (
                    <option key={file} value={file} className="bg-background text-foreground">
                      {file}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-sm border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">RESOLVERS</p>
                <select
                  value={resolverPreset}
                  onChange={(e) => applyResolverPreset(e.target.value)}
                  className="mt-1 w-full bg-transparent text-sm font-medium text-foreground outline-none"
                >
                  {resolverPresets.map((preset) => (
                    <option key={preset.name} value={preset.name} className="bg-background text-foreground">
                      {preset.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 truncate text-xs text-muted-foreground">{resolvers}</p>
              </div>

              <div className="rounded-sm border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">THREADS</p>
                <select
                  value={threads}
                  onChange={(e) => setThreads(Number(e.target.value))}
                  className="mt-1 w-full bg-transparent text-sm font-medium text-foreground outline-none"
                >
                  {threadOptions.map((option) => (
                    <option key={option} value={option} className="bg-background text-foreground">
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">CONSOLE OUTPUT</p>
                <p className="text-[10px] text-muted-foreground">{scanStatus === "RUNNING" ? "LIVE" : "IDLE"}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-muted/20 px-4 py-3 font-mono text-xs leading-6 text-muted-foreground">
                {consoleOutput.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className={line.includes("VULNERABLE") ? "text-emerald-500" : line.includes("Scan initiated") ? "text-primary" : ""}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </section>

          <aside className="grid min-h-0 grid-cols-1 gap-3 overflow-auto p-3">
            <div className="rounded-sm border bg-background p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">TELEMETRY</p>
              <p className="text-xs text-muted-foreground">PERFORMANCE</p>
              <div className="mt-2 space-y-1.5 rounded-sm border bg-muted/10 p-2.5 text-xs">
                {telemetry.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-sm border bg-background p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SCAN STATUS</p>
              <div className="rounded-sm border bg-muted/10 px-2.5 py-2 text-sm">{scanStatus}</div>
            </div>

            <div className="rounded-sm border bg-background p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">VULNERABILITIES</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between"><span className="text-destructive">Critical</span><span className="text-destructive">3</span></div>
                <div className="flex items-center justify-between"><span className="text-amber-500">High</span><span className="text-amber-500">7</span></div>
                <div className="flex items-center justify-between"><span className="text-blue-500">Medium</span><span className="text-blue-500">12</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Low</span><span className="text-muted-foreground">23</span></div>
              </div>
            </div>

            <div className="min-h-0 rounded-sm border bg-background p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">RECENT FINDINGS</p>
              <div className="space-y-2 text-xs">
                {findings.map((finding) => (
                  <button
                    key={finding.title}
                    className="w-full rounded-sm border bg-muted/10 p-2.5 text-left transition-colors hover:bg-muted/20"
                    onClick={() => setSelectedFinding(finding)}
                  >
                    <p className={finding.className}>{finding.severity}</p>
                    <p className="mt-1 text-sm text-foreground">{finding.title}</p>
                    <p className="mt-1 text-muted-foreground">{finding.port}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={isExecuteDialogOpen} onOpenChange={setIsExecuteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start scan?</DialogTitle>
            <DialogDescription>
              Confirm scan configuration before running Subdomain Finder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 rounded-md border bg-muted/20 p-3 text-sm">
            <p><span className="text-muted-foreground">Target:</span> {target || "(empty)"}</p>
            <p><span className="text-muted-foreground">Wordlist:</span> {wordlist}</p>
            <p><span className="text-muted-foreground">Threads:</span> {threads}</p>
            <p><span className="text-muted-foreground">Resolvers:</span> {resolvers}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExecuteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startScan} disabled={!target.trim()}>
              Start Scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResolverDialogOpen} onOpenChange={setIsResolverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom resolvers</DialogTitle>
            <DialogDescription>
              Add comma-separated DNS resolvers, e.g. 8.8.8.8, 1.1.1.1
            </DialogDescription>
          </DialogHeader>
          <Input value={resolverDraft} onChange={(e) => setResolverDraft(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolverDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const next = resolverDraft.trim()
                if (!next) {
                  return
                }
                setResolverPreset("Custom")
                setResolvers(next)
                setIsResolverDialogOpen(false)
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedFinding)} onOpenChange={(open) => !open && setSelectedFinding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedFinding?.title}</DialogTitle>
            <DialogDescription>
              {selectedFinding?.severity} severity finding at {selectedFinding?.port}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{selectedFinding?.detail}</p>
          <DialogFooter>
            <Button onClick={() => setSelectedFinding(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
