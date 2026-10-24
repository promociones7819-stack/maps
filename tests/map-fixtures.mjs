import {deflateSync} from 'node:zlib';
const crc32=data=>{let c=0xffffffff;for(const byte of data){c^=byte;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
const chunk=(type,data)=>{const tag=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);tag.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([tag,data])),data.length+8);return out;};
const header=Buffer.alloc(13);header.writeUInt32BE(256);header.writeUInt32BE(256,4);header[8]=8;header[9]=2;
const pixels=Buffer.alloc(256*(1+256*3));for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=y*(1+256*3)+1+x*3;pixels[i]=40+x*.6;pixels[i+1]=70+y*.6;pixels[i+2]=55+(x+y)%100;}
export const tile=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
export async function installMapFixtures(page){for(const url of ['https://www.geo.euskadi.eus/**','https://www.ign.es/**','https://tile.openstreetmap.org/**'])await page.route(url,r=>r.fulfill({body:tile,contentType:'image/png'}));}
