import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { settingsManager } from './config/index.js';
import {
  TOOL_DEFINITIONS,
  handleConfigureApiKey,
  handleConfigureModel,
  handleGenerateIcon,
  handleResizeIcons,
  handleGenerateSplash,
  handleGenerateScreenshot,
  handleSetupFastlane,
  handlePublishIOS,
  handlePublishAndroid,
  handleGetStatus,
} from './tools/index.js';

export class AppPublisherServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'app-publisher-mcp',
      version: '1.0.0',
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const { name, arguments: args } = request.params;

        try {
          switch (name) {
            case 'configure_api_key':
              return await handleConfigureApiKey(args as { apiKey: string });

            case 'configure_model':
              return await handleConfigureModel(args as { model: string });

            case 'generate_icon':
              return await handleGenerateIcon(args as {
                prompt: string;
                model?: string;
                outputDir?: string;
              });

            case 'resize_icons':
              return await handleResizeIcons(args as {
                sourcePath: string;
                outputDir: string;
                platforms?: ('ios' | 'android')[];
              });

            case 'generate_splash':
              return await handleGenerateSplash(args as {
                prompt: string;
                model?: string;
                outputDir?: string;
              });

            case 'generate_screenshot':
              return await handleGenerateScreenshot(args as {
                prompt: string;
                model?: string;
                outputDir?: string;
              });

            case 'setup_fastlane':
              return await handleSetupFastlane(args as {
                projectDir: string;
                appIdentifier: string;
                appName: string;
                teamId?: string;
                itunesConnectTeamId?: string;
                jsonKeyFile?: string;
                packageName?: string;
              });

            case 'publish_ios':
              return await handlePublishIOS(args as {
                projectDir: string;
                ipaPath?: string;
                submitForReview?: boolean;
              });

            case 'publish_android':
              return await handlePublishAndroid(args as {
                projectDir: string;
                aabPath?: string;
                track?: string;
              });

            case 'get_status':
              return await handleGetStatus();

            default:
              return {
                content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
              };
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text' as const, text: `Error: ${message}` }],
          };
        }
      },
    );

    this.server.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: TOOL_DEFINITIONS,
      }),
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    const model = settingsManager.getModel();
    const configured = settingsManager.isConfigured();
    console.error(`App Publisher MCP server running (model: ${model}, configured: ${configured})`);
  }
}
