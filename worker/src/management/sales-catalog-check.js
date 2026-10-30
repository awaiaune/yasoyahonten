// Pure, read-only explanation of the existing checkout fence. Never adopts versions.
export function salesCatalogCheck(env, mapping, object, variant) {
 const d=object?.item_variation_data;
 const values={price:{saved:variant.unitPrice,current:d?.price_money?.amount??null},currency:{saved:'JPY',current:d?.price_money?.currency??null},name:{saved:variant.name,current:d?.name??null},version:{saved:mapping.variation_version??null,current:object?.version??null},tracking:{saved:true,current:d?.track_inventory??null},location:{saved:env.SQUARE_LOCATION_ID,current:object?.absent_at_location_ids?.includes(env.SQUARE_LOCATION_ID)?'excluded':'not-excluded'}};
 const checks={data:Boolean(d),price:Boolean(d)&&Number(d.price_money?.amount)===variant.unitPrice,currency:d?.price_money?.currency==='JPY',name:d?.name===variant.name,version:object?.version===mapping.variation_version,tracking:d?.track_inventory===true,location:!object?.absent_at_location_ids?.includes(env.SQUARE_LOCATION_ID)};
 const labels={data:'Variation情報',price:'価格',currency:'通貨',name:'Variation名',version:'Variationバージョン',tracking:'在庫追跡',location:'Location販売設定'};
 return {ok:Object.values(checks).every(Boolean),mismatches:Object.keys(checks).filter(k=>!checks[k]).map(key=>({key,label:labels[key],...(values[key]||{})})),values};
}
