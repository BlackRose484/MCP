import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios, { AxiosInstance } from "axios";
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import FormData from "form-data";

// Load environment variables
config();

// Atlassian Configuration
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || "";
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || "";
const ATLASSIAN_BASE_URL = process.env.ATLASSIAN_BASE_URL || "";
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "";
const CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || "";

// Create Axios instance for Atlassian API
const atlassianAPI: AxiosInstance = axios.create({
  baseURL: ATLASSIAN_BASE_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64')}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Create MCP Server
const server = new McpServer({
  name: "atlassian-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

// =================
// JIRA INTEGRATION
// =================

server.tool(
  "jira_test_connection",
  "Test Jira connection and get project info",
  {
    projectKey: z.string().optional(),
  },
  async (params) => {
    try {
      const projectKey = params.projectKey || JIRA_PROJECT_KEY;
      
      // Test basic authentication
      const myselfResponse = await atlassianAPI.get('/rest/api/3/myself');
      
      // Get project info
      const projectResponse = await atlassianAPI.get(`/rest/api/3/project/${projectKey}`);
      
      // Get issue types
      const issueTypesResponse = await atlassianAPI.get(`/rest/api/3/issue/createmeta`, {
        params: { projectKeys: projectKey, expand: 'projects.issuetypes.fields' }
      });
      
      // Get priorities
      const prioritiesResponse = await atlassianAPI.get('/rest/api/3/priority');
      
      const result = {
        user: {
          accountId: myselfResponse.data.accountId,
          emailAddress: myselfResponse.data.emailAddress,
          displayName: myselfResponse.data.displayName
        },
        project: {
          key: projectResponse.data.key,
          name: projectResponse.data.name,
          projectTypeKey: projectResponse.data.projectTypeKey,
          url: `${ATLASSIAN_BASE_URL}/browse/${projectResponse.data.key}`
        },
        issueTypes: issueTypesResponse.data.projects[0]?.issuetypes.map((type: any) => ({
          id: type.id,
          name: type.name,
          description: type.description
        })) || [],
        priorities: prioritiesResponse.data.map((priority: any) => ({
          id: priority.id,
          name: priority.name
        }))
      };
      
      return {
        content: [{ 
          type: "text", 
          text: `✅ Jira connection successful!\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.errors || error.response?.data?.errorMessages || error.message;
      
      return {
        content: [{ 
          type: "text", 
          text: `❌ Jira connection failed:\nStatus: ${error.response?.status}\nError: ${JSON.stringify(errorMsg, null, 2)}` 
        }]
      };
    }
  }
);

// Helper function to get project metadata
async function getProjectMetadata(projectKey: string) {
  try {
    const response = await atlassianAPI.get(`/rest/api/3/project/${projectKey}`);
    return response.data;
  } catch (error) {
    throw new Error(`Project ${projectKey} not found or not accessible`);
  }
}

// Helper function to get issue types for project
async function getIssueTypes(projectKey: string) {
  try {
    const response = await atlassianAPI.get(`/rest/api/3/issue/createmeta`, {
      params: { projectKeys: projectKey, expand: 'projects.issuetypes' }
    });
    return response.data.projects[0]?.issuetypes || [];
  } catch (error) {
    return [];
  }
}

// Helper function to wrap markdown content in Confluence Markdown Macro
function wrapInConfluenceMarkdownMacro(markdownContent: string): string {
  // Using the standard Confluence markdown macro format
  // This works with the Confluence Markdown Macro plugin
  return `<ac:structured-macro ac:name="markdown">
  <ac:plain-text-body><![CDATA[${markdownContent}]]></ac:plain-text-body>
</ac:structured-macro>`;
}

// Alternative macro wrapper for different plugin variants
function wrapInMarkdownPlugin(markdownContent: string, macroName: string = "markdown"): string {
  return `<ac:structured-macro ac:name="${macroName}">
  <ac:plain-text-body><![CDATA[${markdownContent}]]></ac:plain-text-body>
</ac:structured-macro>`;
}

// Helper function to escape HTML entities for ADF format
function escapeForADF(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Helper function to wrap PlantUML content in Confluence ADF Extension format
function wrapInPlantUMLMacro(plantUMLContent: string): string {
  // Using the "PlantUML for Confluence" Forge app ADF extension format
  // Plugin uses Atlassian Document Format with extension-key from Forge
  // Reference: https://marketplace.atlassian.com/apps/1230800/plantuml-macro-for-confluence
  const escapedContent = escapeForADF(plantUMLContent);
  const localId = `plantuml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return `<ac:adf-extension>
<ac:adf-node type="extension">
<ac:adf-attribute key="extension-key">f46085f3-e7c3-4cb5-ba7a-99a19de6e28c/31e52f94-5266-4b1d-a7c8-cef0486bc2e7/static/plantuml-for-confluence</ac:adf-attribute>
<ac:adf-attribute key="extension-type">com.atlassian.ecosystem</ac:adf-attribute>
<ac:adf-attribute key="parameters">
<ac:adf-parameter key="local-id">${localId}</ac:adf-parameter>
<ac:adf-parameter key="extension-id">ari:cloud:ecosystem::extension/f46085f3-e7c3-4cb5-ba7a-99a19de6e28c/31e52f94-5266-4b1d-a7c8-cef0486bc2e7/static/plantuml-for-confluence</ac:adf-parameter>
<ac:adf-parameter key="extension-title">PlantUML for Confluence</ac:adf-parameter>
<ac:adf-parameter key="layout">extension</ac:adf-parameter>
<ac:adf-parameter key="forge-environment">PRODUCTION</ac:adf-parameter>
<ac:adf-parameter key="render">native</ac:adf-parameter>
<ac:adf-parameter key="guest-params">
<ac:adf-parameter key="text">${escapedContent}</ac:adf-parameter>
</ac:adf-parameter>
</ac:adf-attribute>
<ac:adf-attribute key="text">PlantUML for Confluence</ac:adf-attribute>
<ac:adf-attribute key="layout">default</ac:adf-attribute>
<ac:adf-attribute key="local-id">${localId}</ac:adf-attribute>
</ac:adf-node>
<ac:adf-fallback>
<ac:adf-node type="extension">
<ac:adf-attribute key="extension-key">f46085f3-e7c3-4cb5-ba7a-99a19de6e28c/31e52f94-5266-4b1d-a7c8-cef0486bc2e7/static/plantuml-for-confluence</ac:adf-attribute>
<ac:adf-attribute key="extension-type">com.atlassian.ecosystem</ac:adf-attribute>
<ac:adf-attribute key="parameters">
<ac:adf-parameter key="local-id">${localId}</ac:adf-parameter>
<ac:adf-parameter key="extension-id">ari:cloud:ecosystem::extension/f46085f3-e7c3-4cb5-ba7a-99a19de6e28c/31e52f94-5266-4b1d-a7c8-cef0486bc2e7/static/plantuml-for-confluence</ac:adf-parameter>
<ac:adf-parameter key="extension-title">PlantUML for Confluence</ac:adf-parameter>
<ac:adf-parameter key="layout">extension</ac:adf-parameter>
<ac:adf-parameter key="forge-environment">PRODUCTION</ac:adf-parameter>
<ac:adf-parameter key="render">native</ac:adf-parameter>
<ac:adf-parameter key="guest-params">
<ac:adf-parameter key="text">${escapedContent}</ac:adf-parameter>
</ac:adf-parameter>
</ac:adf-attribute>
<ac:adf-attribute key="text">PlantUML for Confluence</ac:adf-attribute>
<ac:adf-attribute key="layout">default</ac:adf-attribute>
<ac:adf-attribute key="local-id">${localId}</ac:adf-attribute>
</ac:adf-node>
</ac:adf-fallback>
</ac:adf-extension>`;
}

// Helper function to upload file as attachment
async function uploadAttachment(filePath: string, issueKey?: string, pageId?: string) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath)
    });

    let uploadUrl;
    if (issueKey) {
      // Upload to Jira issue
      uploadUrl = `/rest/api/3/issue/${issueKey}/attachments`;
    } else if (pageId) {
      // Upload to Confluence page
      uploadUrl = `/wiki/rest/api/content/${pageId}/child/attachment`;
    } else {
      throw new Error('Either issueKey or pageId must be provided');
    }

    const response = await axios({
      method: 'POST',
      url: `${ATLASSIAN_BASE_URL}${uploadUrl}`,
      data: form,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64')}`,
        'X-Atlassian-Token': 'no-check',
        ...form.getHeaders()
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Upload error:', error.message);
    throw error;
  }
}

server.tool(
  "jira_search_issues_by_name",
  "Search Jira issues by summary/name",
  {
    summary: z.string().min(1),
    maxResults: z.number().min(1).max(50).default(10),
  },
  async (params) => {
    try {
      // Use JQL to search by summary containing the text
      const jql = `project = "${JIRA_PROJECT_KEY}" AND summary ~ "${params.summary}"`;
      
      const searchParams = {
        jql: jql,
        maxResults: params.maxResults,
        fields: ['summary', 'status', 'assignee', 'created', 'updated', 'issuetype']
      };

      const response = await atlassianAPI.post('/rest/api/3/search', searchParams);
      
      const issues = response.data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        issueType: issue.fields.issuetype?.name,
        created: issue.fields.created,
        updated: issue.fields.updated,
        url: `${ATLASSIAN_BASE_URL}/browse/${issue.key}`
      }));

      return {
        content: [{ 
          type: "text", 
          text: `Found ${response.data.total} issues matching "${params.summary}":\n\n${JSON.stringify(issues, null, 2)}` 
        }]
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.errorMessages || error.message;
      
      return {
        content: [{ 
          type: "text", 
          text: `❌ Error searching issues: ${JSON.stringify(errorMsg, null, 2)}` 
        }]
      };
    }
  }
);

server.tool(
  "jira_create_issue",
  "Create a new Jira issue with optional file attachment",
  {
    summary: z.string().min(1).max(255),
    description: z.string().optional(),
    issueType: z.string().optional(),
    attachmentPath: z.string().optional(),
  },
  async (params) => {
    try {
      // Verify project exists
      await getProjectMetadata(JIRA_PROJECT_KEY);
      
      // Get available issue types
      const issueTypes = await getIssueTypes(JIRA_PROJECT_KEY);
      const defaultIssueType = issueTypes.find((type: any) => 
        type.name.toLowerCase().includes('task') || 
        type.name.toLowerCase().includes('story')
      ) || issueTypes[0];
      
      if (!defaultIssueType) {
        return {
          content: [{ 
            type: "text", 
            text: `❌ No issue types available for project ${JIRA_PROJECT_KEY}` 
          }]
        };
      }

      // Build issue data with only essential fields
      const issueData: any = {
        fields: {
          project: {
            key: JIRA_PROJECT_KEY
          },
          summary: params.summary,
          issuetype: {
            id: defaultIssueType.id,
            name: params.issueType || defaultIssueType.name
          }
        }
      };

      // Add description if provided (use simple text format)
      if (params.description) {
        issueData.fields.description = {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: params.description
                }
              ]
            }
          ]
        };
      }
      
      const response = await atlassianAPI.post('/rest/api/3/issue', issueData);
      const issueKey = response.data.key;
      
      let attachmentInfo = "";
      
      // Upload attachment if provided
      if (params.attachmentPath) {
        try {
          const attachmentResult = await uploadAttachment(params.attachmentPath, issueKey);
          const fileName = path.basename(params.attachmentPath);
          attachmentInfo = `\n📎 File attached: ${fileName}`;
        } catch (attachError: any) {
          attachmentInfo = `\n⚠️ Issue created but file upload failed: ${attachError.message}`;
        }
      }
      
      return {
        content: [{ 
          type: "text", 
          text: `✅ Jira issue created successfully!\nKey: ${issueKey}\nSummary: ${params.summary}\nURL: ${ATLASSIAN_BASE_URL}/browse/${issueKey}${attachmentInfo}` 
        }]
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.errors || error.response?.data?.errorMessages || error.message;
      console.error('Jira API Error:', JSON.stringify(errorMsg, null, 2));
      
      return {
        content: [{ 
          type: "text", 
          text: `❌ Error creating Jira issue:\n${JSON.stringify(errorMsg, null, 2)}` 
        }]
      };
    }
  }
);

server.tool(
  "jira_create_simple_issue",
  "Create a simple Jira issue with minimal fields",
  {
    summary: z.string().min(1).max(255),
    description: z.string().optional(),
  },
  async (params) => {
    try {
      // Very basic issue creation with minimal required fields
      const issueData: any = {
        fields: {
          project: {
            key: JIRA_PROJECT_KEY
          },
          summary: params.summary,
          issuetype: {
            name: "Task"  // Most common issue type
          }
        }
      };

      // Add description only if provided
      if (params.description) {
        issueData.fields.description = params.description;
      }
      
      const response = await atlassianAPI.post('/rest/api/3/issue', issueData);
      
      return {
        content: [{ 
          type: "text", 
          text: `✅ Simple Jira issue created!\nKey: ${response.data.key}\nURL: ${ATLASSIAN_BASE_URL}/browse/${response.data.key}` 
        }]
      };
    } catch (error: any) {
      const errorMsg = error.response?.data || error.message;
      console.error('Simple Jira API Error:', JSON.stringify(errorMsg, null, 2));
      
      return {
        content: [{ 
          type: "text", 
          text: `❌ Error creating simple issue:\nStatus: ${error.response?.status}\nError: ${JSON.stringify(errorMsg, null, 2)}` 
        }]
      };
    }
  }
);

server.tool(
  "jira_search_issues",
  "Search for Jira issues using JQL",
  {
    jql: z.string().min(1),
    maxResults: z.number().min(1).max(100).default(10),
    fields: z.array(z.string()).optional(),
  },
  async (params) => {
    try {
      const searchParams = {
        jql: params.jql,
        maxResults: params.maxResults,
        fields: params.fields || ['summary', 'status', 'assignee', 'created', 'updated']
      };

      const response = await atlassianAPI.post('/rest/api/3/search', searchParams);
      
      const issues = response.data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        assignee: issue.fields.assignee?.displayName,
        created: issue.fields.created,
        updated: issue.fields.updated,
        url: `${ATLASSIAN_BASE_URL}/browse/${issue.key}`
      }));

      return {
        content: [{ 
          type: "text", 
          text: `Found ${response.data.total} issues:\n\n${JSON.stringify(issues, null, 2)}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ Error searching Jira issues: ${error.response?.data?.errorMessages?.[0] || error.message}` 
        }]
      };
    }
  }
);

