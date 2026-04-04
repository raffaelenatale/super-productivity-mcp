(function () {
  console.log("MCP Bridge: Loading plugin logic...");

  function initPlugin(api) {
    console.log("MCP Bridge: Initializing with API...");

    // Connect to the MCP server (same host; PORT must match server, e.g. 3996)
    var socket = io("http://127.0.0.1:3996", {
      reconnectionDelayMax: 10000,
    });

    socket.on("connect", function () {
      console.log("MCP Bridge: Connected to MCP Server via WebSocket");
    });

    socket.on("disconnect", function () {
      console.log("MCP Bridge: Disconnected from MCP Server");
    });

    socket.on("connect_error", function (err) {
      console.error("MCP Bridge: Connection error:", err);
    });

    // --- Command Handlers (Server -> Plugin) ---

    socket.on("tasks:get", function (data, callback) {
      api.getTasks()
        .then(function (tasks) { callback(tasks); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tasks:getCurrent", function (data, callback) {
      api.getCurrentContextTasks()
        .then(function (tasks) { callback(tasks); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tasks:getArchived", function (data, callback) {
      var fn = api.getArchivedTasks;
      if (typeof fn !== "function") {
        callback({ error: "getArchivedTasks is not available on this Super Productivity version" });
        return;
      }
      fn.call(api)
        .then(function (tasks) { callback(tasks); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tasks:create", function (taskData, callback) {
      api.addTask(taskData)
        .then(function (taskId) { callback(taskId); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tasks:update", function (data, callback) {
      api.updateTask(data.taskId, data.updates)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tasks:delete", function (data, callback) {
      api.deleteTask(data.taskId)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tasks:batch", function (data, callback) {
      // batchUpdateForProject expects the full request { projectId, operations } from the MCP server.
      api.batchUpdateForProject(data)
        .then(function (result) { callback(result); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tasks:reorder", function (data, callback) {
      var fn = api.reorderTasks;
      if (typeof fn !== "function") {
        callback({ error: "reorderTasks is not available on this Super Productivity version" });
        return;
      }
      fn.call(api, data.taskIds, data.contextId, data.contextType)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("projects:get", function (data, callback) {
      api.getAllProjects()
        .then(function (projects) { callback(projects); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("projects:create", function (projectData, callback) {
      api.addProject(projectData)
        .then(function (projectId) { callback(projectId); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("projects:update", function (data, callback) {
      api.updateProject(data.projectId, data.updates)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tags:get", function (data, callback) {
      api.getAllTags()
        .then(function (tags) { callback(tags); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tags:create", function (tagData, callback) {
      api.addTag(tagData)
        .then(function (tagId) { callback(tagId); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tags:update", function (data, callback) {
      api.updateTag(data.tagId, data.updates)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("tags:delete", function (data, callback) {
      api.deleteTag(data.tagId)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("ui:notify", function (config, callback) {
      api.showNotification(config.message, config.type || "INFO", config.duration)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("ui:showSnack", function (config, callback) {
      var msg = config.msg != null ? config.msg : config.message;
      api.showSnack(msg, config.type || "INFO")
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("ui:openDialog", function (config, callback) {
      api.showDialog(config)
        .then(function (result) { callback(result); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    // Counters
    socket.on("counters:get", function (data, callback) {
      api.getAllCounters()
        .then(function (counters) { callback(counters); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("counter:get", function (data, callback) {
      api.getCounter(data.id)
        .then(function (counter) { callback(counter); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("counter:set", function (data, callback) {
      api.setCounter(data.id, data.value)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("counter:increment", function (data, callback) {
      var p = data.incrementBy !== undefined && data.incrementBy !== null
        ? api.incrementCounter(data.id, data.incrementBy)
        : api.incrementCounter(data.id);
      p.then(function (result) { callback(result); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("counter:decrement", function (data, callback) {
      var p = data.decrementBy !== undefined && data.decrementBy !== null
        ? api.decrementCounter(data.id, data.decrementBy)
        : api.decrementCounter(data.id);
      p.then(function (result) { callback(result); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("counter:delete", function (data, callback) {
      api.deleteCounter(data.id)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    // Persisted Data
    socket.on("persisted-data:load", function (data, callback) {
      api.getPersistedData(data.key)
        .then(function (result) { callback(result); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("persisted-data:save", function (data, callback) {
      api.setPersistedData(data.key, data.data)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    // Misc
    socket.on("config:get", function (data, callback) {
      api.getConfig()
        .then(function (config) { callback(config); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("actions:dispatch", function (data, callback) {
      api.dispatchAction(data.action, data.payload)
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    socket.on("window:focus", function (data, callback) {
      api.focusWindow()
        .then(function () { callback({ success: true }); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
    });

    // --- Event Hooks (Plugin -> Server) ---

    api.registerHook("anyTaskUpdate", function (payload) {
      socket.emit("event:taskUpdate", payload);
    });

    api.registerHook("projectListUpdate", function (payload) {
      socket.emit("event:projectListUpdate", payload);
    });

    api.registerHook("currentTaskChange", function (payload) {
      socket.emit("event:currentTaskChange", payload);
    });

    api.registerHook("taskComplete", function (payload) {
        socket.emit("event:taskComplete", payload);
    });
  }

  // Init
  if (typeof PluginAPI !== "undefined") {
    initPlugin(PluginAPI);
  } else {
    console.error("MCP Bridge: PluginAPI not found!");
  }
})();
