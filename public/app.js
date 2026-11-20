document.querySelectorAll('img[data-fallback]').forEach(image=>{
 image.addEventListener('error',()=>{image.hidden=true;image.nextElementSibling.hidden=false});
 if(image.complete && image.naturalWidth===0){image.hidden=true;image.nextElementSibling.hidden=false}
});
