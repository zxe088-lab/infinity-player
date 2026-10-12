// User-entered media sources may require HTTP. App code still defaults to HTTPS
// and requires explicit, per-source consent. Explain this ATS exception to review.
const {withInfoPlist,withAndroidManifest}=require('expo/config-plugins');
module.exports=function withHttpSources(config){
 config=withInfoPlist(config,c=>{
   const ats=c.modResults.NSAppTransportSecurity || {};
   // Fine-grained keys would override NSAllowsArbitraryLoads on modern iOS.
   delete ats.NSAllowsLocalNetworking;
   delete ats.NSAllowsArbitraryLoadsInWebContent;
   delete ats.NSAllowsArbitraryLoadsForMedia;
   ats.NSAllowsArbitraryLoads=true;
   c.modResults.NSAppTransportSecurity=ats;
   return c;
 });
 return withAndroidManifest(config,c=>{
   const app=c.modResults.manifest.application?.[0];
   if(app){app.$=app.$||{};app.$['android:usesCleartextTraffic']='true';}
   return c;
 });
};
