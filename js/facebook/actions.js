import { fetchInventories, updateLog } from "../zopsoftware.js";

export const markInventoriesAsSold = async (client_id, token, cb) => {
  const formData = new FormData();
  formData.append("token", token);

  try {
    cb({
      success: true,
      message: `We are marking the inventories as SOLD ...`,
    });

    const response = await fetchInventories(client_id, token, {
      onlySold: true,
    });

    if (!response.ok) throw new Error("Network error occurred");
    const { inventory } = await response.json();

    for (const vehicle of inventory) {
      let { post_id, stock_no, modification_hash } = vehicle;
      let result = await checkIfInvalidOrSold(post_id);

      if (result === "SOLD" && post_id.trim() !== "") {
        await updateLog(client_id, token, {
          stock_no,
          post_id,
          current_modification_hash: modification_hash,
          status: "SOLD",
        });
      }
    }
  } catch (error) {
    cb({ success: false, error: "There were some errors" });
  }
};

export const publishAndUpdate = async (client_id, token, cb) => {
  try {
    cb({
      success: true,
      message: `We are currently publishing and updating the inventories ...`,
    });

    const response = await fetchInventories(client_id, token);

    if (!response.ok) throw new Error("Network error occurred");
    const { inventory } = await response.json();

    /**
     * STEP 1: LOOP THROUGH ALL INVENTORIES WITH STATUS UPDATE AND IF THEY ARE UNAVAILABLE DELETE THE LOG
     * STEP 2: LOOP THROUGH ALL THE INVENTORIES x
     */

    for (const vehicle of inventory) {
      /***
       * TODO : Algorithm :
       * STEP 3: MAP EACH INVENTORY ATTRIBUTE x
       * STEP 4: IF STATUS IS UPDATED || PUBLISHED || DRAFT CONTINUE x
       * STEP 5: IF EMPTY STATUS THEN DOWNLOAD IMAGES AND CREATE THE POST, UPDATE THE LOG, DELETE IMAGES
       * STEP 6: ELSE IF STATUS IS TO BE UPDATED CHECK IF PAGE CAN BE UPDATED, UPDATE THE LOG
       */

      let { facebook_status: status } = vehicle;
      if (["UPDATED", "PUBLISHED", "DRAFT"].includes(status)) {
        continue;
      }

      if (!status) {
        let result = await publishInventory(vehicle);
        break;
      }

      console.log(vehicle);
    }
  } catch (error) {
    cb({ success: false, error: "There were some errors" });
  }
};

async function publishInventory(vehicle) {
  try {
    const tab = await chrome.tabs.create({
      url: `https://www.facebook.com/marketplace/create/vehicle`,
      active: true,
    });

    await waitForTabToLoad(tab.id);
    await sleep(5000);

    await setVehicleDataForTab(tab.id, vehicle);

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "js/facebook/injection/helpers.js",
        "js/facebook/injection/publish.js",
      ],
    });

    // await chrome.tabs.remove(tab.id);

    return result.result;
  } catch (error) {
    return "";
  }
}

async function checkIfInvalidOrSold(post_id) {
  try {
    if (post_id) {
      if (post_id.trim() !== "") {
        const tab = await chrome.tabs.create({
          url: `https://www.facebook.com/marketplace/item/${post_id}`,
          active: false,
        });

        await waitForTabToLoad(tab.id);
        await sleep(5000);

        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            "js/facebook/injection/helpers.js",
            "js/facebook/injection/markAsSold.js",
          ],
        });

        await chrome.tabs.remove(tab.id);

        return result.result;
      }
    }
  } catch (error) {
    return "";
  }
}

function waitForTabToLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tab load timeout"));
    }, 30000);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

function clickElement(element) {
  element.scrollIntoView({
    behavior: "instant",
    block: "center",
    inline: "center",
  });

  element.click();
}

async function setVehicleDataForTab(tabId, data) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (vehicle_data) => {
      window.vehicle_data = vehicle_data;
    },
    args: [data],
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
