(async () => {
  const {
    findSpansContainingText,
    findSpansWithExactText,
    clickElement,
    fillInput,
    elementExists,
    findDomsContainingText,
  } = window.domHelpers;

  async function publishInventory() {
    const { mapper } = window.vehicleMapper;
    const data = mapper(window.vehicle_data);
    const response = {
      status: "DRAFT",
    };

    await sleep(3000);
    const vehicle_type_doms = findSpansWithExactText("Vehicle type");
    // Vehicle type

    if (vehicle_type_doms.length < 1) {
      return;
    }

    clickElement(findSpansWithExactText("Vehicle type")[0]);
    await sleep(3000);

    clickElement(findSpansWithExactText(data.vehicle_type)[0]);

    if (data.location.trim().length > 0) {
      await fillInput('input[aria-label="Location"]', data.location);
      await sleep(3000);
      clickElement(findSpansWithExactText(data.location)[0]);
    }
    await sleep(3000);

    if (data.image_urls.length > 0) {
      console.log(data.image_urls);
      await uploadMultipleImagesToFacebookMarketplace(data.image_urls);
    }

    clickElement(findSpansWithExactText("Year")[0]);
    await sleep(3000);

    clickElement(findSpansWithExactText(data.year)[0]);

    await fillInputByLabelOrDropdown("Make", data.make);
    await fillInputByLabelOrDropdown("Model", data.model);

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
    const publish_button = document.querySelector(`div[aria-label="Publish"]`);

    if (next_button) {
      if (next_button.getAttribute("aria-disabled")) {
        clickElement(draft_button);
        return response;
      }
    }

    if (publish_button) {
      if (publish_button.getAttribute("aria-disabled")) {
        clickElement(draft_button);
      } else {
        response.status = "PUBLISHED";
        clickElement(publish_button);
      }
      return response;
    }

    clickElement(next_button);
    await sleep(3000);

    if (elementExists(`input[aria-label="Location"]`)) {
      if (data.location.trim().length > 0) {
        await fillInput('input[aria-label="Location"]', data.location);
        await sleep(3000);
        clickElement(findSpansWithExactText(data.location)[0]);
      }
    }

    await sleep(3000);

    if (next_button) {
      if (next_button.getAttribute("aria-label") === "Next") {
        if (!next_button.getAttribute("aria-disabled")) {
          clickElement(next_button);
        }
      }
    }

    await sleep(3000);

    if (data.enable_group_posting === "1") {
      let group_posting_section = findSpansWithExactText("List in your groups");

      if (group_posting_section.length > 0) {
        let fbmp_list_of_groups = data.fbmp_list_of_groups.slice(0, 20);
        for (const fbmp_group_name of fbmp_list_of_groups) {
          let current_dom = findDomsContainingText(
            fbmp_group_name,
            "div[role='checkbox']",
          );

          if (current_dom.length > 0) {
            clickElement(current_dom[0]);
          }
        }
      }
    }

    if (next_button) {
      if (next_button.getAttribute("aria-label") === "Publish") {
        if (next_button.getAttribute("aria-disabled")) {
          clickElement(draft_button);
        } else {
          response.status = "PUBLISHED";
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
    await sleep(3000);

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

    await sleep(3000);
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

    await sleep(3000);
  }

  async function uploadMultipleImagesToFacebookMarketplace(imageUrls) {
    for (let index = 0; index < imageUrls.length && index < 20 ; index++) {
      const imageUrl = imageUrls[index];

      try {
        ImageUploadSingleton.upload(imageUrl, index + 1);

        await sleep(5000);
      } catch (error) {
        console.error(`Error: ${e}`);
      }
    }
  }

  return publishInventory();
})();
