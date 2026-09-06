(() => {
    "use strict";

    const LOW_STOCK_THRESHOLD = 10;
    const MAX_QUANTITY = 10;
    const config = window.YASOYA_STORE_CONFIG;

    async function fetchInventory(ids) {
        const response = await fetch(`${config.workerBaseUrl}/api/inventory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error?.message || "在庫情報を確認できませんでした。");
        return body.inventory || [];
    }

    function ensureStatus(cartArea) {
        let el = document.getElementById("productStockStatus");
        if (!el) {
            el = document.createElement("p");
            el.id = "productStockStatus";
            el.className = "product-stock-status";
            el.setAttribute("aria-live", "polite");
            cartArea.parentNode.insertBefore(el, cartArea);
        }
        return el;
    }

    function fillQuantity(select, available) {
        const limit = Math.min(MAX_QUANTITY, Math.max(0, available));
        const previous = Number.parseInt(select.value, 10) || 1;
        select.innerHTML = "";
        for (let i = 1; i <= limit; i += 1) {
            const option = document.createElement("option");
            option.value = String(i);
            option.textContent = String(i);
            select.appendChild(option);
        }
        if (limit > 0) select.value = String(Math.min(previous, limit));
        select.disabled = limit === 0;
    }

    function applyStock(stock, button, select, status) {
        const available = Math.max(0, Number(stock?.availableQuantity) || 0);
        fillQuantity(select, available);
        status.classList.remove("is-sold-out", "is-low");

        if (available <= 0) {
            status.textContent = "SOLD OUT";
            status.classList.add("is-sold-out");
            button.disabled = true;
            button.textContent = "SOLD OUT";
        } else {
            button.disabled = false;
            button.textContent = "カートへ入れる";
            if (available <= LOW_STOCK_THRESHOLD) {
                status.textContent = `残り${available}点`;
                status.classList.add("is-low");
            } else {
                status.textContent = "";
            }
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        if (!config?.workerBaseUrl) return;
        const button = document.querySelector("[data-add-to-cart]");
        const select = document.getElementById("productQuantity");
        const cartArea = document.querySelector(".product-cart-area");
        if (!button || !select || !cartArea) return;

        const status = ensureStatus(cartArea);
        const ids = [...new Set([
            ...document.querySelectorAll("[data-product-id]")
        ].map((el) => el.dataset.productId).filter(Boolean))];

        try {
            const inventory = await fetchInventory(ids);
            const byId = new Map(inventory.map((item) => [item.id, item]));
            const refresh = () => applyStock(byId.get(button.dataset.productId), button, select, status);
            refresh();
            document.querySelectorAll('input[name="goldenrodVariant"]').forEach((input) => {
                input.addEventListener("change", () => setTimeout(refresh, 0));
            });
        } catch (error) {
            console.error(error);
            status.textContent = "在庫情報を確認できませんでした。";
            status.classList.add("is-low");
            button.disabled = true;
            select.disabled = true;
        }
    });
})();
