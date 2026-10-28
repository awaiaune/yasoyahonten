
(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const variants = document.querySelectorAll(
            'input[name="goldenrodVariant"]'
        );

        const amountElement =
            document.getElementById("productAmount");

        const priceElement =
            document.getElementById("productPrice");

        const cartButton =
            document.querySelector("[data-add-to-cart]");

        if (
            variants.length === 0 ||
            !amountElement ||
            !priceElement ||
            !cartButton
        ) {
            return;
        }

        const money = new Intl.NumberFormat("ja-JP", {
            style: "currency",
            currency: "JPY",
            maximumFractionDigits: 0
        });

        function updateVariant(selected) {
            document
                .querySelectorAll(".product-variant")
                .forEach((label) => {
                    label.classList.remove("is-selected");
                });

            selected
                .closest(".product-variant")
                ?.classList.add("is-selected");

            amountElement.textContent =
                selected.dataset.productAmount;

            priceElement.textContent =
                money.format(
                    Number(selected.dataset.productPrice)
                );

            cartButton.dataset.productId =
                selected.dataset.productId;

            cartButton.dataset.productName =
                selected.dataset.productName;

            cartButton.dataset.productPrice =
                selected.dataset.productPrice;
        }

        variants.forEach((variant) => {
            variant.addEventListener("change", () => {
                if (variant.checked) {
                    updateVariant(variant);
                }
            });
        });

        const initialVariant =
            document.querySelector(
                'input[name="goldenrodVariant"]:checked'
            );

        if (initialVariant) {
            updateVariant(initialVariant);
        }
    });
})();
