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
 if(id&&id===product?.featuredImageId)return '/api/media/'+id;
 const poster={lemonbalm:'/images/lemonbalm-home.jpg',yomogi:'/images/yomogi-home.jpg'}[product?.slug];
 return poster||(id?'/api/media/'+id:product?.fallbackImage||'');
}
