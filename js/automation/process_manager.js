let activeProcess = null;

export function hasActiveProcess() {
  return activeProcess !== null;
}

export function startProcess() {
  stopProcess();

  activeProcess = createProcess();

  return activeProcess;
}

export async function stopProcess() {
  if (!activeProcess) {
    return;
  }

  await activeProcess.stop();
  activeProcess = null;
}

export function clearProcess(process) {
  if (activeProcess === process) {
    activeProcess = null;
  }
}

export function runAbortableProcess(action, sendResponse) {
  const process = startProcess();

  action(process)
    .then((result) => {
      sendResponse(
        result || {
          success: true,
        },
      );
    })
    .catch((error) => {
      if (error.message === "PROCESS_STOPPED") {
        sendResponse({
          success: false,
          stopped: true,
          message: "Process stopped",
        });

        return;
      }

      sendResponse({
        success: false,
        message: error.message || "Something went wrong",
      });
    })
    .finally(() => {
      clearProcess(process);
    });

  return true;
}

function createProcess() {
  const controller = new AbortController();
  const tabIds = new Set();

  function checkStopped() {
    if (controller.signal.aborted) {
      throw new Error("PROCESS_STOPPED");
    }
  }

  async function notify(payload) {
    try {
      await chrome.runtime.sendMessage({
        type: "PROCESS_UPDATE",
        payload,
      });
    } catch (error) {
      // Side panel/popup may be closed. Ignore.
    }
  }

  async function sleep(ms) {
    checkStopped();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, ms);

      controller.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timeoutId);
          reject(new Error("PROCESS_STOPPED"));
        },
        { once: true },
      );
    });
  }

  async function createTab(options) {
    checkStopped();

    const tab = await chrome.tabs.create(options);

    if (tab.id) {
      tabIds.add(tab.id);
    }

    return tab;
  }

  async function updateTab(tabId, options) {
    checkStopped();

    return await chrome.tabs.update(tabId, options);
  }

  async function closeTab(tabId) {
    if (!tabId) {
      return;
    }

    try {
      await chrome.tabs.remove(tabId);
    } catch (error) {
      console.warn("Could not close tab:", error);
    }

    tabIds.delete(tabId);
  }

  async function waitForTabToLoad(tabId, timeoutMs = 420000) {
    checkStopped();

    const existingTab = await chrome.tabs.get(tabId);

    if (existingTab.status === "complete") {
      return true;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Tab load timeout"));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(listener);
        controller.signal.removeEventListener("abort", onAbort);
      }

      function onAbort() {
        cleanup();
        reject(new Error("PROCESS_STOPPED"));
      }

      function listener(updatedTabId, changeInfo) {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
          cleanup();
          resolve(true);
        }
      }

      controller.signal.addEventListener("abort", onAbort, { once: true });
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  async function executeScript(tabId, injection) {
    checkStopped();

    const result = await chrome.scripting.executeScript({
      target: { tabId },
      ...injection,
    });

    checkStopped();

    return result;
  }

  async function stop() {
    controller.abort();

    for (const tabId of tabIds) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            window.__zopStopAutomation = true;
          },
        });
      } catch {}

      try {
        await chrome.tabs.remove(tabId);
      } catch {}
    }

    tabIds.clear();
  }

  return {
    signal: controller.signal,
    checkStopped,
    sleep,
    createTab,
    updateTab,
    closeTab,
    waitForTabToLoad,
    executeScript,
    stop,
    notify,
  };
}
