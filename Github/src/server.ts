import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import {z} from "zod";

// Create a path to repo data
const REPO_PATH = "/home/blackrose/Code/MCP/Github/repo"

function defaultDestFrom(repoUrl: string) {
  const name = (repoUrl.split("/").pop() || "").replace(/\.git$/i, "");
  const dir = `${name}_${Date.now()}`;
  return path.join(REPO_PATH, dir);
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function checkPathExists(repoPath: string): boolean {
  try {
    const fullPath = path.resolve(repoPath);
    const stat = fs.statSync(fullPath);
    return stat.isDirectory();
  } catch (err) {
    return false;
  }
}

async function runGitCommand(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const git = spawn("git", args, { cwd });
    let output = "";
    let errorOutput = "";

    git.stdout.on("data", (d) => (output += d.toString()));
    git.stderr.on("data", (d) => (errorOutput += d.toString()));

    git.on("close", (code) => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(errorOutput || `git ${args.join(" ")} failed`));
    });

    git.on("error", reject);
  });
}

async function setupRepo(params: {
  repoPath: string;
  remoteUrl: string;
}) {

  if (!fs.existsSync(path.join(params.repoPath, ".git"))) {
    await runGitCommand(["init"], params.repoPath);
  }

  try {
    const remotes = await runGitCommand(["remote", "-v"], params.repoPath);
    if (!remotes.includes("origin")) {
      await runGitCommand(["remote", "add", "origin", params.remoteUrl], params.repoPath);
    }
  } catch (e) {
    console.error("Failed to check/add remote:", e);
  }
}

async function ensureGitConfig(repoPath: string) {
  await new Promise((resolve, reject) => {
    const git = spawn("git", ["config", "--get", "user.name"], { cwd: repoPath });
    let output = "";
    git.stdout.on("data", (d) => (output += d.toString().trim()));
    git.on("close", (code) => {
      if (code === 0 && output) {
        resolve(true);
      } else {
        const setName = spawn("git", ["config", "user.name", "BlackRose484"], { cwd: repoPath });
        setName.on("close", (c) => (c === 0 ? resolve(true) : reject(new Error("Failed to set user.name"))));
      }
    });
    git.on("error", reject);
  });

  await new Promise((resolve, reject) => {
    const git = spawn("git", ["config", "--get", "user.email"], { cwd: repoPath });
    let output = "";
    git.stdout.on("data", (d) => (output += d.toString().trim()));
    git.on("close", (code) => {
      if (code === 0 && output) {
        resolve(true); 
      } else {
        const setEmail = spawn("git", ["config", "user.email", "hungnbc2@gmail.com"], { cwd: repoPath });
        setEmail.on("close", (c) => (c === 0 ? resolve(true) : reject(new Error("Failed to set user.email"))));
      }
    });
    git.on("error", reject);
  });
}

const server = new McpServer({
  name: "github-clone-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
})

server.tool(
    "github_clone",
    "Clone one repo from github",
    {
        repo: z.string().min(1).max(100),
        branch: z.string().min(1).max(100).optional(),
    },
    async (params) => {
        try {
            const outDir = defaultDestFrom(params.repo);
            ensureDir(outDir);

            const args = ["clone"];
            if (params.branch) args.push("-b", params.branch);
            args.push(params.repo, outDir);

            await new Promise((resolve, reject) => {
            const git = spawn("git", args, { stdio: ["ignore", "pipe", "pipe"] });

            git.stdout.on("data", (d) => console.log(d.toString()));
            git.stderr.on("data", (d) => console.error(d.toString()));

            git.on("close", (code) => {
                if (code === 0) return resolve(code);
                reject(new Error(`git clone exited with code ${code}`));
            });
            git.on("error", reject);
            });

            let head = "";
            try {
                head = execSync(`git -C "${outDir}" rev-parse --short HEAD`).toString().trim();
            } catch (error) { 
                return {
                    content: [{ type: "text", text: `Failed to get git HEAD` }]
                };
            }

            return {
                content: [{ type: "text", text: `Clone complete to ${outDir}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Failed to clone repository: ${error}` }]
            };
        }
        
    }
)