server.tool(
  "jira_update_issue",
  "Update an existing Jira issue",
  {
    issueKey: z.string().min(1),
    summary: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    assignee: z.string().optional(),
    comment: z.string().optional(),
  },
  async (params) => {
    try {
      const updateData: any = { fields: {} };

      if (params.summary) {
        updateData.fields.summary = params.summary;
      }

      if (params.description) {
        updateData.fields.description = {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: params.description
                }
              ]
            }
          ]
        };
      }

      if (params.assignee) {
        updateData.fields.assignee = { name: params.assignee };
      }

      // Update fields if any
      if (Object.keys(updateData.fields).length > 0) {
        await atlassianAPI.put(`/rest/api/3/issue/${params.issueKey}`, updateData);
      }

      // Handle status transition
      if (params.status) {
        const transitionsResponse = await atlassianAPI.get(`/rest/api/3/issue/${params.issueKey}/transitions`);
        const transition = transitionsResponse.data.transitions.find((t: any) => 
          t.to.name.toLowerCase() === params.status!.toLowerCase()
        );
        
        if (transition) {
          await atlassianAPI.post(`/rest/api/3/issue/${params.issueKey}/transitions`, {
            transition: { id: transition.id }
          });
        }
      }

      // Add comment if provided
      if (params.comment) {
        await atlassianAPI.post(`/rest/api/3/issue/${params.issueKey}/comment`, {
          body: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: params.comment
                  }
                ]
              }
            ]
          }
        });
      }

      return {
        content: [{ 
          type: "text", 
          text: `✅ Jira issue ${params.issueKey} updated successfully!\nURL: ${ATLASSIAN_BASE_URL}/browse/${params.issueKey}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ Error updating Jira issue: ${error.response?.data?.errorMessages?.[0] || error.message}` 
        }]
      };
    }
  }
);

