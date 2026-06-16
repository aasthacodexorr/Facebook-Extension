import { fetchInventories, updateLog, deleteOneLog } from "../zopsoftware.js";

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
      let result = await markAsSold(post_id);

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

export const onlyBulkDelete = async (client_id, token, cb) => {
  try {
    cb({
      success: true,
      message: `We are currently bulk deleting the inventories ...`,
    });

    const response = await fetchInventories(client_id, token, {
      onlyPublished: true,
    });

    if (!response.ok) throw new Error("Network error occurred");
    const { inventory } = await response.json();

    let search_index = inventory.map(({ year, make }) => `${year} ${make}`);
    let post_ids = inventory.map(({ post_id }) => post_id + "");
    search_index = [...new Set(search_index)];

    console.log(search_index);

    for (const search_term of search_index) {
      await deleteBySearchIndex(search_term, post_ids);
    }
  } catch (error) {
    cb({ success: false, error: "There were some errors bulk deleting ..." });
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
    const { inventory, enable_group_posting, fbmp_list_of_groups } =
      await response.json();

    let published_inventories = 0;

    for (const vehicle of inventory) {
      let { post_id, stock_no, modification_hash } = vehicle;
      vehicle.enable_group_posting = enable_group_posting;
      vehicle.fbmp_list_of_groups = fbmp_list_of_groups;

      let result = null;

      let { facebook_status } = vehicle;
      if (["UPDATED", "PUBLISHED", "DRAFT"].includes(facebook_status)) {
        continue;
      }

      if (["TO BE UPDATED", "SOLD"].includes(facebook_status)) {
        let current_status = await checkIfInvalidOrSold(post_id);
        if (current_status === "TO BE DELETED") {
          await deleteOneLog(client_id, token, post_id);
          continue;
        }
      }

      if (!facebook_status) {
        if (++published_inventories > 15) {
          break;
        }

        result = await publishInventory(vehicle);
      } else if (post_id) {
        result = await updateInventory(vehicle, post_id);
      }

      if (result?.status) {
        await updateLog(client_id, token, {
          stock_no,
          post_id: result.post_id,
          current_modification_hash: modification_hash,
          status: result.status,
        });
      }
    }
  } catch (error) {
    cb({ success: false, error: "There were some errors" });
  }
};

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
            "js/facebook/injection/is_invalid_or_sold.js",
          ],
        });

        await chrome.tabs.remove(tab.id);

        return result.result;
      }
    }

    return "TO BE DELETED";
  } catch (error) {
    return "";
  }
}

async function deleteBySearchIndex(search, post_ids) {
  try {
    if (search) {
      if (search.trim() !== "") {
        const tab = await chrome.tabs.create({
          url: `https://www.facebook.com/marketplace/you/selling`,
          active: false,
        });

        await sleep(500);

        await chrome.tabs.update(tab.id, {
          active: true,
        });

        await waitForTabToLoad(tab.id);
        await sleep(5000);

        await setSearchIndexForTab(tab.id, search, post_ids);

        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            "js/facebook/injection/helpers.js",
            "js/facebook/injection/bulk_delete.js",
          ],
        });

        //await chrome.tabs.remove(tab.id);

        return result.result;
      }
    }
  } catch (error) {
    return "";
  }
}

async function updateInventory(vehicle, post_id) {
  try {
    const tab = await chrome.tabs.create({
      url: `https://www.facebook.com/marketplace/edit/?listing_id=${post_id}`,
      active: true,
    });

    await waitForTabToLoad(tab.id);
    await sleep(5000);

    await setVehicleDataForTab(tab.id, vehicle);

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "js/facebook/injection/helpers.js",
        "js/facebook/injection/update.js",
      ],
    });

    console.log(result);

    result.result.post_id = post_id;

    await chrome.tabs.remove(tab.id);
    return result.result;
  } catch (error) {
    return "";
  }
}

async function publishInventory(vehicle) {
  try {
    const tab = await chrome.tabs.create({
      url: `https://www.facebook.com/marketplace/create/vehicle`,
      active: false,
    });

    await sleep(500);

    await chrome.tabs.update(tab.id, {
      active: true,
    });

    await waitForTabToLoad(tab.id);
    await injectGraphqlInterceptor(tab.id);
    await sleep(5000);

    await setVehicleDataForTab(tab.id, vehicle);

    const postIdPromise = waitForMarketplacePostId(tab.id, 300000);

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "js/facebook/injection/helpers.js",
        "js/facebook/injection/image_upload.js",
        "js/facebook/injection/publish.js",
      ],
    });

    const post_id = await postIdPromise;

    console.log("Marketplace post ID:", post_id);
    console.log(result);

    result.result.post_id = post_id;

    await chrome.tabs.remove(tab.id);
    return result.result;
  } catch (error) {
    return "";
  }
}

async function markAsSold(post_id) {
  try {
    if (post_id) {
      if (post_id.trim() !== "") {
        const tab = await chrome.tabs.create({
          url: `https://www.facebook.com/marketplace/item/${post_id}`,
          active: false,
        });

        await sleep(500);

        await chrome.tabs.update(tab.id, {
          active: true,
        });

        await waitForTabToLoad(tab.id);
        await sleep(5000);

        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            "js/facebook/injection/helpers.js",
            "js/facebook/injection/sold.js",
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
    }, 300000);

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

async function setSearchIndexForTab(tabId, search, post_ids) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (search_index, post_ids) => {
      window.search_index = search_index;
      window.post_ids = post_ids;
    },
    args: [search, post_ids],
  });
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

async function waitForMarketplacePostId(tabId, timeout = 300000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => window.__zopMarketplacePostId || "",
    });

    if (result.result) {
      return result.result;
    }

    await sleep(500);
  }

  return "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function injectGraphqlInterceptor(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      if (window.__zopGraphqlInterceptorInstalled) {
        return;
      }

      window.__zopGraphqlInterceptorInstalled = true;
      window.__zopMarketplacePostId = "";

      const originalFetch = window.fetch;

      window.fetch = async (...args) => {
        const response = await originalFetch(...args);

        try {
          const url = typeof args[0] === "string" ? args[0] : args[0]?.url;

          if (url && url.includes("/api/graphql")) {
            const clonedResponse = response.clone();
            const text = await clonedResponse.text();

            const postId = extractMarketplacePostIdFromText(text);

            if (postId) {
              window.__zopMarketplacePostId = postId;
            }
          }
        } catch (error) {
          console.warn("GraphQL fetch intercept failed:", error);
        }

        return response;
      };

      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__zopUrl = url;
        return originalOpen.call(this, method, url, ...rest);
      };

      XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener("load", function () {
          try {
            if (
              this.__zopUrl &&
              String(this.__zopUrl).includes("/api/graphql")
            ) {
              const postId = extractMarketplacePostIdFromText(
                this.responseText,
              );

              if (postId) {
                window.__zopMarketplacePostId = postId;
              }
            }
          } catch (error) {
            console.warn("GraphQL XHR intercept failed:", error);
          }
        });

        return originalSend.apply(this, args);
      };

      function extractMarketplacePostIdFromText(text) {
        try {
          if (!text) return "";

          const json = JSON.parse(text);

          return (
            json?.data?.marketplace_listing_create?.listing?.id ||
            json?.data?.marketplace_listing_update?.listing?.id ||
            ""
          );
        } catch {
          return "";
        }
      }
    },
  });
}
