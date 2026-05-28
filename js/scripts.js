(function () {
  const setup_button = document.getElementById("saveConfigBtn");
  const reset_setup_button = document.getElementById("resetConfigBtn");
  const client_id_input = document.getElementById("clientIdInput");
  const token_input = document.getElementById("tokenInput");
  const config_status_dom = document.getElementById("configStatus");

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
    const data = await chrome.storage.local.get(["client_id", "token"]);

    if (data.client_id) {
      client_id_input.value = data.client_id;
    }

    if (data.token) {
      token_input.value = data.token;
    }
  }

  setup_button.addEventListener("click", async function (event) {
    event.preventDefault();

    const client_id_value = client_id_input.value.trim();
    const token_input_value = token_input.value.trim();

    showMessage();

    if (client_id_value.length === 0 || token_input_value.length === 0) {
      showMessage("Client ID or Token is missing", true);

      return;
    }

    showMessage("We are validating the credentials ...");

    const response = await chrome.runtime.sendMessage({
      type: "SAVE_CONFIG",
      payload: {
        client_id: client_id_value,
        token: token_input_value,
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
  });

  loadConfig();
})();
