import { fetchInventories, updateLog, deleteOneLog } from "../zopsoftware.js";

export const markInventoriesAsSold = async (client_id, token, process) => {
  try {
    await process.notify({
      success: true,
      running: true,
      message: `We are marking the inventories as SOLD ...`,
    });

    const response = await fetchInventories(client_id, token, {
      onlySold: true,
    });

    if (!response.ok) throw new Error("Network error occurred");
    const { inventory } = await response.json();

    for (const vehicle of inventory) {
      process.checkStopped();

      let { post_id, stock_no, modification_hash } = vehicle;

      await process.notify({
        success: true,
        running: true,
        message: `Marking ${stock_no || "inventory"} as SOLD ...`,
        stock_no,
        post_id,
      });

      let result = await markAsSold(post_id, process);

      if (result === "SOLD" && post_id.trim() !== "") {
        await process.notify({
          success: true,
          running: true,
          message: `${stock_no || "Inventory"} marked as SOLD.`,
          stock_no,
          post_id,
          status: "SOLD",
        });

        await updateLog(client_id, token, {
          stock_no,
          post_id,
          current_modification_hash: modification_hash,
          status: "SOLD",
        });
      }
    }

    await process.notify({
      success: true,
      running: false,
      message: "Finished marking inventories as SOLD.",
    });

    return {
      success: true,
      message: "Finished marking inventories as SOLD.",
    };
  } catch (error) {
    if (error.message === "PROCESS_STOPPED") {
      await process.notify({
        success: false,
        stopped: true,
        running: false,
        message: "Mark as SOLD process stopped.",
      });

      throw error;
    }

    await process.notify({
      success: false,
      running: false,
      error: "There were some errors",
    });

    throw error;
  }
};

export const onlyBulkDelete = async (client_id, token, process) => {
  try {
    await process.notify({
      success: true,
      running: true,
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
    console.log(post_ids);

    for (const search_term of search_index) {
      process.checkStopped();

      await process.notify({
        success: true,
        running: true,
        message: `Deleting listings for ${search_term} ...`,
        search_term,
      });

      await deleteBySearchIndex(search_term, post_ids, process);

      await process.notify({
        success: true,
        running: false,
        message: "Bulk deleting completed.",
      });
    }

    return {
      success: true,
      message: "Bulk Deleting completed.",
    };
  } catch (error) {
    if (error.message === "PROCESS_STOPPED") {
      await process.notify({
        success: false,
        stopped: true,
        running: false,
        message: "Bulk deleting stopped.",
      });

      throw error;
    }

    await process.notify({
      success: false,
      running: false,
      error: "There were some errors bulk deleting ...",
    });

    throw error;
  }
};

export const publishAndUpdate = async (client_id, token, process) => {
  try {
    await process.notify({
      success: true,
      running: true,
      message: `We are currently publishing and updating the inventories ...`,
    });

    const response = await fetchInventories(client_id, token);

    if (!response.ok) throw new Error("Network error occurred");
    const { inventory, enable_group_posting, fbmp_list_of_groups } =
      await response.json();

    let published_inventories = 0;

    for (const vehicle of inventory) {
      process.checkStopped();

      let { post_id, stock_no, modification_hash } = vehicle;
      vehicle.enable_group_posting = enable_group_posting;
      vehicle.fbmp_list_of_groups = fbmp_list_of_groups;

      let result = null;

      let { facebook_status } = vehicle;
      if (["UPDATED", "PUBLISHED", "DRAFT"].includes(facebook_status)) {
        continue;
      }

      if (["TO BE UPDATED", "SOLD"].includes(facebook_status)) {
        let current_status = await checkIfInvalidOrSold(post_id, process);
        if (current_status === "TO BE DELETED") {
          await deleteOneLog(client_id, token, post_id);
          continue;
        }
      }

      await process.notify({
        success: true,
        running: true,
        message: `Processing ${stock_no || "inventory"} ...`,
        stock_no,
        facebook_status,
      });

      if (!facebook_status) {
        if (++published_inventories > 15) {
          break;
        }

        result = await publishInventory(vehicle, process);
      } else if (post_id) {
        result = await updateInventory(vehicle, post_id, process);
      }

      if (result?.status) {
        await updateLog(client_id, token, {
          stock_no,
          post_id: result.post_id,
          current_modification_hash: modification_hash,
          status: result.status,
        });

        await process.notify({
          success: true,
          running: true,
          message: `Updated log for ${stock_no || "inventory"}.`,
          stock_no,
          post_id: result.post_id,
          status: result.status,
        });
      }
    }

    await process.notify({
      success: true,
      running: false,
      message: `Publishing and updating completed.`,
    });

    return {
      success: true,
      message: "Publishing and updating completed.",
    };
  } catch (error) {
    if (error.message === "PROCESS_STOPPED") {
      await process.notify({
        success: false,
        stopped: true,
        running: false,
        message: "Publishing and updating stopped.",
      });

      throw error;
    }

    await process.notify({
      success: false,
      running: false,
      error: "There were some errors",
    });

    throw error;
  }
};

async function checkIfInvalidOrSold(post_id, process) {
  let tab = null;

  try {
    if (post_id) {
      if (post_id.trim() !== "") {
        process.checkStopped();

        tab = await process.create({
          url: `https://www.facebook.com/marketplace/item/${post_id}`,
          active: false,
        });

        await process.waitForTabToLoad(tab.id);
        await process.sleep(5000);

        const [result] = await process.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            "js/facebook/injection/helpers.js",
            "js/facebook/injection/is_invalid_or_sold.js",
          ],
        });

        await process.closeTab(tab.id);

        return result.result;
      }
    }

    return "TO BE DELETED";
  } catch (error) {
    if (tab?.id) {
      await process.closeTab(tab.id);
    }

    if (error.message === "PROCESS_STOPPED") {
      throw error;
    }

    return "";
  }
}

