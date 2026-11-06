import { fetchInventories, deleteOneLog } from "./js/zopsoftware.js";
import { handleBackgroundImageFetchRequest } from "./js/background_fetch.js";
import {
  markInventoriesAsSold,
  publishAndUpdate,
  onlyBulkDelete,
} from "./js/facebook/actions.js";

import {
  runAbortableProcess,
  stopProcess,
} from "./js/automation/process_manager.js";

chrome.runtime.onInstalled.addListener(async () => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await chrome.storage.local.set({
      show_setup: true,
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "STOP_PROCESS") {
    stopProcess()
      .then(() => {
        sendResponse({
          success: true,
          message: "Process stopped",
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          message: error.message || "Could not stop process",
        });
      });

    return true;
  }

  if (message.type === "SAVE_CONFIG") {
    saveConfig(message.payload)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          message: error.message || "Something went wrong",
        });
      });

    return true;
  }

  if (message.type === "PROCESS_UPDATE") {
    console.log("Process update:", message.payload);

    sendResponse({
      success: false,
      message: message.payload,
    });

    return true;
  }

  if (message.type === "MARK_ONLY_SOLD") {
    return runAbortableProcess(async (process) => {
      console.log(`MARKING SOLD`);
      let { client_id, token } = message.payload;
      return await markInventoriesAsSold(client_id, token, process);
    }, sendResponse);
  }

  if (message.type === "PUBLISH_AND_UPDATE") {
    return runAbortableProcess(async (process) => {
      console.log(`PUBLISH AND UPDATE`);
      let { client_id, token } = message.payload;
      return await publishAndUpdate(client_id, token, process);
    }, sendResponse);
  }

  if (message.type === "ONLY_BULK_DELETE") {
    return runAbortableProcess(async (process) => {
      console.log(`ONLY_BULK_DELETE`);
      let { client_id, token } = message.payload;
      return await onlyBulkDelete(client_id, token, process);
    }, sendResponse);
  }

  if (message.type === "DELETE_ONE_LOG") {
    const { post_id } = message.payload || {};

    if (!post_id) {
      sendResponse({
        success: false,
        message: "Post ID is required",
      });

      return true;
    }

    deleteLogByPostId(post_id)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          message: error.message || "Something went wrong",
        });
      });

    return true;
  }

  return false;
});

async function saveConfig({ client_id, token, country, host_permission }) {
  await chrome.storage.local.set({
    country,
    host_permission: host_permission || "",
  });

  const response = await fetchInventories(client_id, token);
  const data = await response.json();

  if (!response.ok) {
    await chrome.storage.local.set({
      token: "",
      show_setup: true,
    });

    return {
      success: false,
      message: data.errors || "Invalid Client ID or Token",
    };
  }

  await chrome.storage.local.set({
    client_id,
    token,
    show_setup: false,
    host_permission: host_permission || "",
  });

  return {
    success: true,
    message: "Configuration saved successfully",
  };
}

async function deleteLogByPostId(post_id) {
  const { client_id, token } = await chrome.storage.local.get([
    "client_id",
    "token",
  ]);

  await deleteOneLog(client_id, token, post_id);

  return {
    success: true,
    message: `Post ID: ${post_id} has been deleted.`,
  };
}

chrome.storage.onChanged.addListener(handleBackgroundImageFetchRequest);
