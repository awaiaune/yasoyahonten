/*
 * 八草屋本店の商品カタログ
 *
 * ここに書かれた価格・販売可否・購入上限が、
 * サーバー側の最終的な正解です。
 * 商品ページ内の data-product-price は表示用であり、
 * 決済金額には使用しません。
 */

export const CATALOG = Object.freeze({
    "lemonbalm-10g": Object.freeze({
        name: "乾燥レモンバーム 10g",
        price: 980,
        active: true,
        maxQuantity: 10,
        squareVariationId: "RRTIT6N4QLIYPUW633WDBG36"
    }),

    "yomogi-10g": Object.freeze({
        name: "乾燥ヨモギ 10g",
        price: 980,
        active: true,
        maxQuantity: 10,
        squareVariationId: "F7X4UHYUAI7PSGURVQ4LEROY"
    }),

    "goldenrod-leaf-10g": Object.freeze({
        name: "乾燥セイタカアワダチソウ 葉 10g",
        price: 980,
        active: true,
        maxQuantity: 10,
        squareVariationId: "U4T4IF6YCH2K2CGSG7IPWV5J"
    }),

    "goldenrod-leaf-stem-20g": Object.freeze({
        name: "乾燥セイタカアワダチソウ 葉と茎 20g",
        price: 980,
        active: true,
        maxQuantity: 10,
        squareVariationId: "CHYZVEADNVDMKAMR7XTYWJLP"
    })
});

export const SHIPPING = Object.freeze({
    flatRate: 350,
    freeThreshold: 3000
});

export function calculateShipping(subtotal) {
    return subtotal >= SHIPPING.freeThreshold ? 0 : SHIPPING.flatRate;
}
