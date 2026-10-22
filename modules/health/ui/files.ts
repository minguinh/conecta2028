/** Render only pixels locally. Never execute PDF actions or send files to another service. */
export async function documentPages(file:File):Promise<Blob[]>{
 if(file.size>8388608)throw Error('O arquivo deve ter até 8 MB.');
 const png=(canvas:HTMLCanvasElement)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b&&b.size<=1048576?resolve(b):reject(Error('Página muito grande. Envie uma imagem menor.')),'image/png'));
 if(file.type==='application/pdf'){
  const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc='/pdf/pdf.worker.min.mjs';
  const task=pdf.getDocument({data:new Uint8Array(await file.arrayBuffer()),disableFontFace:true,useSystemFonts:true,maxImageSize:16000000,cMapUrl:'/pdf/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdf/standard_fonts/',wasmUrl:'/pdf/wasm/'});
  try{const doc=await task.promise;if(doc.numPages>6)throw Error('Envie um PDF com até seis páginas.');const result:Blob[]=[];for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(1000/base.width,1400/base.height,2)}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,viewport}).promise;result.push(await png(canvas));canvas.width=canvas.height=0;page.cleanup();}return result;}finally{await task.destroy();}
 }
 if(!['image/jpeg','image/png'].includes(file.type))throw Error('Selecione PDF, JPG ou PNG.');
 const image=await createImageBitmap(file);try{if(image.width*image.height>40000000)throw Error('Imagem muito grande.');const scale=Math.min(1000/image.width,1400/image.height,1),canvas=document.createElement('canvas');canvas.width=Math.ceil(image.width*scale);canvas.height=Math.ceil(image.height*scale);canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);const result=await png(canvas);canvas.width=canvas.height=0;return [result];}finally{image.close();}
}
