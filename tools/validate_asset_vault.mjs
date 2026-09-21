import fs from 'node:fs';

const must=(ok,msg)=>{
  if(!ok)throw new Error(msg);
  console.log('PASS',msg);
};

const html=fs.readFileSync('asset-vault/index.html','utf8');
const app=fs.readFileSync('asset-vault/js/app.js','utf8');
const sw=fs.readFileSync('asset-vault/sw.js','utf8');
const manifest=JSON.parse(fs.readFileSync('asset-vault/manifest.webmanifest','utf8'));

for(const id of ['pickBtn','clearBtn','fileInput','drop','search','statusFilter','kindFilter','grid','detail','saveDetail','downloadDetail','metadataDetail','deleteDetail']){
  must(html.includes('id="'+id+'"'),'UI contract: '+id);
}

for(const token of ['indexedDB','crypto.randomUUID','URL.createObjectURL','downloadMetadata','importFiles','applyFilters','saveDetail','deleteSelected']){
  must(app.includes(token),'app contract: '+token);
}

must(/<script[^>]+src=["']\.\/js\/app\.js["']/.test(html),'single local app.js include');
must(!/<script[^>]+src=["']https?:/i.test(html),'no remote JavaScript dependency');
must(manifest.start_url==='/asset-vault/','PWA start_url is scoped');
must(manifest.scope==='/asset-vault/','PWA scope is scoped');
must(/const CACHE='tamasrazim-asset-vault-v\d+'/.test(sw),'service-worker cache is versioned');
must(sw.includes('self.registration.scope'),'service-worker fallback uses registration scope');
must(sw.includes('caches.match(FALLBACK_URL)'),'offline fallback exists');

try{new Function(app);console.log('PASS Asset Vault JavaScript parses')}
catch(error){throw new Error('Asset Vault JavaScript syntax: '+error.message)}

try{new Function(sw);console.log('PASS Asset Vault service worker parses')}
catch(error){throw new Error('Asset Vault service worker syntax: '+error.message)}

console.log('Asset Vault validation complete.');