server.tool(
  "github_search",
  "Search repositories on GitHub",
  {
    query: z.string().min(1).max(100),
    sort: z.enum(["stars", "forks", "updated"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    language: z.string().min(2).max(100).optional(),
    per_page: z.number().min(1).max(20).optional(),
  },
  async (params) => {
    try {
      const q = encodeURIComponent(params.query);
      const sort = params.sort || "stars";
      const order = params.order || "desc";
      const per_page = params.per_page || 5;
      const language = params.language ? `+language:${encodeURIComponent(params.language)}` : "";

      const url = `https://api.github.com/search/repositories?q=${q}${language}&sort=${sort}&order=${order}&per_page=${per_page}`;

      const res = await fetch(url, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "mcp-github-search",
        },
      });

      if (!res.ok) {
        return {
          content: [{ type: "text", text: `GitHub API error: ${res.status} ${res.statusText}` }],
        };
      }

      const data = await res.json();

      const results = data.items.map((repo: any) => ({
        name: repo.full_name,
        url: repo.html_url,
        stars: repo.stargazers_count,
        description: repo.description,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

server.tool(
  "github_create_repo",
  "Create a new GitHub repository and link local folder",
  {
    repoPath: z.string().min(1),
    repoName: z.string().min(1),
    description: z.string().optional(),
    private: z.boolean().default(false)
  },
  async (params) => {
    try {

      const token = process.env.GITHUB_TOKEN || "";
      if (!token) {
        return {
          content: [{ type: "text", text: "❌ Error: GITHUB_TOKEN is not set in environment." }]
        };
      }
      
      const res = await fetch("https://api.github.com/user/repos", {  
        method: "POST",
        headers: {
          "Authorization": `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          name: params.repoName,
          description: params.description || "",
          private: params.private,
        }),
      });

      if (!checkPathExists(params.repoPath)) {
        return {
          content: [{ type: "text", text: `❌ Path "${params.repoPath}" does not exist or is not a directory.` }]
        };
      }

      if (!res.ok) {
        const errText = await res.text();
        return { content: [{ type: "text", text: `Failed to create repo: ${errText}` }] };
      }

      const repoData = await res.json();
      const remoteUrl = repoData.ssh_url;

      await setupRepo({ repoPath: params.repoPath, remoteUrl });

      await fetch(`https://api.github.com/repos/${repoData.owner.login}/${repoData.name}/pages`, {
        method: "POST",
        headers: {
          "Authorization": `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          build_type: "workflow"
        }),
      });

      return {
        content: [{ type: "text", text: `✅ Repository created at ${remoteUrl} and linked with ${params.repoPath}` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

server.tool(
  "github_commit_code",
  "Commit local code changes to git repository",
  {
    repoPath: z.string().min(1),
    commit: z.string().optional(),
  },
  async (params) => {
    try {
      // Add all changes to staging
      await new Promise((resolve, reject) => {
        const git = spawn("git", ["add", "."], { cwd: params.repoPath });
        git.on("close", (code) => code === 0 ? resolve(true) : reject(new Error(`git add exited with ${code}`)));
        git.on("error", reject);
      });

      // Ensure git config is set
      await ensureGitConfig(params.repoPath);

      // Commit changes
      await new Promise((resolve, reject) => {
        const git = spawn("git", ["commit", "-m", params.commit || "Default commit"], { cwd: params.repoPath });
        git.on("close", (code) => {
          if (code === 0) return resolve(true);
          reject(new Error(`Nothing to commit exited with ${code}`));
        });
        git.on("error", reject);
      }).catch((err) => {
        if (err.message.includes("nothing to commit")) {
          return true;
        }
        throw err;
      });

      return {
        content: [{ type: "text", text: `✅ Code committed successfully with message: "${params.commit || "Default commit"}"` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

server.tool(
  "github_push_code",
  "Push committed code to GitHub repository",
  {
    repoPath: z.string().min(1),
    branch: z.string().default("main"),
  },
  async (params) => {
    try {
      // Set the branch to main (or specified branch)
      await new Promise((resolve, reject) => {
        const git = spawn("git", ["branch", "-M", params.branch], { cwd: params.repoPath });
        git.on("close", (code) => code === 0 ? resolve(true) : reject(new Error(`git branch exited with ${code}`)));
        git.on("error", reject);
      });

      // Push to remote repository
      await new Promise((resolve, reject) => {
        const git = spawn("git", ["push", "-u", "origin", params.branch], { cwd: params.repoPath });
        git.stdout.on("data", (d) => console.log(d.toString()));
        git.stderr.on("data", (d) => console.error(d.toString()));
        git.on("close", (code) => code === 0 ? resolve(true) : reject(new Error(`git push exited with ${code}`)));
        git.on("error", reject);
      });

      return {
        content: [{ type: "text", text: `✅ Code pushed to branch ${params.branch} successfully` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

server.prompt(
  "github search and clone",
  "Ask AI to search some repo and clone one",
  {
    query: z.string(),
    criteria: z.string(),
    language: z.string()
  },
  async ({ query, criteria, language }) => {
    return {
      messages: [
        {
        role: "assistant",
        content: {
          type: "text",
          text: `I want to search for repositories about ${query}, written in ${language}, sorted by ${criteria} in descending order, and after you clone it`,
        }}
      ]
    }
  }

)


server.prompt(
  "git.askRepoUrl",
  "Ask the user for a GitHub repo URL",
  {
    repoUrl: z.string(),
    branch: z.string().optional()
  },
  async ({ repoUrl, branch }) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `OK, will clone: ${repoUrl}${branch ? " (branch " + branch + ")" : ""}`,
          },
        },
      ],
    }
  }
);



async function main() {
    try {
    console.error("Starting MCP server...");

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("MCP server is running and waiting for requests...");
  } catch (err) {
    console.error("MCP server failed to start:", err);
    process.exit(1);
  }
}



main()