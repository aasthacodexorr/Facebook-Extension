(function () {
  const setup_button = document.getElementById("saveConfigBtn");
  const reset_setup_button = document.getElementById("resetConfigBtn");
  const proceed_button = document.getElementById("proceedBtn");
  const stop_button = document.getElementById("stopBtn");
  const client_id_input = document.getElementById("clientIdInput");
  const token_input = document.getElementById("tokenInput");
  const country_select = document.getElementById("countrySelect");
  const host_permission_input = document.getElementById("hostPermissionInput");
  const config_status_dom = document.getElementById("configStatus");
  const connection_information_dom = document.getElementById(
    "connectionInformation",
  );
  const client_dom = document.getElementById("clientDom");
  const token_dom = document.getElementById("tokenDom");
  const host_permission_dom = document.getElementById("hostPermissionDom");
  const host_permission_row = document.getElementById("hostPermissionRow");
  const action_section_dom = document.getElementById("actionSection");
  const config_section_dom = document.getElementById("configSection");

  function formatHostPermission(input) {
    if (!input) return "";
    let str = input.trim();
    if (!str) return "";

    let scheme = "https://";
    const schemeMatch = str.match(/^([a-zA-Z*]+:\/\/)/);
    if (schemeMatch) {
      const rawScheme = schemeMatch[1].toLowerCase();
      if (
        rawScheme === "http://" ||
        rawScheme === "https://" ||
        rawScheme === "*://"
      ) {
        scheme = rawScheme;
      }
      str = str.slice(schemeMatch[0].length);
    } else if (str.startsWith("//")) {
      str = str.slice(2);
    }

    // Extract domain part (before any path, query, hash)
    let domain = str.split(/[/?#]/)[0].trim().toLowerCase();

    // Strip port if present
    if (domain.includes(":") && !domain.includes("]")) {
      domain = domain.split(":")[0];
    }

    // Remove any trailing stars or slashes if left
    domain = domain.replace(/^\/+|\/+$/g, "");

    const domainRegex =
      /^(\*|(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9-]{2,})$/;
    if (!domainRegex.test(domain)) {
      return null;
    }

    return `${scheme}${domain}/*`;
  }

  if (typeof window !== "undefined") {
    window.formatHostPermission = formatHostPermission;
  }

  function showMessage(message, isError = false) {
    config_status_dom.innerText = message;
    config_status_dom.classList.remove("d-none");

    if (isError) {
      config_status_dom.classList.add("error");
    } else {
      config_status_dom.classList.remove("error");
    }
  }

  async function loadConfig() {
    const data = await chrome.storage.local.get([
      "client_id",
      "token",
      "show_setup",
      "country",
      "host_permission",
    ]);

    if (data.client_id) {
      client_id_input.value = data.client_id;
      client_dom.innerText = data.client_id;
    }

    if (data.token) {
      token_input.value = data.token;
      token_dom.innerText =
        "*".repeat(data.token.length - 4) + data.token.slice(-4);
    }

    if (data.country) {
      country_select.value = data.country;
    }

    if (data.host_permission) {
      if (host_permission_input) {
        host_permission_input.value = data.host_permission;
      }
      if (host_permission_dom) {
        host_permission_dom.innerText = data.host_permission;
      }
      if (host_permission_row) {
        host_permission_row.classList.remove("d-none");
      }
    } else {
      if (host_permission_input) {
        host_permission_input.value = "";
      }
      if (host_permission_dom) {
        host_permission_dom.innerText = "";
      }
      if (host_permission_row) {
        host_permission_row.classList.add("d-none");
      }
    }

    if (data.show_setup) {
      connection_information_dom.classList.add("d-none");
      action_section_dom.classList.add("d-none");
      config_section_dom.classList.remove("d-none");
    } else {
      connection_information_dom.classList.remove("d-none");
      action_section_dom.classList.remove("d-none");
      config_section_dom.classList.add("d-none");
    }
  }

  setup_button.addEventListener("click", async function (event) {
    event.preventDefault();

    const client_id_value = client_id_input.value.trim();
    const token_input_value = token_input.value.trim();
    const country_select_value = country_select.value.trim();
    const host_permission_raw = host_permission_input
      ? host_permission_input.value.trim()
      : "";

    showMessage();

    if (client_id_value.length === 0 || token_input_value.length === 0) {
      showMessage("Client ID or Token is missing", true);

      return;
    }

    let formatted_host_permission = "";
    if (host_permission_raw.length > 0) {
      formatted_host_permission = formatHostPermission(host_permission_raw);
      if (!formatted_host_permission) {
        showMessage(
          "Invalid host permission format. Please enter a qualified domain (e.g., https://cdn.example.com/*).",
          true,
        );
        return;
      }

      host_permission_input.value = formatted_host_permission;

      try {
        const hasPermission = await chrome.permissions.contains({
          origins: [formatted_host_permission],
        });

        if (!hasPermission) {
          const granted = await chrome.permissions.request({
            origins: [formatted_host_permission],
          });

          if (!granted) {
            showMessage(
              "Host permission was not granted. Please approve the permission request to proceed.",
              true,
            );
            return;
          }
        }
      } catch (permissionError) {
        console.error("Failed to request host permission:", permissionError);
        showMessage(
          permissionError.message || "Failed to request host permission.",
          true,
        );
        return;
      }
    }

    showMessage("We are validating the credentials ...");

    const response = await chrome.runtime.sendMessage({
      type: "SAVE_CONFIG",
      payload: {
        client_id: client_id_value,
        token: token_input_value,
        country: country_select_value,
        host_permission: formatted_host_permission,
      },
    });

    if (!response.success) {
      showMessage(
        response.message ||
          "We couldn’t verify your credentials, or you don’t currently have any inventory eligible for Facebook Marketplace.",
        true,
      );
      return;
    }

    showMessage("Configuration saved successfully.");
    loadConfig();
  });

  stop_button.addEventListener("click", async function (event) {
    event.preventDefault();

    await chrome.runtime.sendMessage({
      type: "STOP_PROCESS",
    });
  });

  reset_setup_button.addEventListener("click", async function (event) {
    event.preventDefault();

    await chrome.storage.local.set({
      show_setup: true,
    });

    loadConfig();
  });

  proceed_button.addEventListener("click", async function (event) {
    event.preventDefault();
    loadConfig();

    const action_value =
      document.querySelector('input[name="action"]:checked')?.value || null;

    const response = await chrome.runtime.sendMessage({
      type: action_value,
      payload: {
        client_id: client_id_input.value,
        token: token_input.value,
      },
    });

    if (!response.success) {
      showMessage(
        response.message ||
          "We couldn’t verify your credentials, or you don’t currently have any inventory eligible for Facebook Marketplace.",
        true,
      );
      return;
    } else {
      showMessage(response.message);
    }
  });

  loadConfig();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== "PROCESS_UPDATE") {
      return;
    }
    const payload = message.payload || {};
    console.log("Process update:", payload);

    let process_update_message =
      payload?.message ||
      (payload ? JSON.stringify(payload) : "No message provided");

    if (payload?.success) {
      showMessage(process_update_message);
    } else {
      showMessage(process_update_message, true);
    }
  });
})();
