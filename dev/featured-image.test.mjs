// Offline-only regression checks; no network, Square, R2, D1 or production writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {draft, ManagementError} from '../worker/src/management/domain.js';
import {presentationImageId,presentationImageUrl} from '../worker/src/management/presentation-images.js';

const img1='a'.repeat(64), img2='b'.repeat(64), img3='c'.repeat(64);
const sample=()=>({name:'レモンバーム',description:'乾燥ハーブ',alt:'植物',
  sortOrder:0,images:[img1,img2],
  variants:[{id:'lemonbalm-10g',name:'10g',price:980,amount:'10g',maxQuantity:10,active:true}]});

test('a separate botanical representative photo does not reorder the product detail gallery',()=>{
 const data=draft({...sample(),featuredImageId:img2});
 assert.deepEqual(data.images,[img1,img2]);
 assert.equal(data.featuredImageId,img2);
 assert.equal(presentationImageId(data),img2);
 assert.equal(presentationImageUrl(data),'/api/media/'+img2);
 assert.equal(data.images[0],img1);
});

test('legacy product drafts keep their exact previous shape and first-image fallback',()=>{
 const before=draft(sample());
 assert.equal(Object.hasOwn(before,'featuredImageId'),false);
 assert.equal(presentationImageId(before),img1);
 assert.equal(presentationImageUrl(before),'/api/media/'+img1);
 assert.equal(Object.hasOwn(draft({...sample(),featuredImageId:null}),'featuredImageId'),false);
});

test('do not select an arbitrary/unowned image, injection or invalid input',()=>{
 for(const selected of [img3,'/api/media/'+img2,'<img>',42,{},'']){
  assert.throws(()=>draft({...sample(),featuredImageId:selected}),ManagementError);
 }
 const escaped={images:[img1],featuredImageId:img2};
 assert.equal(presentationImageId(escaped),img1);
 assert.equal(presentationImageUrl(escaped),'/api/media/'+img1);
});

test('empty gallery retains static production fallback, no broken media route',()=>{
 assert.equal(presentationImageUrl({images:[],fallbackImage:'/images/lemonbalm.jpg'}),'/images/lemonbalm.jpg');
 assert.equal(presentationImageUrl({images:[],featuredImageId:img1}),'');
 assert.equal(presentationImageId({images:[]}),null);
});

test('removing a representative photo causes explicit validation failure until selection is reset',()=>{
 assert.throws(()=>draft({...sample(),images:[img1],featuredImageId:img2}),ManagementError);
 const reset=draft({...sample(),images:[img1]});
 assert.equal(presentationImageId(reset),img1);
});
