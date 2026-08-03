(() => {
    "use strict";

    const STORAGE_KEY = "yasoya_honten_cart_v1";
    const MAX_QUANTITY = 10;

    const money = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0
    });

    function normalizeItem(item) {
        if (!item || typeof item !== "object") return null;

        const id = String(item.id || "").trim();
        const name = String(item.name || "").trim();
        const price = Number(item.price);
        const quantity = Math.min(
            MAX_QUANTITY,
            Math.max(1, Number.parseInt(item.quantity, 10) || 1)
        );

        if (!id || !name || !Number.isInteger(price) || price < 0) return null;

        return { id, name, price, quantity };
    }

    function read() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            return Array.isArray(parsed)
                ? parsed.map(normalizeItem).filter(Boolean)
                : [];
        } catch {
            return [];
        }
    }

    function write(cart) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent("yasoya:cart-change", {
            detail: { cart }
        }));
    }

    function add(item) {
        const nextItem = normalizeItem(item);
        if (!nextItem) throw new Error("商品情報が正しくありません。");

        const cart = read();
        const existing = cart.find((entry) => entry.id === nextItem.id);

        if (existing) {
            existing.quantity = Math.min(
                MAX_QUANTITY,
                existing.quantity + nextItem.quantity
            );
        } else {
            cart.push(nextItem);
        }

        write(cart);
        return cart;
    }

    function setQuantity(id, quantity) {
        const cart = read();
        const target = cart.find((entry) => entry.id === id);
        if (!target) return cart;

        const nextQuantity = Number.parseInt(quantity, 10);

        if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
            return remove(id);
        }

        target.quantity = Math.min(MAX_QUANTITY, nextQuantity);
        write(cart);
        return cart;
    }

    function remove(id) {
        const cart = read().filter((entry) => entry.id !== id);
        write(cart);
        return cart;
    }

    function clear() {
        write([]);
    }

    function count() {
        return read().reduce((sum, item) => sum + item.quantity, 0);
    }

    function subtotal() {
        return read().reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
        );
    }

    window.YasoyaCart = Object.freeze({
        read,
        add,
        setQuantity,
        remove,
        clear,
        count,
        subtotal,
        formatMoney: (amount) => money.format(amount)
    });
})();