// ===================
// CONFLUENCE INTEGRATION  
// ===================

server.tool(
  "confluence_test_connection",
  "Test Confluence connection and get space info",
  {
    spaceKey: z.string().optional(),
  },
  async (params) => {
    try {
      const spaceKey = params.spaceKey || CONFLUENCE_SPACE_KEY;
      
      let result: any = { 
        connectionTest: "Starting tests...",
        space: {},
        pages: [],
        capabilities: {}
      };
      
      // Test 1: Basic API access - Get space information (most basic endpoint)
      try {
        const spaceResponse = await atlassianAPI.get(`/wiki/rest/api/space/${spaceKey}`);
        result.space = {
          key: spaceResponse.data.key,
          name: spaceResponse.data.name,
          type: spaceResponse.data.type || 'unknown',
          status: spaceResponse.data.status || 'unknown',
          url: `${ATLASSIAN_BASE_URL}/wiki/spaces/${spaceResponse.data.key}`,
          id: spaceResponse.data.id
        };
      } catch (spaceError: any) {
        result.spaceError = `Failed to get space info: ${spaceError.response?.status} - ${spaceError.message}`;
      }
      
      // Test 2: Get pages in space (simplified)
      try {
        const pagesResponse = await atlassianAPI.get('/wiki/rest/api/content', {
          params: {
            spaceKey: spaceKey,
            limit: 3,
            type: 'page'
          }
        });
        
        result.pages = pagesResponse.data.results?.map((page: any) => ({
          id: page.id,
          title: page.title,
          type: page.type,
          url: `${ATLASSIAN_BASE_URL}/wiki${page._links?.webui || ''}`
        })) || [];
      } catch (pagesError: any) {
        result.pagesError = `Failed to get pages: ${pagesError.response?.status} - ${pagesError.message}`;
      }
      
      // Test 3: Simple authentication test via space list
      try {
        const spacesResponse = await atlassianAPI.get('/wiki/rest/api/space', {
          params: { limit: 1 }
        });
        result.authTest = {
          status: "✅ Authentication successful",
          totalSpaces: spacesResponse.data.size || 0
        };
      } catch (authError: any) {
        result.authError = `Authentication failed: ${authError.response?.status} - ${authError.message}`;
      }
      
      // Set basic capabilities
      result.capabilities = {
        basicAPI: result.space.key ? true : false,
        pageAccess: result.pages.length > 0 ? true : false,
        authenticated: !!result.authTest
      };
      
      const hasErrors = result.spaceError || result.pagesError || result.authError;
      const statusIcon = hasErrors ? "⚠️" : "✅";
      const statusText = hasErrors ? "Partial connection (some features may not work)" : "Full connection successful";
      
      return {
        content: [{ 
          type: "text", 
          text: `${statusIcon} Confluence connection test completed!\n\nStatus: ${statusText}\n\n${JSON.stringify(result, null, 2)}` 
        }]
      };
    } catch (error: any) {
      console.error('Complete connection test failed:', error);
      const errorMsg = error.response?.data?.message || error.response?.data || error.message;
      
      return {
        content: [{ 
          type: "text", 
          text: `❌ Confluence connection completely failed:\nStatus: ${error.response?.status || 'Unknown'}\nError: ${JSON.stringify(errorMsg, null, 2)}\n\nSuggestions:\n1. Check ATLASSIAN_BASE_URL: ${ATLASSIAN_BASE_URL}\n2. Check CONFLUENCE_SPACE_KEY: ${CONFLUENCE_SPACE_KEY}\n3. Verify API token has Confluence access\n4. Try accessing ${ATLASSIAN_BASE_URL}/wiki manually` 
        }]
      };
    }
  }
);

