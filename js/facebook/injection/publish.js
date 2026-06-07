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
      if (next_button.getAttribute("aria-label") === "Publish") {
        if (!next_button.getAttribute("aria-disabled")) {
          clickElement(next_button);
          response.status = "PUBLISHED";
          return response;
        }
      } else {
        clickElement(next_button);
        await sleep(3000);
      }
    }

    await sleep(3000);

    if (publish_button) {
      if (publish_button.getAttribute("aria-disabled")) {
        clickElement(draft_button);
      } else {
        response.status = "PUBLISHED";
        clickElement(publish_button);
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

  async function fetchImageAsFile(imageUrl, fileName = "image.jpg") {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/webp,image/avif,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`);
    }

    const blob = await response.blob();

    return new File([blob], fileName, {
      type: blob.type || "image/jpeg",
      lastModified: Date.now(),
    });
  }

  function findFacebookFileInput() {
    const dialogInput = document
      .querySelector('[role="dialog"] form')
      ?.querySelector('input[type="file"]');

    if (dialogInput) {
      return dialogInput;
    }

    const inputs = document.querySelectorAll('input[type="file"]');

    return inputs.length > 0 ? inputs[0] : null;
  }

  function uploadFileToFacebookInput(file) {
    const fileInput = findFacebookFileInput();

    if (!fileInput) {
      throw new Error("Facebook file input not found");
    }

    const dataTransfer = new DataTransfer();

    dataTransfer.items.add(file);

    fileInput.value = "";
    fileInput.files = dataTransfer.files;

    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function uploadMultipleImagesToFacebookMarketplace(imageUrls) {
    for (let index = 0; index < imageUrls.length; index++) {
      const imageUrl = imageUrls[index];

      const file = await fetchImageAsFile(
        imageUrl,
        `marketplace-image-${index + 1}.jpg`,
      );

      uploadFileToFacebookInput(file);

      await sleep(1000);
    }
  }

  return publishInventory();
})();
