import { PluginAPI, PluginHooks, Task, Project } from '@super-productivity/plugin-api';
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';

class MCPBridgePlugin {
  private api: PluginAPI;
  private server: http.Server;
  private io: Server;
  private app: express.Application;
  private port: number = 3838;

  constructor(api: PluginAPI) {
    this.api = api;
    this.initializeServer();
    this.registerHooks();
    this.setupRoutes();
  }

  private initializeServer(): void {
    this.app = express();
    this.app.use(express.json());
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: { origin: '*' }
    });

    this.server.listen(this.port, () => {
      this.api.log.info(`MCP Bridge listening on port ${this.port}`);
    });
  }

  private registerHooks(): void {
    // Broadcast task updates to connected MCP server clients
    this.api.registerHook(PluginHooks.ANY_TASK_UPDATE, async (payload) => {
      this.io.emit('task:update', payload);
      this.api.log.debug('Task update broadcasted', payload);
    });

    this.api.registerHook(PluginHooks.PROJECT_LIST_UPDATE, async (payload) => {
      this.io.emit('project:update', payload);
      this.api.log.debug('Project update broadcasted', payload);
    });

    this.api.registerHook(PluginHooks.CURRENT_TASK_CHANGE, async (payload) => {
      this.io.emit('current-task:change', payload);
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', plugin: 'mcp-bridge' });
    });

    // Get all tasks
    this.app.get('/api/tasks', async (req, res) => {
      try {
        const tasks = await this.api.getTasks();
        res.json({ success: true, data: tasks });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get current context tasks
    this.app.get('/api/tasks/current', async (req, res) => {
      try {
        const tasks = await this.api.getCurrentContextTasks();
        res.json({ success: true, data: tasks });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.get('/api/tasks/archived', async (req, res) => {
      try {
        const apiAny = this.api as PluginAPI & { getArchivedTasks?: () => Promise<Task[]> };
        if (typeof apiAny.getArchivedTasks !== 'function') {
          res.status(501).json({
            success: false,
            error: 'getArchivedTasks is not available on this Super Productivity version'
          });
          return;
        }
        const tasks = await apiAny.getArchivedTasks();
        res.json({ success: true, data: tasks });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Create task
    this.app.post('/api/tasks', async (req, res) => {
      try {
        const taskId = await this.api.addTask(req.body);
        res.json({ success: true, taskId });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Update task
    this.app.patch('/api/tasks/:taskId', async (req, res) => {
      try {
        await this.api.updateTask(req.params.taskId, req.body);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Delete task
    this.app.delete('/api/tasks/:taskId', async (req, res) => {
      try {
        await this.api.deleteTask(req.params.taskId);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Batch operations
    this.app.post('/api/tasks/batch', async (req, res) => {
      try {
        const result = await this.api.batchUpdateForProject(req.body);
        res.json({ success: true, data: result });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/tasks/reorder', async (req, res) => {
      try {
        const apiAny = this.api as PluginAPI & {
          reorderTasks?: (a: string[], b?: string, c?: string) => Promise<void>;
        };
        if (typeof apiAny.reorderTasks !== 'function') {
          res.status(501).json({
            success: false,
            error: 'reorderTasks is not available on this Super Productivity version'
          });
          return;
        }
        const { taskIds, contextId, contextType } = req.body;
        await apiAny.reorderTasks(taskIds, contextId, contextType);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get all projects
    this.app.get('/api/projects', async (req, res) => {
      try {
        const projects = await this.api.getAllProjects();
        res.json({ success: true, data: projects });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Create project
    this.app.post('/api/projects', async (req, res) => {
      try {
        const projectId = await this.api.addProject(req.body);
        res.json({ success: true, projectId });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.patch('/api/projects/:projectId', async (req, res) => {
      try {
        await this.api.updateProject(req.params.projectId, req.body);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get all tags
    this.app.get('/api/tags', async (req, res) => {
      try {
        const tags = await this.api.getAllTags();
        res.json({ success: true, data: tags });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/tags', async (req, res) => {
      try {
        const tagId = await this.api.addTag(req.body);
        res.json({ success: true, tagId });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.patch('/api/tags/:tagId', async (req, res) => {
      try {
        await this.api.updateTag(req.params.tagId, req.body);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.delete('/api/tags/:tagId', async (req, res) => {
      try {
        await this.api.deleteTag(req.params.tagId);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/ui/notify', async (req, res) => {
      try {
        const b = req.body || {};
        await this.api.showNotification(b.message, b.type || 'INFO', b.duration);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/ui/showSnack', async (req, res) => {
      try {
        const b = req.body || {};
        const msg = b.msg != null ? b.msg : b.message;
        await this.api.showSnack(msg, b.type || 'INFO');
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/ui/openDialog', async (req, res) => {
      try {
        const result = await this.api.showDialog(req.body);
        res.json({ success: true, data: result });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.get('/api/counters', async (req, res) => {
      try {
        const counters = await this.api.getAllCounters();
        res.json({ success: true, data: counters });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.get('/api/counters/:id', async (req, res) => {
      try {
        const data = await this.api.getCounter(req.params.id);
        res.json({ success: true, data });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/counters/:id/set', async (req, res) => {
      try {
        await this.api.setCounter(req.params.id, req.body.value);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/counters/:id/increment', async (req, res) => {
      try {
        const by = req.body?.incrementBy;
        const data =
          by !== undefined && by !== null
            ? await this.api.incrementCounter(req.params.id, by)
            : await this.api.incrementCounter(req.params.id);
        res.json({ success: true, data });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/counters/:id/decrement', async (req, res) => {
      try {
        const by = req.body?.decrementBy;
        const data =
          by !== undefined && by !== null
            ? await this.api.decrementCounter(req.params.id, by)
            : await this.api.decrementCounter(req.params.id);
        res.json({ success: true, data });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.delete('/api/counters/:id', async (req, res) => {
      try {
        await this.api.deleteCounter(req.params.id);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.get('/api/persisted-data/:key', async (req, res) => {
      try {
        const data = await this.api.getPersistedData(req.params.key);
        res.json({ success: true, data });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/persisted-data/:key', async (req, res) => {
      try {
        await this.api.setPersistedData(req.params.key, req.body.data);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.get('/api/config', async (req, res) => {
      try {
        const config = await this.api.getConfig();
        res.json({ success: true, data: config });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/actions/dispatch', async (req, res) => {
      try {
        const { action, payload } = req.body;
        await this.api.dispatchAction(action, payload);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/window/focus', async (req, res) => {
      try {
        await this.api.focusWindow();
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }
}

// Inicializar plugin
if (typeof PluginAPI !== 'undefined') {
  // @ts-ignore
  const plugin = new MCPBridgePlugin(PluginAPI);
}