server.tool(
  "confluence_simple_test",
  "Simple Confluence connection test (minimal API calls)",
  {
    spaceKey: z.string().optional(),
  },
  async (params) => {
    try {
      const spaceKey = params.spaceKey || CONFLUENCE_SPACE_KEY;
      
      // Only test the most basic endpoint
      const response = await atlassianAPI.get(`/wiki/rest/api/space/${spaceKey}`);
      
      return {
        content: [{ 
          type: "text", 
          text: `✅ Confluence simple test successful!\n\nSpace found:\n- Key: ${response.data.key}\n- Name: ${response.data.name}\n- Type: ${response.data.type}\n- URL: ${ATLASSIAN_BASE_URL}/wiki/spaces/${response.data.key}\n\nAPI Endpoint: /wiki/rest/api/space/${spaceKey}\nStatus: ${response.status}` 
        }]
      };
    } catch (error: any) {
      const errorDetails = {
        status: error.response?.status || 'Unknown',
        statusText: error.response?.statusText || 'Unknown',
        method: 'GET',
        url: `/wiki/rest/api/space/${params.spaceKey || CONFLUENCE_SPACE_KEY}`,
        fullUrl: `${ATLASSIAN_BASE_URL}/wiki/rest/api/space/${params.spaceKey || CONFLUENCE_SPACE_KEY}`,
        errorMessage: error.message,
        errorData: error.response?.data
      };
      
      return {
        content: [{ 
          type: "text", 
          text: `❌ Confluence simple test failed!\n\n${JSON.stringify(errorDetails, null, 2)}\n\n🔧 Troubleshooting:\n1. Verify URL manually: ${ATLASSIAN_BASE_URL}/wiki\n2. Check space key exists: ${params.spaceKey || CONFLUENCE_SPACE_KEY}\n3. Verify API token has Confluence permissions\n4. Check if Confluence is enabled on your Atlassian instance` 
        }]
      };
    }
  }
);

