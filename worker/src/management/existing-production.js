// Reviewed public IDs/SKUs, never credentials. Re-read Square before linking.
import snapshot from '../../../production/existing-products.json' with {type:'json'};
export const existingProductionProduct=id=>snapshot.products.find(p=>p.variantId===id);
