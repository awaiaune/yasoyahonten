// Presentation-only choice: preserve the detail gallery order for the first product photo.
// A chosen home/SHOP photo must already belong to the published product gallery.
export function presentationImageId(product) {
 const gallery=Array.isArray(product?.images)?product.images:[];
 return gallery.includes(product?.featuredImageId) ? product.featuredImageId : gallery[0]||null;
}
export function presentationImageUrl(product) {
 const id=presentationImageId(product);
 return id?'/api/media/'+id:product?.fallbackImage||'';
}
