(async () => {
  const {
    findSpansContainingText,
    findSpansWithExactText,
    findDomsContainingText,
    findFieldByLabel,
    findInputInField,
    selectDropdownOption,
    clickElement,
    fillInput,
    setNativeValue,
    elementExists,
    sleep,
  } = window.domHelpers;

  function getNextBtn() {
    return (
      document.querySelector(
        'div[aria-label="Next"][role="button"], div[aria-label="Next"], button[aria-label="Next"]',
      ) ||
      [...document.querySelectorAll('div[role="button"], button')].find(
        (el) => (el.textContent || "").trim() === "Next",
      )
    );
  }

  function getPublishBtn() {
    return (
      document.querySelector(
        'div[aria-label="Publish"][role="button"], div[aria-label="Publish"], button[aria-label="Publish"]',
      ) ||
      [...document.querySelectorAll('div[role="button"], button')].find(
        (el) => (el.textContent || "").trim() === "Publish",
      )
    );
  }

  function getDraftBtn() {
    return document.querySelector(
      'div[aria-label="Save draft"][role="button"], div[aria-label="Save draft"], button[aria-label="Save draft"]',
    );
  }

  function isBtnDisabled(btn) {
    if (!btn) return true;
    return btn.getAttribute("aria-disabled") === "true" || btn.disabled === true;
  }

  async function fillInputByLabelOrDropdown(labelText, value) {
    if (!value) return;
    const field = findFieldByLabel(labelText);
    if (!field) return;

    const input = findInputInField(field);
    if (input) {
      setNativeValue(input, value);
      await sleep(1500);

      // Check if autocomplete popup appeared with options
      const options = document.querySelectorAll(
        'div[role="listbox"] div[role="option"], div[role="option"]',
      );
      if (options.length > 0) {
        const valLower = String(value).trim().toLowerCase();
        const matched = [...options].find((opt) =>
          (opt.textContent || "").trim().toLowerCase().includes(valLower),
        );
        if (matched) {
          clickElement(matched);
          await sleep(1000);
          return;
        }
      }
      return;
    }

    // Otherwise treat as a dropdown
    await selectDropdownOption(field, value);
    await sleep(1500);
  }

  async function fillInputByLabel(labelText, value, selector = "input") {
    if (!value) return;
    const field = findFieldByLabel(labelText);
    if (!field) return;

    const input =
      field.matches && field.matches(selector)
        ? field
        : field.querySelector(selector);
    if (input) {
      setNativeValue(input, value);
      await sleep(1000);
    }
  }

  async function uploadMultipleImagesToFacebookMarketplace(imageUrls) {
    for (let index = 0; index < imageUrls.length && index < 20; index++) {
      const imageUrl = imageUrls[index];
      try {
        await ImageUploadSingleton.upload(imageUrl, index + 1);
        await sleep(5000);
      } catch (error) {
        console.error("Error uploading image to Facebook:", error);
      }
    }
  }

  async function handleGroupPosting(groups) {
    try {
      const groupSection = findSpansContainingText("List in your groups");
      if (groupSection.length === 0) return;

      const groupList = groups.slice(0, 20);
      for (const groupName of groupList) {
        const matchedCheckboxes = findDomsContainingText(
          groupName,
          "div[role='checkbox'], label, div[role='button']",
        );
        if (matchedCheckboxes.length > 0) {
          const checkbox =
            matchedCheckboxes[0].querySelector("div[role='checkbox']") ||
            matchedCheckboxes[0];
          clickElement(checkbox);
          await sleep(500);
        }
      }
    } catch (e) {
      console.warn("Group posting error:", e);
    }
  }

  async function publishInventory() {
    const { mapper } = window.vehicleMapper;
    const data = mapper(window.vehicle_data || {});
    const response = {
      status: "DRAFT",
    };

    console.log("Starting vehicle publishing with data:", data);

    // Initial wait for Facebook create form to initialize
    await sleep(4000);

    // 1. Vehicle Type (Optional on /create/vehicle as it is often pre-selected to Car/truck)
    try {
      const vehicleTypeField = findFieldByLabel("Vehicle type");
      if (vehicleTypeField) {
        const desiredType = data.vehicle_type || "Car/truck";
        await selectDropdownOption(vehicleTypeField, desiredType);
        await sleep(2000);
      }
    } catch (e) {
      console.warn("Vehicle type selection skipped:", e);
    }

    // 2. Location (if present on Step 1)
    if (data.location && data.location.length > 0) {
      try {
        const locInput = document.querySelector('input[aria-label*="Location" i]');
        if (locInput) {
          setNativeValue(locInput, data.location);
          await sleep(3000);
          const suggestion = document.querySelector(
            'div[role="listbox"] div[role="option"], div[role="option"]',
          );
          if (suggestion) {
            clickElement(suggestion);
            await sleep(1500);
          }
        }
      } catch (e) {
        console.warn("Location input error:", e);
      }
    }

    // 3. Vehicle Photos
    if (data.image_urls && data.image_urls.length > 0) {
      console.log(`Uploading ${data.image_urls.length} images...`);
      await uploadMultipleImagesToFacebookMarketplace(data.image_urls);
      await sleep(3000);
    }

    // 4. Year
    if (data.year) {
      const yearField = findFieldByLabel("Year");
      if (yearField) {
        await selectDropdownOption(yearField, data.year);
        await sleep(2000);
      }
    }

    // 5. Make
    if (data.make) {
      await fillInputByLabelOrDropdown("Make", data.make);
      // Wait for Facebook to query models for this make
      await sleep(3000);
    }

    // 6. Model
    if (data.model) {
      await fillInputByLabelOrDropdown("Model", data.model);
      await sleep(2000);
    }

    // 7. Mileage
    if (data.odometer) {
      await fillInputByLabel("Mileage", data.odometer, "input");
    }

    // 8. Price
    if (data.price) {
      await fillInputByLabel("Price", data.price, "input");
    }

    // 9. Additional Vehicle Attributes
    if (data.body_type) {
      await fillInputByLabelOrDropdown("Body style", data.body_type);
    }
    if (data.exterior_color) {
      await fillInputByLabelOrDropdown("Exterior color", data.exterior_color);
    }
    if (data.interior_color) {
      await fillInputByLabelOrDropdown("Interior color", data.interior_color);
    }
    if (data.vehicle_condition) {
      await fillInputByLabelOrDropdown("Vehicle condition", data.vehicle_condition);
    }
    if (data.fuel_type) {
      await fillInputByLabelOrDropdown("Fuel type", data.fuel_type);
    }
    if (data.transmission) {
      await fillInputByLabelOrDropdown("Transmission", data.transmission);
    }

    // 10. Description
    if (data.vehicle_description) {
      await fillInputByLabel("Description", data.vehicle_description, "textarea");
    }

    await sleep(3000);

    // 11. Navigation / Publishing
    let pubBtn = getPublishBtn();
    if (pubBtn && !isBtnDisabled(pubBtn)) {
      response.status = "PUBLISHED";
      clickElement(pubBtn);
      await sleep(3000);
      return response;
    }

    let nextBtn = getNextBtn();
    if (!nextBtn) {
      // If no Next button and no Publish button, check if draft button exists
      const draftBtn = getDraftBtn();
      if (draftBtn) clickElement(draftBtn);
      return response;
    }

    // Wait up to 10 seconds for Next button to become enabled if Facebook is still validating
    for (let i = 0; i < 10; i++) {
      if (!isBtnDisabled(nextBtn)) break;
      await sleep(1000);
      nextBtn = getNextBtn();
    }

    if (isBtnDisabled(nextBtn)) {
      console.warn("Next button remains disabled. Saving as draft.");
      const draftBtn = getDraftBtn();
      if (draftBtn) clickElement(draftBtn);
      return response;
    }

    // Click Next to advance
    clickElement(nextBtn);
    await sleep(6000);

    // Step 2: Check for Location again
    if (data.location && data.location.length > 0) {
      const locInput2 = document.querySelector('input[aria-label*="Location" i]');
      if (locInput2) {
        setNativeValue(locInput2, data.location);
        await sleep(2500);
        const suggestion = document.querySelector(
          'div[role="listbox"] div[role="option"], div[role="option"]',
        );
        if (suggestion) {
          clickElement(suggestion);
          await sleep(1500);
        }
      }
    }

    // Group posting if enabled
    if (data.enable_group_posting === "1" && data.fbmp_list_of_groups.length > 0) {
      await handleGroupPosting(data.fbmp_list_of_groups);
    }

    // Check for Publish on this step
    pubBtn = getPublishBtn();
    if (pubBtn && !isBtnDisabled(pubBtn)) {
      response.status = "PUBLISHED";
      clickElement(pubBtn);
      await sleep(3000);
      return response;
    }

    // If another Next button is present, click it
    nextBtn = getNextBtn();
    if (nextBtn && !isBtnDisabled(nextBtn)) {
      clickElement(nextBtn);
      await sleep(6000);

      pubBtn = getPublishBtn();
      if (pubBtn && !isBtnDisabled(pubBtn)) {
        response.status = "PUBLISHED";
        clickElement(pubBtn);
        await sleep(3000);
        return response;
      }
    }

    return response;
  }

  return publishInventory();
})();
