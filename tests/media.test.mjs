import test from 'node:test';
import assert from 'node:assert/strict';
import {httpsUrl,normalizeServer,apiUrl,streamUrl,parseM3U,filterItems,stableKey,requestText,loadCatalog} from '../src/media.mjs';
test('M3U artwork resolves relative URLs and respects source HTTP opt-in',()=>{
 const list='#EXTM3U\n#EXTINF:-1 tvg-logo="../logo.png",One\nstream.m3u8\n#EXTINF:-1 tvg-logo="http://images.example.com/two.png",Two\nsecond.m3u8\n#EXTINF:-1 tvg-logo="file:///private/image.png",Three\nthird.m3u8';
 const rows=parseM3U(list,'https://example.com/list/index.m3u').items;
 assert.equal(rows[0].artwork,'https://example.com/logo.png');
 assert.equal(rows[1].artwork,null);
 assert.equal(rows[2].artwork,null);
 assert.equal(parseM3U(list,'https://example.com/list/index.m3u',true).items[1].artwork,'http://images.example.com/two.png');
});
test('Xtream catalog preserves movie covers and rejects unsafe artwork',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>({ok:true,headers:{get:()=>0},text:async()=>JSON.stringify(new URL(url).searchParams.get('action')==='get_vod_streams'?[{stream_id:1,name:'Film',cover:'https://example.com/cover.jpg'},{stream_id:2,stream_icon:'javascript:alert(1)'}]:[])});
 try {
  const result=await loadCatalog({server:'https://example.com',username:'u',password:'p'},'movie');
  assert.equal(result.items[0].artwork,'https://example.com/cover.jpg');
  assert.equal(result.items[1].artwork,null);
  assert.match(result.items[0].url,/\/movie\/u\/p\/1.mp4$/);
 }finally{globalThis.fetch=original;}
});
test('HTTPS required, rejects URL credentials and non-web schemes',()=>{for(const u of ['http://example.com','javascript:alert(1)','https://u:p@example.com']) assert.throws(()=>httpsUrl(u));assert.equal(httpsUrl('https://example.com').hostname,'example.com');});
test('normalize server API paths and preserve installation subdirectory',()=>{assert.equal(normalizeServer('https://example.com/panel/player_api.php?a=b'),'https://example.com/panel');});
test('credentials are escaped independently in API URL',()=>{const u=new URL(apiUrl({server:'https://example.com',username:'a&b',password:'p?#='},'get_series_info',{series_id:42}));assert.equal(u.searchParams.get('username'),'a&b');assert.equal(u.searchParams.get('password'),'p?#=');assert.equal(u.searchParams.get('series_id'),'42');});
test('stream path encoding and invalid IDs',()=>{const p={server:'https://example.com',username:'a/b',password:'p?'};assert.equal(streamUrl(p,'movie',42,'mp4'),'https://example.com/movie/a%2Fb/p%3F/42.mp4');assert.throws(()=>streamUrl(p,'live','../x','ts'));});
test('M3U quotes, commas, CRLF, relative URLs and duplicates',()=>{const r=parseM3U('#EXTM3U\r\n#EXTINF:-1 group-title="News, World",قناة, أخبار\r\nstream.m3u8\r\n#EXTINF:-1,Again\r\nstream.m3u8','https://example.com/list/index.m3u');assert.equal(r.items.length,1);assert.equal(r.items[0].name,'قناة, أخبار');assert.equal(r.items[0].group,'News, World');assert.equal(r.items[0].url,'https://example.com/list/stream.m3u8');});
test('M3U rejects HTML and HLS manifests',()=>{assert.throws(()=>parseM3U('<html>login</html>'));assert.throws(()=>parseM3U('#EXTM3U\n#EXT-X-TARGETDURATION:10\nseg.ts'));});
test('M3U skips insecure sources and reports count',()=>{const r=parseM3U('#EXTM3U\n#EXTINF:-1,Bad\nhttp://example.com/a\n#EXTINF:-1,Good\nhttps://example.com/b');assert.equal(r.skipped,1);assert.equal(r.items[0].name,'Good');});
test('search category and favorites compose',()=>{const rows=[{id:'1',name:'أخبار اليوم',group:'أخبار'},{id:'2',name:'رياضة',group:'رياضة'}];assert.equal(filterItems(rows,'أخبار','أخبار',true,['1'],i=>i.id).length,1);assert.equal(filterItems(rows,'','رياضة',true,['1'],i=>i.id).length,0);});
test('item keys separate kinds and do not contain URLs',()=>{assert.equal(stableKey({kind:'live',id:'7'}).length,16);assert.notEqual(stableKey({kind:'live',id:'7'}),stableKey({kind:'movie',id:'7'}));});
test('network errors never reveal credentials',async()=>{await assert.rejects(requestText('https://example.com/?password=SECRET',async()=>{throw new Error('failed https://example.com/?password=SECRET');}),e=>!e.message.includes('SECRET'));});
test('content size limit and authorization failure',async()=>{await assert.rejects(requestText('https://example.com',async()=>({ok:true,headers:{get:()=>13000000}})));await assert.rejects(requestText('https://example.com',async()=>({ok:false})));});
test('HTTP only allowed with explicit source opt-in',()=>{assert.throws(()=>httpsUrl('http://example.com'));assert.equal(httpsUrl('http://example.com',true).protocol,'http:');assert.throws(()=>httpsUrl('ftp://example.com',true));const p={server:'http://example.com',username:'u',password:'p',allowHTTP:true};assert.match(apiUrl(p),/^http:/);assert.match(streamUrl(p,'live',1,'m3u8'),/^http:/);assert.throws(()=>apiUrl({...p,allowHTTP:false}));});
test('M3U mixed sources respect opt-in',()=>{const text='#EXTM3U\n#EXTINF:-1,HTTP\nhttp://example.com/a\n#EXTINF:-1,HTTPS\nhttps://example.com/b';assert.equal(parseM3U(text,undefined,true).items.length,2);assert.equal(parseM3U(text).items.length,1);});
test('HTTP fetch defaults to blocked before network',async()=>{let calls=0;const fake=async()=>{calls++;return{ok:true,headers:{get:()=>0},text:async()=> 'ok'};};await assert.rejects(requestText('http://example.com',fake));assert.equal(calls,0);assert.equal(await requestText('http://example.com',fake,true),'ok');assert.equal(calls,1);});

test('local import names stay inside video directory',async()=>{
 const {localFilename}=await import('../src/media.mjs');
 assert.equal(localFilename('abc-123','../Holiday.MOV'),'abc-123.mov');
 assert.throws(()=>localFilename('../outside','video.mp4'));
});
