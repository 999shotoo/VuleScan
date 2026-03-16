import { Button } from "../components/ui/button"

const tools = [
  {
    name: "Subdomain Finder",
    route: "/tools/subdomain-finder",
    description: "DNS subdomain brute force and passive enumeration console.",
    status: "Ready",
  },
  {
    name: "Network Scan",
    route: "/chat",
    description: "Host and service discovery workflow from the chat modules.",
    status: "Ready",
  },
  {
    name: "Directory Search",
    route: "/chat",
    description: "Directory and endpoint enumeration for web attack surface mapping.",
    status: "Ready",
  },
  {
    name: "Encryption Analyzer",
    route: "/chat",
    description: "Inspect encryption choices and flag insecure implementations.",
    status: "Ready",
  },
]

function Home() {
  return (
    <div className="h-full overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Tools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a security module to run.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <article key={tool.name} className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-base font-medium">{tool.name}</h2>
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{tool.status}</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{tool.description}</p>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.hash = tool.route
                }}
              >
                Open Tool
              </Button>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
