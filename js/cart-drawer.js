(() => {
    "use strict";

    function ensureDrawer() {
        if (document.getElementById("cartDrawer")) return;

        document.body.insertAdjacentHTML("beforeend", `
            <div class="cart-overlay" id="cartOverlay"></div>

            <aside
                class="cart-drawer"
                id="cartDrawer"
                aria-hidden="true"
                aria-label="ショッピングカート">

                <div class="cart-drawer-head">
                    <p class="cart-eyebrow">YOUR SELECTION</p>
                    <button class="cart-close" id="cartClose" type="button" aria-label="カートを閉じる">×</button>
                </div>

                <div class="cart-items" id="cartItems"></div>

                <div class="cart-summary">
                    <div class="cart-total-row">
                        <span>小計</span>
                        <strong id="cartSubtotal">¥0</strong>
                    </div>

                    <p style="margin:12px 0 0;font-size:.67rem;line-height:1.8;color:#6e7069;">
                        送料は決済画面で確定します。
                    </p>

                    <a class="cart-checkout-button" id="cartCheckout" href="../checkout.html">
                        CHECKOUT
                    </a>
                </div>
            </aside>
        `);
    }

    function checkoutPath() {
        return location.pathname.includes("/products/")
            ? "../checkout.html"
            : "checkout.html";
    }

    function render() {

    const cart =
        window.YasoyaCart.read();

    const count =
        window.YasoyaCart.count();

    const countElement =
        document.getElementById("cartCount");

    const itemsElement =
        document.getElementById("cartItems");

    const subtotalElement =
        document.getElementById("cartSubtotal");

    const checkoutElement =
        document.getElementById("cartCheckout");


    if (countElement) {

        countElement.textContent =
            String(count);

        countElement.classList.toggle(
            "is-empty",
            count === 0
        );

    }


    if (
        !itemsElement ||
        !subtotalElement ||
        !checkoutElement
    ) {

        return;

    }

    /* この下は今のコードのままでOK */

        checkoutElement.href = checkoutPath();

        if (cart.length === 0) {
            itemsElement.innerHTML = `
                <p class="cart-empty">
                    まだ植物は選ばれていません。
                </p>
            `;
            checkoutElement.setAttribute("aria-disabled", "true");
        } else {
            checkoutElement.removeAttribute("aria-disabled");
            itemsElement.innerHTML = cart.map((item) => `
                <article class="cart-line" data-cart-id="${escapeHtml(item.id)}">
                    <div>
                        <p class="cart-line-name">${escapeHtml(item.name)}</p>
                        <p class="cart-line-price">${window.YasoyaCart.formatMoney(item.price)}</p>
                    </div>

                    <div>
                        <div class="cart-line-controls">
                            <button class="cart-qty-button" data-action="decrease" type="button" aria-label="数量を減らす">−</button>
                            <span>${item.quantity}</span>
                           <button
    class="cart-qty-button"
    data-action="increase"
    type="button"
    aria-label="数量を増やす"
    ${item.quantity >= 10 ? "disabled" : ""}>
    ＋
</button>
                        </div>
                        <button class="cart-remove" data-action="remove" type="button">削除</button>
                    </div>
                </article>
            `).join("");
        }

        subtotalElement.textContent =
            window.YasoyaCart.formatMoney(window.YasoyaCart.subtotal());
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function openDrawer() {
        document.getElementById("cartDrawer")?.classList.add("is-open");
        document.getElementById("cartOverlay")?.classList.add("is-open");
        document.getElementById("cartDrawer")?.setAttribute("aria-hidden", "false");
        document.body.classList.add("cart-open");
    }

    function closeDrawer() {
        document.getElementById("cartDrawer")?.classList.remove("is-open");
        document.getElementById("cartOverlay")?.classList.remove("is-open");
        document.getElementById("cartDrawer")?.setAttribute("aria-hidden", "true");
        document.body.classList.remove("cart-open");
    }

    document.addEventListener("DOMContentLoaded", () => {
        ensureDrawer();
        render();

        document.getElementById("cartTrigger")?.addEventListener("click", openDrawer);
        document.getElementById("cartClose")?.addEventListener("click", closeDrawer);
        document.getElementById("cartOverlay")?.addEventListener("click", closeDrawer);

        document.getElementById("cartItems")?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-action]");
            const line = event.target.closest("[data-cart-id]");
            if (!button || !line) return;

            const id = line.dataset.cartId;
            const item = window.YasoyaCart.read().find((entry) => entry.id === id);
            if (!item) return;

            switch (button.dataset.action) {
                case "increase":
                    window.YasoyaCart.setQuantity(id, item.quantity + 1);
                    break;
                case "decrease":
                    window.YasoyaCart.setQuantity(id, item.quantity - 1);
                    break;
                case "remove":
                    window.YasoyaCart.remove(id);
                    break;
            }
        });

        document.addEventListener("click", (event) => {

    const addButton =
        event.target.closest("[data-add-to-cart]");

    if (!addButton) {
        return;
    }


    const quantitySelector =
        document.querySelector(
            addButton.dataset.quantitySelector ||
            "#productQuantity"
        );


    const productId =
        addButton.dataset.productId;

    const selectedQuantity =
        Number(quantitySelector?.value || 1);


    const existingItem =
        window.YasoyaCart
            .read()
            .find(
                (item) =>
                    item.id === productId
            );


    const currentQuantity =
        existingItem?.quantity || 0;


    const remainingQuantity =
        10 - currentQuantity;


    if (remainingQuantity <= 0) {

        openDrawer();

        return;

    }


    window.YasoyaCart.add({

        id:
            productId,

        name:
            addButton.dataset.productName,

        price:
            Number(
                addButton.dataset.productPrice
            ),

        quantity:
            Math.min(
                selectedQuantity,
                remainingQuantity
            )

    });


    openDrawer();

});



        window.addEventListener("yasoya:cart-change", render);
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeDrawer();
        });
    });
})();