async function deleteBySearchIndex(search, post_ids, process) {
  let tab = null;

  try {
    if (!search || search.trim() === "") {
      return "";
    }

    if (search.trim() !== "") {
      process.checkStopped();

      tab = await process.createTab({
        url: `https://www.facebook.com/marketplace/you/selling`,
        active: false,
      });

      await process.sleep(500);

      await process.updateTab(tab.id, {
        active: true,
      });

      await process.waitForTabToLoad(tab.id);
      await process.sleep(5000);

      await setSearchIndexForTab(tab.id, search, post_ids, process);

      const [result] = await process.executeScript(tab.id, {
        files: [
          "js/facebook/injection/helpers.js",
          "js/facebook/injection/bulk_delete.js",
        ],
      });

      await process.closeTab(tab.id);

      return result?.result || "";
    }
  } catch (error) {
    if (tab?.id) {
      await process.closeTab(tab.id);
    }

    if (error.message === "PROCESS_STOPPED") {
      throw error;
    }

    console.error("deleteBySearchIndex failed:", error);

    return "";
  }
}

async function updateInventory(vehicle, post_id, process) {
  let tab = null;
  try {
    process.checkStopped();

    tab = await process.createTab({
      url: `https://www.facebook.com/marketplace/edit/?listing_id=${post_id}`,
      active: true,
    });

    await process.waitForTabToLoad(tab.id);
    await process.sleep(5000);

    await setVehicleDataForTab(tab.id, vehicle, process);

    const [result] = await process.executeScript(tab.id, {
      files: [
        "js/facebook/injection/helpers.js",
        "js/facebook/injection/update.js",
      ],
    });

    if (result?.result) {
      result.result.post_id = post_id;
    }

    await process.closeTab(tab.id);

    return result?.result || "";
    return result.result;
  } catch (error) {
    if (tab?.id) {
      await process.closeTab(tab.id);
    }

    if (error.message === "PROCESS_STOPPED") {
      throw error;
    }

    console.error("updateInventory failed:", error);

    return "";
  }
}

async function publishInventory(vehicle, process) {
  let tab = null;

  try {
    tab = await process.createTab({
      url: `https://www.facebook.com/marketplace/create/vehicle`,
      active: true,
    });

    await process.sleep(500);

    await process.waitForTabToLoad(tab.id);
    await injectGraphqlInterceptor(tab.id, process);
    await process.sleep(5000);

    await setVehicleDataForTab(tab.id, vehicle, process);

    const postIdPromise = waitForMarketplacePostId(tab.id, 420000, process);

    const [result] = await process.executeScript(tab.id, {
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

    await process.closeTab(tab.id);
    return result.result;
  } catch (error) {
    if (tab?.id) {
      await process.closeTab(tab.id);
    }

    if (error.message === "PROCESS_STOPPED") {
      throw error;
    }

    console.error("publishInventory failed:", error);
    return "";
  }
}

async function markAsSold(post_id, process) {
  let tab = null;

  try {
    if (post_id) {
      if (post_id.trim() !== "") {
        process.checkStopped();

        const tab = await process.createTab({
          url: `https://www.facebook.com/marketplace/item/${post_id}`,
          active: true,
        });

        await process.sleep(500);

        await process.waitForTabToLoad(tab.id);
        await process.sleep(5000);

        const [result] = await process.executeScript(tab.id, {
          files: [
            "js/facebook/injection/helpers.js",
            "js/facebook/injection/sold.js",
          ],
        });
        await process.closeTab(tab.id);

        return result?.result || "";
      }
    }
  } catch (error) {
    if (tab?.id) {
      await process.closeTab(tab.id);
    }

    if (error.message === "PROCESS_STOPPED") {
      throw error;
    }

    console.error("markAsSold failed:", error);

    return "";
  }
}

function clickElement(element) {
  element.scrollIntoView({
    behavior: "instant",
    block: "center",
    inline: "center",
  });

  element.click();
}

async function setSearchIndexForTab(tabId, search, post_ids, process) {
  await process.executeScript(tabId, {
    func: (search_index, post_ids) => {
      window.search_index = search_index;
      window.post_ids = post_ids;
    },
    args: [search, post_ids],
  });
}

async function setVehicleDataForTab(tabId, data, process) {
  await process.executeScript(tabId, {
    func: (vehicle_data) => {
      window.vehicle_data = vehicle_data;
    },
    args: [data],
  });
}

async function waitForMarketplacePostId(tabId, timeout = 300000, process) {
  try {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      process.checkStopped();

      const [result] = await process.executeScript(tabId, {
        world: "MAIN",
        func: () => window.__zopMarketplacePostId || "",
      });

      if (result?.result) {
        return result.result;
      }

      await process.sleep(500);
    }
  } catch (error) {
    if (error.message === "PROCESS_STOPPED") {
      throw error;
    }

    console.log(error);
  }

  return "";
}

async function injectGraphqlInterceptor(tabId, process) {
  await process.executeScript(tabId, {
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
