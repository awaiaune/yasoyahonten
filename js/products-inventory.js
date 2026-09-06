(() => {
    "use strict";

    const FALLBACK_WORKER_BASE_URL = "https://yasoya-honten-payments.tatsurou3523.workers.dev";

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

    function setOnSale(status) {
        status.textContent = "販売中";
        status.classList.add("status-on-sale");
        status.classList.remove("status-sold-out");
    }

    function setSoldOut(status) {
        status.textContent = "在庫切れ";
        status.classList.remove("status-on-sale");
        status.classList.add("status-sold-out");
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const statuses = [...document.querySelectorAll(".product-status[data-product-ids]")];
        if (statuses.length === 0) return;

        const allIds = statuses.flatMap((status) =>
            String(status.dataset.productIds || "")
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean)
        );

        try {
            const inventory = await fetchInventory(allIds);
            const byId = new Map(
                inventory.map((item) => [
                    item.id,
                    Math.max(0, Math.floor(Number(item.availableQuantity) || 0))
                ])
            );

            statuses.forEach((status) => {
                const ids = String(status.dataset.productIds || "")
                    .split(",")
                    .map((id) => id.trim())
                    .filter(Boolean);

                // セイタカのように複数バリエーションがある商品は、
                // どれか1種類でも在庫があれば「販売中」。全種類0なら「在庫切れ」。
                const allSoldOut = ids.length > 0 && ids.every((id) => (byId.get(id) ?? 0) <= 0);

                if (allSoldOut) setSoldOut(status);
                else setOnSale(status);
            });
        } catch (error) {
            console.error("Products inventory status error:", error);
            // 在庫取得失敗時は誤って「在庫切れ」と表示せず、既存の「販売中」を維持する。
        }
    });
})();
