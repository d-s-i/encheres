function allowed(url) {
 try {const u=new URL(url);return u.protocol==='https:'&&u.hostname.endsWith('.chrono24.com')?u.href:null}
 catch {return null}
}
function productImage(image) {
 const resource=image?.imageResources?.find(x=>x.width>=350)?.url ?? image?.thumbnailUrl;
 return allowed(resource);
}
export function packetImages(images) {
 if(!Array.isArray(images))return [];
 return [...new Set(images.map(productImage).filter(Boolean))];
}
