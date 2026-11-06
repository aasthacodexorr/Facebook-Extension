(async () => {
  const {
    findSpansContainingText,
    findSpansWithExactText,
    clickElement,
    sleep,
    fillInput,
    elementExists,
    findDomsContainingText,
  } = window.domHelpers;
  async function updateInventory() {
    const { mapper } = window.vehicleMapper;
    const data = mapper(window.vehicle_data);
    const response = {
      status: "NOT UPDATED",
    };

    await sleep(6000);
    const vehicle_type_doms = findSpansWithExactText("Vehicle type");
    // Vehicle type

    if (vehicle_type_doms.length < 1) {
      return;
    }

    await fillInputByLabel("Mileage", data.odometer);
    await fillInputByLabel("Price", data.price);

    await fillInputByLabelOrDropdown("Body style", data.body_type);
    await fillInputByLabelOrDropdown("Exterior color", data.exterior_color);
    await fillInputByLabelOrDropdown("Interior color", data.interior_color);
    await fillInputByLabelOrDropdown(
      "Vehicle condition",
      data.vehicle_condition,
    );
    await fillInputByLabelOrDropdown("Fuel type", data.fuel_type);
    await fillInputByLabelOrDropdown("Transmission", data.transmission);

    await fillInputByLabel("Description", data.vehicle_description, "textarea");

    const draft_button = document.querySelector(
      `div[aria-label="Save draft"][role="button"]`,
    );
    const next_button = document.querySelector(`div[aria-label="Next"]`);
    const update_button = document.querySelector(`div[aria-label="Update"]`);

    if (next_button) {
      if (next_button.getAttribute("aria-disabled")) {
        clickElement(draft_button);
        return response;
      }
    }

    if (update_button) {
      if (update_button.getAttribute("aria-disabled")) {
        clickElement(draft_button);
      } else {
        response.status = "UPDATED";
        clickElement(update_button);
      }
      return response;
    }

    clickElement(next_button);

    await sleep(6000);

    if (next_button) {
      if (next_button.getAttribute("aria-label") === "Next") {
        if (!next_button.getAttribute("aria-disabled")) {
          clickElement(next_button);
        }
      }
    }

    await sleep(6000);

    if (next_button) {
      if (next_button.getAttribute("aria-label") === "Update") {
        if (next_button.getAttribute("aria-disabled")) {
          clickElement(draft_button);
        } else {
          response.status = "UPDATED";
          clickElement(next_button);
        }
      }
    }

    return response;
  }

  async function fillInputByLabelOrDropdown(labelText, value) {
    const labels = findDomsContainingText(labelText, "label");

    if (labels.length === 0) {
      return;
    }

    const input = labels[0].querySelector('input[type="text"]');

    if (elementExists('input[type="text"]', labels[0])) {
      await fillInput('input[type="text"]', value, labels[0]);
    }

    clickElement(labels[0]);
    await sleep(6000);

    let options_menus = document.querySelectorAll(
      `div[aria-label="Select an option"]`,
    );
    if (options_menus.length === 0) {
      return;
    }

    let current_options =
      options_menus[options_menus.length - 1].querySelectorAll("span");
    correct_option = [...current_options].filter(
      (x) => x.textContent.trim().toLowerCase() === value.toLowerCase(),
    );

    if (correct_option.length > 0) {
      clickElement(correct_option[0]);
    }

    await sleep(6000);
  }

  async function fillInputByLabel(
    labelText,
    value,
    selector = 'input[type="text"]',
  ) {
    const labels = findDomsContainingText(labelText, "label");

    if (labels.length === 0) {
      return;
    }

    const input = labels[0].querySelector(selector);

    if (elementExists(selector, labels[0])) {
      await fillInput(selector, value, labels[0]);
    }

    await sleep(6000);
  }

  return updateInventory();
})();
