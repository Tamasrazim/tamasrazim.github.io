/* TRILYVA Library Registry */
window.TRILYVA_LIBRARY=(function(){const items=[];return{version:1,register(x){if(!x||!x.id||!x.title||typeof x.load!=="function")throw new TypeError("Invalid TRILYVA library.");if(!items.some(y=>y.id===x.id))items.push(x);return x;},all(){return items.slice();},get(id){return items.find(x=>x.id===id)||null;}};})();
