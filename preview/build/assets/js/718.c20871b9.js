"use strict";(self.webpackChunkllm_d_docs_wip=self.webpackChunkllm_d_docs_wip||[]).push([["718"],{4023(e,t,s){s.r(t),s.d(t,{default:()=>m});var i=s(4714),l=s.n(i),a=s(8291);a.tokenizer.separator=/[\s\-/]+/;let r=class{constructor(e,t,s="/",i){this.searchDocs=e,this.lunrIndex=a.Index.load(t),this.baseUrl=s,this.maxHits=i}getLunrResult(e){return this.lunrIndex.query(function(t){let s=a.tokenizer(e);t.term(s,{boost:10}),t.term(s,{wildcard:a.Query.wildcard.TRAILING})})}getHit(e,t,s){return{hierarchy:{lvl0:e.pageTitle||e.title,lvl1:0===e.type?null:e.title},url:e.url,version:e.version,_snippetResult:s?{content:{value:s,matchLevel:"full"}}:null,_highlightResult:{hierarchy:{lvl0:{value:0===e.type?t||e.title:e.pageTitle},lvl1:0===e.type?null:{value:t||e.title}}}}}getTitleHit(e,t,s){let i=t[0],l=t[0]+s,a=e.title.substring(0,i)+'<span class="algolia-docsearch-suggestion--highlight">'+e.title.substring(i,l)+"</span>"+e.title.substring(l,e.title.length);return this.getHit(e,a)}getKeywordHit(e,t,s){let i=t[0],l=t[0]+s,a=e.title+"<br /><i>Keywords: "+e.keywords.substring(0,i)+'<span class="algolia-docsearch-suggestion--highlight">'+e.keywords.substring(i,l)+"</span>"+e.keywords.substring(l,e.keywords.length)+"</i>";return this.getHit(e,a)}getContentHit(e,t){let s=t[0],i=t[0]+t[1],l=s,a=i,r=!0,o=!0;for(let t=0;t<3;t++){let t=e.content.lastIndexOf(" ",l-2),s=e.content.lastIndexOf(".",l-2);if(s>0&&s>t){l=s+1,r=!1;break}if(t<0){l=0,r=!1;break}l=t+1}for(let t=0;t<10;t++){let t=e.content.indexOf(" ",a+1),s=e.content.indexOf(".",a+1);if(s>0&&s<t){a=s,o=!1;break}if(t<0){a=e.content.length,o=!1;break}a=t}let n=e.content.substring(l,s);return r&&(n="... "+n),n+='<span class="algolia-docsearch-suggestion--highlight">'+e.content.substring(s,i)+"</span>",n+=e.content.substring(i,a),o&&(n+=" ..."),this.getHit(e,null,n)}search(e){return new Promise((t,s)=>{let i=this.getLunrResult(e),l=[];i.length>this.maxHits&&(i.length=this.maxHits),this.titleHitsRes=[],this.contentHitsRes=[],i.forEach(t=>{let s=this.searchDocs[t.ref],{metadata:i}=t.matchData;for(let a in i)if(i[a].title){if(!this.titleHitsRes.includes(t.ref)){let r=i[a].title.position[0];l.push(this.getTitleHit(s,r,e.length)),this.titleHitsRes.push(t.ref)}}else if(i[a].content){let e=i[a].content.position[0];l.push(this.getContentHit(s,e))}else if(i[a].keywords){let r=i[a].keywords.position[0];l.push(this.getKeywordHit(s,r,e.length)),this.titleHitsRes.push(t.ref)}}),l.length>this.maxHits&&(l.length=this.maxHits),t(l)})}};var o=s(4498),n=s.n(o);let h="algolia-docsearch",c=`${h}-suggestion`,u=`${h}-footer`,g={suggestion:`
  <a class="${c}
    {{#isCategoryHeader}}${c}__main{{/isCategoryHeader}}
    {{#isSubCategoryHeader}}${c}__secondary{{/isSubCategoryHeader}}
    "
    aria-label="Link to the result"
    href="{{{url}}}"
    >
    <div class="${c}--category-header">
        <span class="${c}--category-header-lvl0">{{{category}}}</span>
    </div>
    <div class="${c}--wrapper">
      <div class="${c}--subcategory-column">
        <span class="${c}--subcategory-column-text">{{{subcategory}}}</span>
      </div>
      {{#isTextOrSubcategoryNonEmpty}}
      <div class="${c}--content">
        <div class="${c}--subcategory-inline">{{{subcategory}}}</div>
        <div class="${c}--title">{{{title}}}</div>
        {{#text}}<div class="${c}--text">{{{text}}}</div>{{/text}}
        {{#version}}<div class="${c}--version">{{version}}</div>{{/version}}
      </div>
      {{/isTextOrSubcategoryNonEmpty}}
    </div>
  </a>
  `,suggestionSimple:`
  <div class="${c}
    {{#isCategoryHeader}}${c}__main{{/isCategoryHeader}}
    {{#isSubCategoryHeader}}${c}__secondary{{/isSubCategoryHeader}}
    suggestion-layout-simple
  ">
    <div class="${c}--category-header">
        {{^isLvl0}}
        <span class="${c}--category-header-lvl0 ${c}--category-header-item">{{{category}}}</span>
          {{^isLvl1}}
          {{^isLvl1EmptyOrDuplicate}}
          <span class="${c}--category-header-lvl1 ${c}--category-header-item">
              {{{subcategory}}}
          </span>
          {{/isLvl1EmptyOrDuplicate}}
          {{/isLvl1}}
        {{/isLvl0}}
        <div class="${c}--title ${c}--category-header-item">
            {{#isLvl2}}
                {{{title}}}
            {{/isLvl2}}
            {{#isLvl1}}
                {{{subcategory}}}
            {{/isLvl1}}
            {{#isLvl0}}
                {{{category}}}
            {{/isLvl0}}
        </div>
    </div>
    <div class="${c}--wrapper">
      {{#text}}
      <div class="${c}--content">
        <div class="${c}--text">{{{text}}}</div>
      </div>
      {{/text}}
    </div>
  </div>
  `,footer:`
    <div class="${u}">
    </div>
  `,empty:`
  <div class="${c}">
    <div class="${c}--wrapper">
        <div class="${c}--content ${c}--no-results">
            <div class="${c}--title">
                <div class="${c}--text">
                    No results found for query <b>"{{query}}"</b>
                </div>
            </div>
        </div>
    </div>
  </div>
  `,searchBox:`
  <form novalidate="novalidate" onsubmit="return false;" class="searchbox">
    <div role="search" class="searchbox__wrapper">
      <input id="docsearch" type="search" name="search" placeholder="Search the docs" autocomplete="off" required="required" class="searchbox__input"/>
      <button type="submit" title="Submit your search query." class="searchbox__submit" >
        <svg width=12 height=12 role="img" aria-label="Search">
          <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#sbx-icon-search-13"></use>
        </svg>
      </button>
      <button type="reset" title="Clear the search query." class="searchbox__reset hide">
        <svg width=12 height=12 role="img" aria-label="Reset">
          <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#sbx-icon-clear-3"></use>
        </svg>
      </button>
    </div>
</form>

<div class="svg-icons" style="height: 0; width: 0; position: absolute; visibility: hidden">
  <svg xmlns="http://www.w3.org/2000/svg">
    <symbol id="sbx-icon-clear-3" viewBox="0 0 40 40"><path d="M16.228 20L1.886 5.657 0 3.772 3.772 0l1.885 1.886L20 16.228 34.343 1.886 36.228 0 40 3.772l-1.886 1.885L23.772 20l14.342 14.343L40 36.228 36.228 40l-1.885-1.886L20 23.772 5.657 38.114 3.772 40 0 36.228l1.886-1.885L16.228 20z" fill-rule="evenodd"></symbol>
    <symbol id="sbx-icon-search-13" viewBox="0 0 40 40"><path d="M26.806 29.012a16.312 16.312 0 0 1-10.427 3.746C7.332 32.758 0 25.425 0 16.378 0 7.334 7.333 0 16.38 0c9.045 0 16.378 7.333 16.378 16.38 0 3.96-1.406 7.593-3.746 10.426L39.547 37.34c.607.608.61 1.59-.004 2.203a1.56 1.56 0 0 1-2.202.004L26.807 29.012zm-10.427.627c7.322 0 13.26-5.938 13.26-13.26 0-7.324-5.938-13.26-13.26-13.26-7.324 0-13.26 5.936-13.26 13.26 0 7.322 5.936 13.26 13.26 13.26z" fill-rule="evenodd"></symbol>
  </svg>
</div>
  `};var d=s(3704),p=s.n(d);let v={mergeKeyWithParent(e,t){if(void 0===e[t]||"object"!=typeof e[t])return e;let s=p().extend({},e,e[t]);return delete s[t],s},groupBy(e,t){let s={};return p().each(e,(e,i)=>{if(void 0===i[t])throw Error(`[groupBy]: Object has no key ${t}`);let l=i[t];"string"==typeof l&&(l=l.toLowerCase()),Object.prototype.hasOwnProperty.call(s,l)||(s[l]=[]),s[l].push(i)}),s},values:e=>Object.keys(e).map(t=>e[t]),flatten(e){let t=[];return e.forEach(e=>{Array.isArray(e)?e.forEach(e=>{t.push(e)}):t.push(e)}),t},flattenAndFlagFirst(e,t){let s=this.values(e).map(e=>e.map((e,s)=>(e[t]=0===s,e)));return this.flatten(s)},compact(e){let t=[];return e.forEach(e=>{e&&t.push(e)}),t},getHighlightedValue:(e,t)=>e._highlightResult&&e._highlightResult.hierarchy_camel&&e._highlightResult.hierarchy_camel[t]&&e._highlightResult.hierarchy_camel[t].matchLevel&&"none"!==e._highlightResult.hierarchy_camel[t].matchLevel&&e._highlightResult.hierarchy_camel[t].value?e._highlightResult.hierarchy_camel[t].value:e._highlightResult&&e._highlightResult&&e._highlightResult[t]&&e._highlightResult[t].value?e._highlightResult[t].value:e[t],getSnippetedValue(e,t){if(!e._snippetResult||!e._snippetResult[t]||!e._snippetResult[t].value)return e[t];let s=e._snippetResult[t].value;return s[0]!==s[0].toUpperCase()&&(s=`\u{2026}${s}`),-1===[".","!","?"].indexOf(s[s.length-1])&&(s=`${s}\u{2026}`),s},deepClone:e=>JSON.parse(JSON.stringify(e))};class y{constructor({searchDocs:e,searchIndex:t,inputSelector:s,debug:i=!1,baseUrl:l="/",queryDataCallback:a=null,autocompleteOptions:o={debug:!1,hint:!1,autoselect:!0},transformData:h=!1,queryHook:c=!1,handleSelected:u=!1,enhancedSearchInput:d=!1,layout:v="column",maxHits:m=5}){this.input=y.getInputFromSelector(s),this.queryDataCallback=a||null;let b=!!o&&!!o.debug&&o.debug;o.debug=i||b,this.autocompleteOptions=o,this.autocompleteOptions.cssClasses=this.autocompleteOptions.cssClasses||{},this.autocompleteOptions.cssClasses.prefix=this.autocompleteOptions.cssClasses.prefix||"ds";let f=this.input&&"function"==typeof this.input.attr&&this.input.attr("aria-label");this.autocompleteOptions.ariaLabel=this.autocompleteOptions.ariaLabel||f||"search input",this.isSimpleLayout="simple"===v,this.client=new r(e,t,l,m),d&&(this.input=y.injectSearchBox(this.input)),this.autocomplete=n()(this.input,o,[{source:this.getAutocompleteSource(h,c),templates:{suggestion:y.getSuggestionTemplate(this.isSimpleLayout),footer:g.footer,empty:y.getEmptyTemplate()}}]),this.handleSelected=u||this.handleSelected,u&&p()(".algolia-autocomplete").on("click",".ds-suggestions a",e=>{e.preventDefault()}),this.autocomplete.on("autocomplete:selected",this.handleSelected.bind(null,this.autocomplete.autocomplete)),this.autocomplete.on("autocomplete:shown",this.handleShown.bind(null,this.input)),d&&y.bindSearchBoxEvent(),document.addEventListener("keydown",e=>{(e.ctrlKey||e.metaKey)&&"k"==e.key&&(this.input.focus(),e.preventDefault())})}static injectSearchBox(e){e.before(g.searchBox);let t=e.prev().prev().find("input");return e.remove(),t}static bindSearchBoxEvent(){p()('.searchbox [type="reset"]').on("click",function(){p()("input#docsearch").focus(),p()(this).addClass("hide"),n().autocomplete.setVal("")}),p()("input#docsearch").on("keyup",()=>{let e=document.querySelector("input#docsearch"),t=document.querySelector('.searchbox [type="reset"]');t.className="searchbox__reset",0===e.value.length&&(t.className+=" hide")})}static getInputFromSelector(e){let t=p()(e).filter("input");return t.length?p()(t[0]):null}getAutocompleteSource(e,t){return(s,i)=>{t&&(s=t(s)||s),this.client.search(s).then(t=>{this.queryDataCallback&&"function"==typeof this.queryDataCallback&&this.queryDataCallback(t),e&&(t=e(t)||t),i(y.formatHits(t))})}}static formatHits(e){let t=v.deepClone(e).map(e=>(e._highlightResult&&(e._highlightResult=v.mergeKeyWithParent(e._highlightResult,"hierarchy")),v.mergeKeyWithParent(e,"hierarchy"))),s=v.groupBy(t,"lvl0");return p().each(s,(e,t)=>{let i=v.groupBy(t,"lvl1"),l=v.flattenAndFlagFirst(i,"isSubCategoryHeader");s[e]=l}),(s=v.flattenAndFlagFirst(s,"isCategoryHeader")).map(e=>{let t=y.formatURL(e),s=v.getHighlightedValue(e,"lvl0"),i=v.getHighlightedValue(e,"lvl1")||s,l=v.compact([v.getHighlightedValue(e,"lvl2")||i,v.getHighlightedValue(e,"lvl3"),v.getHighlightedValue(e,"lvl4"),v.getHighlightedValue(e,"lvl5"),v.getHighlightedValue(e,"lvl6")]).join('<span class="aa-suggestion-title-separator" aria-hidden="true"> \u203A </span>'),a=v.getSnippetedValue(e,"content"),r=i&&""!==i||l&&""!==l,o=!i||""===i||i===s,n=l&&""!==l&&l!==i,h=!n&&i&&""!==i&&i!==s,c=e.version;return{isLvl0:!h&&!n,isLvl1:h,isLvl2:n,isLvl1EmptyOrDuplicate:o,isCategoryHeader:e.isCategoryHeader,isSubCategoryHeader:e.isSubCategoryHeader,isTextOrSubcategoryNonEmpty:r,category:s,subcategory:i,title:l,text:a,url:t,version:c}})}static formatURL(e){let{url:t,anchor:s}=e;if(t){if(-1!==t.indexOf("#"));else if(s)return`${e.url}#${e.anchor}`;return t}return s?`#${e.anchor}`:(console.warn("no anchor nor url for : ",JSON.stringify(e)),null)}static getEmptyTemplate(){return e=>l().compile(g.empty).render(e)}static getSuggestionTemplate(e){let t=e?g.suggestionSimple:g.suggestion,s=l().compile(t);return e=>s.render(e)}handleSelected(e,t,s,i,l={}){"click"!==l.selectionMethod&&(e.setVal(""),window.location.assign(s.url))}handleShown(e){let t=e.offset().left+e.width()/2,s=p()(document).width()/2;isNaN(s)&&(s=900);let i=t-s>=0?"algolia-autocomplete-right":"algolia-autocomplete-left",l=t-s<0?"algolia-autocomplete-right":"algolia-autocomplete-left",a=p()(".algolia-autocomplete");a.hasClass(i)||a.addClass(i),a.hasClass(l)&&a.removeClass(l)}}let m=y},4967(){}}]);