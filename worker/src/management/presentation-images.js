// A selected image is reserved for home/SHOP presentation; gallery order is preserved.
export function presentationImageId(product) {
 const gallery=Array.isArray(product?.images)?product.images:[];
 return gallery.includes(product?.featuredImageId) ? product.featuredImageId : gallery[0]||null;
}
export function detailImageIds(product) {
 const gallery=Array.isArray(product?.images)?product.images:[];
 return gallery.filter(id=>id!==product?.featuredImageId);
}
export function presentationImageUrl(product) {
 const id=presentationImageId(product);
 return id?'/api/media/'+id:product?.fallbackImage||'';
}