// Helper function to detect and process mixed content (markdown + plantuml)
function processMixedContent(content: string): string {
  // Pattern to find PlantUML blocks in markdown code blocks
  const plantUMLCodeBlockPattern = /```plantuml\n([\s\S]*?)\n```/gi;
  // Pattern to find standalone PlantUML blocks  
  const standalonePlantUMLPattern = /(@start(?:uml|wbs|mindmap|gantt|activity|component|deployment|state|timing|sequence|class|usecase|object|salt|ditaa|dot|jcckit|wire|yaml|json|ebnf|regex|flow|nwdiag|rackdiag|packetdiag|actdiag|blockdiag|seqdiag)\b[\s\S]*?@end(?:uml|wbs|mindmap|gantt|activity|component|deployment|state|timing|sequence|class|usecase|object|salt|ditaa|dot|jcckit|wire|yaml|json|ebnf|regex|flow|nwdiag|rackdiag|packetdiag|actdiag|blockdiag|seqdiag)\b)/gi;
  
  // Find all PlantUML matches - but prioritize markdown code blocks to avoid duplicates
  const plantUMLMatches: Array<{match: RegExpMatchArray, content: string, start: number, end: number}> = [];
  
  // First, find PlantUML in markdown code blocks (these take priority)
  let match;
  while ((match = plantUMLCodeBlockPattern.exec(content)) !== null) {
    plantUMLMatches.push({
      match: match,
      content: match[1].trim(),
      start: match.index!,
      end: match.index! + match[0].length
    });
  }
  
  // Then find standalone PlantUML blocks, but only if they're NOT already inside a code block
  const standalonePlantUMLPattern2 = /(@start(?:uml|wbs|mindmap|gantt|activity|component|deployment|state|timing|sequence|class|usecase|object|salt|ditaa|dot|jcckit|wire|yaml|json|ebnf|regex|flow|nwdiag|rackdiag|packetdiag|actdiag|blockdiag|seqdiag)\b[\s\S]*?@end(?:uml|wbs|mindmap|gantt|activity|component|deployment|state|timing|sequence|class|usecase|object|salt|ditaa|dot|jcckit|wire|yaml|json|ebnf|regex|flow|nwdiag|rackdiag|packetdiag|actdiag|blockdiag|seqdiag)\b)/gi;
  while ((match = standalonePlantUMLPattern2.exec(content)) !== null) {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;
    
    // Check if this standalone PlantUML is already inside a code block we found earlier
    const isInsideCodeBlock = plantUMLMatches.some(existingMatch => 
      matchStart >= existingMatch.start && matchEnd <= existingMatch.end
    );
    
    // Only add if it's not already inside a code block
    if (!isInsideCodeBlock) {
      plantUMLMatches.push({
        match: match,
        content: match[1].trim(),
        start: matchStart,
        end: matchEnd
      });
    }
  }
  
  // If no PlantUML found, process as pure markdown
  if (plantUMLMatches.length === 0) {
    return wrapInConfluenceMarkdownMacro(content);
  }
  
  // Sort matches by position
  plantUMLMatches.sort((a, b) => a.start - b.start);
  
  let processedContent = '';
  let lastEnd = 0;
  
  plantUMLMatches.forEach((plantUMLMatch) => {
    // Add markdown content before this PlantUML block
    if (plantUMLMatch.start > lastEnd) {
      const beforeContent = content.slice(lastEnd, plantUMLMatch.start);
      const trimmedContent = beforeContent.trim();
      
      if (trimmedContent) {
        processedContent += wrapInConfluenceMarkdownMacro(trimmedContent) + '\n\n';
      }
    }
    
    // Add PlantUML block using ADF extension format
    processedContent += wrapInPlantUMLMacro(plantUMLMatch.content) + '\n\n';
    
    lastEnd = plantUMLMatch.end;
  });
  
  // Add remaining markdown content after last PlantUML block
  if (lastEnd < content.length) {
    const remainingContent = content.slice(lastEnd);
    const trimmedContent = remainingContent.trim();
    
    if (trimmedContent) {
      processedContent += wrapInConfluenceMarkdownMacro(trimmedContent);
    }
  }
  
  return processedContent.trim();
}

