for (const group of document.querySelectorAll("[data-choice]")) {
  group.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-value]");
    if (!button) return;
    document.body.dataset[group.dataset.choice] = button.dataset.value;
    for (const sibling of group.querySelectorAll("button")) {
      sibling.setAttribute("aria-pressed", String(sibling === button));
    }
  });
}

const menuButton = document.querySelector(".menu-button");
const menuSheet = document.querySelector(".mobile-sheet");
const menuClose = document.querySelector(".sheet-close");

if (menuButton && menuSheet && menuClose) {
  menuButton.addEventListener("click", () => {
    menuSheet.showModal();
    menuButton.setAttribute("aria-expanded", "true");
  });
  menuClose.addEventListener("click", () => menuSheet.close());
  menuSheet.addEventListener("close", () => menuButton.setAttribute("aria-expanded", "false"));
  menuSheet.addEventListener("click", (event) => {
    if (event.target === menuSheet) menuSheet.close();
  });
}
