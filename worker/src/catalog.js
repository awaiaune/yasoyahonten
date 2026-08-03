/*
 * このファイルが価格・販売可否の最終的な正解です。
 * フロントの data-product-price は表示用にすぎません。
 *
 * 価格は円単位の整数です。JPYには小数を使用しません。
 */
export const CATALOG = Object.freeze({
    "goldenrod-10g": Object.freeze({
        name: "乾燥セイタカアワダチソウ 10g",
        price: 980,
        active: true,
        maxQuantity: 3
    }),

    "lemonbalm-10g": Object.freeze({
        name: "乾燥レモンバーム 10g",
        price: 980,
        active: true,
        maxQuantity: 3
    }),

    "yomogi-10g": Object.freeze({
        name: "乾燥ヨモギ 10g",
        price: 980,
        active: true,
        maxQuantity: 3
    })
});

/*
 * 仮の送料です。公開前に必ず実運用へ合わせて変更してください。
 * 例：全国一律350円、3,000円以上無料。
 */
export function calculateShipping(subtotal) {
    return subtotal >= 3000 ? 0 : 350;
}