server.tool(
  "confluence_create_page",
  "Create a new Confluence page with markdown content and auto-detect PlantUML diagrams. ⚠️ SMART: Automatically detects PlantUML diagrams in content and renders them properly alongside markdown.",
  {
    title: z.string().min(1).max(255),
    content: z.string().min(1).describe("Mixed content - supports markdown syntax AND PlantUML diagrams. PlantUML can be in ```plantuml code blocks or standalone @start/@end blocks. Markdown: headers (#), bold (**), italic (*), lists (-), tables, etc."),
    spaceKey: z.string().optional(),
    parentPageId: z.string().optional(),
    attachmentPath: z.string().optional(),
  },
  async (params) => {
    try {
      // Process content to handle both markdown and PlantUML
      const processedContent = processMixedContent(params.content);

      const pageData = {
        type: "page",
        title: params.title,
        space: {
          key: params.spaceKey || CONFLUENCE_SPACE_KEY
        },
        body: {
          storage: {
            value: processedContent,
            representation: "storage"
          }
        }
      };

      if (params.parentPageId) {
        (pageData as any).ancestors = [{ id: params.parentPageId }];
      }

      const response = await atlassianAPI.post('/wiki/rest/api/content', pageData);
      const pageId = response.data.id;
      
      let attachmentInfo = "";
      
      // Upload attachment if provided
      if (params.attachmentPath) {
        try {
          const attachmentResult = await uploadAttachment(params.attachmentPath, undefined, pageId);
          const fileName = path.basename(params.attachmentPath);
          attachmentInfo = `\n📎 File attached: ${fileName}`;
        } catch (attachError: any) {
          attachmentInfo = `\n⚠️ Page created but file upload failed: ${attachError.message}`;
        }
      }
      
      // Analyze what was processed
      const hasPlantUML = params.content.includes('@start') || params.content.includes('```plantuml');
      let processingInfo = "📝 Markdown content processed with Confluence Markdown Macro";
      
      if (hasPlantUML) {
        const plantUMLCount = (params.content.match(/(@start|```plantuml)/g) || []).length;
        processingInfo = `📝 Mixed content processed:\n- Markdown sections → Confluence Markdown Macro\n- ${plantUMLCount} PlantUML diagram(s) → ADF Extension format`;
      }
      
      return {
        content: [{ 
          type: "text", 
          text: `✅ Confluence page created successfully!\nTitle: ${response.data.title}\n${processingInfo}\nURL: ${ATLASSIAN_BASE_URL}/wiki${response.data._links.webui}${attachmentInfo}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ Error creating Confluence page: ${error.response?.data?.message || error.message}` 
        }]
      };
    }
  }
);

server.tool(
  "confluence_search_pages",
  "Search for Confluence pages",
  {
    query: z.string().min(1),
    spaceKey: z.string().optional(),
    limit: z.number().min(1).max(50).default(10),
  },
  async (params) => {
    try {
      const cql = params.spaceKey 
        ? `text ~ "${params.query}" AND space = "${params.spaceKey}"`
        : `text ~ "${params.query}"`;

      const response = await atlassianAPI.get('/wiki/rest/api/search', {
        params: {
          cql: cql,
          limit: params.limit,
          expand: 'content.space,content.version,content.body.view'
        }
      });
      
      const pages = response.data.results.map((result: any) => ({
        id: result.content.id,
        title: result.content.title,
        space: result.content.space?.name,
        url: `${ATLASSIAN_BASE_URL}/wiki${result.content._links.webui}`,
        excerpt: result.excerpt,
        lastModified: result.content.version?.when
      }));

      return {
        content: [{ 
          type: "text", 
          text: `Found ${response.data.size} pages:\n\n${JSON.stringify(pages, null, 2)}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ Error searching Confluence pages: ${error.response?.data?.message || error.message}` 
        }]
      };
    }
  }
);

server.tool(
  "confluence_update_page",
  "Update an existing Confluence page",
  {
    pageId: z.string().min(1),
    title: z.string().optional(),
    content: z.string().optional(),
  },
  async (params) => {
    try {
      // Get current page data first
      const currentPageResponse = await atlassianAPI.get(`/wiki/rest/api/content/${params.pageId}`, {
        params: { expand: 'version,space,body.storage' }
      });
      
      const currentPage = currentPageResponse.data;
      
      const updateData = {
        version: {
          number: currentPage.version.number + 1
        },
        type: "page",
        title: params.title || currentPage.title,
        body: {
          storage: {
            value: params.content || currentPage.body.storage.value,
            representation: "storage"
          }
        }
      };

      const response = await atlassianAPI.put(`/wiki/rest/api/content/${params.pageId}`, updateData);
      
      return {
        content: [{ 
          type: "text", 
          text: `✅ Confluence page updated successfully!\nTitle: ${response.data.title}\nURL: ${ATLASSIAN_BASE_URL}/wiki${response.data._links.webui}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ Error updating Confluence page: ${error.response?.data?.message || error.message}` 
        }]
      };
    }
  }
);


// ===================
// PROMPTS
// ===================

server.prompt(
  "atlassian_workflow",
  "Workflow to create Jira issue and Confluence documentation",
  {
    projectName: z.string(),
    issueType: z.string().optional(),
    createDocs: z.string().optional()
  },
  async ({ projectName, issueType = "Task", createDocs = "true" }) => {
    const shouldCreateDocs = createDocs === "true";
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll help you set up a workflow for ${projectName}. 
                First, I'll create a ${issueType} in Jira to track this work.
                ${shouldCreateDocs ? "Then I'll create documentation in Confluence to capture requirements and progress." : ""}

                Please provide:
                1. Issue summary and description
                2. ${shouldCreateDocs ? "Documentation title and content" : ""}
                3. Any specific assignee or labels for the Jira issue`,
          }
        }
      ]
    };
  }
);

// ===================
// SERVER STARTUP
// ===================

async function main() {
  try {
    console.error("Starting Atlassian MCP server...");
    
    // Validate configuration
    if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN || !ATLASSIAN_BASE_URL) {
      console.error("⚠️  Warning: Atlassian credentials not configured. Please set ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN, and ATLASSIAN_BASE_URL environment variables.");
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("✅ Atlassian MCP server is running and waiting for requests...");
  } catch (err) {
    console.error("❌ Atlassian MCP server failed to start:", err);
    process.exit(1);
  }
}

main();
