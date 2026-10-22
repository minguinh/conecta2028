import {decode,encode} from 'fast-png';
import {Unzlib} from 'fflate';
import {ServiceError} from './types';
/** Accept only bounded RGBA canvas pages. Discard every ancillary chunk before decoding. */
export function sanitizePreview(value:Uint8Array){
 try{
 const b=Buffer.from(value);if(b.length<45||b.length>1048576||![137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n)||b.toString('ascii',12,16)!=='IHDR'||b.readUInt32BE(8)!==13)throw Error();
 const width=b.readUInt32BE(16),height=b.readUInt32BE(20);if(!width||!height||width>1400||height>2000||width*height>2000000||b[24]!==8||b[25]!==6||b[26]!==0||b[27]!==0||b[28]!==0)throw Error();
 const kept:Buffer[]=[b.subarray(0,8)],compressed:Buffer[]=[];let offset=8,ended=false,headers=0;
 while(offset+12<=b.length){const size=b.readUInt32BE(offset),end=offset+12+size;if(end>b.length)throw Error();const kind=b.toString('ascii',offset+4,offset+8);if(kind==='IHDR'){if(++headers!==1||offset!==8)throw Error();kept.push(b.subarray(offset,end));}else if(kind==='IDAT'){compressed.push(b.subarray(offset+8,end-4));kept.push(b.subarray(offset,end));}else if(kind==='IEND'){if(size!==0||end!==b.length)throw Error();kept.push(b.subarray(offset,end));ended=true;break;}else if(kind==='acTL'||kind[0]===kind[0].toUpperCase())throw Error();offset=end;}
 if(!ended||!compressed.length)throw Error();
 // Feed small chunks and stop before a compressed bomb can grow an unbounded buffer.
 const expected=height*(width*4+1);let expanded=0;const stream=new Unzlib((chunk)=>{expanded+=chunk.length;if(expanded>expected)throw Error();});
 const packed=Buffer.concat(compressed);for(let i=0;i<packed.length;i+=256)stream.push(packed.subarray(i,i+256),i+256>=packed.length);
 if(expanded!==expected)throw Error();
 const pixels=decode(Buffer.concat(kept),{checkCrc:true});
 return Buffer.from(encode({width,height,data:pixels.data,depth:8,channels:4}));
 }catch{throw new ServiceError(400,'Prévia PNG inválida ou acima dos limites permitidos.');}
}
