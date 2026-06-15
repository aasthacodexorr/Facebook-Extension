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

  if (!window.search_index || !window.post_ids) {
    return;
  }

  await sleep(5000);

  const { search_index, post_ids } = window;

  for (let listing_loop = 0; listing_loop < 2; listing_loop++) {
    let listing_page_title = findDomsContainingText("Your listings", "h2");

    if (listing_page_title.length < 1) {
      return;
    }

    let start_selling_disclaimer = findDomsContainingText(
      "When you start selling",
      "h2",
    );

    if (start_selling_disclaimer.length > 0) {
      console.log("Start Selling disclaimer. No Listings Found.");
      return;
    }

    if (listing_loop === 1) {
      await fillInput('input[aria-label="Search your listings"]', search_index);
    }

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });

    await sleep(5000);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    await sleep(5000);

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });

    await sleep(5000);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    await sleep(5000);

    const listings = findDomsContainingText(search_index, "span > span");

    for (const listing of listings) {
      console.log(listing);
      await sleep(5000);
      if (!listing.checkVisibility()) {
        continue;
      }

      clickElement(listing);
      await sleep(5000);

      const view_modal = findDomsContainingText(
        "Your Listing",
        "div[aria-label='Your Listing'][role='dialog']",
      );
      if (view_modal.length > 0) {
        let post_id = null;
        const edit_listing_dom = view_modal[0].querySelector(
          "a[aria-label='Edit Listing'][role='link']",
        );

        if (edit_listing_dom) {
          let url = edit_listing_dom.getAttribute("href");
          if (url) {
            post_id = url.match(/listing_id=(\d+)/)[1];
          }
        }

        const view_listing_dom = view_modal[0].querySelector(
          "a[aria-label='View Listing'][role='link']",
        );

        if (view_listing_dom) {
          let url = view_listing_dom.getAttribute("href");
          if (url) {
            post_id = url.match(/\/marketplace\/item\/(\d+)\//)[1];
          }
        }

        if (post_id && post_id !== "") {
          if (post_ids.includes(post_id)) {
            const delete_button = view_modal[0].querySelector(
              "div[aria-label='Delete marketplace listing'][role='button']",
            );

            clickElement(delete_button);
            await sleep(5000);

            const delete_modal = findDomsContainingText(
              "Are you sure you want to delete this listing?",
              "div[role='dialog']",
            );

            if (delete_modal.length > 0) {
              const delete_action_button = delete_modal[0].querySelector(
                "div[aria-label='Delete'][role='button']:not([aria-disabled='true']) span > span",
              );

              const delete_modal_close_button = delete_modal[0].querySelector(
                "div[aria-label='Close'][role='button']",
              );

              if (delete_action_button) {
                console.log(`${post_id} found. Deleting it ...`);

                clickElement(delete_action_button);
                await sleep(5000);
                await chrome.runtime.sendMessage({
                  type: "DELETE_ONE_LOG",
                  payload: {
                    post_id,
                  },
                });
              }

              await sleep(5000);

              if (delete_modal_close_button) {
                if (delete_modal_close_button.checkVisibility()) {
                  clickElement(delete_modal_close_button);
                }
              }
            }
          }
        }

        let main_view_modal_close_button = view_modal[0].querySelector(
          "div[aria-label='Close'][role='button']",
        );

        await sleep(5000);

        if (main_view_modal_close_button) {
          if (main_view_modal_close_button.checkVisibility()) {
            clickElement(main_view_modal_close_button);
          }
        }
      }
    }

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });

    await sleep(5000);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    await sleep(5000);
  }
})();
