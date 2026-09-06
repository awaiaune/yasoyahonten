(() => {
    "use strict";

    const MAX_QUANTITY = 10;
    const LOW_STOCK_THRESHOLD = 10;
    const FALLBACK_WORKER_BASE_URL = "https://yasoya-honten-payments.tatsurou3523.workers.dev";
    const inventoryById = new Map();
    let inventoryRequest = null;

    function workerBaseUrl() {
        return window.YASOYA_STORE_CONFIG?.workerBaseUrl || FALLBACK_WORKER_BASE_URL;
    }

    async function fetchInventory(ids) {
        const uniqueIds = [...new Set(ids.filter(Boolean))];
        if (uniqueIds.length === 0) return [];

        const response = await fetch(`${workerBaseUrl()}/api/inventory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: uniqueIds })
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body?.error?.message || "在庫情報を確認できませんでした。");
        }

        return Array.isArray(body.inventory) ? body.inventory : [];
    }

    async function refreshCartInventory() {
        if (inventoryRequest) return inventoryRequest;

        const cart = window.YasoyaCart.read();
        if (cart.length === 0) {
            inventoryById.clear();
            render();
            return;
        }

        inventoryRequest = (async () => {
            try {
                const inventory = await fetchInventory(cart.map((item) => item.id));
                inventoryById.clear();
                inventory.forEach((item) => {
                    inventoryById.set(item.id, Math.max(0, Math.floor(Number(item.availableQuantity) || 0)));
                });

                // 在庫より多い数量がカートに残っていたら、現在庫まで自動調整する。
                let changed = false;
                for (const item of window.YasoyaCart.read()) {
                    const available = inventoryById.get(item.id);
                    if (Number.isInteger(available) && available > 0 && item.quantity > available) {
                        window.YasoyaCart.setQuantity(item.id, available);
                        changed = true;
                    }
                }

                if (!changed) render();
            } catch (error) {
                console.error("Cart inventory error:", error);
                render(true);
            } finally {
                inventoryRequest = null;
            }
        })();

        return inventoryRequest;
    }

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

    function render(inventoryError = false) {
        const cart = window.YasoyaCart.read();
        const count = window.YasoyaCart.count();
        const countElement = document.getElementById("cartCount");
        const itemsElement = document.getElementById("cartItems");
        const subtotalElement = document.getElementById("cartSubtotal");
        const checkoutElement = document.getElementById("cartCheckout");

        if (countElement) {
            countElement.textContent = String(count);
            countElement.classList.toggle("is-empty", count === 0);
        }

        if (!itemsElement || !subtotalElement || !checkoutElement) return;

        checkoutElement.href = checkoutPath();

        if (cart.length === 0) {
            itemsElement.innerHTML = `
                <p class="cart-empty">
                    まだ植物は選ばれていません。
                </p>
            `;
            checkoutElement.setAttribute("aria-disabled", "true");
        } else {
            let hasSoldOut = false;

            itemsElement.innerHTML = cart.map((item) => {
                const available = inventoryById.get(item.id);
                const hasInventory = Number.isInteger(available);
                const soldOut = hasInventory && available <= 0;
                const maxAllowed = hasInventory
                    ? Math.min(MAX_QUANTITY, available)
                    : MAX_QUANTITY;
                const increaseDisabled = soldOut || item.quantity >= maxAllowed;
                if (soldOut) hasSoldOut = true;

                let stockText = "";
                let stockClass = "";

                if (soldOut) {
                    stockText = "SOLD OUT";
                    stockClass = " is-sold-out";
                } else if (hasInventory && available <= LOW_STOCK_THRESHOLD) {
                    stockText = `在庫：残り${available}点`;
                    stockClass = " is-low";
                } else if (inventoryError) {
                    stockText = "在庫情報を確認できませんでした。";
                    stockClass = " is-error";
                }

                return `
                    <article class="cart-line" data-cart-id="${escapeHtml(item.id)}">
                        <div>
                            <p class="cart-line-name">${escapeHtml(item.name)}</p>
                            <p class="cart-line-price">${window.YasoyaCart.formatMoney(item.price)}</p>
                            ${stockText ? `<p class="cart-line-stock${stockClass}">${escapeHtml(stockText)}</p>` : ""}
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
                                    ${increaseDisabled ? "disabled" : ""}>
                                    ＋
                                </button>
                            </div>
                            <button class="cart-remove" data-action="remove" type="button">削除</button>
                        </div>
                    </article>
                `;
            }).join("");

            if (hasSoldOut) {
                checkoutElement.setAttribute("aria-disabled", "true");
            } else {
                checkoutElement.removeAttribute("aria-disabled");
            }
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

    async function openDrawer() {
        document.getElementById("cartDrawer")?.classList.add("is-open");
        document.getElementById("cartOverlay")?.classList.add("is-open");
        document.getElementById("cartDrawer")?.setAttribute("aria-hidden", "false");
        document.body.classList.add("cart-open");
        await refreshCartInventory();
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
        refreshCartInventory();

        document.getElementById("cartTrigger")?.addEventListener("click", openDrawer);
        document.getElementById("cartClose")?.addEventListener("click", closeDrawer);
        document.getElementById("cartOverlay")?.addEventListener("click", closeDrawer);

        document.getElementById("cartItems")?.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-action]");
            const line = event.target.closest("[data-cart-id]");
            if (!button || !line) return;

            const id = line.dataset.cartId;
            const item = window.YasoyaCart.read().find((entry) => entry.id === id);
            if (!item) return;

            switch (button.dataset.action) {
                case "increase": {
                    // 押す直前にも現在庫を取り直し、古い在庫情報で増やさない。
                    await refreshCartInventory();
                    const freshItem = window.YasoyaCart.read().find((entry) => entry.id === id);
                    if (!freshItem) return;

                    const available = inventoryById.get(id);
                    const maxAllowed = Number.isInteger(available)
                        ? Math.min(MAX_QUANTITY, available)
                        : MAX_QUANTITY;

                    if (freshItem.quantity < maxAllowed) {
                        window.YasoyaCart.setQuantity(id, freshItem.quantity + 1);
                    }
                    break;
                }
                case "decrease":
                    window.YasoyaCart.setQuantity(id, item.quantity - 1);
                    break;
                case "remove":
                    inventoryById.delete(id);
                    window.YasoyaCart.remove(id);
                    break;
            }
        });

        document.addEventListener("click", (event) => {
            const addButton = event.target.closest("[data-add-to-cart]");
            if (!addButton) return;

            const quantitySelector = document.querySelector(
                addButton.dataset.quantitySelector || "#productQuantity"
            );

            const productId = addButton.dataset.productId;
            const selectedQuantity = Number(quantitySelector?.value || 1);
            const existingItem = window.YasoyaCart
                .read()
                .find((item) => item.id === productId);
            const currentQuantity = existingItem?.quantity || 0;

            const knownAvailable = inventoryById.get(productId);
            const maxAllowed = Number.isInteger(knownAvailable)
                ? Math.min(MAX_QUANTITY, knownAvailable)
                : MAX_QUANTITY;
            const remainingQuantity = maxAllowed - currentQuantity;

            if (remainingQuantity <= 0) {
                openDrawer();
                return;
            }

            window.YasoyaCart.add({
                id: productId,
                name: addButton.dataset.productName,
                price: Number(addButton.dataset.productPrice),
                quantity: Math.min(selectedQuantity, remainingQuantity)
            });

            openDrawer();
        });

        window.addEventListener("yasoya:cart-change", render);
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeDrawer();
        });
    });
})();
